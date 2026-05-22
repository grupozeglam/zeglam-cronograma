import { ZeglamButton } from "@/components/ZeglamButton";
import { Card, CardContent } from "@/components/ui/card";
import { Home, SearchX } from "lucide-react";
import { useLocation } from "wouter";
import { ZeglamPageShell } from "@/components/ZeglamPageShell";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <ZeglamPageShell centered className="p-4">
      <Card className="w-full max-w-lg border-primary/20 bg-card/90 shadow-2xl backdrop-blur-sm">
        <CardContent className="px-6 py-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/25">
            <SearchX className="h-8 w-8 text-primary" />
          </div>

          <p className="font-display text-5xl font-semibold gold-text">404</p>
          <h1 className="mt-2 font-display text-xl text-foreground">Página não encontrada</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            O endereço que você acessou não existe ou foi movido. Volte ao cronograma para
            continuar.
          </p>

          <ZeglamButton size="lg" onClick={() => setLocation("/")} className="mt-8">
            <Home className="h-4 w-4" />
            Ir para o cronograma
          </ZeglamButton>
        </CardContent>
      </Card>
    </ZeglamPageShell>
  );
}
