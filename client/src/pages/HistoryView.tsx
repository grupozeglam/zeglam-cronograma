import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

const LOGO_URL = "https://cdn.grupozeglam.click/logo.png";

const PAGE_SIZE = 50;

export default function HistoryView() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(0);
  
  // Placeholder: History functionality will be implemented with proper tRPC routes
  const historyData: any[] = [];
  const isLoading = false;
  const totalCount = 0;
  
  const totalPages = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 0;

  return (
    <div className="min-h-screen" style={{ background: "#0f1e38" }}>
      {/* Header */}
      <header style={{ background: "linear-gradient(180deg,#0a1628 0%,#0f1e38 100%)", borderBottom: "1px solid rgba(184,160,96,0.25)" }}>
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={LOGO_URL} alt="Grupo Zeglam" className="h-12 w-auto" />
              <div className="hidden sm:block h-8 w-px" style={{ background: "rgba(184,160,96,0.3)" }} />
              <div className="hidden sm:block">
                <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "#b8a060" }}>Histórico</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Auto-fechamentos</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLocation('/admin')}
              className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              ← Voltar
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(184,160,96,0.15)" }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "rgba(10,22,40,0.8)", borderBottom: "1px solid rgba(184,160,96,0.15)" }}>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Link</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Horário Programado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Data de Fechamento</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Carregando...
                    </td>
                  </tr>
                ) : historyData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Nenhum fechamento automático registrado
                    </td>
                  </tr>
                ) : (
                  historyData.map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid rgba(184,160,96,0.1)" }}>
                      <td className="px-4 py-3 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{item.id}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{item.linkNome}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{item.scheduledCloseTime}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{new Date(item.closedAt).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: "1px solid rgba(184,160,96,0.15)", background: "rgba(10,22,40,0.5)" }}>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Página {page + 1} de {totalPages}</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="w-7 h-7"
                  style={{ borderColor: "rgba(184,160,96,0.3)", color: "rgba(255,255,255,0.6)", background: "transparent" }}
                  onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = page <= 2 ? i : page + i - 2;
                  if (p < 0 || p >= totalPages) return null;
                  return (
                    <Button key={p} size="icon" className="w-7 h-7 text-xs"
                      style={p === page
                        ? { background: "linear-gradient(135deg,#c9a84c,#b8a060)", color: "#0a1628", border: "none" }
                        : { borderColor: "rgba(184,160,96,0.3)", color: "rgba(255,255,255,0.6)", background: "transparent", border: "1px solid rgba(184,160,96,0.3)" }}
                      onClick={() => setPage(p)}>{p + 1}</Button>
                  );
                })}
                <Button variant="outline" size="icon" className="w-7 h-7"
                  style={{ borderColor: "rgba(184,160,96,0.3)", color: "rgba(255,255,255,0.6)", background: "transparent" }}
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
