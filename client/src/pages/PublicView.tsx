import { useState, useEffect, useMemo } from "react";
import { StatusBadge, STATUS_DEFAULTS } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, LayoutGrid, ChevronLeft, ChevronRight, ArrowUpDown, Plus, LogOut, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ShipmentSubmit from "./ShipmentSubmit";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663391333985/kfJrCdZgsWRY3f9mLQkwBL/zeglam-logo_80654552.png";
const PAGE_SIZE = 50;

function formatDate(val: string | null | undefined) {
  if (!val) return null;
  const d = new Date(val + "T12:00:00");
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("pt-BR");
}

function getDateStyle(val: string | null | undefined, isDeadline = false) {
  if (!val) return null;
  const d = new Date(val + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (isDeadline) {
    if (diff < 0) return { color: "#f87171", bg: "rgba(248,113,113,0.12)", label: "Vencido" };
    if (diff <= 3) return { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", label: `${diff}d` };
    return { color: "#4ade80", bg: "rgba(74,222,128,0.10)", label: null };
  }
  return { color: "rgba(255,255,255,0.65)", bg: "transparent", label: null };
}

type SortDir = "asc" | "desc";

export default function PublicView() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("numero");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const [allLinks, setAllLinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showShipmentModal, setShowShipmentModal] = useState(false);

  useEffect(() => {
    // Default to cards on mobile
    if (window.innerWidth < 768) setViewMode("cards");
  }, []);

  useEffect(() => {
    const loadLinks = () => {
      fetch('/api/links/list')
        .then(r => r.json())
        .then(links => {
          const filtered = links.filter((link: any) => link.status !== "Concluída");
          setAllLinks(filtered);
        })
        .catch(() => {});
    };
    loadLinks();
    const interval = setInterval(loadLinks, 30000);
    return () => clearInterval(interval);
  }, []);

  const data = useMemo(() => {
    let filtered = allLinks;
    if (statusFilter === "all") {
      filtered = filtered.filter(l => l.status !== "Finalizado");
    } else {
      filtered = filtered.filter(l => l.status === statusFilter);
    }
    if (deptFilter !== "all") filtered = filtered.filter(l => l.departamento === deptFilter);
    if (search.trim()) filtered = filtered.filter(l => l.nome.toLowerCase().includes(search.toLowerCase()));
    // Ordenação customizada para a página pública:
    // 1. "Link Aberto" no topo (prioridade 1)
    // 2. Demais status no meio (prioridade 500)
    // 3. "Liberado pra Envio" por último (prioridade 999)
    const getStatusPriority = (status: string): number => {
      if (status === "Link Aberto") return 1;
      if (status === "Liberado pra Envio") return 999;
      return 500;
    };
    
    filtered = [...filtered].sort((a, b) => {
      // Primeiro, ordena por prioridade de status
      const priorityA = getStatusPriority(a.status);
      const priorityB = getStatusPriority(b.status);
      if (priorityA !== priorityB) return priorityA - priorityB;
      
      // Dentro da mesma prioridade, ordena pelo campo selecionado
      const av = a[sortBy] ?? ""; const bv = b[sortBy] ?? "";
      const cmp = String(av).localeCompare(String(bv), "pt-BR", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return { data: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: filtered.length };
  }, [allLinks, statusFilter, deptFilter, search, sortBy, sortDir, page]);

  const [statsData, setStatsData] = useState<any>(null);
  const [statusesData, setStatusesData] = useState<any>(null);
  const [deptsData, setDeptsData] = useState<any>(null);
  const [visibleCols, setVisibleCols] = useState({
    encerramentoLink: true, conferenciaEstoque: true, romaneiosClientes: true,
    postadoFornecedor: true, dataInicioSeparacao: true, liberadoEnvio: true,
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/links/stats').then(r => r.json()),
      fetch('/api/statuses/list?onlyActive=true').then(r => r.json()),
      fetch('/api/departments/list?onlyActive=true').then(r => r.json()),
      fetch('/api/column-settings').then(r => r.json()),
    ]).then(([stats, statuses, depts, colSettings]) => {
      setStatsData(stats); setStatusesData(statuses); setDeptsData(depts); setVisibleCols(colSettings);
    });
  }, []);

  const statusMap = useMemo(() => {
    const m: Record<string, { color: string; bgColor: string }> = { ...STATUS_DEFAULTS };
    if (Array.isArray(statusesData)) {
      statusesData.forEach((s: any) => { m[s.name] = { color: s.color, bgColor: s.bgColor }; });
    }
    return m;
  }, [statusesData]);

  const statCards = useMemo(() => {
    const stats: Record<string, number> = {};
    if (Array.isArray(statsData?.statusStats)) {
      statsData.statusStats.forEach((s: any) => { stats[s.status] = s.count; });
    }
    return [
      { label: "Total", value: statsData?.total ?? 0, color: "#b8a060" },
      ...Object.entries(stats).slice(0, 6).map(([label, value]) => ({
        label, value, color: statusMap[label]?.color ?? "#b8a060",
      })),
    ];
  }, [statsData, statusMap]);

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: string }) => (
    <ArrowUpDown className={`w-3 h-3 ml-1 inline-block ${sortBy === col ? "opacity-100" : "opacity-20"}`}
      style={{ color: sortBy === col ? "#b8a060" : undefined }} />
  );

  const thClass = "px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap select-none";
  const tdClass = "px-3 py-2.5 border-b border-white/5 text-sm";

  const obsColor = (obs: string | null) => obs
    ? obs.toLowerCase().includes("cancel") ? "#f87171"
    : obs.toLowerCase().includes("liberad") ? "#4ade80"
    : obs.toLowerCase().includes("aguard") ? "#fbbf24"
    : "rgba(255,255,255,0.75)"
    : "rgba(255,255,255,0.3)";

  return (
    <div className="min-h-screen" style={{ background: "#0f1e38" }}>
      {/* Header */}
      <header style={{ background: "linear-gradient(180deg, #0a1628 0%, #0f1e38 100%)", borderBottom: "1px solid rgba(184,160,96,0.25)" }}>
        <div className="container py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <a href="https://grupozeglam.click" target="_blank" rel="noopener noreferrer">
                <img src={LOGO_URL} alt="Grupo Zeglam" className="h-9 md:h-12 w-auto object-contain hover:opacity-80 transition-opacity" />
              </a>
              <div className="hidden sm:block h-8 w-px" style={{ background: "rgba(184,160,96,0.3)" }} />
              <div className="hidden sm:block">
                <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "#b8a060" }}>Cronograma</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Acompanhamento de Links</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile view toggle */}
              <button
                className="md:hidden p-2 rounded-lg text-xs"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(184,160,96,0.2)", color: "#b8a060" }}
                onClick={() => setViewMode(v => v === "table" ? "cards" : "table")}>
                {viewMode === "table" ? <LayoutGrid className="w-4 h-4" /> : <ArrowUpDown className="w-4 h-4" />}
              </button>
                <a href="/envioscomprovantes" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:shadow-lg hover:scale-105"
                style={{ background: "linear-gradient(135deg, #b8a060 0%, #9d8a4d 100%)", color: "#0a1628", border: "1px solid #c9b570" }}>
                <FileUp className="w-3.5 h-3.5" /> Enviar Comprovante
              </a>

            </div>
          </div>
        </div>
      </header>

      <div className="container py-4 md:py-6 space-y-4 md:space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3">
          {statCards.map(({ label, value, color }) => {
            const isActive = (label === "Total" && statusFilter === "all") || label === statusFilter;
            return (
              <div key={label}
                className="rounded-xl p-2 md:p-3 text-center cursor-pointer transition-all hover:scale-105"
                style={{
                  background: isActive ? `${color}25` : `${color}12`,
                  border: isActive ? `2px solid ${color}90` : `1px solid ${color}30`,
                  boxShadow: isActive ? `0 0 12px ${color}30` : "none",
                }}
                onClick={() => { setStatusFilter(label === "Total" ? "all" : label); setPage(1); }}>
                <div className="text-lg md:text-2xl font-bold" style={{ color }}>{value}</div>
                <div className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.65rem" }}>{label}</div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="rounded-xl p-3 flex flex-wrap gap-2 md:gap-3 items-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(184,160,96,0.15)" }}>
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: "#b8a060" }} />
            <Input placeholder="Buscar por nome..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 text-sm h-9"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }} />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] md:w-[170px] text-sm h-9"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}>
              <Filter className="w-3.5 h-3.5 mr-1" style={{ color: "#b8a060" }} />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.25)" }}>
              <SelectItem value="all" className="text-white focus:bg-white/10">Todos os Status</SelectItem>
              {statusesData?.map((s: any) => (
                <SelectItem key={s.id} value={s.name} className="text-white focus:bg-white/10">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={deptFilter} onValueChange={v => { setDeptFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] md:w-[170px] text-sm h-9"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}>
              <LayoutGrid className="w-3.5 h-3.5 mr-1" style={{ color: "#b8a060" }} />
              <SelectValue placeholder="Depto." />
            </SelectTrigger>
            <SelectContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.25)" }}>
              <SelectItem value="all" className="text-white focus:bg-white/10">Todos os Depto.</SelectItem>
              {(deptsData ?? []).map((d: any) => (
                <SelectItem key={d.id} value={d.name} className="text-white focus:bg-white/10">{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || statusFilter !== "all" || deptFilter !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setDeptFilter("all"); setPage(1); }}
              className="text-xs h-9" style={{ color: "rgba(255,255,255,0.4)" }}>
              Limpar ×
            </Button>
          )}
          <div className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            <strong style={{ color: "rgba(255,255,255,0.7)" }}>{data?.total ?? 0}</strong> registros
          </div>
        </div>

        {/* ── MOBILE CARDS ── */}
        {viewMode === "cards" && (
          <div className="space-y-3 md:hidden">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(184,160,96,0.1)" }}>
                  <div className="h-4 w-2/3 rounded mb-3" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <div className="h-3 w-1/3 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>
              ))
            ) : data?.data.length === 0 ? (
              <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.35)" }}>Nenhum registro encontrado</div>
            ) : data?.data.map((link: any) => {
              const prazoStyle = getDateStyle(link.prazoMaxFinalizar, true);
              return (
                <div key={link.id} className="rounded-xl p-4 space-y-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(184,160,96,0.15)" }}>
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs" style={{ color: "rgba(184,160,96,0.7)" }}>#{link.numero}</span>
                        <StatusBadge status={link.status} statusMap={statusMap} />
                      </div>
                      <p className="font-medium text-sm leading-snug" style={{ color: "rgba(255,255,255,0.9)" }}>{link.nome}</p>
                    </div>
                  </div>
                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    {link.departamento && (
                      <div>
                        <span style={{ color: "rgba(184,160,96,0.6)" }}>Depto</span>
                        <p style={{ color: "rgba(255,255,255,0.7)" }}>{link.departamento}</p>
                      </div>
                    )}
                    {link.observacoes && (
                      <div className="col-span-2">
                        <span style={{ color: "rgba(184,160,96,0.6)" }}>Obs</span>
                        <p style={{ color: obsColor(link.observacoes) }}>{link.observacoes}</p>
                      </div>
                    )}
                    {link.encerramentoLink && visibleCols.encerramentoLink && (
                      <div>
                        <span style={{ color: "rgba(184,160,96,0.6)" }}>Encerramento</span>
                        <p style={{ color: "rgba(255,255,255,0.7)" }}>{formatDate(link.encerramentoLink)}</p>
                      </div>
                    )}
                    {link.romaneiosClientes && visibleCols.romaneiosClientes && (
                      <div>
                        <span style={{ color: "rgba(184,160,96,0.6)" }}>Romaneio</span>
                        <p style={{ color: "rgba(255,255,255,0.7)" }}>{formatDate(link.romaneiosClientes)}</p>
                      </div>
                    )}
                    {link.dataInicioSeparacao && visibleCols.dataInicioSeparacao && (
                      <div>
                        <span style={{ color: "rgba(184,160,96,0.6)" }}>Início Sep.</span>
                        <p style={{ color: "rgba(255,255,255,0.7)" }}>{formatDate(link.dataInicioSeparacao)}</p>
                      </div>
                    )}
                    {link.prazoMaxFinalizar && (
                      <div>
                        <span style={{ color: "rgba(184,160,96,0.6)" }}>Prazo Máx.</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded text-xs"
                            style={{ color: prazoStyle?.color ?? "rgba(255,255,255,0.7)", background: prazoStyle?.bg ?? "transparent" }}>
                            {formatDate(link.prazoMaxFinalizar)}
                          </span>
                          {prazoStyle?.label && (
                            <span className="text-xs font-bold px-1 py-0.5 rounded"
                              style={{ color: prazoStyle.color, background: prazoStyle.bg, border: `1px solid ${prazoStyle.color}40` }}>
                              {prazoStyle.label}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {link.liberadoEnvio && visibleCols.liberadoEnvio && (
                      <div>
                        <span style={{ color: "rgba(184,160,96,0.6)" }}>Lib. Envio</span>
                        <p className="px-1.5 py-0.5 rounded inline-block text-xs"
                          style={{ color: "#4ade80", background: "rgba(74,222,128,0.10)" }}>
                          {formatDate(link.liberadoEnvio)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── DESKTOP TABLE ── */}
        {(viewMode === "table" || window.innerWidth >= 768) && (
          <div className={`rounded-xl overflow-hidden ${viewMode === "cards" ? "hidden md:block" : ""}`}
            style={{ border: "1px solid rgba(184,160,96,0.2)", background: "rgba(255,255,255,0.02)" }}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr style={{ background: "rgba(10,22,40,0.8)", borderBottom: "1px solid rgba(184,160,96,0.25)" }}>
                    {[
                      { label: "N°", col: "numero", field: null },
                      { label: "Nome do Link", col: "nome", field: null },
                      { label: "Status", col: "status", field: null },
                      { label: "Departamento", col: null, field: null },
                      { label: "Observações", col: null, field: null },
                      { label: "Encerramento", col: null, field: "encerramentoLink" },
                      { label: "Romaneios", col: null, field: "romaneiosClientes" },
                      { label: "Início Sep.", col: null, field: "dataInicioSeparacao" },
                      { label: "Prazo Máx.", col: "prazoMaxFinalizar", field: null },
                      { label: "Lib. Envio", col: null, field: "liberadoEnvio" },
                    ].filter(({ field }) => !field || visibleCols[field as keyof typeof visibleCols]).map(({ label, col }) => (
                      <th key={label} className={`${thClass} ${col ? "cursor-pointer hover:opacity-80" : ""}`}
                        style={{ color: "rgba(184,160,96,0.8)" }}
                        onClick={col ? () => handleSort(col) : undefined}>
                        {label}{col && <SortIcon col={col} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        {Array.from({ length: 10 }).map((_, j) => (
                          <td key={j} className="px-3 py-3">
                            <div className="h-4 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : data?.data.length === 0 ? (
                    <tr><td colSpan={12} className="text-center py-16" style={{ color: "rgba(255,255,255,0.35)" }}>
                      Nenhum registro encontrado
                    </td></tr>
                  ) : (
                    data?.data.map((link: any, idx: any) => {
                      const prazoStyle = getDateStyle(link.prazoMaxFinalizar, true);
                      const inicioStyle = getDateStyle(link.dataInicioSeparacao);
                      return (
                        <tr key={link.id}
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(184,160,96,0.05)")}
                          onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)")}>
                          <td className={tdClass}><span className="font-mono text-xs" style={{ color: "rgba(184,160,96,0.7)" }}>#{link.numero}</span></td>
                          <td className={tdClass}><span className="font-medium" style={{ color: "rgba(255,255,255,0.9)" }}>{link.nome}</span></td>
                          <td className={tdClass}><StatusBadge status={link.status} statusMap={statusMap} /></td>
                          <td className={tdClass}><span style={{ color: "rgba(255,255,255,0.65)" }}>{link.departamento}</span></td>
                          <td className={tdClass}><span className="text-xs" style={{ color: obsColor(link.observacoes) }}>{link.observacoes || "—"}</span></td>
                          {visibleCols.encerramentoLink && <td className={tdClass}><span className="text-xs" style={{ color: link.encerramentoLink ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.2)" }}>{formatDate(link.encerramentoLink) || "—"}</span></td>}
                          {visibleCols.romaneiosClientes && <td className={tdClass}><span className="text-xs" style={{ color: link.romaneiosClientes ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.2)" }}>{formatDate(link.romaneiosClientes) || "—"}</span></td>}
                          {visibleCols.dataInicioSeparacao && (
                            <td className={tdClass}>
                              {link.dataInicioSeparacao ? (
                                <span className="text-xs px-1.5 py-0.5 rounded"
                                  style={{ color: inicioStyle?.color ?? "rgba(255,255,255,0.65)", background: inicioStyle?.bg ?? "transparent" }}>
                                  {formatDate(link.dataInicioSeparacao)}
                                </span>
                              ) : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                            </td>
                          )}
                          <td className={tdClass}>
                            {link.prazoMaxFinalizar ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs px-1.5 py-0.5 rounded"
                                  style={{ color: prazoStyle?.color ?? "rgba(255,255,255,0.65)", background: prazoStyle?.bg ?? "transparent" }}>
                                  {formatDate(link.prazoMaxFinalizar)}
                                </span>
                                {prazoStyle?.label && (
                                  <span className="text-xs font-bold px-1 py-0.5 rounded"
                                    style={{ color: prazoStyle.color, background: prazoStyle.bg, border: `1px solid ${prazoStyle.color}40` }}>
                                    {prazoStyle.label}
                                  </span>
                                )}
                              </div>
                            ) : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                          </td>
                          {visibleCols.liberadoEnvio && (
                            <td className={tdClass}>
                              {link.liberadoEnvio ? (
                                <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: "#4ade80", background: "rgba(74,222,128,0.10)" }}>
                                  {formatDate(link.liberadoEnvio)}
                                </span>
                              ) : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderTop: "1px solid rgba(184,160,96,0.15)", background: "rgba(10,22,40,0.5)" }}>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Página {page} de {totalPages}</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="w-7 h-7"
                    style={{ borderColor: "rgba(184,160,96,0.3)", color: "rgba(255,255,255,0.6)", background: "transparent" }}
                    onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = page <= 3 ? i + 1 : page + i - 2;
                    if (p < 1 || p > totalPages) return null;
                    return (
                      <Button key={p} size="icon" className="w-7 h-7 text-xs"
                        style={p === page
                          ? { background: "linear-gradient(135deg,#c9a84c,#b8a060)", color: "#0a1628", border: "none" }
                          : { borderColor: "rgba(184,160,96,0.3)", color: "rgba(255,255,255,0.6)", background: "transparent", border: "1px solid rgba(184,160,96,0.3)" }}
                        onClick={() => setPage(p)}>{p}</Button>
                    );
                  })}
                  <Button variant="outline" size="icon" className="w-7 h-7"
                    style={{ borderColor: "rgba(184,160,96,0.3)", color: "rgba(255,255,255,0.6)", background: "transparent" }}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mobile pagination */}
        {viewMode === "cards" && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 md:hidden">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ borderColor: "rgba(184,160,96,0.3)", color: "rgba(255,255,255,0.6)", background: "transparent" }}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{page} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ borderColor: "rgba(184,160,96,0.3)", color: "rgba(255,255,255,0.6)", background: "transparent" }}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="text-center py-2">
          <p className="text-xs" style={{ color: "rgba(184,160,96,0.35)" }}>Grupo Zeglam — Cronograma de Links</p>
        </div>
      </div>
    </div>
  );
}
