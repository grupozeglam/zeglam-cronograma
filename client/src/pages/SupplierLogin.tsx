import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ZeglamButton } from "@/components/ZeglamButton";
import { Input } from "@/components/ui/input";
import { Lock, User } from "lucide-react";
import { ZeglamAuthCard } from "@/components/ZeglamAuthCard";
import { ZeglamPageShell } from "@/components/ZeglamPageShell";
import { useLocation } from "wouter";

export function SupplierLogin() {
  const [, setLocation] = useLocation();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const loginMutation = trpc.shipments.suppliers.login.useMutation({
    onSuccess: () => {
      window.location.href = "/painelfornecedor";
    },
    onError: (err) => {
      setError(err.message || "Erro ao fazer login");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError("Preencha todos os campos");
      return;
    }
    loginMutation.mutate(credentials);
  };

  return (
    <ZeglamPageShell centered className="p-4">
      <ZeglamAuthCard
        title="Área do Fornecedor"
        description="Acesse para gerenciar seus comprovantes de frete"
        footer={
          <button
            type="button"
            className="mt-4 text-primary/90 underline-offset-2 hover:text-primary hover:underline"
            onClick={() => setLocation("/")}
          >
            Voltar ao cronograma público
          </button>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="zeglam-field-label">Usuário</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Digite seu usuário"
                value={credentials.username}
                onChange={(e) => {
                  setCredentials((prev) => ({ ...prev, username: e.target.value }));
                  setError("");
                }}
                className="pl-10"
                disabled={loginMutation.isPending}
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="zeglam-field-label">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Digite sua senha"
                value={credentials.password}
                onChange={(e) => {
                  setCredentials((prev) => ({ ...prev, password: e.target.value }));
                  setError("");
                }}
                className="pl-10"
                disabled={loginMutation.isPending}
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <ZeglamButton
            type="submit"
            size="lg"
            className="mt-2 w-full"
            loading={loginMutation.isPending}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Entrando..." : "Entrar"}
          </ZeglamButton>
        </form>
      </ZeglamAuthCard>
    </ZeglamPageShell>
  );
}
