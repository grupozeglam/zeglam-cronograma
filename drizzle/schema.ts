import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const links = mysqlTable("links", {
  id: int("id").autoincrement().primaryKey(),
  numero: int("numero").notNull(),
  nome: varchar("nome", { length: 500 }).notNull(),
  status: varchar("status", { length: 100 }).default("Link Aberto").notNull(),
  departamento: varchar("departamento", { length: 200 }).default("").notNull(),
  observacoes: text("observacoes"),
  encerramentoLink: varchar("encerramentoLink", { length: 50 }),
  encerramentoHorario: varchar("encerramentoHorario", { length: 10 }).default("00:00"),
  conferenciaEstoque: varchar("conferenciaEstoque", { length: 100 }),
  romaneiosClientes: varchar("romaneiosClientes", { length: 100 }),
  postadoFornecedor: varchar("postadoFornecedor", { length: 100 }),
  dataInicioSeparacao: varchar("dataInicioSeparacao", { length: 100 }),
  prazoMaxFinalizar: varchar("prazoMaxFinalizar", { length: 100 }),
  liberadoEnvio: varchar("liberadoEnvio", { length: 100 }),
  seeded: boolean("seeded").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Link = typeof links.$inferSelect;
export type InsertLink = typeof links.$inferInsert;

export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

export const linkStatuses = mysqlTable("link_statuses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  color: varchar("color", { length: 30 }).notNull().default("#b8a060"),
  bgColor: varchar("bgColor", { length: 30 }).notNull().default("rgba(184,160,96,0.15)"),
  sortOrder: int("sortOrder").default(0).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LinkStatus = typeof linkStatuses.$inferSelect;
export type InsertLinkStatus = typeof linkStatuses.$inferInsert;

export const linkDepartments = mysqlTable("link_departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull().unique(),
  sortOrder: int("sortOrder").default(0).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LinkDepartment = typeof linkDepartments.$inferSelect;
export type InsertLinkDepartment = typeof linkDepartments.$inferInsert;

export const columnSettings = mysqlTable("column_settings", {
  id: int("id").autoincrement().primaryKey(),
  encerramentoLink: boolean("encerramentoLink").default(true).notNull(),
  conferenciaEstoque: boolean("conferenciaEstoque").default(true).notNull(),
  romaneiosClientes: boolean("romaneiosClientes").default(true).notNull(),
  postadoFornecedor: boolean("postadoFornecedor").default(true).notNull(),
  dataInicioSeparacao: boolean("dataInicioSeparacao").default(true).notNull(),
  liberadoEnvio: boolean("liberadoEnvio").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ColumnSettings = typeof columnSettings.$inferSelect;
export type InsertColumnSettings = typeof columnSettings.$inferInsert;

export const autoCloseHistory = mysqlTable("auto_close_history", {
  id: int("id").autoincrement().primaryKey(),
  linkId: int("linkId").notNull().references(() => links.id),
  linkNome: varchar("linkNome", { length: 500 }).notNull(),
  closedAt: timestamp("closedAt").defaultNow().notNull(),
  scheduledCloseTime: varchar("scheduledCloseTime", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AutoCloseHistory = typeof autoCloseHistory.$inferSelect;
export type InsertAutoCloseHistory = typeof autoCloseHistory.$inferInsert;

export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  panel: mysqlEnum("panel", ["sp", "limeira"]).notNull().default("sp"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

export const shipments = mysqlTable("shipments", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").notNull().references(() => suppliers.id),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  galvanica: varchar("galvanica", { length: 255 }).default(""),
  galvanicaEnvio: varchar("galvanicaEnvio", { length: 255 }),
  supplier: mysqlEnum("supplier", ["sp", "limeira"]).notNull(),
  proofImageUrl: text("proofImageUrl").notNull(),
  status: mysqlEnum("status", ["Pendente", "Processado", "Enviado"]).default("Pendente").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Shipment = typeof shipments.$inferSelect;
export type InsertShipment = typeof shipments.$inferInsert;

export const shipmentsArchived = mysqlTable("shipments_archived", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").notNull(),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  galvanica: varchar("galvanica", { length: 255 }).default(""),
  galvanicaEnvio: varchar("galvanicaEnvio", { length: 255 }),
  supplier: mysqlEnum("supplier", ["sp", "limeira"]).notNull(),
  proofImageUrl: text("proofImageUrl").notNull(),
  status: mysqlEnum("status", ["Pendente", "Processado", "Enviado"]).default("Pendente").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  archivedAt: timestamp("archivedAt").defaultNow().notNull(),
});

export type ShipmentArchived = typeof shipmentsArchived.$inferSelect;
export type InsertShipmentArchived = typeof shipmentsArchived.$inferInsert;
