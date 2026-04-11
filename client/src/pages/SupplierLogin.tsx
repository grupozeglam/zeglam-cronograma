import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Lock, User } from "lucide-react";

export function SupplierLogin() {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");

  const loginMutation = trpc.shipments.suppliers.login.useMutation({
    onSuccess: () => {
      window.location.href = "/painelfornecedor";
    },
    onError: (error) => {
      setError(error.message || "Erro ao fazer login");
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800">
        <CardContent className="pt-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Usuário */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Usuário
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Digite seu usuário"
                  value={credentials.username}
                  onChange={(e) => {
                    setCredentials(prev => ({ ...prev, username: e.target.value }));
                    setError("");
                  }}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  disabled={loginMutation.isPending}
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  type="password"
                  placeholder="Digite sua senha"
                  value={credentials.password}
                  onChange={(e) => {
                    setCredentials(prev => ({ ...prev, password: e.target.value }));
                    setError("");
                  }}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  disabled={loginMutation.isPending}
                />
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="p-3 bg-red-900/20 border border-red-700 rounded-md">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Botão */}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 mt-6"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Fazer Login"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
