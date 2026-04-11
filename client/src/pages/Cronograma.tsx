import React, { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { StatusBadge, ALL_STATUSES } from "@/components/StatusBadge";
import { EditableCell } from "@/components/EditableCell";
import { DateCell } from "@/components/DateCell";
import { LinkModal, LinkFormData } from "@/components/LinkModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Search, Filter, Trash2, ChevronLeft, ChevronRight, RefreshCw, ArrowUpDown, LayoutGrid } from "lucide-react";

const DEPARTAMENTOS = ["Setor de Envios", "Financeiro", "Fornecedor", "Grupo Conecta", "Separação", "Correio"];
const PAGE_SIZE = 50;
const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663391333985/kfJrCdZgsWRY3f9mLQkwBL/zeglam-logo_80654552.png";

type SortDir = "asc" | "desc";

// ─── Business days utility ───────────────────────────────────────────────────
function addBusinessDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  let d = new Date(Date.UTC(year, month - 1, day));
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d.toISOString().split('T')[0];
}

function calcDatesFromRomaneio(romaneioStr: string): { inicio: string; prazo: string } {
  const inicio = addBusinessDays(romaneioStr, 2);
  const prazo  = addBusinessDays(inicio, 15);
  return { inicio, prazo };
}

export default function Cronograma() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("numero");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading, isFetching } = trpc.links.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    departamento: deptFilter !== "all" ? deptFilter : undefined,
    page,
    pageSize: PAGE_SIZE,
    sortBy,
    sortDir,
  }, { keepPreviousData: true } as any);

  const { data: statsData } = trpc.links.stats.useQuery();

  const updateMutation = trpc.links.update.useMutation({
    onSuccess: () => {
      utils.links.list.invalidate();
      utils.links.stats.invalidate();
      toast.success("Registro atualizado", { style: { background: "#1a3a6b", color: "#f0e8d0", border: "1px solid #b8a060" } });
    },
    onError: () => toast.error("Erro ao atualizar registro"),
  });

  const createMutation = trpc.links.create.useMutation({
    onSuccess: () => {
      utils.links.list.invalidate();
      utils.links.stats.invalidate();
      setModalOpen(false);
      toast.success("Link adicionado com sucesso", { style: { background: "#1a3a6b", color: "#f0e8d0", border: "1px solid #b8a060" } });
    },
    onError: () => toast.error("Erro ao adicionar link"),
  });

  const deleteMutation = trpc.links.delete.useMutation({
    onSuccess: () => {
      utils.links.list.invalidate();
      utils.links.stats.invalidate();
      setDeleteId(null);
      toast.success("Registro excluído");
    },
    onError: () => toast.error("Erro ao excluir registro"),
  });

  const seedMutation = trpc.links.seed.useMutation({
    onSuccess: (res) => {
      utils.links.list.invalidate();
      utils.links.stats.invalidate();
      if (res.skipped) toast.info("Dados já importados anteriormente");
      else toast.success(`${(res as any).inserted ?? 0} registros importados da planilha`);
    },
  });

  const handleCellUpdate = useCallback((id: number, field: string, value: string) => {
    if (field === "romaneiosClientes" && value) {
      const { inicio, prazo } = calcDatesFromRomaneio(value);
      updateMutation.mutate({ id, data: {
        romaneiosClientes: value,
        dataInicioSeparacao: inicio,
        prazoMaxFinalizar: prazo,
      }});
      return;
    }
    updateMutation.mutate({ id, data: { [field]: value || null } });
  }, [updateMutation]);

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
    setPage(1);
  };

  const handleCreate = (data: LinkFormData) => {
    createMutation.mutate({
      ...data,
      observacoes: data.observacoes || null,
      encerramentoLink: data.encerramentoLink || null,
      conferenciaEstoque: data.conferenciaEstoque || null,
      romaneiosClientes: data.romaneiosClientes || null,
      postadoFornecedor: data.postadoFornecedor || null,
      dataInicioSeparacao: data.dataInicioSeparacao || null,
      prazoMaxFinalizar: data.prazoMaxFinalizar || null,
      liberadoEnvio: data.liberadoEnvio || null,
    });
  };

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const statusStats = useMemo(() => {
    const stats: Record<string, number> = {};
    statsData?.statusStats?.forEach(s => { stats[s.status] = s.count; });
    return stats;
  }, [statsData]);

  const SortIcon = ({ col }: { col: string }) => (
    <ArrowUpDown className={`w-3 h-3 ml-1 inline-block transition-opacity ${sortBy === col ? "opacity-100" : "opacity-25"}`} style={{ color: sortBy === col ? "#b8a060" : undefined }} />
  );

  const thClass = "px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none transition-colors";
  const tdClass = "px-3 py-2 border-b border-white/5";

  const statCards = [
    { label: "Total de Links", value: statsData?.total ?? 0, color: "#b8a060", bg: "rgba(184,160,96,0.12)" },
    { label: "Concluídas", value: statusStats["Concluída"] ?? 0, color: "#4ade80", bg: "rgba(74,222,128,0.10)" },
    { label: "Em Separação", value: statusStats["Em Separação"] ?? 0, color: "#60a5fa", bg: "rgba(96,165,250,0.10)" },
    { label: "Em Trânsito", value: statusStats["Em trânsito"] ?? 0, color: "#b8a060", bg: "rgba(184,160,96,0.10)" },
    { label: "Link Aberto", value: statusStats["Link Aberto"] ?? 0, color: "#a78bfa", bg: "rgba(167,139,250,0.10)" },
    { label: "Verificando", value: statusStats["Verificando Estoque"] ?? 0, color: "#f472b6", bg: "rgba(244,114,182,0.10)" },
    { label: "Cancelados", value: (statusStats["Cancelado"] ?? 0) + (statusStats["cancelado"] ?? 0), color: "#f87171", bg: "rgba(248,113,113,0.10)" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0f1e38" }}>
      {/* Top Header */}
      <header style={{ background: "linear-gradient(180deg, #0a1628 0%, #0f1e38 100%)", borderBottom: "1px solid rgba(184,160,96,0.25)" }}>
        <div className="container">
          <div className="flex items-center justify-between py-3">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <img
                src={LOGO_URL}
                alt="Grupo Zeglam"
                className="h-12 w-auto object-contain"
              />
              <div className="hidden sm:block h-8 w-px" style={{ background: "rgba(184,160,96,0.3)" }} />
              <div className="hidden sm:block">
                <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "#b8a060" }}>Cronograma</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Gestão de Links</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="text-xs gap-1.5 hidden sm:flex"
                style={{ borderColor: "rgba(184,160,96,0.3)", color: "rgba(255,255,255,0.6)", background: "transparent" }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${seedMutation.isPending ? "animate-spin" : ""}`} />
                Reimportar Planilha
              </Button>
              <Button
                size="sm"
                onClick={() => setModalOpen(true)}
                className="gap-1.5 font-semibold"
                style={{ background: "linear-gradient(135deg, #c9a84c, #b8a060)", color: "#0a1628", border: "none" }}
              >
                <Plus className="w-4 h-4" />
                Novo Link
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-6 space-y-5">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {statCards.map(({ label, value, color, bg }) => (
            <div
              key={label}
              className="rounded-xl p-3 text-center"
              style={{ background: bg, border: `1px solid ${color}30` }}
            >
              <div className="text-2xl font-bold" style={{ color }}>{value}</div>
              <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filters Bar */}
        <div
          className="rounded-xl p-3 flex flex-wrap gap-3 items-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(184,160,96,0.15)" }}
        >
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#b8a060" }} />
            <Input
              placeholder="Buscar por nome do link..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 text-sm"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
            />
          </div>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger
              className="w-[175px] text-sm"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
            >
              <Filter className="w-3.5 h-3.5 mr-1.5" style={{ color: "#b8a060" }} />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.25)" }}>
              <SelectItem value="all" className="text-white focus:bg-white/10">Todos os Status</SelectItem>
              {ALL_STATUSES.map(s => (
                <SelectItem key={s} value={s} className="text-white focus:bg-white/10">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setPage(1); }}>
            <SelectTrigger
              className="w-[175px] text-sm"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1.5" style={{ color: "#b8a060" }} />
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.25)" }}>
              <SelectItem value="all" className="text-white focus:bg-white/10">Todos os Depto.</SelectItem>
              {DEPARTAMENTOS.map(d => (
                <SelectItem key={d} value={d} className="text-white focus:bg-white/10">{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || statusFilter !== "all" || deptFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(""); setStatusFilter("all"); setDeptFilter("all"); setPage(1); }}
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Limpar filtros ×
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            {isFetching && !isLoading && (
              <span className="flex items-center gap-1" style={{ color: "#b8a060" }}>
                <RefreshCw className="w-3 h-3 animate-spin" /> Atualizando...
              </span>
            )}
            <span><strong style={{ color: "rgba(255,255,255,0.7)" }}>{data?.total ?? 0}</strong> registros</span>
          </div>
        </div>

        {/* Table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(184,160,96,0.2)", background: "rgba(255,255,255,0.02)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px]">
              <thead>
                <tr style={{ background: "rgba(10,22,40,0.8)", borderBottom: "1px solid rgba(184,160,96,0.25)" }}>
                  {[
                    { label: "N°", col: "numero", w: "w-16" },
                    { label: "Nome do Link", col: "nome", w: "min-w-[200px]" },
                    { label: "Status", col: "status", w: "w-36" },
                    { label: "Departamento", col: null, w: "w-36" },
                    { label: "Observações", col: null, w: "min-w-[140px]" },
                    { label: "Encerramento", col: null, w: "w-28" },
                    { label: "Conf. Estoque", col: null, w: "w-28" },
                    { label: "Romaneios", col: null, w: "w-28" },
                    { label: "Post. Forn.", col: null, w: "w-28" },
                    { label: "Início Sep.", col: null, w: "w-28" },
                    { label: "Prazo Máx.", col: "prazoMaxFinalizar", w: "w-28" },
                    { label: "Lib. Envio", col: null, w: "w-28" },
                    { label: "", col: null, w: "w-12" },
                  ].map(({ label, col, w }) => (
                    <th
                      key={label || "actions"}
                      className={`${thClass} ${w}`}
                      style={{ color: "rgba(184,160,96,0.8)" }}
                      onClick={col ? () => handleSort(col) : undefined}
                    >
                      {label}{col && <SortIcon col={col} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      {Array.from({ length: 13 }).map((_, j) => (
                        <td key={j} className="px-3 py-2.5">
                          <div className="h-4 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data?.data.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <Search className="w-10 h-10" style={{ color: "rgba(184,160,96,0.3)" }} />
                        <p style={{ color: "rgba(255,255,255,0.4)" }}>Nenhum registro encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data?.data.map((link, idx) => (
                    <tr
                      key={link.id}
                      className="group transition-colors"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(184,160,96,0.05)")}
                      onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)")}
                    >
                      <td className={tdClass}>
                        <span className="font-mono text-xs" style={{ color: "rgba(184,160,96,0.7)" }}>#{link.numero}</span>
                      </td>
                      <td className={tdClass}>
                        <EditableCell
                          value={link.nome}
                          onSave={(v) => handleCellUpdate(link.id, "nome", v)}
                          placeholder="Nome do link"
                        />
                      </td>
                      <td className={tdClass}>
                        <div className="space-y-1">
                          <EditableCell
                            value={link.status}
                            onSave={(v) => handleCellUpdate(link.id, "status", v)}
                            type="select"
                            options={ALL_STATUSES}
                          />
                          <StatusBadge status={link.status} />
                        </div>
                      </td>
                      <td className={tdClass}>
                        <EditableCell
                          value={link.departamento}
                          onSave={(v) => handleCellUpdate(link.id, "departamento", v)}
                          type="select"
                          options={DEPARTAMENTOS}
                        />
                      </td>
                      <td className={tdClass}>
                        <EditableCell
                          value={link.observacoes}
                          onSave={(v) => handleCellUpdate(link.id, "observacoes", v)}
                          placeholder="Observações"
                        />
                      </td>
                      <td className={tdClass}>
                        <EditableCell
                          value={link.encerramentoLink}
                          onSave={(v) => handleCellUpdate(link.id, "encerramentoLink", v)}
                          type="date"
                        />
                        <DateCell value={link.encerramentoLink} />
                      </td>
                      <td className={tdClass}>
                        <EditableCell
                          value={link.conferenciaEstoque}
                          onSave={(v) => handleCellUpdate(link.id, "conferenciaEstoque", v)}
                          type="date"
                        />
                        <DateCell value={link.conferenciaEstoque} />
                      </td>
                      <td className={tdClass}>
                        <EditableCell
                          value={link.romaneiosClientes}
                          onSave={(v) => handleCellUpdate(link.id, "romaneiosClientes", v)}
                          type="date"
                        />
                        <DateCell value={link.romaneiosClientes} />
                      </td>
                      <td className={tdClass}>
                        <EditableCell
                          value={link.postadoFornecedor}
                          onSave={(v) => handleCellUpdate(link.id, "postadoFornecedor", v)}
                          type="date"
                        />
                        <DateCell value={link.postadoFornecedor} />
                      </td>
                      <td className={tdClass}>
                        <EditableCell
                          value={link.dataInicioSeparacao}
                          onSave={(v) => handleCellUpdate(link.id, "dataInicioSeparacao", v)}
                          type="date"
                        />
                        <DateCell value={link.dataInicioSeparacao} />
                      </td>
                      <td className={tdClass}>
                        <EditableCell
                          value={link.prazoMaxFinalizar}
                          onSave={(v) => handleCellUpdate(link.id, "prazoMaxFinalizar", v)}
                          type="date"
                        />
                        <DateCell value={link.prazoMaxFinalizar} isDeadline />
                      </td>
                      <td className={tdClass}>
                        <EditableCell
                          value={link.liberadoEnvio}
                          onSave={(v) => handleCellUpdate(link.id, "liberadoEnvio", v)}
                          type="date"
                        />
                        <DateCell value={link.liberadoEnvio} />
                      </td>
                      <td className={`${tdClass} text-center`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: "#f87171" }}
                          onClick={() => setDeleteId(link.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: "1px solid rgba(184,160,96,0.15)", background: "rgba(10,22,40,0.5)" }}
            >
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                Página {page} de {totalPages} — {data?.total} registros
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="icon" className="w-7 h-7"
                  style={{ borderColor: "rgba(184,160,96,0.3)", color: "rgba(255,255,255,0.6)", background: "transparent" }}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page + i - 2;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <Button
                      key={p} size="icon" className="w-7 h-7 text-xs font-medium"
                      style={p === page
                        ? { background: "linear-gradient(135deg, #c9a84c, #b8a060)", color: "#0a1628", border: "none" }
                        : { borderColor: "rgba(184,160,96,0.3)", color: "rgba(255,255,255,0.6)", background: "transparent", border: "1px solid rgba(184,160,96,0.3)" }
                      }
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
                <Button
                  variant="outline" size="icon" className="w-7 h-7"
                  style={{ borderColor: "rgba(184,160,96,0.3)", color: "rgba(255,255,255,0.6)", background: "transparent" }}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-2">
          <p className="text-xs" style={{ color: "rgba(184,160,96,0.4)" }}>
            Grupo Zeglam — Sistema de Gestão de Cronograma
          </p>
        </div>
      </div>

      {/* Add Modal */}
      <LinkModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        mode="create"
        loading={createMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.3)", color: "white" }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: "white" }}>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription style={{ color: "rgba(255,255,255,0.55)" }}>
              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              style={{ background: "#dc2626", color: "white", border: "none" }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
