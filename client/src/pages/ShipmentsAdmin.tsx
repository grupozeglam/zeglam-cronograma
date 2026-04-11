import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ChevronLeft, ChevronRight, Trash2, FileText, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const STATUSES = [
  { value: "all", label: "Todos os Status" },
  { value: "Pendente", label: "Pendente" },
  { value: "Processado", label: "Processado" },
  { value: "Enviado", label: "Enviado" },
];

const SUPPLIERS = [
  { value: "all", label: "Todos os Fornecedores" },
  { value: "sp", label: "São Paulo" },
  { value: "limeira", label: "Limeira" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  "Pendente": { bg: "rgba(251, 191, 36, 0.1)", text: "#fbbf24" },
  "Processado": { bg: "rgba(59, 130, 246, 0.1)", text: "#3b82f6" },
  "Enviado": { bg: "rgba(74, 222, 128, 0.1)", text: "#4ade80" },
};

const SUPPLIER_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  "sp": { bg: "rgba(59, 130, 246, 0.15)", text: "#60a5fa", label: "São Paulo" },
  "limeira": { bg: "rgba(74, 222, 128, 0.15)", text: "#4ade80", label: "Limeira" },
};

export function ShipmentsAdmin() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [allShipments, setAllShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingNotes, setEditingNotes] = useState<{ id: number; text: string } | null>(null);
  const [selectedNotes, setSelectedNotes] = useState<{ id: number; notes: string } | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [chartData, setChartData] = useState<any[]>([]);
  const [bulkStatus, setBulkStatus] = useState("Processado");

  const PAGE_SIZE = 10;

  // Gerar dados do gráfico de tendência temporal
  const generateChartData = (shipments: any[]) => {
    const hourly: Record<string, number> = {};
    
    shipments.forEach((s) => {
      const date = new Date(s.createdAt);
      const hour = date.getHours();
      const hourLabel = `${hour.toString().padStart(2, "0")}:00`;
      hourly[hourLabel] = (hourly[hourLabel] || 0) + 1;
    });

    return Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, "0");
      return {
        hour: `${hour}:00`,
        comprovantes: hourly[`${hour}:00`] || 0,
      };
    });
  };

  // Buscar comprovantes via REST
  const loadShipments = async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter === "all" ? "" : `&status=${statusFilter}`;
      const supplierParam = supplierFilter === "all" ? "" : `&supplier=${supplierFilter}`;
      const searchParam = search.trim() ? `&search=${encodeURIComponent(search)}` : "";
      const dateFromParam = dateFrom ? `&dateFrom=${dateFrom}` : "";
      const dateToParam = dateTo ? `&dateTo=${dateTo}` : "";

      const response = await fetch(
        `/api/admin/shipments?page=${page}&pageSize=${PAGE_SIZE}${statusParam}${supplierParam}${searchParam}${dateFromParam}${dateToParam}`
      );
      if (response.ok) {
        const data = await response.json();
        setAllShipments(data.data || []);
        setTotal(data.total || 0);
        setChartData(generateChartData(data.data || []));
      } else {
        toast.error("Erro ao carregar comprovantes");
      }
    } catch (error) {
      toast.error("Erro ao carregar comprovantes");
    } finally {
      setLoading(false);
    }
  };

  // Carregar ao montar e quando mudar filtros
  useEffect(() => {
    loadShipments();
    const interval = setInterval(loadShipments, 60000);
    return () => clearInterval(interval);
  }, [page, statusFilter, supplierFilter, search, dateFrom, dateTo]);

  const handleStatusChange = async (shipmentId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        toast.success("Status atualizado");
        setAllShipments((prev) =>
          prev.map((s) => (s.id === shipmentId ? { ...s, status: newStatus } : s))
        );
      }
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDeleteShipment = async (shipmentId: number) => {
    if (!confirm("Tem certeza que deseja deletar este comprovante?")) return;
    try {
      const response = await fetch(`/api/shipments/${shipmentId}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("Comprovante deletado");
        setAllShipments((prev) => prev.filter((s) => s.id !== shipmentId));
        setTotal((prev) => Math.max(0, prev - 1));
        setSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(shipmentId);
          return newSet;
        });
      }
    } catch {
      toast.error("Erro ao deletar comprovante");
    }
  };

  const handleDeleteMultiple = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione pelo menos um comprovante");
      return;
    }
    if (!confirm(`Tem certeza que deseja deletar ${selectedIds.size} comprovante(s)?`)) return;
    try {
      for (const id of Array.from(selectedIds)) {
        await fetch(`/api/shipments/${id}`, { method: "DELETE" });
      }
      toast.success(`${selectedIds.size} comprovante(s) deletado(s)`);
      setAllShipments((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      setTotal((prev) => Math.max(0, prev - selectedIds.size));
      setSelectedIds(new Set());
    } catch {
      toast.error("Erro ao deletar comprovantes");
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione pelo menos um comprovante");
      return;
    }
    try {
      for (const id of Array.from(selectedIds)) {
        await fetch(`/api/shipments/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: bulkStatus }),
        });
      }
      toast.success(`${selectedIds.size} comprovante(s) marcado(s) como ${bulkStatus}`);
      setAllShipments((prev) =>
        prev.map((s) => (selectedIds.has(s.id) ? { ...s, status: bulkStatus } : s))
      );
      setSelectedIds(new Set());
    } catch {
      toast.error("Erro ao atualizar status em lote");
    }
  };

  const handleSaveNotes = async (shipmentId: number, notes: string) => {
    try {
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (response.ok) {
        toast.success("Observação salva");
        setAllShipments((prev) =>
          prev.map((s) => (s.id === shipmentId ? { ...s, notes } : s))
        );
        setEditingNotes(null);
        setSelectedNotes(null);
      }
    } catch {
      toast.error("Erro ao salvar observação");
    }
  };

  const toggleSelectId = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === allShipments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allShipments.map((s) => s.id)));
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Contadores
  const countSP = allShipments.filter((s) => s.supplier === "sp").length;
  const countLimeira = allShipments.filter((s) => s.supplier === "limeira").length;
  const countPendente = allShipments.filter((s) => s.status === "Pendente").length;
  const countProcessado = allShipments.filter((s) => s.status === "Processado").length;
  const countEnviado = allShipments.filter((s) => s.status === "Enviado").length;

  // Detectar comprovantes atrasados (>24h pendentes)
  const isOverdue = (shipment: any) => {
    if (shipment.status !== "Pendente") return false;
    const createdAt = new Date(shipment.createdAt);
    const now = new Date();
    const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return diffHours > 24;
  };

  // Mostrar observações inline (preview)
  const getNotesPreview = (notes: string | null) => {
    if (!notes) return "—";
    return notes.length > 30 ? notes.substring(0, 30) + "..." : notes;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 md:mb-8 pt-4">
          <div className="flex items-center gap-2 md:gap-3">
            <Button
              onClick={() => setLocation("/admin")}
              variant="ghost"
              className="text-slate-400 hover:text-white p-2"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="hidden md:block">
              <h1 className="text-2xl md:text-3xl font-bold text-white">Gerenciamento de Fretes</h1>
              <p className="text-slate-400 text-sm">Comprovantes de São Paulo e Limeira</p>
            </div>
            <div className="md:hidden">
              <h1 className="text-xl font-bold text-white">Fretes</h1>
              <p className="text-slate-400 text-xs">SP e Limeira</p>
            </div>
          </div>
        </div>

        {/* Dashboard de Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 mb-6 md:mb-8">
          {[
            { label: "São Paulo", value: countSP, color: "text-blue-400" },
            { label: "Limeira", value: countLimeira, color: "text-green-400" },
            { label: "Pendente", value: countPendente, color: "text-amber-400" },
            { label: "Processado", value: countProcessado, color: "text-blue-400" },
            { label: "Enviado", value: countEnviado, color: "text-green-400" },
          ].map((stat) => (
            <Card key={stat.label} className="border-slate-700 bg-slate-800/50">
              <CardContent className="pt-4 md:pt-6">
                <div className="text-center">
                  <p className="text-slate-400 text-xs md:text-sm mb-1 md:mb-2">{stat.label}</p>
                  <p className={`text-2xl md:text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gráfico de Tendência Temporal */}
        <Card className="border-slate-700 bg-slate-800 mb-6 md:mb-8">
          <CardHeader>
            <CardTitle className="text-white text-lg md:text-xl">Tendência de Recebimento (24h)</CardTitle>
            <CardDescription>Volume de comprovantes por hora</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="hour" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(184,160,96,0.3)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "white" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="comprovantes"
                  stroke="#3b82f6"
                  dot={{ fill: "#3b82f6" }}
                  strokeWidth={2}
                  name="Comprovantes"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Modal de Observações */}
        {selectedNotes && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedNotes(null)}
          >
            <div
              className="bg-slate-800 rounded-lg max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="text-white font-semibold">Observações</h3>
              </div>
              <textarea
                value={editingNotes?.text || ""}
                onChange={(e) =>
                  setEditingNotes(
                    editingNotes ? { ...editingNotes, text: e.target.value } : null
                  )
                }
                className="w-full h-32 bg-slate-700 border border-slate-600 rounded text-white p-3 mb-4"
                placeholder="Adicione observações sobre este comprovante..."
              />
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => setSelectedNotes(null)}
                  variant="outline"
                  className="border-slate-600 text-slate-200"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (editingNotes) {
                      handleSaveNotes(editingNotes.id, editingNotes.text);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div
          className="rounded-lg p-3 md:p-4 mb-6 flex flex-wrap gap-2 md:gap-3 items-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(184,160,96,0.15)" }}
        >
          <Input
            placeholder="Buscar por cliente..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1 min-w-[150px] md:min-w-[200px] bg-slate-700 border-slate-600 text-white text-sm"
          />
          
          {/* Filtro de Datas */}
          <div className="flex gap-2 items-center">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="bg-slate-700 border border-slate-600 rounded text-white text-sm px-2 py-1"
              title="De"
            />
            <span className="text-slate-400 text-sm">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="bg-slate-700 border border-slate-600 rounded text-white text-sm px-2 py-1"
              title="Até"
            />
          </div>

          <Select
            value={supplierFilter}
            onValueChange={(v) => {
              setSupplierFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] md:w-[200px] bg-slate-700 border-slate-600 text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {SUPPLIERS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-white">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] md:w-[200px] bg-slate-700 border-slate-600 text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-white">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedIds.size > 0 && (
            <>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="w-[120px] md:w-[140px] bg-slate-700 border-slate-600 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {["Pendente", "Processado", "Enviado"].map((s) => (
                    <SelectItem key={s} value={s} className="text-white">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleBulkStatusUpdate}
                className="bg-green-600 hover:bg-green-700 text-sm"
              >
                Marcar ({selectedIds.size})
              </Button>
              <Button
                onClick={handleDeleteMultiple}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-sm"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* Tabela de Comprovantes */}
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-lg md:text-xl">Comprovantes Recebidos</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              {supplierFilter === "all" ? "Todos os fornecedores" : SUPPLIER_BADGE[supplierFilter]?.label} •{" "}
              {statusFilter === "all" ? "Todos os status" : `Status: ${statusFilter}`} • Total: {total} • Página {page} de {Math.max(1, totalPages)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : allShipments.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                Nenhum comprovante encontrado
              </div>
            ) : (
              <>
                {/* Desktop: Tabela */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 font-semibold text-slate-300">
                          <input
                            type="checkbox"
                            checked={
                              selectedIds.size === allShipments.length && allShipments.length > 0
                            }
                            onChange={toggleSelectAll}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-300">Cliente</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-300">Fornecedor</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-300">Galvânica</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-300">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-300">Observações</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-300">Data Recebimento</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-300">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allShipments.map((shipment) => {
                        const badge = SUPPLIER_BADGE[shipment.supplier] || {
                          bg: "rgba(255,255,255,0.05)",
                          text: "#94a3b8",
                          label: shipment.supplier || "—",
                        };
                        const overdue = isOverdue(shipment);
                        return (
                          <tr
                            key={shipment.id}
                            className={`border-b border-slate-700 hover:bg-slate-700/50 ${
                              overdue ? "bg-red-900/20" : ""
                            }`}
                          >
                            <td className="py-3 px-4">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(shipment.id)}
                                onChange={() => toggleSelectId(shipment.id)}
                                className="w-4 h-4 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-4 text-white">{shipment.clientName}</td>
                            <td className="py-3 px-4">
                              <span
                                className="px-2 py-1 rounded text-xs font-semibold"
                                style={{ background: badge.bg, color: badge.text }}
                              >
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-300 text-xs">
                              {shipment.galvanicaEnvio || "—"}
                            </td>
                            <td className="py-3 px-4">
                              <Select
                                value={shipment.status}
                                onValueChange={(v) => handleStatusChange(shipment.id, v)}
                              >
                                <SelectTrigger
                                  className="w-[120px] h-8 text-xs"
                                  style={{
                                    background:
                                      STATUS_COLORS[shipment.status]?.bg ||
                                      "rgba(255,255,255,0.05)",
                                    color:
                                      STATUS_COLORS[shipment.status]?.text || "#fff",
                                    border: `1px solid ${
                                      STATUS_COLORS[shipment.status]?.text ||
                                      "rgba(255,255,255,0.1)"
                                    }`,
                                  }}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                  {["Pendente", "Processado", "Enviado"].map((s) => (
                                    <SelectItem key={s} value={s} className="text-white">
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-3 px-4 text-slate-300 text-xs max-w-xs truncate">
                              <button
                                onClick={() => {
                                  setSelectedNotes({ id: shipment.id, notes: shipment.notes || "" });
                                  setEditingNotes({ id: shipment.id, text: shipment.notes || "" });
                                }}
                                className="text-amber-400 hover:text-amber-300 underline"
                              >
                                {getNotesPreview(shipment.notes)}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-slate-300 text-xs">
                              {new Date(shipment.createdAt).toLocaleString("pt-BR")}
                            </td>
                            <td className="py-3 px-4 flex gap-2">
                              <Button
                                onClick={() => {
                                  setSelectedNotes({ id: shipment.id, notes: shipment.notes || "" });
                                  setEditingNotes({ id: shipment.id, text: shipment.notes || "" });
                                }}
                                size="sm"
                                variant="ghost"
                                className="text-amber-400 hover:text-amber-300"
                                title="Editar observação"
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteShipment(shipment.id)}
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300"
                                title="Deletar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: Cards */}
                <div className="md:hidden space-y-3">
                  {allShipments.map((shipment) => {
                    const badge = SUPPLIER_BADGE[shipment.supplier] || {
                      bg: "rgba(255,255,255,0.05)",
                      text: "#94a3b8",
                      label: shipment.supplier || "—",
                    };
                    const overdue = isOverdue(shipment);
                    return (
                      <div
                        key={shipment.id}
                        className={`bg-slate-700/50 rounded-lg p-3 border border-slate-600 ${
                          overdue ? "border-red-500 bg-red-900/20" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(shipment.id)}
                            onChange={() => toggleSelectId(shipment.id)}
                            className="w-4 h-4 cursor-pointer mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-semibold text-white truncate">{shipment.clientName}</p>
                              <span
                                className="px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
                                style={{ background: badge.bg, color: badge.text }}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 space-y-1">
                              <p>Galvânica: {shipment.galvanicaEnvio || "—"}</p>
                              <p>Data: {new Date(shipment.createdAt).toLocaleString("pt-BR")}</p>
                              <p className="text-amber-400">
                                Obs: {getNotesPreview(shipment.notes)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <Select
                                value={shipment.status}
                                onValueChange={(v) => handleStatusChange(shipment.id, v)}
                              >
                                <SelectTrigger
                                  className="flex-1 h-7 text-xs"
                                  style={{
                                    background:
                                      STATUS_COLORS[shipment.status]?.bg ||
                                      "rgba(255,255,255,0.05)",
                                    color:
                                      STATUS_COLORS[shipment.status]?.text || "#fff",
                                    border: `1px solid ${
                                      STATUS_COLORS[shipment.status]?.text ||
                                      "rgba(255,255,255,0.1)"
                                    }`,
                                  }}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                  {["Pendente", "Processado", "Enviado"].map((s) => (
                                    <SelectItem key={s} value={s} className="text-white">
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={() => {
                                  setSelectedNotes({ id: shipment.id, notes: shipment.notes || "" });
                                  setEditingNotes({ id: shipment.id, text: shipment.notes || "" });
                                }}
                                size="sm"
                                variant="ghost"
                                className="text-amber-400 hover:text-amber-300 h-7 w-7 p-0"
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteShipment(shipment.id)}
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 h-7 w-7 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-700">
                    <Button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      variant="outline"
                      className="border-slate-600 text-slate-200 text-sm"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>
                    <span className="text-slate-400 text-sm">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      variant="outline"
                      className="border-slate-600 text-slate-200 text-sm"
                    >
                      Próxima
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
