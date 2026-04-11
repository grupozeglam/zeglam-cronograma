import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ALL_STATUSES } from "./StatusBadge";

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


const DEPARTAMENTOS = [
  "Setor de Envios",
  "Financeiro",
  "Fornecedor",
  "Grupo Conecta",
  "Separação",
  "Correio",
];

export interface LinkFormData {
  numero: number;
  nome: string;
  status: string;
  departamento: string;
  observacoes: string;
  encerramentoLink: string;
  conferenciaEstoque: string;
  romaneiosClientes: string;
  postadoFornecedor: string;
  dataInicioSeparacao: string;
  prazoMaxFinalizar: string;
  liberadoEnvio: string;
}

interface LinkModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: LinkFormData) => void;
  initialData?: Partial<LinkFormData>;
  mode: "create" | "edit";
  loading?: boolean;
}

export function LinkModal({ open, onClose, onSubmit, initialData, mode, loading }: LinkModalProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<LinkFormData>({
    defaultValues: {
      numero: 0,
      nome: "",
      status: "Link Aberto",
      departamento: "Setor de Envios",
      observacoes: "",
      encerramentoLink: "",
      conferenciaEstoque: "",
      romaneiosClientes: "",
      postadoFornecedor: "",
      dataInicioSeparacao: "",
      prazoMaxFinalizar: "",
      liberadoEnvio: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        numero: initialData?.numero ?? 0,
        nome: initialData?.nome ?? "",
        status: initialData?.status ?? "Link Aberto",
        departamento: initialData?.departamento ?? "Setor de Envios",
        observacoes: initialData?.observacoes ?? "",
        encerramentoLink: initialData?.encerramentoLink ?? "",
        conferenciaEstoque: initialData?.conferenciaEstoque ?? "",
        romaneiosClientes: initialData?.romaneiosClientes ?? "",
        postadoFornecedor: initialData?.postadoFornecedor ?? "",
        dataInicioSeparacao: initialData?.dataInicioSeparacao ?? "",
        prazoMaxFinalizar: initialData?.prazoMaxFinalizar ?? "",
        liberadoEnvio: initialData?.liberadoEnvio ?? "",
      });
    }
  }, [open, initialData, reset]);

  const statusValue = watch("status");
  const deptValue = watch("departamento");

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(184,160,96,0.25)",
    color: "white",
  };

  const labelStyle = { color: "rgba(255,255,255,0.55)", fontSize: "0.75rem" };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: "#0f1e38", border: "1px solid rgba(184,160,96,0.3)", color: "white" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <span style={{ color: "#b8a060" }}>
              {mode === "create" ? "Adicionar Novo Link" : "Editar Link"}
            </span>
          </DialogTitle>
          <div className="h-px mt-1" style={{ background: "linear-gradient(90deg, #b8a060, transparent)" }} />
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label style={labelStyle}>N°</Label>
              <Input
                type="number"
                {...register("numero", { required: true, valueAsNumber: true })}
                style={inputStyle}
                placeholder="Ex: 500"
              />
              {errors.numero && <p className="text-xs" style={{ color: "#f87171" }}>Campo obrigatório</p>}
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Nome do Link *</Label>
              <Input
                {...register("nome", { required: true })}
                style={inputStyle}
                placeholder="Ex: Aço Inox"
              />
              {errors.nome && <p className="text-xs" style={{ color: "#f87171" }}>Campo obrigatório</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label style={labelStyle}>Status</Label>
              <Select value={statusValue} onValueChange={(v) => setValue("status", v)}>
                <SelectTrigger style={{ ...inputStyle, background: "rgba(255,255,255,0.06)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.25)" }}>
                  {ALL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-white focus:bg-white/10">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Departamento</Label>
              <Select value={deptValue} onValueChange={(v) => setValue("departamento", v)}>
                <SelectTrigger style={{ ...inputStyle, background: "rgba(255,255,255,0.06)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.25)" }}>
                  {DEPARTAMENTOS.map((d) => (
                    <SelectItem key={d} value={d} className="text-white focus:bg-white/10">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label style={labelStyle}>Observações</Label>
            <Textarea
              {...register("observacoes")}
              style={{ ...inputStyle, resize: "none" }}
              rows={2}
              placeholder="Observações sobre o link..."
            />
          </div>

          <div className="pt-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1" style={{ background: "rgba(184,160,96,0.2)" }} />
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#b8a060" }}>Datas</p>
              <div className="h-px flex-1" style={{ background: "rgba(184,160,96,0.2)" }} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "encerramentoLink", label: "Encerramento do Link" },
                { key: "conferenciaEstoque", label: "Conferência de Estoque" },
                { key: "postadoFornecedor", label: "Postado pelo Fornecedor" },
                { key: "dataInicioSeparacao", label: "Início de Separação" },
                { key: "prazoMaxFinalizar", label: "Prazo Máx. Finalizar" },
                { key: "liberadoEnvio", label: "Liberado para Envio" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <Label style={labelStyle}>{label}</Label>
                  <Input
                    type="date"
                    {...register(key as keyof LinkFormData)}
                    style={{ ...inputStyle, fontSize: "0.875rem" }}
                  />
                </div>
              ))}
              {/* Romaneios — triggers auto-calc of inicio/prazo */}
              <div className="space-y-1.5">
                <Label style={labelStyle}>Romaneios Clientes</Label>
                <Input
                  type="date"
                  {...register("romaneiosClientes", {
                    onChange: (e) => {
                      const v = e.target.value;
                      if (v) {
                        const { inicio, prazo } = calcDatesFromRomaneio(v);
                        setValue("dataInicioSeparacao", inicio);
                        setValue("prazoMaxFinalizar", prazo);
                      }
                    },
                  })}
                  style={{ ...inputStyle, fontSize: "0.875rem" }}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              style={{ background: "linear-gradient(135deg, #c9a84c, #b8a060)", color: "#0a1628", border: "none", fontWeight: 600 }}
            >
              {loading ? "Salvando..." : mode === "create" ? "Adicionar Link" : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
