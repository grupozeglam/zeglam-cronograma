
export async function extractLinksFromImage(
  imageBuffer: Buffer, 
  apiKey: string, 
  prompt: string, 
  provider: string = "openai"
) {
  try {
    const base64Image = imageBuffer.toString("base64");

    if (provider === "gemini") {
      return await extractWithGemini(base64Image, apiKey, prompt);
    } else {
      return await extractWithOpenAI(base64Image, apiKey, prompt);
    }
  } catch (error) {
    console.error("[EXTRACT_LINKS_AI] Error:", error);
    throw error;
  }
}

async function extractWithOpenAI(base64Image: string, apiKey: string, prompt: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message}`);
  }

  const data = await response.json() as any;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from OpenAI");
  }

  // Parse JSON from response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON from response");
  }

  const links = JSON.parse(jsonMatch[0]);
  return links;
}

async function extractWithGemini(base64Image: string, apiKey: string, prompt: string) {
  try {
    console.log("[GEMINI] Starting extraction with Gemini API");
    console.log("[GEMINI] API Key length:", apiKey.length);
    
    // Usar o modelo correto do Gemini
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    };

    console.log("[GEMINI] Sending request to Gemini API");
    console.log("[GEMINI] Request body size:", JSON.stringify(requestBody).length);

    // Usar gemini-2.5-flash que suporta visão e tem quota disponível
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    console.log("[GEMINI] URL:", url.substring(0, 100) + "...");
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("[GEMINI] Response status:", response.status);
    console.log("[GEMINI] Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[GEMINI] Error response:", JSON.stringify(errorData, null, 2));
      
      // Melhor mensagem de erro
      if (errorData.error?.message?.includes("API key")) {
        throw new Error("Chave de API do Gemini inválida. Verifique sua chave em https://generativelanguage.googleapis.com");
      }
      if (errorData.error?.message?.includes("quota") || errorData.error?.status === "RESOURCE_EXHAUSTED") {
        throw new Error("Quota do Gemini excedida! O plano gratuito tem limite diário. Aguarde até amanhã ou use uma chave com plano pago.");
      }
      if (errorData.error?.code === 404) {
        throw new Error("Modelo Gemini não encontrado. Verifique se sua chave de API é válida.");
      }
      
      throw new Error(
        `Gemini API error: ${errorData.error?.message || JSON.stringify(errorData)}`
      );
    }

    const data = await response.json() as any;
    
    console.log("[GEMINI] Response received, parsing...");

    // Verificar se há conteúdo na resposta
    if (!data.candidates || data.candidates.length === 0) {
      console.error("[GEMINI] No candidates in response:", JSON.stringify(data, null, 2));
      throw new Error("Nenhuma resposta do Gemini. Tente novamente.");
    }

    const candidate = data.candidates[0];
    
    // Verificar se o candidato foi bloqueado
    if (candidate.finishReason === "SAFETY") {
      console.error("[GEMINI] Response blocked by safety settings");
      throw new Error("Resposta bloqueada pelas configurações de segurança do Gemini. Tente com outra imagem.");
    }

    if (candidate.finishReason === "MAX_TOKENS") {
      console.warn("[GEMINI] Response truncated due to max tokens");
    }

    const content = candidate.content?.parts?.[0]?.text;

    if (!content) {
      console.error("[GEMINI] No text content in response:", JSON.stringify(data, null, 2));
      throw new Error("Nenhum conteúdo de texto na resposta do Gemini");
    }

    console.log("[GEMINI] Content received, length:", content.length);
    console.log("[GEMINI] Content preview:", content.substring(0, 200));

    // Parse JSON from response - mais robusto
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("[GEMINI] Could not find JSON in response");
      console.error("[GEMINI] Full response:", content);
      throw new Error("Não foi possível extrair JSON da resposta. A imagem pode não conter uma tabela válida.");
    }

    try {
      const links = JSON.parse(jsonMatch[0]);
      console.log("[GEMINI] Successfully parsed JSON, found", links.length, "links");
      return links;
    } catch (parseErr) {
      console.error("[GEMINI] JSON parse error:", parseErr);
      throw new Error("Erro ao fazer parse do JSON extraído. Tente novamente.");
    }

  } catch (error) {
    console.error("[GEMINI] Error:", error);
    throw error;
  }
}
