"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogOut, Eye, ChevronLeft, ChevronRight, Trash2, FileText, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ZeglamButton } from "@/components/ZeglamButton";
import { ZeglamGlassPanel } from "@/components/ZeglamGlassPanel";
import { ZeglamHeader } from "@/components/ZeglamHeader";
import { ZeglamPageShell } from "@/components/ZeglamPageShell";

const STATUSES = [
  { value: "all", label: "Todos os Status" },
  { value: "Pendente", label: "Pendente" },
  { value: "Processado", label: "Processado" },
  { value: "Enviado", label: "Enviado" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  "Pendente": { bg: "rgba(251, 191, 36, 0.1)", text: "#fbbf24" },
  "Processado": { bg: "rgba(59, 130, 246, 0.1)", text: "#3b82f6" },
  "Enviado": { bg: "rgba(74, 222, 128, 0.1)", text: "#4ade80" },
};

export function SupplierDashboard() {
  const [supplierInfo, setSupplierInfo] = useState<{ supplierId: number; name: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedNotes, setSelectedNotes] = useState<{ id: number; notes: string } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [allShipments, setAllShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingNotes, setEditingNotes] = useState<{ id: number; text: string } | null>(null);

  const [bulkStatus, setBulkStatus] = useState("Processado");

  const PAGE_SIZE = 10;

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/supplier/me");
        if (response.ok) {
          const data = await response.json();
          setSupplierInfo(data);
        } else {
          window.location.href = "/loginfornecedores";
        }
      } catch {
        window.location.href = "/loginfornecedores";
      }
    };
    checkAuth();
  }, []);

  // Buscar comprovantes
  useEffect(() => {
    if (!supplierInfo) return;

    const loadShipments = async () => {
      setLoading(true);
      try {
        const filterToUse = statusFilter === "all" ? "Pendente,Processado" : statusFilter;
        
        let url = `/api/shipments/list?supplierId=${supplierInfo.supplierId}&search=${search}&status=${filterToUse}&page=${page}&pageSize=${PAGE_SIZE}`;
        

        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setAllShipments(data.data || []);
          setTotal(data.total || 0);
        }
      } catch (error) {
        toast.error("Erro ao carregar comprovantes");
      } finally {
        setLoading(false);
      }
    };

    loadShipments();
    
    // Auto-refresh a cada 1 minuto para sincronização
    const interval = setInterval(loadShipments, 60000);
    return () => clearInterval(interval);
  }, [supplierInfo, search, statusFilter, page]);

  const handleLogout = async () => {
    try {
      await fetch("/api/supplier/logout", { method: "POST" });
      window.location.href = "/loginfornecedores";
    } catch {
      toast.error("Erro ao fazer logout");
    }
  };

  const handleStatusChange = async (shipmentId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        toast.success("Status atualizado");
        if (newStatus === "Enviado" && statusFilter !== "Enviado") {
          setAllShipments((prev) => prev.filter((s) => s.id !== shipmentId));
          setTotal((prev) => Math.max(0, prev - 1));
        } else {
          setAllShipments((prev) =>
            prev.map((s) => (s.id === shipmentId ? { ...s, status: newStatus } : s))
          );
        }
      }
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDeleteShipment = async (shipmentId: number) => {
    if (!confirm("Tem certeza que deseja deletar este comprovante?")) return;
    
    try {
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: "DELETE",
      });
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

  const handleBulkStatusChange = async () => {
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
        prev.map((s) => selectedIds.has(s.id) ? { ...s, status: bulkStatus } : s)
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
      }
    } catch {
      toast.error("Erro ao salvar observação");
    }
  };

  const toggleSelectId = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === allShipments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allShipments.map((s) => s.id)));
    }
  };

  const isOverdue = (createdAt: string) => {
    const shipmentDate = new Date(createdAt);
    const now = new Date();
    const diffHours = (now.getTime() - shipmentDate.getTime()) / (1000 * 60 * 60);
    return diffHours > 24;
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (!supplierInfo) {
    return (
      <ZeglamPageShell centered>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </ZeglamPageShell>
    );
  }

  return (
    <ZeglamPageShell>
      <ZeglamHeader
        title={supplierInfo.name}
        subtitle="Seus comprovantes de frete"
        badge="Fornecedor"
        actions={
          <ZeglamButton variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sair
          </ZeglamButton>
        }
      />
      <main className="container flex-1 pb-8">

        {/* Dashboard de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-border/80 bg-card/70">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-2">Total Recebido</p>
                <p className="text-3xl font-bold text-blue-400">{allShipments.filter(s => s.status === 'Pendente').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/70">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-2">Processado</p>
                <p className="text-3xl font-bold text-amber-400">{allShipments.filter(s => s.status === 'Processado').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/70">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-2">Enviado</p>
                <p className="text-3xl font-bold text-green-400">{allShipments.filter(s => s.status === 'Enviado').length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modal de Imagem */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-card">
                <h3 className="text-white font-semibold">Comprovante de Frete</h3>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-muted-foreground hover:text-white text-2xl"
                >
                  ✗
                </button>
              </div>
              <div className="p-4">
                {selectedImage.endsWith('.pdf') ? (
                  <div className="bg-muted rounded p-8 text-center">
                    <p className="text-foreground/80 mb-4">Arquivo PDF</p>
                    <a
                      href={selectedImage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="zeglam-btn-primary inline-block rounded px-6 py-2"
                    >
                      Clique para abrir o PDF
                    </a>
                  </div>
                ) : (
                  <img src={selectedImage} alt="Comprovante" className="w-full rounded" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Observações */}
        {selectedNotes && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedNotes(null)}
          >
            <div
              className="bg-card rounded-lg max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="text-white font-semibold">Observações</h3>
              </div>
              <textarea
                value={editingNotes?.text || ""}
                onChange={(e) => setEditingNotes(editingNotes ? { ...editingNotes, text: e.target.value } : null)}
                className="w-full h-32 bg-input border border-input rounded text-white p-3 mb-4"
                placeholder="Adicione observações sobre este comprovante..."
              />
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => setSelectedNotes(null)}
                  variant="outline"
                  className="border-border text-foreground"
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
        <div className="rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(184,160,96,0.15)" }}>
          <Input
            placeholder="Buscar por cliente..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1 min-w-[200px] bg-input border-input text-white"
          />

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[200px] bg-input border-input text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-input border-input">
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
                <SelectTrigger className="w-[140px] bg-input border-input text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-input border-input">
                  {["Pendente", "Processado", "Enviado"].map((s) => (
                    <SelectItem key={s} value={s} className="text-white">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleBulkStatusChange}
                className="bg-green-600 hover:bg-green-700"
              >
                Marcar ({selectedIds.size})
              </Button>
              <Button
                onClick={handleDeleteMultiple}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Deletar ({selectedIds.size})
              </Button>
            </>
          )}
        </div>

        {/* Tabela de Comprovantes */}
        <Card className="border-border/80 bg-card">
          <CardHeader>
            <CardTitle className="text-white">Comprovantes Recebidos</CardTitle>
            <CardDescription>
              {statusFilter === "all" ? "Mostrando: Pendente e Processado" : `Status: ${statusFilter}`} • Total: {total} • Página {page} de {totalPages}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : allShipments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum comprovante encontrado
              </div>
            ) : (
              <>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold text-foreground/80">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === allShipments.length && allShipments.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground/80">Cliente</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground/80">Galvânica</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground/80">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground/80">Observações</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground/80">Data</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground/80">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allShipments.map((shipment) => (
                        <tr
                          key={shipment.id}
                          className={`border-b border-border hover:bg-accent/40 ${
                            isOverdue(shipment.createdAt) && shipment.status === "Pendente"
                              ? "bg-red-900/20"
                              : ""
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
                          <td className="py-3 px-4 text-foreground/80">{shipment.galvanicaEnvio || "—"}</td>
                          <td className="py-3 px-4">
                            <Select
                              value={shipment.status}
                              onValueChange={(v) => handleStatusChange(shipment.id, v)}
                            >
                              <SelectTrigger
                                className="w-[140px] h-8 text-xs"
                                style={{
                                  background: STATUS_COLORS[shipment.status]?.bg || "rgba(255,255,255,0.05)",
                                  color: STATUS_COLORS[shipment.status]?.text || "#fff",
                                  border: `1px solid ${STATUS_COLORS[shipment.status]?.text || "rgba(255,255,255,0.1)"}`,
                                }}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-input border-input">
                                {["Pendente", "Processado", "Enviado"].map((s) => (
                                  <SelectItem key={s} value={s} className="text-white">
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-3 px-4 text-foreground/80 text-xs max-w-xs truncate">
                            {shipment.notes ? shipment.notes.substring(0, 30) + (shipment.notes.length > 30 ? "..." : "") : "—"}
                          </td>
                          <td className="py-3 px-4 text-foreground/80 text-xs">
                            {new Date(shipment.createdAt).toLocaleString("pt-BR")}
                          </td>
                          <td className="py-3 px-4 flex gap-2">
                            <Button
                              onClick={() => {
                                if (shipment.proofImageUrl && !shipment.proofImageUrl.includes('example.com')) {
                                  setSelectedImage(shipment.proofImageUrl);
                                } else {
                                  toast.error('Comprovante não disponível');
                                }
                              }}
                              size="sm"
                              variant="ghost"
                              className="text-blue-400 hover:text-blue-300"
                              title="Ver comprovante"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
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
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View - Cards */}
                <div className="md:hidden space-y-3">
                  {allShipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className={`zeglam-card-mobile ${
                        isOverdue(shipment.createdAt) && shipment.status === 'Pendente'
                          ? 'border-destructive bg-destructive/5'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(shipment.id)}
                          onChange={() => toggleSelectId(shipment.id)}
                          className="cursor-pointer mt-1"
                        />
                        <div className="flex-1">
                          <p className="text-foreground font-semibold">{shipment.clientName}</p>
                          <p className="text-muted-foreground text-xs">Galvânica: {shipment.galvanicaEnvio || "—"}</p>
                          {isOverdue(shipment.createdAt) && shipment.status === "Pendente" && (
                            <div className="flex items-center gap-1 text-red-400 text-xs mt-1">
                              <AlertCircle className="w-3 h-3" />
                              Atrasado (+24h)
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                          <span className="text-muted-foreground text-xs">Status:</span>
                          <Select
                            value={shipment.status}
                            onValueChange={(v) => handleStatusChange(shipment.id, v)}
                          >
                            <SelectTrigger
                              className="w-[120px] h-7 text-xs"
                              style={{
                                background: STATUS_COLORS[shipment.status]?.bg || "rgba(255,255,255,0.05)",
                                color: STATUS_COLORS[shipment.status]?.text || "#fff",
                              }}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-input border-input">
                              {["Pendente", "Processado", "Enviado"].map((s) => (
                                <SelectItem key={s} value={s} className="text-white">
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {shipment.notes && (
                          <p className="text-foreground/80 text-xs bg-muted/50 p-2 rounded">
                            <strong>Obs:</strong> {shipment.notes.substring(0, 50)}...
                          </p>
                        )}
                        <p className="text-muted-foreground text-xs">
                          {new Date(shipment.createdAt).toLocaleString("pt-BR")}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            onClick={() => {
                              if (shipment.proofImageUrl && !shipment.proofImageUrl.includes('example.com')) {
                                setSelectedImage(shipment.proofImageUrl);
                              }
                            }}
                            size="sm"
                            variant="ghost"
                            className="text-blue-400 hover:text-blue-300 flex-1"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedNotes({ id: shipment.id, notes: shipment.notes || "" });
                              setEditingNotes({ id: shipment.id, text: shipment.notes || "" });
                            }}
                            size="sm"
                            variant="ghost"
                            className="text-amber-400 hover:text-amber-300 flex-1"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Obs
                          </Button>
                          <Button
                            onClick={() => handleDeleteShipment(shipment.id)}
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
                    <Button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      variant="outline"
                      className="border-border text-foreground"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>
                    <span className="text-muted-foreground text-sm">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      variant="outline"
                      className="border-border text-foreground"
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
      </main>
    </ZeglamPageShell>
  );
}
