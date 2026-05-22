import { useState, useRef } from "react";
import { ZeglamButton } from "@/components/ZeglamButton";
import { ZeglamGlassPanel } from "@/components/ZeglamGlassPanel";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ZeglamHeader } from "@/components/ZeglamHeader";
import { ZeglamPageShell } from "@/components/ZeglamPageShell";

const SUPPLIERS = [
  { value: "sp", label: "Fornecedor São Paulo" },
  { value: "limeira", label: "Fornecedor Limeira via motoboy" },
];

export default function ShipmentSubmit() {
  const [clientName, setClientName] = useState("");
  const [supplier, setSupplier] = useState("sp");
  const [galvanicaEnvio, setGalvanicaEnvio] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLimeira = supplier === "limeira";
  const isFormValid = clientName && supplier && file;

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 1920;
          if (width > height && width > maxDim) {
            height = (height * maxDim) / width;
            width = maxDim;
          } else if (height > maxDim) {
            width = (width * maxDim) / height;
            height = maxDim;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.8);
        };
      };
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 5MB");
      return;
    }
    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Selecione um arquivo válido (JPEG, PNG ou PDF)");
      return;
    }
    setFile(selectedFile);
    if (selectedFile.type.startsWith("image/")) {
      const compressed = await compressImage(selectedFile);
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(compressed);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const base64 = ev.target?.result as string;
          const response = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientName,
              galvanicaEnvio: isLimeira ? galvanicaEnvio : null,
              supplier,
              imageData: base64,
              fileName: file?.name,
            }),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Erro ao enviar comprovante");
          }
          toast.success("Comprovante enviado com sucesso!");
          setSubmitted(true);
          setClientName("");
          setSupplier("sp");
          setGalvanicaEnvio("");
          setFile(null);
          setPreview(null);
          setTimeout(() => {
            setSubmitted(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }, 2000);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Erro ao enviar");
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file!);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar");
      setLoading(false);
    }
  };

  return (
    <ZeglamPageShell>
      <ZeglamHeader
        title="Enviar comprovante"
        subtitle="Envie comprovantes de frete para processamento"
        badge="Fretes"
        backHref="/"
      />
      <main className="container flex-1 py-6 md:py-8">
        <div className="mx-auto max-w-2xl">
          {submitted ? (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="flex items-center gap-3 pt-6 text-emerald-400">
                <CheckCircle className="h-6 w-6 shrink-0" />
                <span>Comprovante enviado com sucesso!</span>
              </CardContent>
            </Card>
          ) : (
            <ZeglamGlassPanel delay={0.1} className="!p-0 overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="font-display text-lg">Formulário de envio</CardTitle>
                <CardDescription>
                  Preencha os dados e anexe o comprovante (JPEG, PNG ou PDF)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="zeglam-field-label">
                      Nome do cliente <span className="text-destructive">*</span>
                    </label>
                    <Input
                      placeholder="Digite o nome do cliente"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Deve corresponder ao nome do link no cronograma
                    </p>
                  </div>

                  <div>
                    <label className="zeglam-field-label">
                      Enviar para <span className="text-destructive">*</span>
                    </label>
                    <Select value={supplier} onValueChange={setSupplier}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o fornecedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPLIERS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {isLimeira && (
                    <div>
                      <label className="zeglam-field-label">Galvânica de envio</label>
                      <Input
                        placeholder="Nome da galvânica (opcional)"
                        value={galvanicaEnvio}
                        onChange={(e) => setGalvanicaEnvio(e.target.value)}
                      />
                    </div>
                  )}

                  <div>
                    <label className="zeglam-field-label">
                      Comprovante <span className="text-destructive">*</span>
                    </label>
                    <div
                      className="cursor-pointer rounded-xl border-2 border-dashed border-primary/25 bg-background/40 p-8 text-center transition-colors hover:border-primary/45 hover:bg-accent/30"
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Upload className="mx-auto mb-2 h-8 w-8 text-primary/70" />
                      <p className="text-sm text-foreground/90">
                        Clique ou arraste o arquivo aqui
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Máx. 5MB · JPEG, PNG ou PDF
                      </p>
                    </div>
                    {file && (
                      <p className="mt-2 text-sm text-emerald-400/90">
                        ✓ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  {preview && (
                    <div className="rounded-xl border border-border p-4">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
                      <img src={preview} alt="Preview" className="max-h-64 rounded-lg" />
                    </div>
                  )}

                  <Alert className="border-amber-500/25 bg-amber-500/8">
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    <AlertDescription className="text-amber-200/90">
                      Imagens são comprimidas automaticamente. PDFs mantêm o formato original.
                    </AlertDescription>
                  </Alert>

                  <ZeglamButton
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={!isFormValid}
                    loading={loading}
                  >
                    <Upload className="h-4 w-4" />
                    Enviar comprovante
                  </ZeglamButton>
                </form>
              </CardContent>
            </Card>
            </ZeglamGlassPanel>
          )}
        </div>
      </main>
    </ZeglamPageShell>
  );
}
