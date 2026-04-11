import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, AlertCircle, CheckCircle, ChevronLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

const SUPPLIERS = [
  { value: 'sp', label: 'Fornecedor São Paulo' },
  { value: 'limeira', label: 'Fornecedor Limeira via motoboy' },
];

export default function ShipmentSubmit() {
  const [, setLocation] = useLocation();
  const [clientName, setClientName] = useState('');
  const [supplier, setSupplier] = useState('sp');
  const [galvanicaEnvio, setGalvanicaEnvio] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLimeira = supplier === 'limeira';
  const isFormValid = clientName && supplier && file;

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
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
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              resolve(blob || file);
            },
            'image/jpeg',
            0.8
          );
        };
      };
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 5MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Selecione um arquivo válido (JPEG, PNG ou PDF)');
      return;
    }

    try {
      if (selectedFile.type.startsWith('image/')) {
        const compressed = await compressImage(selectedFile);
        const compressedFile = new File([compressed], selectedFile.name, { type: 'image/jpeg' });
        setFile(compressedFile);

        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(compressedFile);
      } else {
        setFile(selectedFile);
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(selectedFile);
      }
    } catch (error) {
      toast.error('Erro ao processar arquivo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string;

          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            throw new Error(errorData.error || 'Erro ao enviar comprovante');
          }

          toast.success('Comprovante enviado com sucesso!');
          setSubmitted(true);
          setClientName('');
          setSupplier('sp');
          setGalvanicaEnvio('');
          setFile(null);
          setPreview(null);

          setTimeout(() => {
            setSubmitted(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }, 2000);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Erro ao enviar');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file!);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center gap-3">
          <Button onClick={() => setLocation('/')} variant="ghost" className="text-slate-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Enviar Comprovante de Frete</h1>
            <p className="text-slate-400">Envie seus comprovantes de frete para processamento</p>
          </div>
        </div>

        {submitted ? (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-green-400">
                <CheckCircle className="w-6 h-6" />
                <span>Comprovante enviado com sucesso!</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle>Formulário de Envio</CardTitle>
              <CardDescription>Preencha os dados e selecione o arquivo do comprovante</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Nome do Cliente <span className="text-red-400">*</span>
                  </label>
                  <Input
                    placeholder="Digite o nome do cliente"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <p className="text-xs text-slate-400 mt-1">Deve corresponder ao nome do link no sistema</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Enviar para <span className="text-red-400">*</span>
                  </label>
                  <Select value={supplier} onValueChange={setSupplier}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Selecione o fornecedor" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {SUPPLIERS.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="text-white">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isLimeira && (
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Galvânica de Envio
                    </label>
                    <Input
                      placeholder="Digite o nome da galvânica"
                      value={galvanicaEnvio}
                      onChange={(e) => setGalvanicaEnvio(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    <p className="text-xs text-slate-400 mt-1">Opcional</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Comprovante de Frete <span className="text-red-400">*</span>
                  </label>
                  <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-slate-500 transition">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div onClick={() => fileInputRef.current?.click()} className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-slate-400" />
                      <p className="text-slate-300">Clique para selecionar ou arraste o arquivo</p>
                      <p className="text-xs text-slate-500">Máximo 5MB • Formatos: JPEG, PNG, PDF</p>
                    </div>
                  </div>
                  {file && (
                    <p className="text-sm text-green-400 mt-2">✓ {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)</p>
                  )}
                </div>

                {preview && (
                  <div className="border border-slate-600 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-2">Preview:</p>
                    {file?.type === 'application/pdf' ? (
                      <div className="text-slate-400 text-center py-8">
                        <p>📄 Arquivo PDF selecionado</p>
                        <p className="text-xs mt-2">{file.name}</p>
                      </div>
                    ) : (
                      <img src={preview} alt="Preview" className="max-h-64 rounded" />
                    )}
                  </div>
                )}

                <Alert className="bg-amber-500/10 border-amber-500/20">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-amber-400">
                    Imagens serão comprimidas automaticamente antes do envio. PDFs serão mantidos no formato original.
                  </AlertDescription>
                </Alert>

                <Button
                  type="submit"
                  disabled={!isFormValid || loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Enviar Comprovante
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
