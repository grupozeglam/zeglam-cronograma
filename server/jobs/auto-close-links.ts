import { getDb } from "../db";
import { links, autoCloseHistory } from "../../drizzle/schema";
import { eq, and, ne } from "drizzle-orm";
import { notifyLinksAutoFechados } from "./whatsapp";

// ═══════════════════════════════════════════════════════════════════════════════
// REGRA ABSOLUTA DE AUTO-CLOSE:
// ─ APENAS links com status "Link Aberto" podem ser fechados automaticamente.
// ─ "Liberado pra Envio" NUNCA é alterado automaticamente, independente da data.
//   Motivo: clientes com "Liberado pra Envio" já estão em processo de envio de
//   produtos e não devem ser interrompidos por fechamento automático.
// ═══════════════════════════════════════════════════════════════════════════════

const STATUSES_NEVER_AUTO_CLOSE = [
  "Liberado pra Envio",
  "Envio Liberado",
  "Finalizado",
  "Em Separação",
  "Em trânsito",
  "Verificando Estoque",
  "Cancelado",
  "Fornecedor separando o pedido",
  "Em Breve",
  "Fechado",
  "Aguardando Pagamentos",
  "Produção/Fabricação",
];

function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  return h * 60 + m;
}

export async function autoCloseLinksByEncerramento() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[AUTO-CLOSE] Database not available");
      return;
    }

    // Get current date and time in Brasília timezone (UTC-3)
    const now = new Date();
    const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

    const year  = brasiliaTime.getFullYear();
    const month = String(brasiliaTime.getMonth() + 1).padStart(2, '0');
    const day   = String(brasiliaTime.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const currentHour   = String(brasiliaTime.getHours()).padStart(2, '0');
    const currentMinute = String(brasiliaTime.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMinute}`;
    const currentTotalMinutes = brasiliaTime.getHours() * 60 + brasiliaTime.getMinutes();

    // Buscar SOMENTE links com status "Link Aberto" — nenhum outro status é fechado automaticamente
    const allLinks = await db
      .select()
      .from(links)
      .where(eq(links.status, "Link Aberto"));

    const linksNeedingClose = allLinks.filter(link => {
      // Proteção dupla: verificar explicitamente que o status é "Link Aberto"
      // Qualquer outro status é ignorado completamente
      if (link.status !== "Link Aberto") {
        console.log(`[AUTO-CLOSE] IGNORADO: link ${link.id} (${link.nome}) tem status "${link.status}" - apenas "Link Aberto" fecha automaticamente`);
        return false;
      }

      if (!link.encerramentoLink) return false;
      
      // Se a data de encerramento é no passado, fechar
      if (link.encerramentoLink < todayStr) return true;

      // Se a data de encerramento é hoje
      if (link.encerramentoLink === todayStr) {
        const rawHorario = link.encerramentoHorario;
        
        // Se tem horário customizado, fechar quando chegar na hora
        if (rawHorario && rawHorario.trim() !== "" && rawHorario.trim() !== "00:00") {
          const closeMinutes = parseTimeToMinutes(rawHorario);
          return currentTotalMinutes >= closeMinutes;
        }
        
        // Se não tem horário customizado, fechar às 00:00 (meia-noite)
        return currentTotalMinutes === 0;
      }

      // Se a data é no futuro, não fechar
      return false;
    });

    if (linksNeedingClose.length === 0) {
      // Log apenas a cada 10 minutos para não poluir os logs
      if (brasiliaTime.getMinutes() % 10 === 0) {
        console.log(`[AUTO-CLOSE] Nenhum link para fechar (Brasília: ${currentTimeStr})`);
      }
      return;
    }

    const closedForNotification: { nome: string; horario: string }[] = [];

    for (const link of linksNeedingClose) {
      // Verificação final antes de alterar: garantir que é "Link Aberto"
      if (link.status !== "Link Aberto") {
        console.log(`[AUTO-CLOSE] BLOQUEADO: link ${link.id} (${link.nome}) - status "${link.status}" não pode ser fechado automaticamente`);
        continue;
      }

      const encerramento = link.encerramentoLink || 'N/A';
      const horario = link.encerramentoHorario || '00:00';
      console.log(`[AUTO-CLOSE] Fechando link ${link.id} (${link.nome}) - Data: ${encerramento}, Hora: ${horario}, Hora atual: ${currentTimeStr}`);

      await db
        .update(links)
        .set({ 
          status: "Fechado", 
          observacoes: "Fechado para compras!" 
        })
        .where(and(eq(links.id, link.id), eq(links.status, "Link Aberto")));

      try {
        await db.insert(autoCloseHistory).values({
          linkId: link.id,
          linkNome: link.nome,
          scheduledCloseTime: link.encerramentoHorario || "00:00",
        });
      } catch (histErr) {
        console.error(`[AUTO-CLOSE] Erro ao registrar histórico do link ${link.id}:`, histErr);
      }

      closedForNotification.push({
        nome: link.nome,
        horario: link.encerramentoHorario || "00:00",
      });
    }

    console.log(`[AUTO-CLOSE] ${linksNeedingClose.length} link(s) fechado(s) com sucesso`);

    // Send WhatsApp notification
    await notifyLinksAutoFechados(closedForNotification);

  } catch (err) {
    console.error("[AUTO-CLOSE] Erro:", err);
  }
}
