import { eq, like, and, sql, desc, asc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, links, InsertLink,
  linkStatuses, InsertLinkStatus,
  linkDepartments, InsertLinkDepartment,
  adminUsers, columnSettings, ColumnSettings,
  shipments, Shipment, InsertShipment,
  suppliers, Supplier, InsertSupplier,
  autoCloseHistory,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { ne } from "drizzle-orm";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Links ────────────────────────────────────────────────────────────────────

export interface ListLinksParams {
  search?: string;
  status?: string;
  departamento?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  isPublic?: boolean;
}

export async function listLinks(params: ListLinksParams = {}) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };

  const { search, status, departamento, page = 1, pageSize = 50, sortBy = 'numero', sortDir = 'asc' } = params;

  const conditions = [];
  if (search && search.trim()) conditions.push(like(links.nome, `%${search}%`));
  if (status && status.trim() && status !== 'all') {
    conditions.push(eq(links.status, status));
  } else if (!status || status === 'all') {
    // Se não filtrar por status específico, excluir "Cancelado"
    conditions.push(ne(links.status, 'Cancelado'));
  }
  if (departamento && departamento.trim() && departamento !== 'all') conditions.push(eq(links.departamento, departamento));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const sortCol = sortBy === 'numero' ? links.numero
    : sortBy === 'nome' ? links.nome
    : sortBy === 'status' ? links.status
    : sortBy === 'prazoMaxFinalizar' ? links.prazoMaxFinalizar
    : links.numero;

  const orderFn = sortDir === 'desc' ? desc : asc;

  // Ordenação por prioridade de status (apenas página pública):
  // 0 = Link Aberto (primeiro)
  // 1 = demais status (meio)
  // 2 = Liberado pra Envio (último)
  const statusPriority = sql<number>`CASE
    WHEN ${links.status} = 'Link Aberto' THEN 0
    WHEN ${links.status} = 'Liberado pra Envio' THEN 2
    ELSE 1
  END`;

  const isPublic = params.isPublic ?? false;

  const [data, countResult] = await Promise.all([
    db.select().from(links)
      .where(where)
      .orderBy(...(isPublic ? [asc(statusPriority), orderFn(sortCol)] : [orderFn(sortCol)]))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(links).where(where),
  ]);

  return { data, total: Number(countResult[0]?.count ?? 0) };
}

export async function getLinkById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(links).where(eq(links.id, id)).limit(1);
  return result[0];
}

export async function createLink(data: InsertLink) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(links).values(data);
}

export async function updateLink(id: number, data: Partial<InsertLink>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(links).set(data).where(eq(links.id, id));
  return getLinkById(id);
}

export async function deleteLink(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Remover registros de histórico de auto-fechamento antes (FK constraint)
  await db.delete(autoCloseHistory).where(eq(autoCloseHistory.linkId, id));
  await db.delete(links).where(eq(links.id, id));
  return { success: true };
}

export async function countLinks() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(links);
  return Number(result[0]?.count ?? 0);
}

export async function getStatusStats() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ status: links.status, count: sql<number>`count(*)` })
    .from(links)
    .groupBy(links.status);
  return result.map(r => ({ status: r.status, count: Number(r.count) }));
}

export async function bulkInsertLinks(data: InsertLink[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    await db.insert(links).values(data.slice(i, i + batchSize));
  }
  return { inserted: data.length };
}

// ─── Status dinâmicos ─────────────────────────────────────────────────────────

export async function listStatuses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(linkStatuses).orderBy(asc(linkStatuses.sortOrder));
}

export async function createStatus(data: InsertLinkStatus) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(linkStatuses).values(data);
  return listStatuses();
}

export async function updateStatus(id: number, data: Partial<InsertLinkStatus>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(linkStatuses).set(data).where(eq(linkStatuses.id, id));
  return listStatuses();
}

export async function deleteStatus(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(linkStatuses).where(eq(linkStatuses.id, id));
  return { success: true };
}

// ─── Departamentos dinâmicos ──────────────────────────────────────────────────

export async function listDepartments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(linkDepartments).orderBy(asc(linkDepartments.sortOrder));
}

export async function createDepartment(data: InsertLinkDepartment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(linkDepartments).values(data);
  return listDepartments();
}

export async function deleteDepartment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(linkDepartments).where(eq(linkDepartments.id, id));
  return { success: true };
}

// ─── Admin Users (login próprio) ──────────────────────────────────────────────

export async function getAdminByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
  return result[0];
}

// ─── Column Settings ──────────────────────────────────────────────

export async function getColumnSettings(): Promise<ColumnSettings | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(columnSettings).limit(1);
  return result[0];
}

export async function updateColumnSettings(settings: Partial<Omit<ColumnSettings, 'id' | 'updatedAt'>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(columnSettings).set(settings).where(eq(columnSettings.id, 1));
  return result;
}

export async function getLinksStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const allLinks = await db.select().from(links);
  
  // Count links by status
  const statusStats: Record<string, number> = {};
  allLinks.forEach(link => {
    const status = link.status || "Sem Status";
    statusStats[status] = (statusStats[status] || 0) + 1;
  });
  
  return {
    total: allLinks.length,
    statusStats: Object.entries(statusStats).map(([status, count]) => ({
      status,
      count,
    })),
  };
}

// ─── Shipments (Fretes e Comprovantes) ────────────────────────────────────────
export async function listShipments(params: { page?: number; pageSize?: number; status?: string; search?: string; supplier?: string } = {}) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };

  const { page = 1, pageSize = 20, status, search, supplier } = params;
  const conditions = [];

  if (status && status !== "todos") {
    conditions.push(eq(shipments.status, status as any));
  }

  if (search && search.trim()) {
    // Busca case-insensitive usando LOWER
    const searchLower = search.toLowerCase();
    conditions.push(sql`LOWER(${shipments.clientName}) LIKE ${`%${searchLower}%`}`);
  }

  if (supplier && supplier !== "todos") {
    conditions.push(eq(shipments.supplier, supplier as any));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const total = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(shipments)
    .where(whereClause)
    .then(r => r[0]?.count || 0);

  const offset = (page - 1) * pageSize;
  const data = await db
    .select()
    .from(shipments)
    .where(whereClause)
    .orderBy(desc(shipments.createdAt))
    .limit(pageSize)
    .offset(offset);

  return { data, total };
}

export async function getShipmentById(id: number): Promise<Shipment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(shipments).where(eq(shipments.id, id)).limit(1);
  return result[0];
}

export async function createShipment(data: InsertShipment): Promise<Shipment> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(shipments).values(data);
  const id = result[0].insertId as number;
  const created = await getShipmentById(id);
  if (!created) throw new Error("Failed to create shipment");
  return created;
}

export async function updateShipment(id: number, data: Partial<Omit<InsertShipment, 'createdAt'>>): Promise<Shipment> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(shipments).set(data).where(eq(shipments.id, id));
  const updated = await getShipmentById(id);
  if (!updated) throw new Error("Failed to update shipment");
  return updated;
}

export async function deleteShipment(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(shipments).where(eq(shipments.id, id));
}

export async function getShipmentStats() {
  const db = await getDb();
  if (!db) return { total: 0, pendente: 0, processado: 0, enviado: 0 };

  const result = await db
    .select({
      status: shipments.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(shipments)
    .groupBy(shipments.status);

  const stats = { total: 0, pendente: 0, processado: 0, enviado: 0 };
  result.forEach(r => {
    stats.total += r.count;
    if (r.status === "Pendente") stats.pendente = r.count;
    if (r.status === "Processado") stats.processado = r.count;
    if (r.status === "Enviado") stats.enviado = r.count;
  });

  return stats;
}

// ─── Suppliers (Fornecedores) ─────────────────────────────────────────────────
export async function getSupplierByUsername(username: string): Promise<Supplier | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(suppliers).where(eq(suppliers.username, username)).limit(1);
  return result[0];
}

export async function getSupplierById(id: number): Promise<Supplier | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return result[0];
}

export async function listSuppliers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select({ id: suppliers.id, name: suppliers.name, username: suppliers.username, panel: suppliers.panel }).from(suppliers);
}

export async function listShipmentsBySupplier(
  supplierId: number,
  params: { page?: number; pageSize?: number; status?: string; search?: string; panel?: 'sp' | 'limeira' } = {}
) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };

  const { page = 1, pageSize = 10, status, search, panel } = params;
  const conditions = [eq(shipments.supplierId, supplierId)];
  
  // Filtrar também pelo painel se fornecido
  if (panel) {
    conditions.push(eq(shipments.supplier, panel));
  }

  if (status && status !== "all") {
    // Suportar múltiplos status separados por vírgula
    const statusList = status.split(",").map(s => s.trim());
    if (statusList.length > 1) {
      conditions.push(inArray(shipments.status, statusList as any));
    } else {
      conditions.push(eq(shipments.status, status as any));
    }
  }

  if (search && search.trim()) {
    // Busca case-insensitive usando LOWER
    const searchLower = search.toLowerCase();
    conditions.push(sql`LOWER(${shipments.clientName}) LIKE ${`%${searchLower}%`}`);
  }

  const whereClause = and(...conditions);

  const total = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(shipments)
    .where(whereClause)
    .then(r => r[0]?.count || 0);

  const offset = (page - 1) * pageSize;
  const data = await db
    .select()
    .from(shipments)
    .where(whereClause)
    .orderBy(desc(shipments.createdAt))
    .limit(pageSize)
    .offset(offset);

  return { data, total };
}


// ─── Admin Users CRUD ──────────────────────────────────────────────────────────
export async function listAdminUsers() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ id: adminUsers.id, name: adminUsers.name, username: adminUsers.username }).from(adminUsers);
  return result;
}

export async function createAdminUser(data: { name: string; username: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(adminUsers).values(data);
  return result;
}

export async function deleteAdminUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(adminUsers).where(eq(adminUsers.id, id));
  return result;
}

export async function updateAdminPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(adminUsers).set({ passwordHash }).where(eq(adminUsers.id, id));
  return result;
}

// ─── Suppliers CRUD ────────────────────────────────────────────────────────────
export async function createSupplier(data: { name: string; username: string; passwordHash: string; email?: string; panel?: 'sp' | 'limeira' }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(suppliers).values(data);
  return result;
}

export async function deleteSupplier(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(suppliers).where(eq(suppliers.id, id));
  return result;
}

export async function updateAdminUser(id: number, data: { name?: string; username?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(adminUsers).set(data).where(eq(adminUsers.id, id));
  return result;
}

export async function updateSupplierUser(id: number, data: { name?: string; username?: string; panel?: 'sp' | 'limeira' }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(suppliers).set(data).where(eq(suppliers.id, id));
  return result;
}

export async function updateSupplierPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(suppliers).set({ passwordHash }).where(eq(suppliers.id, id));
  return result;
}

export async function getSupplierByPanel(panel: 'sp' | 'limeira'): Promise<Supplier | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(suppliers).where(eq(suppliers.panel, panel)).limit(1);
  return result[0];
}

export async function deleteShipmentMultiple(ids: number[]): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(shipments).where(inArray(shipments.id, ids));
}

export async function updateShipmentMultiple(
  ids: number[],
  data: { status?: string; notes?: string | null }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const updates: any = {};
  if (data.status) updates.status = data.status;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (Object.keys(updates).length === 0) return;
  await db.update(shipments).set(updates).where(inArray(shipments.id, ids));
}
