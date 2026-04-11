import { ENV } from "../_core/env";

/**
 * Sends a WhatsApp message via Evolution API.
 * Set these env vars to enable:
 *   EVOLUTION_API_URL   = https://sua-evolution-api.com
 *   EVOLUTION_API_KEY   = sua-chave
 *   EVOLUTION_INSTANCE  = nome-da-instancia
 *   WHATSAPP_ADMIN_NUMBER = 5511999999999  (ou lista separada por vírgula)
 */
export async function sendWhatsApp(message: string): Promise<void> {
  const { evolutionApiUrl, evolutionApiKey, evolutionInstance, whatsappAdminNumber } = ENV;

  if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstance || !whatsappAdminNumber) {
    console.log("[WHATSAPP] Não configurado — pulando notificação.");
    return;
  }

  const numbers = whatsappAdminNumber.split(",").map(n => n.trim()).filter(Boolean);

  for (const number of numbers) {
    try {
      const res = await fetch(`${evolutionApiUrl}/message/sendText/${evolutionInstance}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": evolutionApiKey,
        },
        body: JSON.stringify({
          number,
          text: message,
        }),
      });

      if (res.ok) {
        console.log(`[WHATSAPP] Mensagem enviada para ${number}`);
      } else {
        const err = await res.text();
        console.error(`[WHATSAPP] Erro ao enviar para ${number}:`, err);
      }
    } catch (err) {
      console.error(`[WHATSAPP] Falha ao enviar para ${number}:`, err);
    }
  }
}

/**
 * Notifica sobre links que foram fechados automaticamente.
 */
export async function notifyLinksAutoFechados(closedLinks: { nome: string; horario: string }[]): Promise<void> {
  if (closedLinks.length === 0) return;

  const lines = closedLinks.map(l => `  • ${l.nome} (${l.horario})`).join("\n");
  const message =
    `🔒 *Auto-fechamento de Links — Zeglam*\n\n` +
    `${closedLinks.length} link(s) fechado(s) automaticamente:\n` +
    `${lines}\n\n` +
    `Acesse o painel para mais detalhes.`;

  await sendWhatsApp(message);
}

/**
 * Notifica sobre links com prazo vencendo hoje ou amanhã.
 */
export async function notifyPrazosVencendo(links: { nome: string; prazo: string; diff: number }[]): Promise<void> {
  if (links.length === 0) return;

  const lines = links.map(l => {
    const label = l.diff === 0 ? "HOJE" : l.diff < 0 ? `VENCIDO há ${Math.abs(l.diff)}d` : `${l.diff}d restante(s)`;
    return `  • ${l.nome} — ${l.prazo} (${label})`;
  }).join("\n");

  const message =
    `⚠️ *Prazos em Atenção — Zeglam*\n\n` +
    `${links.length} link(s) com prazo próximo:\n` +
    `${lines}\n\n` +
    `Verifique o cronograma.`;

  await sendWhatsApp(message);
}
