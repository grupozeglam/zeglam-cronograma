import { getDb } from "../db";
import { links } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { getSemijoiasClient, mapStatus } from "./semijoias-client";
import { ENV } from "../_core/env";

// Statuses que já avançaram no workflow local — não sobrescrever com dados externos
const SYNC_PROTECTED_STATUSES = [
  "Liberado pra Envio",
  "Envio Liberado",
  "Em Separação",
  "Finalizado",
];

export async function syncExternalLinks() {
  try {
    if (!ENV.semijoisEmail || !ENV.semijoisPassword) {
      return;
    }

    const db = await getDb();
    if (!db) {
      console.error("[SYNC] Database not available");
      return;
    }

    const client = getSemijoiasClient(ENV.semijoisEmail, ENV.semijoisPassword);
    const externalLinks = await client.fetchLinks();

    if (externalLinks.length === 0) {
      console.log("[SYNC] Nenhum link externo encontrado");
      return;
    }

    const localLinks = await db.select().from(links);
    const localByName = new Map(localLinks.map(l => [l.nome.trim().toLowerCase(), l]));

    let created = 0;
    let updated = 0;

    // Get max numero for new links
    const maxResult = await db.select({ max: sql<number>`COALESCE(MAX(${links.numero}), 0)` }).from(links);
    let nextNumero = (maxResult[0]?.max ?? 0) + 1;

    for (const ext of externalLinks) {
      try {
        const key = ext.nome.trim().toLowerCase();
        const local = localByName.get(key);
        const mappedStatus = ext.statusText ? mapStatus(ext.statusText) : null;

        if (local) {
          // Update existing link
          const changes: Record<string, any> = {};

          if (mappedStatus && mappedStatus !== local.status && !SYNC_PROTECTED_STATUSES.includes(local.status)) {
            changes.status = mappedStatus;
          }

          if (ext.encerramento && ext.encerramento !== local.encerramentoLink) {
            changes.encerramentoLink = ext.encerramento;
          }

          if (Object.keys(changes).length > 0) {
            await db.update(links).set(changes).where(eq(links.id, local.id));
            console.log(`[SYNC] Atualizado "${ext.nome}": ${Object.entries(changes).map(([k, v]) => `${k}=${v}`).join(", ")}`);
            updated++;
          }
        } else {
          // Create new link
          await db.insert(links).values({
            numero: nextNumero++,
            nome: ext.nome.trim(),
            status: mappedStatus ?? "Link Aberto",
            departamento: "Grupo Zeglam",
            encerramentoLink: ext.encerramento,
            seeded: true,
          });
          console.log(`[SYNC] Criado link #${nextNumero - 1}: "${ext.nome}"`);
          created++;
        }
      } catch (err) {
        console.error(`[SYNC] Erro ao processar "${ext.nome}":`, err);
      }
    }

    console.log(`[SYNC] Concluído: ${externalLinks.length} externos, ${created} criados, ${updated} atualizados`);
  } catch (err) {
    console.error("[SYNC] Erro geral:", err);
  }
}
