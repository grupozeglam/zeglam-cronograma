import { getDb } from "../db";
import { links } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyPrazosVencendo } from "./whatsapp";

/**
 * Roda uma vez por dia (às 08:00 Brasília).
 * Envia WhatsApp com links cujo prazo vence hoje, amanhã ou já venceu.
 */
export async function checkPrazosAlert() {
  try {
    const db = await getDb();
    if (!db) return;

    const now = new Date();
    const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const today = new Date(Date.UTC(brasiliaTime.getFullYear(), brasiliaTime.getMonth(), brasiliaTime.getDate()));

    const allLinks = await db.select().from(links);

    const alertLinks = allLinks
      .filter(l => l.prazoMaxFinalizar && l.status !== "Concluída" && l.status !== "Fechado")
      .map(l => {
        const prazoDate = new Date(l.prazoMaxFinalizar! + "T12:00:00");
        const diff = Math.ceil((prazoDate.getTime() - today.getTime()) / 86400000);
        return { nome: l.nome, prazo: l.prazoMaxFinalizar!, diff };
      })
      .filter(l => l.diff <= 2); // today, tomorrow, or overdue

    if (alertLinks.length === 0) {
      console.log("[PRAZO-ALERT] Nenhum prazo urgente hoje.");
      return;
    }

    console.log(`[PRAZO-ALERT] ${alertLinks.length} link(s) com prazo urgente — notificando WhatsApp`);
    await notifyPrazosVencendo(alertLinks);

  } catch (err) {
    console.error("[PRAZO-ALERT] Erro:", err);
  }
}
