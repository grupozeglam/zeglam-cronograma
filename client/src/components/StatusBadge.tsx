import React from "react";

// Default colors for statuses (fallback when DB not loaded)
export const STATUS_DEFAULTS: Record<string, { color: string; bgColor: string }> = {
  "Concluída":           { color: "#4ade80", bgColor: "rgba(74,222,128,0.15)" },
  "Em Separação":        { color: "#60a5fa", bgColor: "rgba(96,165,250,0.15)" },
  "Em trânsito":         { color: "#b8a060", bgColor: "rgba(184,160,96,0.15)" },
  "Link Aberto":         { color: "#a78bfa", bgColor: "rgba(167,139,250,0.15)" },
  "Verificando Estoque": { color: "#f472b6", bgColor: "rgba(244,114,182,0.15)" },
  "Cancelado":           { color: "#f87171", bgColor: "rgba(248,113,113,0.15)" },
  "cancelado":           { color: "#f87171", bgColor: "rgba(248,113,113,0.15)" },
  "Pendente":            { color: "#fbbf24", bgColor: "rgba(251,191,36,0.15)" },
  "Pagamentos pendentes":{ color: "#fbbf24", bgColor: "rgba(251,191,36,0.15)" },
};

export const ALL_STATUSES = [
  "Concluída",
  "Em Separação",
  "Em trânsito",
  "Link Aberto",
  "Verificando Estoque",
  "Cancelado",
  "Pendente",
  "Pagamentos pendentes",
];

interface StatusBadgeProps {
  status: string;
  statusMap?: Record<string, { color: string; bgColor: string }>;
  className?: string;
}

export function StatusBadge({ status, statusMap, className = "" }: StatusBadgeProps) {
  const map = { ...STATUS_DEFAULTS, ...(statusMap ?? {}) };
  const style = map[status] ?? { color: "#b8a060", bgColor: "rgba(184,160,96,0.15)" };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${className}`}
      style={{
        color: style.color,
        background: style.bgColor,
        border: `1px solid ${style.color}40`,
      }}
    >
      {status}
    </span>
  );
}
