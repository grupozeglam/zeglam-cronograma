import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { StatusBadge, STATUS_DEFAULTS } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search, Filter, LayoutGrid, Plus, Trash2, Pencil, Settings,
  ChevronLeft, ChevronRight, ArrowUpDown, LogOut, Eye, X, Check, Palette, MessageSquare, Package, Truck, Users
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663391333985/kfJrCdZgsWRY3f9mLQkwBL/zeglam-logo_80654552.png";
const PAGE_SIZE = 50;

function formatDate(val: string | null | undefined) {
  if (!val) return null;
  const d = new Date(val + "T12:00:00");
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("pt-BR");
}

function getDateAlert(val: string | null | undefined) {
  if (!val) return null;
  const d = new Date(val + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { color: "#f87171", bg: "rgba(248,113,113,0.12)", label: "Vencido" };
  if (diff <= 3) return { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", label: `${diff}d` };
  return { color: "#4ade80", bg: "rgba(74,222,128,0.10)", label: null };
}

// ─── Inline editable cell ────────────────────────────────────────────────────
function EditCell({ value, onSave, type = "text", options }: {
  value: string | null | undefined;
  onSave: (v: string | null) => void;
  type?: "text" | "date" | "select";
  options?: { value: string; label: string; color?: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const start = () => { setVal(value ?? ""); setEditing(true); setTimeout(() => inputRef.current?.focus(), 50); };
  const save = () => { onSave(val || null); setEditing(false); };
  const cancel = () => setEditing(false);

  if (!editing) {
    return (
      <div className="group flex items-center gap-1 cursor-pointer min-w-[60px]" onClick={start}>
        <span style={{ color: value ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)" }}>
          {type === "date" ? (formatDate(value) ?? "—") : (value || "—")}
        </span>
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" style={{ color: "#b8a060" }} />
      </div>
    );
  }

  if (type === "select" && options) {
    return (
      <Select value={val} onValueChange={v => { setVal(v); onSave(v || null); setEditing(false); }}>
        <SelectTrigger className="h-7 text-xs w-[160px]"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.4)", color: "white" }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.25)" }}>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value} className="text-white focus:bg-white/10">
              {o.color && <span className="w-2 h-2 rounded-full mr-2 inline-block" style={{ background: o.color }} />}
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        type={type}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
        className="h-7 px-2 text-xs rounded"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.4)", color: "white", minWidth: 80, maxWidth: 160 }}
      />
      <button onClick={save} className="p-1 rounded hover:bg-green-500/20"><Check className="w-3 h-3" style={{ color: "#4ade80" }} /></button>
      <button onClick={cancel} className="p-1 rounded hover:bg-red-500/20"><X className="w-3 h-3" style={{ color: "#f87171" }} /></button>
    </div>
  );
}

// ─── Status Edit Cell (with badge display) ────────────────────────────────────
function StatusEditCell({ value, statusMap, options, onSave }: {
  value: string | null | undefined;
  statusMap: Record<string, { color: string; bgColor: string }>;
  options: { value: string; label: string; color?: string }[];
  onSave: (v: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? "");

  const start = () => { setVal(value ?? ""); setEditing(true); };
  const save = () => { onSave(val || null); setEditing(false); };
  const cancel = () => setEditing(false);

  if (!editing) {
    return (
      <div className="group flex items-center gap-1 cursor-pointer" onClick={start}>
        <StatusBadge status={value || ""} statusMap={statusMap} />
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" style={{ color: "#b8a060" }} />
      </div>
    );
  }

  return (
    <Select value={val} onValueChange={v => { setVal(v); onSave(v || null); setEditing(false); }}>
      <SelectTrigger className="h-7 text-xs w-[160px]"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.4)", color: "white" }}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.25)" }}>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value} className="text-white focus:bg-white/10">
            {o.color && <span className="w-2 h-2 rounded-full mr-2 inline-block" style={{ background: o.color }} />}
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Status Manager Modal ────────────────────────────────────────────────────
function StatusManager({ open, onClose, onStatusesChange }: { open: boolean; onClose: () => void; onStatusesChange: (statuses: any[]) => void }) {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      fetch("/api/statuses/list").then(r => r.json()).then(d => {
        setStatuses(Array.isArray(d) ? d : []);
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
    }
  }, [open]);

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#b8a060");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsPending(true);
    try {
      const res = await fetch("/api/statuses/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor, bgColor: newColor + "26" }),
      });
      if (res.ok) {
        toast.success("Status criado!");
        setNewName(""); setNewColor("#b8a060");
        const updated = await fetch("/api/statuses/list").then(r => r.json());
        setStatuses(updated); onStatusesChange(updated);
      } else {
        toast.error("Erro ao criar status");
      }
    } catch (err) {
      toast.error("Erro ao criar status");
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Excluir status "${name}"? Os links com esse status não serão alterados.`)) return;
    setIsPending(true);
    try {
      const res = await fetch(`/api/statuses/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Status excluído");
        const updated = await fetch("/api/statuses/list").then(r => r.json());
        setStatuses(updated); onStatusesChange(updated);
      } else {
        toast.error("Erro ao excluir status");
      }
    } catch (err) {
      toast.error("Erro ao excluir status");
    } finally {
      setIsPending(false);
    }
  };

  const startEdit = (s: { id: number; name: string; color: string }) => {
    setEditId(s.id); setEditName(s.name); setEditColor(s.color);
  };

  const saveEdit = async () => {
    if (!editId) return;
    setIsPending(true);
    try {
      const res = await fetch(`/api/statuses/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, color: editColor, bgColor: editColor + "26" }),
      });
      if (res.ok) {
        toast.success("Status atualizado!");
        setEditId(null);
        const updated = await fetch("/api/statuses/list").then(r => r.json());
        setStatuses(updated); onStatusesChange(updated);
      } else {
        toast.error("Erro ao atualizar status");
      }
    } catch (err) {
      toast.error("Erro ao atualizar status");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ background: "#0f1e38", border: "1px solid rgba(184,160,96,0.3)", color: "white", maxWidth: 480 }}>
        <DialogHeader>
          <DialogTitle style={{ color: "#b8a060" }}>Gerenciar Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {isLoading ? <p className="text-sm opacity-50">Carregando...</p> : statuses?.map(s => (
            <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {editId === s.id ? (
                <>
                  <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0.5" style={{ background: "transparent" }} />
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    className="flex-1 h-8 px-2 text-sm rounded"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.4)", color: "white" }} />
                  <button onClick={saveEdit} className="p-1.5 rounded hover:bg-green-500/20"><Check className="w-4 h-4" style={{ color: "#4ade80" }} /></button>
                  <button onClick={() => setEditId(null)} className="p-1.5 rounded hover:bg-white/10"><X className="w-4 h-4 opacity-50" /></button>
                </>
              ) : (
                <>
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="flex-1 text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>{s.name}</span>
                  <button onClick={() => {
                    setIsPending(true);
                    fetch(`/api/statuses/${s.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: s.name, color: s.color, bgColor: s.bgColor, ativo: !(s.ativo ?? true) }),
                    }).then(() => fetch("/api/statuses/list").then(r=>r.json())).then(updated => { setStatuses(updated); onStatusesChange(updated); setIsPending(false); }).catch(() => setIsPending(false));
                  }} disabled={isPending} className="p-1.5 rounded hover:bg-blue-500/20 opacity-50 hover:opacity-100" title={s.ativo !== false ? "Desativar" : "Ativar"}>
                    <Eye className="w-3.5 h-3.5" style={{ color: s.ativo !== false ? "#60a5fa" : "#9ca3af" }} />
                  </button>
                  <button onClick={() => startEdit(s)} disabled={isPending} className="p-1.5 rounded hover:bg-white/10 opacity-50 hover:opacity-100">
                    <Pencil className="w-3.5 h-3.5" style={{ color: "#b8a060" }} />
                  </button>
                  <button onClick={() => handleDelete(s.id, s.name)} className="p-1.5 rounded hover:bg-red-500/20 opacity-50 hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5" style={{ color: "#f87171" }} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid rgba(184,160,96,0.15)" }}>
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0 p-0.5" style={{ background: "transparent" }} />
          <Input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Nome do novo status..."
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            className="flex-1 h-8 text-sm"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(184,160,96,0.25)", color: "white" }} />
          <Button size="sm" onClick={handleCreate}
            style={{ background: "linear-gradient(135deg,#c9a84c,#b8a060)", color: "#0a1628" }}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Department Manager Modal ─────────────────────────────────────────────────
function DeptManager({ open, onClose, onDeptsChange }: { open: boolean; onClose: () => void; onDeptsChange: (depts: any[]) => void }) {
  const [depts, setDepts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      fetch("/api/departments/list").then(r => r.json()).then(d => {
        setDepts(Array.isArray(d) ? d : []);
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
    }
  }, [open]);

  const [newName, setNewName] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsPending(true);
    try {
      const res = await fetch("/api/departments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        toast.success("Departamento criado!");
        setNewName("");
        const updated = await fetch("/api/departments/list").then(r => r.json());
        setDepts(updated); onDeptsChange(updated);
      } else {
        toast.error("Erro ao criar departamento");
      }
    } catch (err) {
      toast.error("Erro ao criar departamento");
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Excluir departamento "${name}"?`)) return;
    setIsPending(true);
    try {
      const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Departamento excluído");
        const updated = await fetch("/api/departments/list").then(r => r.json());
        setDepts(updated); onDeptsChange(updated);
      } else {
        toast.error("Erro ao excluir departamento");
      }
    } catch (err) {
      toast.error("Erro ao excluir departamento");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ background: "#0f1e38", border: "1px solid rgba(184,160,96,0.3)", color: "white", maxWidth: 420 }}>
        <DialogHeader>
          <DialogTitle style={{ color: "#b8a060" }}>Gerenciar Departamentos</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {isLoading ? <p className="text-sm opacity-50">Carregando...</p> : depts?.map(d => (
            <div key={d.id} className="flex items-center gap-2 p-2 rounded-lg"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="flex-1 text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>{d.name}</span>
              <button onClick={() => {
                setIsPending(true);
                fetch(`/api/departments/${d.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: d.name, ativo: !(d.ativo ?? true) }),
                }).then(() => fetch("/api/departments/list").then(r=>r.json())).then(updated => { setDepts(updated); onDeptsChange(updated); setIsPending(false); }).catch(() => setIsPending(false));
              }} disabled={isPending} className="p-1.5 rounded hover:bg-blue-500/20 opacity-50 hover:opacity-100" title={d.ativo !== false ? "Desativar" : "Ativar"}>
                <Eye className="w-3.5 h-3.5" style={{ color: d.ativo !== false ? "#60a5fa" : "#9ca3af" }} />
              </button>
              <button onClick={() => handleDelete(d.id, d.name)} className="p-1.5 rounded hover:bg-red-500/20 opacity-50 hover:opacity-100">
                <Trash2 className="w-3.5 h-3.5" style={{ color: "#f87171" }} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid rgba(184,160,96,0.15)" }}>
          <Input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Nome do departamento..."
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            className="flex-1 h-8 text-sm"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(184,160,96,0.25)", color: "white" }} />
          <Button size="sm" onClick={handleCreate}
            style={{ background: "linear-gradient(135deg,#c9a84c,#b8a060)", color: "#0a1628" }}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add/Edit Link Modal ──────────────────────────────────────────────────────
function LinkModal({ open, onClose, link, statusOptions, deptOptions, onSaved }: {
  open: boolean;
  onClose: () => void;
  link?: any;
  statusOptions: { value: string; label: string; color?: string }[];
  deptOptions: { value: string; label: string }[];
  onSaved: (savedLink: any, isNew: boolean) => void;
}) {
  const [isPending, setIsPending] = useState(false);
  
  const doCreate = async (payload: any) => {
    setIsPending(true);
    try {
      const res = await fetch("/api/links/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erro ao criar link"); return; }
      toast.success("Link criado!");
      onClose();
      onSaved(data, true);
    } catch (err) {
      toast.error("Erro ao criar link");
    } finally {
      setIsPending(false);
    }
  };
  
  const doUpdate = async (id: number, payload: any) => {
    setIsPending(true);
    try {
      const res = await fetch(`/api/links/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erro ao atualizar link"); return; }
      toast.success("Link atualizado!");
      onClose();
      onSaved(data, false);
    } catch (err) {
      toast.error("Erro ao atualizar link");
    } finally {
      setIsPending(false);
    }
  };

  const empty = {
    numero: 0, nome: "", status: "Link Aberto", departamento: "", observacoes: "",
    encerramentoLink: "", encerramentoHorario: "00:00", conferenciaEstoque: "", romaneiosClientes: "",
    postadoFornecedor: "", dataInicioSeparacao: "", prazoMaxFinalizar: "", liberadoEnvio: "",
  };
  const [form, setForm] = useState(link ? {
    numero: link.numero, nome: link.nome, status: link.status, departamento: link.departamento,
    observacoes: link.observacoes ?? "", encerramentoLink: link.encerramentoLink ?? "",
    encerramentoHorario: link.encerramentoHorario ?? "00:00",
    conferenciaEstoque: link.conferenciaEstoque ?? "", romaneiosClientes: link.romaneiosClientes ?? "",
    postadoFornecedor: link.postadoFornecedor ?? "", dataInicioSeparacao: link.dataInicioSeparacao ?? "",
    prazoMaxFinalizar: link.prazoMaxFinalizar ?? "", liberadoEnvio: link.liberadoEnvio ?? "",
  } : empty);

  const set = (k: string, v: string) => {
    const newForm = { ...form, [k]: v };
    
    // Auto-calculate dataInicioSeparacao and prazoMaxFinalizar when romaneiosClientes is set
    if (k === "romaneiosClientes" && v) {
      const { inicio, prazo } = calcDatesFromRomaneio(v);
      newForm.dataInicioSeparacao = inicio;
      newForm.prazoMaxFinalizar = prazo;
    }
    
    setForm(newForm);
  };

  const handleSubmit = () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const payload = {
      ...form,
      numero: Number(form.numero) || 0,
      observacoes: form.observacoes || null,
      encerramentoLink: form.encerramentoLink || null,
      encerramentoHorario: form.encerramentoHorario || "00:00",
      conferenciaEstoque: form.conferenciaEstoque || null,
      romaneiosClientes: form.romaneiosClientes || null,
      postadoFornecedor: form.postadoFornecedor || null,
      dataInicioSeparacao: form.dataInicioSeparacao || null,
      prazoMaxFinalizar: form.prazoMaxFinalizar || null,
      liberadoEnvio: form.liberadoEnvio || null,
    };
    if (link) doUpdate(link.id, payload);
    else doCreate(payload);
  };

  const fieldStyle = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(184,160,96,0.25)", color: "white" };
  const labelStyle = { color: "rgba(184,160,96,0.8)", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ background: "#0f1e38", border: "1px solid rgba(184,160,96,0.3)", color: "white", maxWidth: 560 }}>
        <DialogHeader>
          <DialogTitle style={{ color: "#b8a060" }}>{link ? "Editar Link" : "Novo Link"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto pr-1">
          <div className="col-span-1">
            <label style={labelStyle}>N°</label>
            <Input type="number" value={form.numero} onChange={e => set("numero", e.target.value)} className="mt-1 h-8 text-sm" style={fieldStyle} />
          </div>
          <div className="col-span-1">
            <label style={labelStyle}>Status</label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger className="mt-1 h-8 text-sm" style={fieldStyle}><SelectValue /></SelectTrigger>
              <SelectContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.25)" }}>
                {statusOptions.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-white focus:bg-white/10">
                    {o.color && <span className="w-2 h-2 rounded-full mr-2 inline-block" style={{ background: o.color }} />}
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label style={labelStyle}>Nome do Link</label>
            <Input value={form.nome} onChange={e => set("nome", e.target.value)} className="mt-1 h-8 text-sm" style={fieldStyle} />
          </div>
          <div className="col-span-2">
            <label style={labelStyle}>Departamento</label>
            <Select value={form.departamento} onValueChange={v => set("departamento", v)}>
              <SelectTrigger className="mt-1 h-8 text-sm" style={fieldStyle}><SelectValue /></SelectTrigger>
              <SelectContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.25)" }}>
                {deptOptions.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-white focus:bg-white/10">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label style={labelStyle}>Observações</label>
            <div className="flex gap-2 mt-1">
              <Select value={form.observacoes || ""} onValueChange={v => set("observacoes", v)}>
                <SelectTrigger className="h-8 text-sm flex-1" style={fieldStyle}>
                  <SelectValue placeholder="Selecionar ou digitar..." />
                </SelectTrigger>
                <SelectContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.25)" }}>
                  <SelectItem value="Verificando disponibilidade de estoque!">Verificando disponibilidade de estoque!</SelectItem>
                  <SelectItem value="Fornecedor separando o pedido">Fornecedor separando o pedido</SelectItem>
                  <SelectItem value="Aguardando Pagamentos">Aguardando Pagamentos</SelectItem>
                  <SelectItem value="Aberto para compras!">Aberto para compras!</SelectItem>
                  <SelectItem value="Fechado para compras!">Fechado para compras!</SelectItem>
                  <SelectItem value="Envio Liberado">Envio Liberado</SelectItem>
                  <SelectItem value="Personalização">Personalização</SelectItem>
                </SelectContent>
              </Select>
              <Input value={form.observacoes} onChange={e => set("observacoes", e.target.value)} placeholder="Ou digitar manual..." className="h-8 text-sm flex-1" style={fieldStyle} />
            </div>
          </div>
          {[
            { key: "encerramentoLink", label: "Encerramento do Link" },
            { key: "romaneiosClientes", label: "Romaneios Clientes" },
            { key: "dataInicioSeparacao", label: "Início Separação" },
            { key: "prazoMaxFinalizar", label: "Prazo Máx. Finalizar" },
            { key: "liberadoEnvio", label: "Liberado Envio" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <Input type="date" value={(form as any)[key]} onChange={e => set(key, e.target.value)} className="mt-1 h-8 text-sm" style={fieldStyle} />
            </div>
          ))}
          <div>
            <label style={labelStyle}>Horário de Encerramento</label>
            <Input type="time" value={form.encerramentoHorario} onChange={e => set("encerramentoHorario", e.target.value)} className="mt-1 h-8 text-sm" style={fieldStyle} />
          </div>
        </div>
        <DialogFooter className="pt-2" style={{ borderTop: "1px solid rgba(184,160,96,0.15)" }}>
          <Button variant="ghost" onClick={onClose} style={{ color: "rgba(255,255,255,0.5)" }}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending}
            style={{ background: "linear-gradient(135deg,#c9a84c,#b8a060)", color: "#0a1628" }}>
            {link ? "Salvar" : "Criar Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
// ─── Business days utility ───────────────────────────────────────────────────
function addBusinessDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  let d = new Date(Date.UTC(year, month - 1, day));
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) added++; // skip Sat(6) and Sun(0)
  }
  return d.toISOString().split('T')[0];
}

function calcDatesFromRomaneio(romaneioStr: string): { inicio: string; prazo: string } {
  const inicio = addBusinessDays(romaneioStr, 2);   // +2 dias úteis
  const prazo  = addBusinessDays(inicio, 15);        // +15 dias úteis
  return { inicio, prazo };
}

type SortDir = "asc" | "desc";

export default function AdminView() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [adminUser, setAdminUser] = useState<{ adminId: number; name: string } | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [loginPending, setLoginPending] = useState(false);

  const checkMe = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/me", { credentials: "include" });
      const data = await res.json();
      setAdminUser(data);
    } catch {
      setAdminUser(null);
    } finally {
      setAdminLoading(false);
    }
  }, []);

  useEffect(() => { checkMe(); }, [checkMe]);

  const doLogin = useCallback(async (username: string, password: string) => {
    setLoginPending(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Usuário ou senha incorretos");
      } else {
        setAdminUser(data);
        toast.success("Login realizado com sucesso!");
      }
    } catch {
      toast.error("Erro ao fazer login");
    } finally {
      setLoginPending(false);
    }
  }, []);

  const doLogout = useCallback(async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
      setAdminUser(null);
    } catch {
      toast.error("Erro ao sair");
    }
  }, []);

  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const isAuthenticated = !!adminUser;
  const loading = adminLoading;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("numero");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showStatusMgr, setShowStatusMgr] = useState(false);
  const [showDeptMgr, setShowDeptMgr] = useState(false);

  const [showAddLink, setShowAddLink] = useState(false);
  const [editLink, setEditLink] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [monthFilter, setMonthFilter] = useState("");
  const [visibleCols, setVisibleCols] = useState({
    encerramentoLink: true,
    conferenciaEstoque: true,
    romaneiosClientes: true,
    postadoFornecedor: true,
    dataInicioSeparacao: true,
    liberadoEnvio: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [statsData, setStatsData] = useState<any>(null);
  const [statusesData, setStatusesData] = useState<any>(null);
  const [deptsData, setDeptsData] = useState<any>(null);

  const [allLinks, setAllLinks] = useState<any[]>([]);
  const [needsRefresh, setNeedsRefresh] = useState(0);

  useEffect(() => {
    const loadData = () => {
      Promise.all([
        fetch("/api/links/list").then(r => r.json()),
        fetch("/api/statuses/list").then(r => r.json()),
        fetch("/api/departments/list").then(r => r.json()),
        fetch("/api/column-settings").then(r => r.json()),
        fetch("/api/links/stats").then(r => r.json()),
      ]).then(([links, statuses, depts, colSettings, stats]) => {
        // Garantir que links é um array (pode vir como { data: [] } ou [])
        const linksArray = Array.isArray(links) ? links : (links?.data || []);
        setAllLinks(linksArray);
        setStatusesData(statuses);
        setDeptsData(depts);
        setVisibleCols(colSettings);
        setStatsData(stats);
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
    };
    setIsLoading(true);
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [needsRefresh]);

  // Filter + sort + paginate on the client
  const data = useMemo(() => {
    let filtered = allLinks;
    // Se o filtro de status for "all", ocultamos os "Finalizado" e "Cancelado" por padrão
    if (statusFilter === "all") {
      filtered = filtered.filter(l => l.status !== "Finalizado" && l.status !== "Cancelado");
    } else {
      filtered = filtered.filter(l => l.status === statusFilter);
    }
    if (deptFilter !== "all") filtered = filtered.filter(l => l.departamento === deptFilter);
    if (monthFilter) {
      const [year, month] = monthFilter.split("-");
      filtered = filtered.filter(l => {
        const d = new Date(l.dataCriacao || l.createdAt || 0);
        return d.getFullYear() === parseInt(year) && (d.getMonth() + 1) === parseInt(month);
      });
    }
    if (search.trim()) filtered = filtered.filter(l => l.nome.toLowerCase().includes(search.toLowerCase()));
    filtered = [...filtered].sort((a, b) => {
      const av = a[sortBy] ?? "";
      const bv = b[sortBy] ?? "";
      const cmp = String(av).localeCompare(String(bv), "pt-BR", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    const total = filtered.length;
    const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    return { result: { data: pageData }, total };
  }, [allLinks, statusFilter, deptFilter, monthFilter, search, sortBy, sortDir, page]);

  const updateMut = { mutate: async (payload: any) => {
    try {
      const { id, ...updates } = payload;
      const res = await fetch(`/api/links/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      toast.success("Salvo!");
      setAllLinks(prev => prev.map((link: any) =>
        link.id === id ? { ...link, ...updates } : link
      ));
    } catch (err) {
      toast.error("Erro ao salvar");
    }
  }};
  const deleteMut = { mutate: async (id: number) => {
    try {
      const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Link excluído");
      setDeleteConfirm(null);
      setAllLinks(prev => prev.filter(l => l.id !== id));
      setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      setNeedsRefresh(n => n + 1);
    } catch (err) {
      toast.error("Erro ao deletar");
    }
  }};

  const handleDeleteMultiple = async () => {
    if (selectedIds.size === 0) return;
    try {
      let deleted = 0;
      for (const id of Array.from(selectedIds)) {
        const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
        if (res.ok) deleted++;
      }
      toast.success(`${deleted} link(s) excluído(s) com sucesso!`);
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
      setNeedsRefresh(n => n + 1);
    } catch (err) {
      toast.error("Erro ao deletar links");
    }
  };

  const toggleSelectId = (id: number) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    const currentIds = (data?.result?.data ?? []).map((l: any) => l.id);
    const allSelected = currentIds.every((id: number) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(prev => {
        const s = new Set(prev);
        currentIds.forEach((id: number) => s.delete(id));
        return s;
      });
    } else {
      setSelectedIds(prev => {
        const s = new Set(prev);
        currentIds.forEach((id: number) => s.add(id));
        return s;
      });
    }
  };

  const statusMap = useMemo(() => {
    const m: Record<string, { color: string; bgColor: string }> = { ...STATUS_DEFAULTS };
    statusesData?.forEach((s: any) => { m[s.name] = { color: s.color, bgColor: s.bgColor }; });
    return m;
  }, [statusesData]);

  const statusOptions = useMemo(() =>
    (Array.isArray(statusesData) ? statusesData : []).map((s: any) => ({ value: s.name, label: s.name, color: s.color })),
    [statusesData]);
  const deptOptions = useMemo(() =>
    (Array.isArray(deptsData) ? deptsData : []).map((d: any) => ({ value: d.name, label: d.name })),
    [deptsData]);

  const statCards = useMemo(() => {
    const stats: Record<string, number> = {};
    statsData?.statusStats?.forEach((s: any) => { stats[s.status] = s.count; });
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

  const handleCellSave = (id: number, field: string, value: string | null) => {
    // Se editando Romaneios, recalcular início de separação e prazo máximo
    if (field === "romaneiosClientes" && value) {
      const { inicio, prazo } = calcDatesFromRomaneio(value);
      updateMut.mutate({
        id,
        [field]: value,
        dataInicioSeparacao: inicio,
        prazoMaxFinalizar: prazo,
      });
      return;
    }
    updateMut.mutate({ id, [field]: value });
  };

  const SortIcon = ({ col }: { col: string }) => (
    <ArrowUpDown className={`w-3 h-3 ml-1 inline-block ${sortBy === col ? "opacity-100" : "opacity-20"}`}
      style={{ color: sortBy === col ? "#b8a060" : undefined }} />
  );

  const thClass = "px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap select-none";
  const tdClass = "px-3 py-2 border-b border-white/5 text-sm";

  // Login gate
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f1e38" }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "#b8a060", borderTopColor: "transparent" }} />
    </div>
  );

  if (!isAuthenticated) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#0f1e38" }}>
      <div className="w-full max-w-sm mx-auto p-8 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(184,160,96,0.25)" }}>
        <div className="flex flex-col items-center gap-4 mb-8">
          <img src={LOGO_URL} alt="Grupo Zeglam" className="h-14 w-auto" />
          <div className="text-center">
            <h1 className="text-lg font-semibold" style={{ color: "#b8a060" }}>Área Administrativa</h1>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Faça login para continuar</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>Usuário</label>
            <Input
              value={loginUser}
              onChange={e => setLoginUser(e.target.value)}
              placeholder="Usuário"
              autoComplete="username"
              onKeyDown={e => e.key === "Enter" && doLogin(loginUser, loginPass)}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(184,160,96,0.25)", color: "white" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>Senha</label>
            <div className="relative">
              <Input
                type={showPass ? "text" : "password"}
                value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                placeholder="Senha"
                autoComplete="current-password"
                onKeyDown={e => e.key === "Enter" && doLogin(loginUser, loginPass)}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(184,160,96,0.25)", color: "white", paddingRight: "2.5rem" }}
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80"
                style={{ color: "white" }}>
                {showPass ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button
            className="w-full font-semibold mt-2"
            disabled={loginPending || !loginUser || !loginPass}
            onClick={() => doLogin(loginUser, loginPass)}
            style={{ background: "linear-gradient(135deg,#c9a84c,#b8a060)", color: "#0a1628" }}>
            {loginPending ? "Entrando..." : "Entrar"}
          </Button>
        </div>
      </div>
    </div>
  );

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
                <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "#b8a060" }}>Administração</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Gestão de Links</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setLocation('/')} variant="ghost" className="text-slate-400 hover:text-white">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <a href="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Eye className="w-3.5 h-3.5" /> Visualização Pública
              </a>
              <Button variant="ghost" size="sm" onClick={() => setShowStatusMgr(true)}
                className="text-xs gap-1.5" style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(184,160,96,0.2)" }}>
                <Palette className="w-3.5 h-3.5" style={{ color: "#b8a060" }} /> Status
              </Button>

              <Button variant="ghost" size="sm" onClick={() => setShowDeptMgr(true)}
                className="text-xs gap-1.5" style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(184,160,96,0.2)" }}>
                <Settings className="w-3.5 h-3.5" style={{ color: "#b8a060" }} /> Departamentos
              </Button>
                 <a href="/gerenciamentofreteadmin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <Truck className="w-3.5 h-3.5" /> Gerenciar Fretes
              </a>
              <a href="/admin/users" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/5" style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Users className="w-3.5 h-3.5" /> Gerenciar Usuários
              </a>
              <a href="/admin/importar-links" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/5" style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Plus className="w-3.5 h-3.5" /> Importar Links via IA
              </a>
              <Button size="sm" onClick={() => setShowAddLink(true)}
                className="text-xs gap-1.5"
                style={{ background: "linear-gradient(135deg,#c9a84c,#b8a060)", color: "#0a1628" }}>
                <Plus className="w-3.5 h-3.5" /> Novo Link
              </Button>
              <span className="hidden sm:block text-xs px-2 py-1 rounded" style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.04)" }}>
                {adminUser?.name}
              </span>
              <Button variant="ghost" size="sm" onClick={() => doLogout()}
                className="text-xs gap-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                <LogOut className="w-3.5 h-3.5" /> Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-6 space-y-5">
        {/* Stats */}
        {/* Cards de status removidos - deixar seco */}

        {/* Filters */}
        <div className="rounded-xl p-3 flex flex-wrap gap-3 items-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(184,160,96,0.15)" }}>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#b8a060" }} />
            <Input placeholder="Buscar por nome..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 text-sm"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }} />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[170px] text-sm"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}>
              <Filter className="w-3.5 h-3.5 mr-1.5" style={{ color: "#b8a060" }} />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.25)" }}>
              <SelectItem value="all" className="text-white focus:bg-white/10">Todos os Status</SelectItem>
              {(statusesData ?? []).map((s: any) => (
                <SelectItem key={s.id} value={s.name} className="text-white focus:bg-white/10">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    {s.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={deptFilter} onValueChange={v => { setDeptFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[170px] text-sm"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}>
              <LayoutGrid className="w-3.5 h-3.5 mr-1.5" style={{ color: "#b8a060" }} />
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.25)" }}>
              <SelectItem value="all" className="text-white focus:bg-white/10">Todos os Depto.</SelectItem>
              {(deptsData ?? []).map((d: any) => (
                <SelectItem key={d.id} value={d.name} className="text-white focus:bg-white/10">{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="month" value={monthFilter} onChange={e => { setMonthFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm rounded" 
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }} />
          {(search || statusFilter !== "all" || deptFilter !== "all" || monthFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setDeptFilter("all"); setMonthFilter(""); setPage(1); }}
              className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Limpar ×
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => {
              const newVal = !visibleCols.conferenciaEstoque;
              setVisibleCols(prev => ({ ...prev, conferenciaEstoque: newVal }));
              fetch('/api/column-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conferenciaEstoque: newVal }) });
            }}
              className="text-xs" style={{ color: visibleCols.conferenciaEstoque ? "#b8a060" : "rgba(255,255,255,0.3)" }}>
              CONF. ESTOQUE
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              const newVal = !visibleCols.postadoFornecedor;
              setVisibleCols(prev => ({ ...prev, postadoFornecedor: newVal }));
              fetch('/api/column-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postadoFornecedor: newVal }) });
            }}
              className="text-xs" style={{ color: visibleCols.postadoFornecedor ? "#b8a060" : "rgba(255,255,255,0.3)" }}>
              POST. FORN.
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              const newVal = !visibleCols.romaneiosClientes;
              setVisibleCols(prev => ({ ...prev, romaneiosClientes: newVal }));
              fetch('/api/column-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ romaneiosClientes: newVal }) });
            }}
              className="text-xs" style={{ color: visibleCols.romaneiosClientes ? "#b8a060" : "rgba(255,255,255,0.3)" }}>
              ROMANEIOS
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              const newVal = !visibleCols.encerramentoLink;
              setVisibleCols(prev => ({ ...prev, encerramentoLink: newVal }));
                      fetch('/api/column-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ encerramentoLink: newVal, encerramentoHorario: newVal }) });
            }}
               className="text-xs" style={{ color: visibleCols.encerramentoLink ? "#b8a060" : "rgba(255,255,255,0.3)" }}>
               ENCERRAMENTO / HORÁRIO
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              const newVal = !visibleCols.dataInicioSeparacao;
              setVisibleCols(prev => ({ ...prev, dataInicioSeparacao: newVal }));
              fetch('/api/column-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataInicioSeparacao: newVal }) });
            }}
              className="text-xs" style={{ color: visibleCols.dataInicioSeparacao ? "#b8a060" : "rgba(255,255,255,0.3)" }}>
              INÍCIO SEP.
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              const newVal = !visibleCols.liberadoEnvio;
              setVisibleCols(prev => ({ ...prev, liberadoEnvio: newVal }));
              fetch('/api/column-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ liberadoEnvio: newVal }) });
            }}
              className="text-xs" style={{ color: visibleCols.liberadoEnvio ? "#b8a060" : "rgba(255,255,255,0.3)" }}>
              LIB. ENVIO
            </Button>
          </div>
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            <strong style={{ color: "rgba(255,255,255,0.7)" }}>{data?.total ?? 0}</strong> registros
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)" }}>
            <span className="text-sm font-medium" style={{ color: "#f87171" }}>
              {selectedIds.size} link(s) selecionado(s)
            </span>
            <Button size="sm" variant="outline"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs h-7 px-3"
              style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.5)", background: "transparent" }}>
              Cancelar seleção
            </Button>
            <Button size="sm"
              onClick={() => setBulkDeleteConfirm(true)}
              className="text-xs h-7 px-3 ml-auto"
              style={{ background: "rgba(248,113,113,0.2)", color: "#f87171", border: "1px solid rgba(248,113,113,0.4)" }}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Deletar {selectedIds.size} selecionado(s)
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(184,160,96,0.2)", background: "rgba(255,255,255,0.02)" }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr style={{ background: "rgba(10,22,40,0.8)", borderBottom: "1px solid rgba(184,160,96,0.25)" }}>
                  <th className="px-3 py-3.5 w-8">
                    <input type="checkbox"
                      className="w-3.5 h-3.5 cursor-pointer accent-amber-500"
                      checked={(data?.result?.data ?? []).length > 0 && (data?.result?.data ?? []).every((l: any) => selectedIds.has(l.id))}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  {[
                    { label: "N°", col: "numero" },
                    { label: "Nome do Link", col: "nome" },
                    { label: "Status", col: "status" },
                    { label: "Departamento", col: null },
                    { label: "Observações", col: null },
                    { label: "Encerramento", col: null },
                    { label: "Horário Encerramento", col: null },
                    { label: "Conf. Estoque", col: null },
                    { label: "Romaneios", col: null },
                    { label: "Post. Forn.", col: null },
                    { label: "Início Sep.", col: null },
                    { label: "Prazo Máx.", col: "prazoMaxFinalizar" },
                    { label: "Lib. Envio", col: null },
                    { label: "Ações", col: null },
                  ].filter(({ label }) => {
                    const fieldMap: Record<string, string> = {
                      "Encerramento": "encerramentoLink",
                      "Horário Encerramento": "encerramentoHorario",
                      "Conf. Estoque": "conferenciaEstoque",
                      "Romaneios": "romaneiosClientes",
                      "Post. Forn.": "postadoFornecedor",
                      "Início Sep.": "dataInicioSeparacao",
                      "Lib. Envio": "liberadoEnvio",
                    };
                    const field = fieldMap[label];
                    return !field || visibleCols[field as keyof typeof visibleCols];
                  }).map(({ label, col }) => (
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
                      {Array.from({ length: 13 }).map((_, j) => (
                        <td key={j} className="px-3 py-3">
                          <div className="h-4 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (data?.result?.data?.length ?? 0) === 0 ? (
                  <tr><td colSpan={13} className="text-center py-16" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Nenhum registro encontrado
                  </td></tr>
                ) : (
                  data?.result?.data?.map((link: any, idx: any) => {
                    const prazoAlert = getDateAlert(link.prazoMaxFinalizar);
                    const inicioAlert = getDateAlert(link.dataInicioSeparacao);

                    const obsColor = link.observacoes
                      ? link.observacoes.toLowerCase().includes("cancel") ? "#f87171"
                      : link.observacoes.toLowerCase().includes("liberad") ? "#4ade80"
                      : link.observacoes.toLowerCase().includes("aguard") ? "#fbbf24"
                      : "rgba(255,255,255,0.75)"
                      : "rgba(255,255,255,0.3)";

                    return (
                      <tr key={link.id}
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: selectedIds.has(link.id) ? "rgba(184,160,96,0.08)" : idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}
                        onMouseEnter={e => { if (!selectedIds.has(link.id)) e.currentTarget.style.background = "rgba(184,160,96,0.05)"; }}
                        onMouseLeave={e => { if (!selectedIds.has(link.id)) e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"; }}>
                        <td className="px-3 py-2 border-b border-white/5 w-8">
                          <input type="checkbox"
                            className="w-3.5 h-3.5 cursor-pointer accent-amber-500"
                            checked={selectedIds.has(link.id)}
                            onChange={() => toggleSelectId(link.id)}
                          />
                        </td>
                        <td className={tdClass}>
                          <EditCell value={String(link.numero)} onSave={v => handleCellSave(link.id, "numero", v)} type="text" />
                        </td>
                        <td className={tdClass} style={{ minWidth: 180 }}>
                          <EditCell value={link.nome} onSave={v => handleCellSave(link.id, "nome", v)} />
                        </td>
                        <td className={tdClass}>
                          <StatusEditCell value={link.status} statusMap={statusMap} options={statusOptions}
                            onSave={v => handleCellSave(link.id, "status", v)} />
                        </td>
                        <td className={tdClass}>
                          <EditCell value={link.departamento} type="select"
                            options={deptOptions}
                            onSave={v => handleCellSave(link.id, "departamento", v)} />
                        </td>
                        <td className={tdClass} style={{ minWidth: 140 }}>
                          <EditCell value={link.observacoes}
                            onSave={v => handleCellSave(link.id, "observacoes", v)} />
                        </td>
                        {/* Date cells */}
                        {[
                          { field: "encerramentoLink", val: link.encerramentoLink },
                          { field: "encerramentoHorario", val: link.encerramentoHorario },
                          { field: "conferenciaEstoque", val: link.conferenciaEstoque },
                          { field: "romaneiosClientes", val: link.romaneiosClientes },
                          { field: "postadoFornecedor", val: link.postadoFornecedor },
                        ].filter(({ field }) => visibleCols[field as keyof typeof visibleCols]).map(({ field, val }) => (
                          <td key={field} className={tdClass}>
                            <EditCell value={val} type={field === "encerramentoHorario" ? "text" : "date"} onSave={v => handleCellSave(link.id, field, v)} />
                          </td>
                        ))}
                        {/* Início Separação — colored */}
                        {visibleCols.dataInicioSeparacao && (
                        <td className={tdClass}>
                          <div className={inicioAlert ? "px-1.5 py-0.5 rounded inline-block" : ""}
                            style={inicioAlert ? { background: inicioAlert.bg } : {}}>
                            <EditCell value={link.dataInicioSeparacao} type="date"
                              onSave={v => handleCellSave(link.id, "dataInicioSeparacao", v)} />
                          </div>
                        </td>
                        )}
                        {/* Prazo Máx — colored with alert */}
                        <td className={tdClass}>
                          <div className="flex items-center gap-1">
                            <div className={prazoAlert ? "px-1.5 py-0.5 rounded inline-block" : ""}
                              style={prazoAlert ? { background: prazoAlert.bg } : {}}>
                              <EditCell value={link.prazoMaxFinalizar} type="date"
                                onSave={v => handleCellSave(link.id, "prazoMaxFinalizar", v)} />
                            </div>
                            {prazoAlert?.label && (
                              <span className="text-xs font-bold px-1 py-0.5 rounded"
                                style={{ color: prazoAlert.color, background: prazoAlert.bg, border: `1px solid ${prazoAlert.color}40` }}>
                                {prazoAlert.label}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Liberado Envio — green */}
                        <td className={tdClass}>
                          <div className={link.liberadoEnvio ? "px-1.5 py-0.5 rounded inline-block" : ""}
                            style={link.liberadoEnvio ? { background: "rgba(74,222,128,0.10)" } : {}}>
                            <EditCell value={link.liberadoEnvio} type="date"
                              onSave={v => handleCellSave(link.id, "liberadoEnvio", v)} />
                          </div>
                        </td>
                        {/* Actions */}
                        <td className={tdClass}>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEditLink(link)}
                              className="p-1.5 rounded hover:bg-white/10 opacity-50 hover:opacity-100 transition-opacity">
                              <Pencil className="w-3.5 h-3.5" style={{ color: "#b8a060" }} />
                            </button>
                            <button onClick={() => setDeleteConfirm(link.id)}
                              className="p-1.5 rounded hover:bg-red-500/20 opacity-50 hover:opacity-100 transition-opacity">
                              <Trash2 className="w-3.5 h-3.5" style={{ color: "#f87171" }} />
                            </button>
                          </div>
                        </td>
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
      </div>

      {/* Modals */}
      <StatusManager open={showStatusMgr} onClose={() => setShowStatusMgr(false)}
        onStatusesChange={(updated) => setStatusesData(updated)} />
      <DeptManager open={showDeptMgr} onClose={() => setShowDeptMgr(false)}
        onDeptsChange={(updated) => setDeptsData(updated)} />
      {showAddLink && (
        <LinkModal open={showAddLink} onClose={() => setShowAddLink(false)}
          statusOptions={statusOptions} deptOptions={deptOptions}
          onSaved={(savedLink, isNew) => {
            if (isNew) setAllLinks(prev => [savedLink, ...prev]);
            setShowAddLink(false);
          }} />
      )}
      {editLink && (
        <LinkModal open={!!editLink} onClose={() => setEditLink(null)}
          link={editLink} statusOptions={statusOptions} deptOptions={deptOptions}
          onSaved={(savedLink) => {
            setAllLinks(prev => prev.map(l => l.id === savedLink.id ? { ...l, ...savedLink } : l));
            setEditLink(null);
          }} />
      )}


      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <DialogContent style={{ background: "#0f1e38", border: "1px solid rgba(248,113,113,0.3)", color: "white", maxWidth: 400 }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#f87171" }}>Confirmar Exclusão em Lote</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
            Tem certeza que deseja excluir <strong style={{ color: "#f87171" }}>{selectedIds.size} link(s)</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkDeleteConfirm(false)} style={{ color: "rgba(255,255,255,0.5)" }}>Cancelar</Button>
            <Button onClick={handleDeleteMultiple}
              style={{ background: "#f87171", color: "white" }}>
              Excluir {selectedIds.size} link(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirm !== null} onOpenChange={(_open: boolean) => setDeleteConfirm(null)}>
        <DialogContent style={{ background: "#0f1e38", border: "1px solid rgba(248,113,113,0.3)", color: "white", maxWidth: 380 }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#f87171" }}>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
            Tem certeza que deseja excluir este link? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)} style={{ color: "rgba(255,255,255,0.5)" }}>Cancelar</Button>
            <Button onClick={() => deleteConfirm !== null && deleteMut.mutate(deleteConfirm)}
              disabled={false}
              style={{ background: "#f87171", color: "white" }}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
