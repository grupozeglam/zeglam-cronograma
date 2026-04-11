import { AlertCircle } from "lucide-react";

interface Link {
  id: number;
  nome: string;
  status: string;
  encerramento_link: string | null;
  encerramentoHorario?: string | null;
}

export function ClosingAlert({ links }: { links: Link[] }) {
  const closingSoon = links.filter(link => {
    if (link.status !== "Link Aberto" || !link.encerramento_link) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const closeDate = new Date(link.encerramento_link + "T12:00:00");
    const hoursUntilClose = (closeDate.getTime() - today.getTime()) / 3600000;
    
    return hoursUntilClose > 0 && hoursUntilClose <= 24;
  });

  if (closingSoon.length === 0) return null;

  return (
    <div
      className="p-4 rounded-lg flex items-start gap-3"
      style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}
    >
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#fbbf24" }} />
      <div>
        <p style={{ color: "#fbbf24" }} className="text-sm font-medium">
          Atenção: {closingSoon.length} link(s) será(ão) fechado(s) nas próximas 24 horas!
        </p>
        <ul className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
          {closingSoon.map(link => (
            <li key={link.id}>• {link.nome}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
