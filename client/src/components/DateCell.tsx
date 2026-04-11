import React from "react";
import { differenceInCalendarDays, parseISO, isValid } from "date-fns";

interface DateCellProps {
  value: string | null | undefined;
  isDeadline?: boolean;
  onEdit?: () => void;
}

function parseDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  // Handle YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const d = parseISO(val);
    return isValid(d) ? d : null;
  }
  return null;
}

function formatDate(val: string | null | undefined): string {
  if (!val) return "—";
  const d = parseDate(val);
  if (!d) return val; // return raw string if not a date
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function DateCell({ value, isDeadline = false }: DateCellProps) {
  const formatted = formatDate(value);
  
  if (!isDeadline || !value) {
    return (
      <span className={`text-sm ${!value ? "text-muted-foreground/40 italic" : "text-foreground/80"}`}>
        {formatted}
      </span>
    );
  }

  const d = parseDate(value);
  if (!d) {
    return <span className="text-sm text-foreground/80">{formatted}</span>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = differenceInCalendarDays(d, today);

  if (diff < 0) {
    return (
      <span className="text-sm font-medium alert-overdue flex items-center gap-1" title={`Vencido há ${Math.abs(diff)} dia(s)`}>
        <span>⚠</span> {formatted}
      </span>
    );
  }

  if (diff <= 3) {
    return (
      <span className="text-sm font-medium alert-soon flex items-center gap-1" title={`Vence em ${diff} dia(s)`}>
        <span>⏰</span> {formatted}
      </span>
    );
  }

  return <span className="text-sm text-foreground/80">{formatted}</span>;
}

export function getDateAlertClass(value: string | null | undefined): string {
  if (!value) return "";
  const d = parseDate(value);
  if (!d) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = differenceInCalendarDays(d, today);
  if (diff < 0) return "alert-overdue";
  if (diff <= 3) return "alert-soon";
  return "";
}
