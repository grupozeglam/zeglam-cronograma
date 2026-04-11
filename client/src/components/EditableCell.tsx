import React, { useState, useRef, useEffect, KeyboardEvent } from "react";

interface EditableCellProps {
  value: string | null | undefined;
  onSave: (value: string) => void;
  type?: "text" | "date" | "select";
  options?: string[];
  className?: string;
  placeholder?: string;
}

export function EditableCell({
  value,
  onSave,
  type = "text",
  options = [],
  className = "",
  placeholder = "—",
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== (value ?? "")) {
      onSave(draft);
    }
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value ?? "");
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") cancel();
  };

  const displayValue = value && value.trim() !== "" ? value : null;

  if (!editing) {
    return (
      <div
        className={`group relative min-h-[28px] px-1 py-0.5 rounded cursor-pointer hover:bg-white/5 transition-colors ${className}`}
        onClick={() => setEditing(true)}
        title="Clique para editar"
      >
        {displayValue ? (
          <span className="text-sm text-foreground/90">{displayValue}</span>
        ) : (
          <span className="text-sm text-muted-foreground/40 italic">{placeholder}</span>
        )}
        <span className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 transition-opacity text-primary text-xs">✎</span>
      </div>
    );
  }

  if (type === "select") {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="w-full text-sm bg-input border border-ring/60 rounded px-1.5 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className="w-full text-sm bg-input border border-ring/60 rounded px-1.5 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    />
  );
}
