import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ZeglamFloatingOrbs } from "@/components/ZeglamFloatingOrbs";
import { ZeglamGlassPanel } from "@/components/ZeglamGlassPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StatusBadge, STATUS_DEFAULTS } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, LayoutGrid, ChevronLeft, ChevronRight, ArrowUpDown, Plus, LogOut, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ShipmentSubmit from "./ShipmentSubmit";

import { ZEGLAM_LOGO_URL, ZEGLAM_SITE_URL } from "@/lib/brand";
const PAGE_SIZE = 50;

function formatDate(val: string | null | undefined) {
  if (!val) return null;
  const d = new Date(val + "T12:00:00");
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("pt-BR");
}

type DateStyle = { badgeClass: string; label?: string };

function getDateStyle(val: string | null | undefined, isDeadline = false): DateStyle | null {
  if (!val) return null;
  const d = new Date(val + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (isDeadline) {
    if (diff < 0) return { badgeClass: "cronograma-date-badge-danger", label: "Vencido" };
    if (diff <= 3) return { badgeClass: "cronograma-date-badge-warn", label: `${diff}d` };
    return { badgeClass: "cronograma-date-badge-ok" };
  }
  return { badgeClass: "cronograma-cell" };
}

function obsClass(obs: string | null | undefined): string {
  if (!obs) return "cronograma-empty";
  const o = obs.toLowerCase();
  if (o.includes("cancel")) return "text-red-700 dark:text-red-400";
  if (o.includes("liberad")) return "text-emerald-700 dark:text-emerald-400";
  if (o.includes("aguard")) return "text-amber-700 dark:text-amber-400";
  return "cronograma-cell";
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
    <ArrowUpDown
      className={`ml-1 inline-block h-3 w-3 ${sortBy === col ? "text-primary opacity-100" : "opacity-30"}`}
    />
  );

  const thClass = "cronograma-th";
  const tdClass = "cronograma-td";

  return (
    <div className="zeglam-page relative min-h-screen">
      <div className="zeglam-page-glow pointer-events-none absolute inset-0" aria-hidden />
      <ZeglamFloatingOrbs />
      <header className="zeglam-header relative z-10">
        <div className="container py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <a href={ZEGLAM_SITE_URL} target="_blank" rel="noopener noreferrer">
                <img src={ZEGLAM_LOGO_URL} alt="Grupo Zeglam" className="h-9 w-auto object-contain transition-opacity hover:opacity-85 md:h-12" />
              </a>
              <div className="hidden h-8 w-px bg-primary/30 sm:block" />
              <div className="hidden sm:block">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Cronograma</p>
                <p className="text-sm text-muted-foreground">Acompanhamento de links</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle size="sm" />
              <button
                type="button"
                className="rounded-lg border border-primary/20 bg-accent/30 p-2 text-primary md:hidden"
                onClick={() => setViewMode((v) => (v === "table" ? "cards" : "table"))}
                aria-label="Alternar visualização"
              >
                {viewMode === "table" ? <LayoutGrid className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4" />}
              </button>
              <motion.a
                href="/envioscomprovantes"
                className="zeglam-btn zeglam-btn-primary zeglam-btn-sm flex items-center gap-1.5 no-underline"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="zeglam-btn-shine" aria-hidden />
                <FileUp className="h-3.5 w-3.5" /> Enviar comprovante
              </motion.a>
            </div>
          </div>
        </div>
      </header>
      <div className="relative z-10">

      <div className="container py-4 md:py-6 space-y-4 md:space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3">
          {statCards.map(({ label, value, color }, i) => {
            const isActive = (label === "Total" && statusFilter === "all") || label === statusFilter;
            return (
              <motion.div
                key={label}
                role="button"
                tabIndex={0}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`zeglam-stat-card cursor-pointer ${isActive ? "is-active" : ""}`}
                style={{
                  background: isActive ? `${color}22` : undefined,
                  borderColor: isActive ? `${color}88` : undefined,
                }}
                onClick={() => { setStatusFilter(label === "Total" ? "all" : label); setPage(1); }}
                onKeyDown={(e) => e.key === "Enter" && (setStatusFilter(label === "Total" ? "all" : label), setPage(1))}
              >
                <div
                  className={`cronograma-stat-value ${label === "Total" ? "is-total" : ""}`}
                  style={label !== "Total" ? { color } : undefined}
                >
                  {value}
                </div>
                <div className="mt-1 truncate text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground md:text-xs">
                  {label}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Filters */}
        <ZeglamGlassPanel delay={0.15} className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary md:h-4 md:w-4" />
            <Input placeholder="Buscar por nome..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="cronograma-input-surface pl-8 text-sm h-9" />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="cronograma-input-surface w-[140px] md:w-[170px] text-sm h-9">
              <Filter className="w-3.5 h-3.5 mr-1 text-primary" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="cronograma-popover">
              <SelectItem value="all">Todos os Status</SelectItem>
              {statusesData?.map((s: any) => (
                <SelectItem key={s.id} value={s.name}>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={deptFilter} onValueChange={v => { setDeptFilter(v); setPage(1); }}>
            <SelectTrigger className="cronograma-input-surface w-[140px] md:w-[170px] text-sm h-9">
              <LayoutGrid className="w-3.5 h-3.5 mr-1 text-primary" />
              <SelectValue placeholder="Depto." />
            </SelectTrigger>
            <SelectContent className="cronograma-popover">
              <SelectItem value="all">Todos os Depto.</SelectItem>
              {(deptsData ?? []).map((d: any) => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || statusFilter !== "all" || deptFilter !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setDeptFilter("all"); setPage(1); }}
              className="h-9 text-xs text-muted-foreground">
              Limpar ×
            </Button>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            <strong className="text-foreground/80">{data?.total ?? 0}</strong> registros
          </div>
        </ZeglamGlassPanel>

        {/* ── MOBILE CARDS ── */}
        {viewMode === "cards" && (
          <div className="space-y-4 md:hidden">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="zeglam-card-mobile animate-pulse space-y-4 p-5">
                  <div className="cronograma-skeleton mb-3 h-4 w-2/3" />
                  <div className="cronograma-skeleton h-3 w-1/3" />
                </div>
              ))
            ) : data?.data.length === 0 ? (
              <div className="cronograma-muted py-16 text-center">Nenhum registro encontrado</div>
            ) : data?.data.map((link: any) => {
              const prazoStyle = getDateStyle(link.prazoMaxFinalizar, true);
              return (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="zeglam-card-mobile space-y-4"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="cronograma-num">#{link.numero}</span>
                        <StatusBadge status={link.status} statusMap={statusMap} />
                      </div>
                      <p className="cronograma-name text-sm leading-snug">{link.nome}</p>
                    </div>
                  </div>
                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    {link.departamento && (
                      <div>
                        <span className="cronograma-label">Depto</span>
                        <p className="cronograma-cell">{link.departamento}</p>
                      </div>
                    )}
                    {link.observacoes && (
                      <div className="col-span-2">
                        <span className="cronograma-label">Obs</span>
                        <p className={obsClass(link.observacoes)}>{link.observacoes}</p>
                      </div>
                    )}
                    {link.encerramentoLink && visibleCols.encerramentoLink && (
                      <div>
                        <span className="cronograma-label">Encerramento</span>
                        <p className="cronograma-cell">{formatDate(link.encerramentoLink)}</p>
                      </div>
                    )}
                    {link.romaneiosClientes && visibleCols.romaneiosClientes && (
                      <div>
                        <span className="cronograma-label">Romaneio</span>
                        <p className="cronograma-cell">{formatDate(link.romaneiosClientes)}</p>
                      </div>
                    )}
                    {link.dataInicioSeparacao && visibleCols.dataInicioSeparacao && (
                      <div>
                        <span className="cronograma-label">Início Sep.</span>
                        <p className="cronograma-cell">{formatDate(link.dataInicioSeparacao)}</p>
                      </div>
                    )}
                    {link.prazoMaxFinalizar && (
                      <div>
                        <span className="cronograma-label">Prazo Máx.</span>
                        <div className="mt-0.5 flex items-center gap-1">
                          <span className={prazoStyle?.badgeClass ?? "cronograma-cell"}>
                            {formatDate(link.prazoMaxFinalizar)}
                          </span>
                          {prazoStyle?.label && (
                            <span className={prazoStyle.badgeClass}>{prazoStyle.label}</span>
                          )}
                        </div>
                      </div>
                    )}
                    {link.liberadoEnvio && visibleCols.liberadoEnvio && (
                      <div>
                        <span className="cronograma-label">Lib. Envio</span>
                        <p className="cronograma-date-badge-ok inline-block">
                          {formatDate(link.liberadoEnvio)}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ── DESKTOP TABLE ── */}
        {(viewMode === "table" || window.innerWidth >= 768) && (
          <div className={`zeglam-table-wrap ${viewMode === "cards" ? "hidden md:block" : ""}`}>
            <div className="zeglam-table-scroll">
              <table className="cronograma-table w-full min-w-[1100px]">
                <thead>
                  <tr>
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
                      <th
                        key={label}
                        className={`${thClass} ${col ? "cursor-pointer hover:opacity-90" : ""}`}
                        onClick={col ? () => handleSort(col) : undefined}
                      >
                        {label}{col && <SortIcon col={col} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="cronograma-row">
                        {Array.from({ length: 10 }).map((_, j) => (
                          <td key={j} className="cronograma-td">
                            <div className="cronograma-skeleton h-4" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : data?.data.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="cronograma-muted py-16 text-center">
                        Nenhum registro encontrado
                      </td>
                    </tr>
                  ) : (
                    data?.data.map((link: any, idx: any) => {
                      const prazoStyle = getDateStyle(link.prazoMaxFinalizar, true);
                      const inicioStyle = getDateStyle(link.dataInicioSeparacao);
                      return (
                        <tr key={link.id} className="cronograma-row">
                          <td className={tdClass}><span className="cronograma-num">#{link.numero}</span></td>
                          <td className={`${tdClass} cronograma-td--nome`}><span className="cronograma-name">{link.nome}</span></td>
                          <td className={tdClass}><StatusBadge status={link.status} statusMap={statusMap} /></td>
                          <td className={tdClass}><span className="cronograma-cell">{link.departamento || "—"}</span></td>
                          <td className={tdClass}><span className={obsClass(link.observacoes)}>{link.observacoes || "—"}</span></td>
                          {visibleCols.encerramentoLink && (
                            <td className={tdClass}>
                              <span className={link.encerramentoLink ? "cronograma-cell" : "cronograma-empty"}>
                                {formatDate(link.encerramentoLink) || "—"}
                              </span>
                            </td>
                          )}
                          {visibleCols.romaneiosClientes && (
                            <td className={tdClass}>
                              <span className={link.romaneiosClientes ? "cronograma-cell" : "cronograma-empty"}>
                                {formatDate(link.romaneiosClientes) || "—"}
                              </span>
                            </td>
                          )}
                          {visibleCols.dataInicioSeparacao && (
                            <td className={tdClass}>
                              {link.dataInicioSeparacao ? (
                                <span className={inicioStyle?.badgeClass ?? "cronograma-cell"}>
                                  {formatDate(link.dataInicioSeparacao)}
                                </span>
                              ) : (
                                <span className="cronograma-empty">—</span>
                              )}
                            </td>
                          )}
                          <td className={tdClass}>
                            {link.prazoMaxFinalizar ? (
                              <div className="flex items-center gap-1">
                                <span className={prazoStyle?.badgeClass ?? "cronograma-cell"}>
                                  {formatDate(link.prazoMaxFinalizar)}
                                </span>
                                {prazoStyle?.label && (
                                  <span className={prazoStyle.badgeClass}>{prazoStyle.label}</span>
                                )}
                              </div>
                            ) : (
                              <span className="cronograma-empty">—</span>
                            )}
                          </td>
                          {visibleCols.liberadoEnvio && (
                            <td className={tdClass}>
                              {link.liberadoEnvio ? (
                                <span className="cronograma-date-badge-ok">{formatDate(link.liberadoEnvio)}</span>
                              ) : (
                                <span className="cronograma-empty">—</span>
                              )}
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
              <div className="cronograma-footer flex items-center justify-between px-4 py-3">
                <p className="text-xs text-muted-foreground">Página {page} de {totalPages}</p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
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
                        key={p}
                        size="icon"
                        variant={p === page ? "default" : "outline"}
                        className="h-7 w-7 text-xs"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
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
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="text-center py-2">
          <p className="text-xs text-primary/35">Grupo Zeglam — Cronograma de Links</p>
        </div>
      </div>
      </div>
    </div>
  );
}
