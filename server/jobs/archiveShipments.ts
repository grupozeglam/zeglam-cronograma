import { getDb } from "../db";
import { shipments, shipmentsArchived } from "../../drizzle/schema";
import { sql } from "drizzle-orm";

/**
 * Job de arquivamento automático de comprovantes
 * 
 * Executa duas operações:
 * 1. Move comprovantes com >30 dias e status "Enviado" para shipments_archived
 * 2. Deleta comprovantes com >90 dias no arquivo
 */
export async function archiveOldShipments() {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[ARCHIVE JOB] Banco de dados não disponível");
      return;
    }

    console.log("[ARCHIVE JOB] Iniciando arquivamento de comprovantes...");

    // 1. Mover comprovantes com >30 dias e status "Enviado" para arquivo
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Buscar comprovantes que serão arquivados
    const shipmentsToArchive = await db
      .select()
      .from(shipments)
      .where(
        sql`${shipments.status} = 'Enviado' AND ${shipments.createdAt} < ${thirtyDaysAgo}`
      );

    if (shipmentsToArchive.length > 0) {
      // Inserir na tabela de arquivo
      await db.insert(shipmentsArchived).values(
        shipmentsToArchive.map((s) => ({
          id: s.id,
          supplierId: s.supplierId,
          clientName: s.clientName,
          galvanica: s.galvanica,
          galvanicaEnvio: s.galvanicaEnvio,
          supplier: s.supplier,
          proofImageUrl: s.proofImageUrl,
          status: s.status,
          notes: s.notes,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }))
      );

      // Deletar da tabela principal
      await db
        .delete(shipments)
        .where(
          sql`${shipments.status} = 'Enviado' AND ${shipments.createdAt} < ${thirtyDaysAgo}`
        );

      console.log(
        `[ARCHIVE JOB] ${shipmentsToArchive.length} comprovantes movidos para arquivo`
      );
    }

    // 2. Deletar comprovantes com >90 dias no arquivo
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const deletedCount = await db
      .delete(shipmentsArchived)
      .where(sql`${shipmentsArchived.archivedAt} < ${ninetyDaysAgo}`);

    console.log(
      `[ARCHIVE JOB] Comprovantes com >90 dias deletados permanentemente`
    );

    console.log("[ARCHIVE JOB] ✅ Arquivamento concluído com sucesso");
  } catch (error) {
    console.error("[ARCHIVE JOB] ❌ Erro ao arquivar comprovantes:", error);
  }
}

/**
 * Função para testar o job manualmente
 */
export async function testArchiveJob() {
  console.log("[TEST] Executando teste do job de arquivamento...");
  await archiveOldShipments();
  console.log("[TEST] Teste concluído");
}
