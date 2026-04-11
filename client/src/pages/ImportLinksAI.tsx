import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, ArrowLeft, Loader2, Check, AlertCircle, Save } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663391333985/kfJrCdZgsWRY3f9mLQkwBL/zeglam-logo_80654552.png";

const DEFAULT_PROMPT = `Você é um assistente que extrai dados de tabelas de links de e-commerce.
Extraia os seguintes dados de cada linha:
- Nome do Link (o texto principal da linha)
- Status: Retorne APENAS um destes 3 valores:
  * "Link Aberto" - se contém "Aberto", "Pronto", "Ativo"
  * "Envio Liberado" - se contém "Envio Liberado", "Liberado pra Envio", "Liberado"
  * "Fechado" - se contém "Fechado", "Encerrado", "Cancelado"
- Data de Encerramento (formato DD/MM/YYYY)

Retorne APENAS um JSON array com este formato:
[
  { "name": "NOME DO LINK", "status": "Link Aberto", "closingDate": "31/03/2026" },
  { "name": "OUTRO LINK", "status": "Envio Liberado", "closingDate": "30/03/2026" },
  { "name": "LINK FECHADO", "status": "Fechado", "closingDate": "28/03/2026" }
]

Se não conseguir extrair algum campo, use null.
IMPORTANTE: Retorne APENAS "Link Aberto", "Envio Liberado" ou "Fechado", nunca outros valores!`;

const DEFAULT_STATUS_MAPPING = `Pronto e Aberto=Link Aberto
Link Aberto=Link Aberto
Fechado=Fechado
Envio Liberado=Liberado pra Envio
Liberado=Liberado pra Envio`;

const DEFAULT_IGNORE_KEYWORDS = `TESTE
DEMO
EXEMPLO`;

export default function ImportLinksAI() {
  const [, setLocation] = useLocation();
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [savedApiKeys, setSavedApiKeys] = useState<Record<string, string>>({});
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [statusMapping, setStatusMapping] = useState(DEFAULT_STATUS_MAPPING);
  const [ignoreKeywords, setIgnoreKeywords] = useState(DEFAULT_IGNORE_KEYWORDS);
  const [loading, setLoading] = useState(false);
  const [extractedLinks, setExtractedLinks] = useState<any[]>([]);
  const [selectedLinks, setSelectedLinks] = useState<Set<number>>(new Set());

  // Carregar API Keys e Prompt salvos do localStorage
  useEffect(() => {
    const saved = localStorage.getItem("zeglam_api_keys");
    if (saved) {
      try {
        const keys = JSON.parse(saved);
        setSavedApiKeys(keys);
        if (keys[provider]) {
          setApiKey(keys[provider]);
        }
      } catch (e) {
        console.error("Erro ao carregar API Keys:", e);
      }
    }
    // Carregar prompt salvo
    const savedPrompt = localStorage.getItem("zeglam_ai_prompt");
    if (savedPrompt) setPrompt(savedPrompt);
  }, []);

  // Atualizar API Key quando o provider mudar
  useEffect(() => {
    if (savedApiKeys[provider]) {
      setApiKey(savedApiKeys[provider]);
    } else {
      setApiKey("");
    }
  }, [provider, savedApiKeys]);

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast.error("Insira uma API Key");
      return;
    }
    const updated = { ...savedApiKeys, [provider]: apiKey };
    localStorage.setItem("zeglam_api_keys", JSON.stringify(updated));
    setSavedApiKeys(updated);
    toast.success(`API Key do ${provider.toUpperCase()} salva com sucesso!`);
  };

  const handleSavePrompt = () => {
    localStorage.setItem("zeglam_ai_prompt", prompt);
    toast.success("Prompt salvo com sucesso!");
  };

  const handleResetPrompt = () => {
    setPrompt(DEFAULT_PROMPT);
    localStorage.removeItem("zeglam_ai_prompt");
    toast.success("Prompt restaurado para o padrão!");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    setImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleExtract = async () => {
    if (!image || !apiKey) {
      toast.error("Por favor, selecione uma imagem e insira sua API Key");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("apiKey", apiKey);
      formData.append("prompt", prompt);
      formData.append("provider", provider);

      const response = await fetch("/api/admin/extract-links", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Erro ao extrair dados");

      const data = await response.json();
      
      if (!Array.isArray(data.links)) {
        toast.error("Nenhum link foi extraído. Tente outra imagem.");
        return;
      }

      // Filter by ignore keywords
      const keywords = ignoreKeywords.split("\n").map(k => k.trim().toUpperCase()).filter(Boolean);
      const filtered = data.links.filter((link: any) => 
        !keywords.some(kw => link.name?.toUpperCase().includes(kw))
      );

      setExtractedLinks(filtered);
      setSelectedLinks(new Set(filtered.map((_: any, i: number) => i)));
      toast.success(`${filtered.length} links extraídos com sucesso`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao extrair links. Verifique sua API Key e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLinks = async () => {
    if (selectedLinks.size === 0) {
      toast.error("Selecione pelo menos um link");
      return;
    }

    setLoading(true);
    try {
      const linksToCreate = extractedLinks
        .filter((_, i) => selectedLinks.has(i))
        .map(link => {
          // Preservar o status original retornado pela IA
          const rawStatus = link.status || "Link Aberto";
          // Mapear observações baseado no status
          let observations = "Aberto para compras!";
          if (rawStatus === "Fechado" || rawStatus === "Encerrado") observations = "Fechado para compras!";
          else if (rawStatus === "Envio Liberado" || rawStatus === "Liberado pra Envio" || rawStatus === "Liberado") observations = "Envio liberado!";
          
          return {
            name: link.name,
            status: rawStatus,
            closingDate: link.closingDate,
            observations,
          };
        });

      const response = await fetch("/api/admin/create-links-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: linksToCreate }),
      });

      if (!response.ok) throw new Error("Erro ao criar links");

      const data = await response.json();
      toast.success(`${data.created} links criados com sucesso`);
      setTimeout(() => setLocation("/admin"), 1000);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar links");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0a1628 0%, #152340 100%)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "rgba(184,160,96,0.1)", background: "rgba(10,22,40,0.4)" }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Zeglam" className="h-8" />
            <h1 className="text-lg font-semibold" style={{ color: "#b8a060" }}>Importar Links via IA</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}
            className="text-xs gap-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            <ArrowLeft className="w-3 h-3" /> Voltar
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna 1: Upload e Configuração */}
          <div className="lg:col-span-1 space-y-6">
            {/* Provider Selection */}
            <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(184,160,96,0.1)" }}>
              <label className="block text-sm font-medium mb-2" style={{ color: "#b8a060" }}>
                Provedor de IA
              </label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="bg-transparent border" style={{ borderColor: "rgba(184,160,96,0.2)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (GPT-4 Vision)</SelectItem>
                  <SelectItem value="gemini">Google Gemini (Grátis)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                {provider === "openai" 
                  ? "Use sua chave OpenAI (paga)" 
                  : "Use sua chave Gemini (grátis em generativelanguage.googleapis.com)"}
              </p>
            </div>

            {/* API Key Input */}
            <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(184,160,96,0.1)" }}>
              <label className="block text-sm font-medium mb-2" style={{ color: "#b8a060" }}>
                API Key {provider.toUpperCase()}
              </label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Cole sua chave ${provider.toUpperCase()}`}
                className="bg-transparent border mb-2"
                style={{ borderColor: "rgba(184,160,96,0.2)" }}
              />
              <Button 
                onClick={handleSaveApiKey}
                size="sm"
                className="w-full gap-2"
                style={{ background: "#b8a060", color: "#0a1628" }}
              >
                <Save className="w-4 h-4" /> Salvar Chave
              </Button>
              {savedApiKeys[provider] && (
                <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "#22c55e" }}>
                  <Check className="w-3 h-3" /> Chave salva no navegador
                </p>
              )}
            </div>

            {/* Image Upload */}
            <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(184,160,96,0.1)" }}>
              <label className="block text-sm font-medium mb-2" style={{ color: "#b8a060" }}>
                Imagem da Tabela
              </label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition"
                style={{ borderColor: "rgba(184,160,96,0.3)" }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    const input = document.createElement("input");
                    input.type = "file";
                    Object.defineProperty(input, "files", { value: e.dataTransfer.files });
                    handleImageUpload({ target: input } as any);
                  }
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-input"
                />
                <label htmlFor="image-input" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: "#b8a060" }} />
                  <p className="text-sm" style={{ color: "#b8a060" }}>
                    {image ? image.name : "Clique ou arraste uma imagem"}
                  </p>
                </label>
              </div>
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="mt-4 rounded-lg max-h-48 w-full object-cover" />
              )}
            </div>

            {/* Extract Button */}
            <Button
              onClick={handleExtract}
              disabled={loading || !image || !apiKey}
              className="w-full gap-2"
              style={{ background: "#b8a060", color: "#0a1628" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {loading ? "Extraindo..." : "Extrair Links"}
            </Button>
          </div>

          {/* Coluna 2: Configurações do Prompt */}
          <div className="lg:col-span-2 space-y-6">
            {/* Prompt */}
            <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(184,160,96,0.1)" }}>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium" style={{ color: "#b8a060" }}>
                  Prompt de Extração
                </label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleResetPrompt}
                    className="text-xs h-7 px-2" style={{ borderColor: "rgba(184,160,96,0.3)", color: "rgba(255,255,255,0.5)" }}>
                    Restaurar Padrão
                  </Button>
                  <Button size="sm" onClick={handleSavePrompt}
                    className="text-xs h-7 px-2" style={{ background: "#b8a060", color: "#0a0a0f" }}>
                    <Save className="w-3 h-3 mr-1" /> Salvar Prompt
                  </Button>
                </div>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="bg-transparent border text-xs"
                style={{ borderColor: "rgba(184,160,96,0.2)", minHeight: "150px" }}
              />
              <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                ⚠️ Certifique-se de que o prompt pede para extrair "closingDate" no formato DD/MM/YYYY
              </p>
            </div>

            {/* Ignore Keywords */}
            <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(184,160,96,0.1)" }}>
              <label className="block text-sm font-medium mb-2" style={{ color: "#b8a060" }}>
                Palavras-chave para Ignorar (uma por linha)
              </label>
              <Textarea
                value={ignoreKeywords}
                onChange={(e) => setIgnoreKeywords(e.target.value)}
                className="bg-transparent border text-xs"
                style={{ borderColor: "rgba(184,160,96,0.2)", minHeight: "100px" }}
              />
            </div>

            {/* Links Extraídos */}
            {extractedLinks.length > 0 && (
              <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(184,160,96,0.1)" }}>
                <label className="block text-sm font-medium mb-3" style={{ color: "#b8a060" }}>
                  Links Extraídos ({selectedLinks.size}/{extractedLinks.length})
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {extractedLinks.map((link, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 rounded" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <input
                        type="checkbox"
                        checked={selectedLinks.has(i)}
                        onChange={(e) => {
                          const newSet = new Set(selectedLinks);
                          if (e.target.checked) newSet.add(i);
                          else newSet.delete(i);
                          setSelectedLinks(newSet);
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1 text-sm">
                        <p className="font-medium">{link.name}</p>
                        <p style={{ color: "rgba(255,255,255,0.6)" }}>
                          Status: {link.status} | Data: {link.closingDate || "N/A"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleCreateLinks}
                  disabled={loading || selectedLinks.size === 0}
                  className="w-full mt-4 gap-2"
                  style={{ background: "#22c55e", color: "#fff" }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {loading ? "Criando..." : `Criar ${selectedLinks.size} Link(s)`}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
