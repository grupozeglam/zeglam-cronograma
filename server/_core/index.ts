import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import swaggerUi from "swagger-ui-express";
import { registerOAuthRoutes } from "./oauth";
import { requireApiKey, generateApiKey } from "./apiAuth";
import { apiKeys as apiKeysTable } from "../../drizzle/schema";
import { desc } from "drizzle-orm";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import {
  getAdminByUsername, createLink, updateLink, deleteLink, listLinks,
  createStatus, updateStatus, deleteStatus, listStatuses,
  createDepartment, deleteDepartment, listDepartments, getLinksStats,
} from "../db";
import bcrypt from "bcryptjs";
import * as jose from "jose";
import { eq } from "drizzle-orm";
import { linkStatuses, linkDepartments } from "../../drizzle/schema";
import { autoCloseLinksByEncerramento } from "../jobs/auto-close-links";
import { checkPrazosAlert } from "../jobs/prazo-alert";
import { archiveOldShipments } from "../jobs/archiveShipments";

const ADMIN_COOKIE = "zeglam_admin_session";
const SUPPLIER_COOKIE = "zeglam_supplier_session";
const ADMIN_JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "zeglam-admin-secret-2025");

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => { server.close(() => resolve(true)); });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

/** Pasta drizzle na raiz do projeto (dev: cwd; build: dist → ../../drizzle). */
function resolveMigrationsFolder(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const candidates = [
    path.resolve(process.cwd(), "drizzle"),
    path.resolve(__dirname, "../../drizzle"),
    path.resolve(__dirname, "../drizzle"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "meta", "_journal.json"))) {
      return dir;
    }
  }
  throw new Error(
    `Pasta de migrations não encontrada. Procurado em: ${candidates.join(", ")}`
  );
}

async function startServer() {
  // ── Rodar migrations automaticamente ao iniciar ───────────────
  if (process.env.DATABASE_URL) {
    try {
      console.log("[Migration] Conectando ao banco...");
      const connection = await mysql.createConnection(process.env.DATABASE_URL);
      const dbMigrate = drizzle(connection);
      const migrationsFolder = resolveMigrationsFolder();
      await migrate(dbMigrate, { migrationsFolder });
      console.log("[Migration] ✅ Migrations aplicadas com sucesso!");
      await connection.end();
    } catch (err) {
      console.error("[Migration] ❌ Erro ao rodar migrations (servidor vai continuar):", err);
      // NÃO relança o erro — servidor deve subir mesmo se migration falhar
    }
  } else {
    console.warn("[Migration] ⚠️ DATABASE_URL não definida, pulando migrations.");
  }
  // ─────────────────────────────────────────────────────────────

  const app = express();
  const server = createServer(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Rota estática para servir arquivos de upload
  app.use('/api/files', express.static(path.resolve(process.cwd(), 'uploads')));

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
  registerOAuthRoutes(app);

  // ─── Admin Auth REST endpoints ────────────────────────────────────────────────
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
      const admin = await getAdminByUsername(username);
      if (!admin) return res.status(401).json({ error: "Usuário ou senha incorretos" });
      const valid = bcrypt.compareSync(password, admin.passwordHash);
      if (!valid) return res.status(401).json({ error: "Usuário ou senha incorretos" });
      const token = await new jose.SignJWT({ adminId: admin.id, name: admin.name })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(ADMIN_JWT_SECRET);
      res.cookie(ADMIN_COOKIE, token, {
        httpOnly: true,
        secure: req.protocol === "https" || req.headers["x-forwarded-proto"] === "https",
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });
      return res.json({ success: true, name: admin.name });
    } catch (err) {
      console.error("[REST LOGIN] Error:", err);
      return res.status(500).json({ error: "Erro interno" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    res.clearCookie(ADMIN_COOKIE, { path: "/", sameSite: "none", secure: true });
    return res.json({ success: true });
  });

  app.get("/api/admin/me", async (req, res) => {
    try {
      const { parse: parseCookies } = await import("cookie");
      const cookies = parseCookies(req.headers.cookie || "");
      const token = cookies[ADMIN_COOKIE];
      if (!token) return res.json(null);
      const { payload } = await jose.jwtVerify(token, ADMIN_JWT_SECRET);
      return res.json({ adminId: payload.adminId, name: payload.name });
    } catch {
      return res.json(null);
    }
  });

  // ─── Links REST endpoints ─────────────────────────────────────────────────────
  app.get("/api/links/stats", async (req, res) => {
    try {
      const stats = await getLinksStats();
      return res.json(stats);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao obter estatísticas" });
    }
  });

  app.post("/api/links/create", async (req, res) => {
    try {
      const { numero, nome, status, departamento, observacoes, encerramentoLink, encerramentoHorario, conferenciaEstoque, romaneiosClientes, postadoFornecedor, dataInicioSeparacao, prazoMaxFinalizar, liberadoEnvio } = req.body;
      if (!numero || !nome) return res.status(400).json({ error: "Número e nome são obrigatórios" });
      await createLink({ numero, nome, status, departamento, observacoes, encerramentoLink, encerramentoHorario, conferenciaEstoque, romaneiosClientes, postadoFornecedor, dataInicioSeparacao, prazoMaxFinalizar, liberadoEnvio } as any);
      return res.json({ success: true, numero, nome });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao criar link" });
    }
  });

  app.put("/api/links/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await updateLink(id, req.body as any);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao atualizar link" });
    }
  });

  app.delete("/api/links/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`[DELETE_LINK] Deletando link ID: ${id}`);
      const result = await deleteLink(id);
      console.log(`[DELETE_LINK] Link ${id} deletado com sucesso:`, result);
      return res.json({ success: true });
    } catch (err) {
      console.error(`[DELETE_LINK] Erro ao deletar link:`, err);
      return res.status(500).json({ error: "Erro ao deletar link", details: String(err) });
    }
  });

  app.get("/api/links/list", async (req, res) => {
    try {
      const db = await (await import("../db")).getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const { links: linksTable } = await import("../../drizzle/schema");
      const { ne } = await import("drizzle-orm");
      const excludeConcluded = req.query.excludeConcluded === "true";
      const showCanceled = req.query.showCanceled === "true";
      
      let allLinks = await db.select().from(linksTable);
      
      // Filtrar Cancelado (sempre excluir a menos que explicitamente pedido)
      if (!showCanceled) {
        allLinks = allLinks.filter((l: any) => l.status !== "Cancelado");
      }
      
      // Filtrar Concluída se solicitado
      if (excludeConcluded) {
        allLinks = allLinks.filter((l: any) => l.status !== "Concluída");
      }
      
      return res.json(allLinks);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao listar links" });
    }
  });

  // ─── Status REST endpoints ────────────────────────────────────────────────────
  app.get("/api/statuses/list", async (req, res) => {
    try {
      const db = await (await import("../db")).getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const onlyActive = req.query.onlyActive === "true";
      const statuses = onlyActive
        ? await db.select().from(linkStatuses).where(eq(linkStatuses.ativo, true))
        : await db.select().from(linkStatuses);
      return res.json(statuses);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao listar statuses" });
    }
  });

  app.post("/api/statuses/create", async (req, res) => {
    try {
      const { name, color, bgColor } = req.body;
      if (!name) return res.status(400).json({ error: "Nome é obrigatório" });
      await createStatus({ name, color: color || "#b8a060", bgColor: bgColor || "rgba(184,160,96,0.15)" } as any);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao criar status" });
    }
  });

  app.put("/api/statuses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await updateStatus(id, req.body as any);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao atualizar status" });
    }
  });

  app.delete("/api/statuses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await deleteStatus(id);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao deletar status" });
    }
  });

  // ─── Departments REST endpoints ───────────────────────────────────────────────
  app.get("/api/departments/list", async (req, res) => {
    try {
      const db = await (await import("../db")).getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const onlyActive = req.query.onlyActive === "true";
      const depts = onlyActive
        ? await db.select().from(linkDepartments).where(eq(linkDepartments.ativo, true))
        : await db.select().from(linkDepartments);
      return res.json(depts);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao listar departamentos" });
    }
  });

  app.post("/api/departments/create", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "Nome é obrigatório" });
      await createDepartment({ name } as any);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao criar departamento" });
    }
  });

  app.put("/api/departments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, ativo } = req.body;
      const db = await (await import("../db")).getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      await db.update(linkDepartments).set({ name, ativo }).where(eq(linkDepartments.id, id));
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao atualizar departamento" });
    }
  });

  app.delete("/api/departments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await deleteDepartment(id);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao deletar departamento" });
    }
  });

  // ─── Column Settings ──────────────────────────────────────────────────────────
  app.get("/api/column-settings", async (req, res) => {
    try {
      const { getColumnSettings } = await import("../db");
      const settings = await getColumnSettings();
      if (!settings) return res.json({ encerramentoLink: true, conferenciaEstoque: true, romaneiosClientes: true, postadoFornecedor: true, dataInicioSeparacao: true, liberadoEnvio: true });
      return res.json(settings);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao obter configuracoes de colunas" });
    }
  });

  app.put("/api/column-settings", async (req, res) => {
    try {
      const { updateColumnSettings } = await import("../db");
      await updateColumnSettings(req.body);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao atualizar configuracoes de colunas" });
    }
  });

  // ─── Shipments (Comprovantes) REST endpoints ──────────────────────────────────
  app.post("/api/upload", async (req, res) => {
    try {
      const { clientName, galvanicaEnvio, supplier, imageData } = req.body;
      if (!clientName || !supplier || !imageData) return res.status(400).json({ error: "Campos obrigatórios faltando" });
      if (supplier === "limeira" && !galvanicaEnvio) return res.status(400).json({ error: "Galvânica de envio obrigatória para Limeira" });
      const base64Data = imageData.split(",")[1] || imageData;
      const buffer = Buffer.from(base64Data, "base64");
      let contentType = "image/jpeg";
      if (imageData.includes("image/png")) contentType = "image/png";
      else if (imageData.includes("application/pdf")) contentType = "application/pdf";
      const { storagePut } = await import("../storage");
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      const ext = contentType === "image/png" ? "png" : contentType === "application/pdf" ? "pdf" : "jpg";
      const fileKey = `shipments/${supplier}/${timestamp}-${random}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, contentType);
      const { createShipment, getSupplierByPanel } = await import("../db");
      const supplierRecord = await getSupplierByPanel(supplier as 'sp' | 'limeira');
      if (!supplierRecord) return res.status(400).json({ error: `Fornecedor ${supplier} não encontrado` });
      const shipment = await createShipment({ supplierId: supplierRecord.id, clientName, galvanica: "", galvanicaEnvio: supplier === "limeira" ? galvanicaEnvio : null, supplier, proofImageUrl: url, status: "Pendente" } as any);
      return res.json({ success: true, id: shipment.id, url });
    } catch (err) {
      console.error("[REST UPLOAD]", err);
      return res.status(500).json({ error: "Erro ao fazer upload" });
    }
  });

  app.get("/api/shipments/list", async (req, res) => {
    try {
      const { supplierId, search, status, page = "1", pageSize = "10", panel } = req.query;
      if (!supplierId) return res.status(400).json({ error: "supplierId é obrigatório" });
      const { listShipmentsBySupplier, getSupplierById } = await import("../db");
      let panelToUse = panel as 'sp' | 'limeira' | undefined;
      if (!panelToUse) {
        const sup = await getSupplierById(parseInt(supplierId as string));
        if (sup) panelToUse = sup.panel as 'sp' | 'limeira';
      }
      const result = await listShipmentsBySupplier(parseInt(supplierId as string), { search: search as string, status: status as string, page: parseInt(page as string), pageSize: parseInt(pageSize as string), panel: panelToUse });
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao listar comprovantes" });
    }
  });

  app.patch("/api/shipments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, notes } = req.body;
      const updates: any = {};
      if (status) updates.status = status;
      if (notes !== undefined) updates.notes = notes;
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nenhum campo para atualizar" });
      const { updateShipment } = await import("../db");
      await updateShipment(id, updates);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao atualizar comprovante" });
    }
  });

  app.delete("/api/shipments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { deleteShipment } = await import("../db");
      await deleteShipment(id);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao deletar comprovante" });
    }
  });

  // ─── Supplier Auth ────────────────────────────────────────────────────────────
  app.post("/api/supplier/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
      const { getSupplierByUsername } = await import("../db");
      const supplier = await getSupplierByUsername(username);
      if (!supplier) return res.status(401).json({ error: "Usuário ou senha incorretos" });
      const valid = bcrypt.compareSync(password, supplier.passwordHash);
      if (!valid) return res.status(401).json({ error: "Usuário ou senha incorretos" });
      const token = await new jose.SignJWT({ supplierId: supplier.id, name: supplier.name })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(ADMIN_JWT_SECRET);
      res.cookie(SUPPLIER_COOKIE, token, {
        httpOnly: true,
        secure: req.protocol === "https" || req.headers["x-forwarded-proto"] === "https",
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });
      return res.json({ success: true, name: supplier.name, supplierId: supplier.id });
    } catch (err) {
      return res.status(500).json({ error: "Erro interno" });
    }
  });

  app.get("/api/supplier/me", async (req, res) => {
    try {
      const { parse: parseCookies } = await import("cookie");
      const cookies = parseCookies(req.headers.cookie || "");
      const token = cookies[SUPPLIER_COOKIE];
      if (!token) return res.json(null);
      const { payload } = await jose.jwtVerify(token, ADMIN_JWT_SECRET);
      return res.json({ supplierId: payload.supplierId, name: payload.name });
    } catch {
      return res.json(null);
    }
  });

  app.post("/api/supplier/logout", (req, res) => {
    res.clearCookie(SUPPLIER_COOKIE, { path: "/", sameSite: "none", secure: true });
    return res.json({ success: true });
  });

  // ─── Admin Users Management ───────────────────────────────────────────────────
  app.get("/api/admin/users", async (req, res) => {
    try {
      const { listAdminUsers } = await import("../db");
      return res.json(await listAdminUsers());
    } catch (err) {
      return res.status(500).json({ error: "Erro ao listar admins" });
    }
  });

  app.post("/api/admin/users", async (req, res) => {
    try {
      const { name, username, password } = req.body;
      if (!name || !username || !password) return res.status(400).json({ error: "Nome, usuário e senha são obrigatórios" });
      if (password.length < 8) return res.status(400).json({ error: "Senha deve ter no mínimo 8 caracteres" });
      const { createAdminUser, getAdminByUsername: getAdmin } = await import("../db");
      const existing = await getAdmin(username);
      if (existing) return res.status(400).json({ error: "Usuário já existe" });
      const passwordHash = bcrypt.hashSync(password, 10);
      await createAdminUser({ name, username, passwordHash });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao criar admin" });
    }
  });

  app.put("/api/admin/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, username } = req.body;
      if (!name || !username) return res.status(400).json({ error: "Nome e usuário são obrigatórios" });
      const { updateAdminUser } = await import("../db");
      await updateAdminUser(id, { name, username });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao atualizar admin" });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { deleteAdminUser } = await import("../db");
      await deleteAdminUser(id);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao deletar admin" });
    }
  });

  app.post("/api/admin/change-password", async (req, res) => {
    try {
      const { parse: parseCookies } = await import("cookie");
      const cookies = parseCookies(req.headers.cookie || "");
      const token = cookies[ADMIN_COOKIE];
      if (!token) return res.status(401).json({ error: "Não autenticado" });
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
      if (newPassword.length < 8) return res.status(400).json({ error: "Nova senha deve ter no mínimo 8 caracteres" });
      const { payload } = await jose.jwtVerify(token, ADMIN_JWT_SECRET);
      const adminId = payload.adminId as number;
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { adminUsers: adminUsersTable } = await import("../../drizzle/schema");
      const result = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, adminId)).limit(1);
      const admin = result[0];
      if (!admin) return res.status(404).json({ error: "Admin não encontrado" });
      const valid = bcrypt.compareSync(currentPassword, admin.passwordHash);
      if (!valid) return res.status(401).json({ error: "Senha atual incorreta" });
      const passwordHash = bcrypt.hashSync(newPassword, 10);
      const { updateAdminPassword } = await import("../db");
      await updateAdminPassword(adminId, passwordHash);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao alterar senha" });
    }
  });

  // ─── Suppliers Management ─────────────────────────────────────────────────────
  app.get("/api/suppliers/list", async (req, res) => {
    try {
      const { listSuppliers } = await import("../db");
      return res.json(await listSuppliers());
    } catch (err) {
      return res.status(500).json({ error: "Erro ao listar fornecedores" });
    }
  });

  app.post("/api/suppliers/create", async (req, res) => {
    try {
      const { name, username, password, email, panel } = req.body;
      if (!name || !username || !password) return res.status(400).json({ error: "Nome, usuário e senha são obrigatórios" });
      if (password.length < 8) return res.status(400).json({ error: "Senha deve ter no mínimo 8 caracteres" });
      const { createSupplier, getSupplierByUsername } = await import("../db");
      const existing = await getSupplierByUsername(username);
      if (existing) return res.status(400).json({ error: "Usuário já existe" });
      const passwordHash = bcrypt.hashSync(password, 10);
      await createSupplier({ name, username, passwordHash, email, panel: panel || "sp" });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao criar fornecedor" });
    }
  });

  app.put("/api/suppliers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, username, panel } = req.body;
      if (!name || !username) return res.status(400).json({ error: "Nome e usuário são obrigatórios" });
      const { updateSupplierUser } = await import("../db");
      await updateSupplierUser(id, { name, username, panel });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao atualizar fornecedor" });
    }
  });

  app.post("/api/suppliers/:id/change-password", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
      if (newPassword.length < 8) return res.status(400).json({ error: "Nova senha deve ter no mínimo 8 caracteres" });
      const { getSupplierById, updateSupplierPassword } = await import("../db");
      const supplier = await getSupplierById(id);
      if (!supplier) return res.status(404).json({ error: "Fornecedor não encontrado" });
      const valid = bcrypt.compareSync(currentPassword, supplier.passwordHash);
      if (!valid) return res.status(401).json({ error: "Senha atual incorreta" });
      const passwordHash = bcrypt.hashSync(newPassword, 10);
      await updateSupplierPassword(id, passwordHash);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao alterar senha" });
    }
  });

  app.delete("/api/suppliers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { deleteSupplier } = await import("../db");
      await deleteSupplier(id);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao deletar fornecedor" });
    }
  });

  // ─── Admin Shipments ──────────────────────────────────────────────────────────
  app.get("/api/admin/shipments", async (req, res) => {
    try {
      const { search, status, page = "1", pageSize = "10", supplier } = req.query;
      const { listShipments } = await import("../db");
      const result = await listShipments({ search: search as string, status: status as string, page: parseInt(page as string), pageSize: parseInt(pageSize as string), supplier: supplier as string });
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao listar comprovantes" });
    }
  });

  // ─── Extract Links via AI ─────────────────────────────────────────────────────
  // Endpoint para obter API Key salva (do localStorage do cliente)
  app.get("/api/admin/get-api-key", async (req, res) => {
    try {
      // Nota: As chaves são salvas no localStorage do cliente, não no servidor
      return res.json({ success: true, message: "Use localStorage no cliente" });
    } catch (err) {
      return res.status(500).json({ error: "Erro" });
    }
  });

  app.post("/api/admin/extract-links", upload.single("image"), async (req, res) => {
    try {
      const { apiKey, prompt, provider } = req.body;
      const imageBuffer = req.file?.buffer;
      if (!imageBuffer || !apiKey || !prompt) return res.status(400).json({ error: "Missing required fields" });
      const { extractLinksFromImage } = await import("../jobs/extractLinksAI");
      const links = await extractLinksFromImage(imageBuffer, apiKey, prompt, provider || "openai");
      return res.json({ links });
    } catch (err) {
      console.error("Erro ao extrair links:", err);
      return res.status(500).json({ error: "Erro ao extrair links" });
    }
  });

  // Salvar API Key do usuário (localStorage no cliente, mas também podemos oferecer endpoint)
  app.post("/api/admin/save-api-key", async (req, res) => {
    try {
      const { provider, apiKey } = req.body;
      if (!provider || !apiKey) return res.status(400).json({ error: "Missing provider or apiKey" });
      // Nota: A chave é salva no localStorage do cliente, não no servidor
      // Se quiser persistir no servidor, seria necessário adicionar uma tabela de settings
      return res.json({ success: true, message: "API Key será salva no navegador" });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao salvar API Key" });
    }
  });

  app.post("/api/admin/create-links-batch", async (req, res) => {
    try {
      const { links: linksData } = req.body;
      if (!Array.isArray(linksData)) return res.status(400).json({ error: "Links must be an array" });
      let created = 0;
      for (const link of linksData) {
        try {
          // Converter closingDate (DD/MM/YYYY) para formato YYYY-MM-DD
          let encerramentoLink = link.encerramentoLink || link.closingDate;
          
          // Se estiver em formato DD/MM/YYYY, converter para YYYY-MM-DD
          if (encerramentoLink && encerramentoLink.includes('/')) {
            const [day, month, year] = encerramentoLink.split('/');
            encerramentoLink = `${year}-${month}-${day}`;
          }
          
          // Mapear status retornado pela IA para status válidos do sistema
          // REGRA ABSOLUTA: "Liberado pra Envio" e "Envio Liberado" NUNCA são alterados.
          // Esses links representam produtos em processo de envio ativo para clientes.
          const STATUS_MAP: Record<string, string> = {
            "Envio Liberado": "Liberado pra Envio",
            "Liberado": "Liberado pra Envio",
            "Pronto e Aberto": "Link Aberto",
            "Pronto": "Link Aberto",
            "Aberto": "Link Aberto",
            "Ativo": "Link Aberto",
            "Encerrado": "Fechado",
          };
          const rawStatus = link.status || "Link Aberto";
          const mappedStatus = STATUS_MAP[rawStatus] || rawStatus;

          console.log(`[CREATE_LINKS_BATCH] Criando link: ${link.nome || link.name}, status: ${rawStatus} -> ${mappedStatus}, data: ${encerramentoLink}`);
          
          await createLink({ 
            numero: link.numero || 0, 
            nome: link.nome || link.name, 
            status: mappedStatus, 
            departamento: link.departamento || "Grupo Zeglam", 
            observacoes: link.observacoes || link.observations,
            encerramentoLink: encerramentoLink
          } as any);
          created++;
        } catch (e) {
          console.error("Erro ao criar link:", e);
        }
      }
      return res.json({ created, total: linksData.length });
    } catch (err) {
      console.error("Erro ao criar links em batch:", err);
      return res.status(500).json({ error: "Erro ao criar links" });
    }
  });

  // ─── Public API v1 ────────────────────────────────────────────────────────────
  // Aceita autenticação via cookie de admin OU via chave mestre permanente
  // (header `X-Admin-Key` / `Authorization: Bearer ...`) configurada em ADMIN_MASTER_KEY.
  async function requireAdmin(req: express.Request, res: express.Response): Promise<{ adminId: number; name: string } | null> {
    // 1) Master key (permanente — não expira) via env ADMIN_MASTER_KEY
    const master = process.env.ADMIN_MASTER_KEY;
    if (master && master.length >= 16) {
      const headerKey = req.header("x-admin-key");
      const auth = req.header("authorization");
      const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
      const provided = headerKey || bearer;
      if (provided && provided === master) {
        return { adminId: 0, name: "master" };
      }
    }

    // 2) Cookie de admin (sessão JWT, expira em 7 dias)
    try {
      const { parse: parseCookies } = await import("cookie");
      const cookies = parseCookies(req.headers.cookie || "");
      const token = cookies[ADMIN_COOKIE];
      if (!token) { res.status(401).json({ error: "unauthorized", message: "Forneça X-Admin-Key, Authorization: Bearer <master>, ou faça login como admin." }); return null; }
      const { payload } = await jose.jwtVerify(token, ADMIN_JWT_SECRET);
      return { adminId: payload.adminId as number, name: payload.name as string };
    } catch {
      res.status(401).json({ error: "unauthorized" });
      return null;
    }
  }

  // List API keys (admin only)
  app.get("/api/admin/api-keys", async (req, res) => {
    const admin = await requireAdmin(req, res); if (!admin) return;
    const db = await (await import("../db")).getDb();
    if (!db) return res.status(500).json({ error: "database_unavailable" });
    const rows = await db.select({
      id: apiKeysTable.id, name: apiKeysTable.name, keyPrefix: apiKeysTable.keyPrefix,
      scopes: apiKeysTable.scopes, ativo: apiKeysTable.ativo, lastUsedAt: apiKeysTable.lastUsedAt,
      createdAt: apiKeysTable.createdAt,
    }).from(apiKeysTable).orderBy(desc(apiKeysTable.createdAt));
    return res.json(rows);
  });

  // Create API key — returns raw key once
  app.post("/api/admin/api-keys", async (req, res) => {
    const admin = await requireAdmin(req, res); if (!admin) return;
    const { name, scopes } = req.body ?? {};
    if (!name || typeof name !== "string") return res.status(400).json({ error: "name_required" });
    const db = await (await import("../db")).getDb();
    if (!db) return res.status(500).json({ error: "database_unavailable" });
    const { raw, prefix, hash } = generateApiKey();
    await db.insert(apiKeysTable).values({
      name, keyPrefix: prefix, keyHash: hash,
      scopes: typeof scopes === "string" ? scopes : "read",
      createdBy: admin.adminId,
    });
    return res.status(201).json({
      key: raw,
      prefix,
      message: "Guarde essa chave em local seguro — ela não poderá ser exibida novamente.",
    });
  });

  // Revoke API key
  app.delete("/api/admin/api-keys/:id", async (req, res) => {
    const admin = await requireAdmin(req, res); if (!admin) return;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid_id" });
    const db = await (await import("../db")).getDb();
    if (!db) return res.status(500).json({ error: "database_unavailable" });
    await db.update(apiKeysTable).set({ ativo: false }).where(eq(apiKeysTable.id, id));
    return res.json({ success: true });
  });

  // Get single link by id
  app.get("/api/v1/links/:id", requireApiKey("read"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid_id" });
      const db = await (await import("../db")).getDb();
      if (!db) return res.status(500).json({ error: "database_unavailable" });
      const { links: linksTable } = await import("../../drizzle/schema");
      const rows = await db.select().from(linksTable).where(eq(linksTable.id, id)).limit(1);
      if (!rows[0]) return res.status(404).json({ error: "not_found" });
      return res.json({ data: rows[0] });
    } catch (err) {
      console.error("[GET /api/v1/links/:id]", err);
      return res.status(500).json({ error: "internal_error" });
    }
  });

  // Create link
  app.post("/api/v1/links", requireApiKey("write"), async (req, res) => {
    try {
      const { numero, nome, status, departamento, observacoes,
        encerramentoLink, encerramentoHorario, conferenciaEstoque, romaneiosClientes,
        postadoFornecedor, dataInicioSeparacao, prazoMaxFinalizar, liberadoEnvio } = req.body ?? {};
      if (numero === undefined || numero === null || !nome) {
        return res.status(400).json({ error: "validation_error", message: "Campos obrigatórios: numero, nome." });
      }
      const created = await createLink({
        numero: Number(numero), nome, status, departamento,
        observacoes, encerramentoLink, encerramentoHorario, conferenciaEstoque, romaneiosClientes,
        postadoFornecedor, dataInicioSeparacao, prazoMaxFinalizar, liberadoEnvio,
      } as any);
      return res.status(201).json({ data: created ?? { numero, nome } });
    } catch (err) {
      console.error("[POST /api/v1/links]", err);
      return res.status(500).json({ error: "internal_error", message: "Erro ao criar link." });
    }
  });

  // Update link (partial)
  app.patch("/api/v1/links/:id", requireApiKey("write"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid_id" });
      await updateLink(id, req.body as any);
      const db = await (await import("../db")).getDb();
      if (!db) return res.status(500).json({ error: "database_unavailable" });
      const { links: linksTable } = await import("../../drizzle/schema");
      const updated = await db.select().from(linksTable).where(eq(linksTable.id, id)).limit(1);
      if (!updated[0]) return res.status(404).json({ error: "not_found" });
      return res.json({ data: updated[0] });
    } catch (err) {
      console.error("[PATCH /api/v1/links/:id]", err);
      return res.status(500).json({ error: "internal_error" });
    }
  });

  // Delete link
  app.delete("/api/v1/links/:id", requireApiKey("write"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid_id" });
      await deleteLink(id);
      return res.json({ success: true });
    } catch (err) {
      console.error("[DELETE /api/v1/links/:id]", err);
      return res.status(500).json({ error: "internal_error" });
    }
  });

  // Public endpoint — protected by API key
  app.get("/api/v1/links", requireApiKey("read"), async (req, res) => {
    try {
      const db = await (await import("../db")).getDb();
      if (!db) return res.status(500).json({ error: "database_unavailable" });
      const { links: linksTable } = await import("../../drizzle/schema");
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const departamento = typeof req.query.departamento === "string" ? req.query.departamento : undefined;
      const limit = Math.min(Number(req.query.limit) || 100, 500);
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      let rows = await db.select().from(linksTable);
      if (status) rows = rows.filter((l: any) => l.status === status);
      if (departamento) rows = rows.filter((l: any) => l.departamento === departamento);
      const total = rows.length;
      const data = rows.slice(offset, offset + limit);
      return res.json({ data, meta: { total, limit, offset } });
    } catch (err) {
      console.error("[GET /api/v1/links]", err);
      return res.status(500).json({ error: "internal_error" });
    }
  });

  // OpenAPI spec + Swagger UI
  const openApiSpec = {
    openapi: "3.0.3",
    info: { title: "Zeglam Cronograma API", version: "1.0.0", description: "API pública para integradores externos do sistema de cronograma Zeglam." },
    servers: [{ url: "/", description: "Atual" }],
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer", description: "Use sua chave: Authorization: Bearer zglm_live_..." },
        ApiKeyHeader: { type: "apiKey", in: "header", name: "X-API-Key" },
      },
      schemas: {
        Link: {
          type: "object",
          properties: {
            id: { type: "integer" }, numero: { type: "integer" }, nome: { type: "string" },
            status: { type: "string" }, departamento: { type: "string" },
            observacoes: { type: "string", nullable: true },
            encerramentoLink: { type: "string", nullable: true },
            prazoMaxFinalizar: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Error: { type: "object", properties: { error: { type: "string" }, message: { type: "string" } } },
      },
    },
    security: [{ BearerAuth: [] }, { ApiKeyHeader: [] }],
    paths: {
      "/api/v1/links": {
        get: {
          summary: "Listar links do cronograma",
          tags: ["Links"],
          parameters: [
            { name: "status", in: "query", schema: { type: "string" }, description: "Filtra por status (ex: Link Aberto, Fechado)" },
            { name: "departamento", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 100, maximum: 500 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: {
            "200": {
              description: "Lista paginada",
              content: { "application/json": { schema: {
                type: "object",
                properties: {
                  data: { type: "array", items: { $ref: "#/components/schemas/Link" } },
                  meta: { type: "object", properties: { total: { type: "integer" }, limit: { type: "integer" }, offset: { type: "integer" } } },
                },
              }}},
            },
            "401": { description: "API key ausente ou inválida", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
        post: {
          summary: "Criar link",
          tags: ["Links"],
          description: "Requer scope `write`.",
          requestBody: {
            required: true,
            content: { "application/json": { schema: {
              type: "object",
              required: ["numero", "nome"],
              properties: {
                numero: { type: "integer" }, nome: { type: "string" },
                status: { type: "string" }, departamento: { type: "string" },
                observacoes: { type: "string", nullable: true },
                encerramentoLink: { type: "string", nullable: true },
                encerramentoHorario: { type: "string", nullable: true },
                conferenciaEstoque: { type: "string", nullable: true },
                romaneiosClientes: { type: "string", nullable: true },
                postadoFornecedor: { type: "string", nullable: true },
                dataInicioSeparacao: { type: "string", nullable: true },
                prazoMaxFinalizar: { type: "string", nullable: true },
                liberadoEnvio: { type: "string", nullable: true },
              },
            }}},
          },
          responses: {
            "201": { description: "Criado", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Link" } } } } } },
            "400": { description: "Erro de validação", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "403": { description: "Sem permissão de escrita", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/v1/links/{id}": {
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        get: {
          summary: "Buscar link por id",
          tags: ["Links"],
          responses: {
            "200": { description: "Encontrado", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Link" } } } } } },
            "404": { description: "Não encontrado" },
          },
        },
        patch: {
          summary: "Atualizar link (parcial)",
          tags: ["Links"],
          description: "Requer scope `write`. Envie apenas os campos a alterar.",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/Link" } } },
          },
          responses: {
            "200": { description: "Atualizado", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Link" } } } } } },
            "404": { description: "Não encontrado" },
          },
        },
        delete: {
          summary: "Excluir link",
          tags: ["Links"],
          description: "Requer scope `write`. Exclusão permanente.",
          responses: {
            "200": { description: "Excluído", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
          },
        },
      },
    },
  };
  app.get("/api/v1/openapi.json", (_req, res) => res.json(openApiSpec));
  app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

  // ─── tRPC ─────────────────────────────────────────────────────────────────────
  app.use("/api/trpc", express.json({ limit: "50mb" }), createExpressMiddleware({ router: appRouter, createContext }));

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  server.listen(port, () => { console.log(`Server running on http://localhost:${port}/`); });

  // ── Auto-close: roda a cada minuto ───────────────────────────────────────────
  autoCloseLinksByEncerramento();
  setInterval(() => { autoCloseLinksByEncerramento(); }, 60 * 1000);

  // ── Alerta de prazos: roda às 08:00 (Brasília) todo dia ─────────────────────
  function schedulePrazoAlert() {
    const now = new Date();
    const brasilia = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const nextRun = new Date(brasilia);
    nextRun.setHours(8, 0, 0, 0);
    if (brasilia.getHours() >= 8) nextRun.setDate(nextRun.getDate() + 1);
    const msUntilFirst = nextRun.getTime() - brasilia.getTime();
    setTimeout(() => { checkPrazosAlert(); setInterval(() => { checkPrazosAlert(); }, 24 * 60 * 60 * 1000); }, msUntilFirst);
  }
  schedulePrazoAlert();

  // ── Arquivamento: roda às 02:00 (Brasília) todo dia ─────────────────────────
  function scheduleArchiveJob() {
    const now = new Date();
    const brasilia = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const nextRun = new Date(brasilia);
    nextRun.setHours(2, 0, 0, 0);
    if (brasilia.getHours() >= 2) nextRun.setDate(nextRun.getDate() + 1);
    const msUntilFirst = nextRun.getTime() - brasilia.getTime();
    setTimeout(() => { archiveOldShipments(); setInterval(() => { archiveOldShipments(); }, 24 * 60 * 60 * 1000); }, msUntilFirst);
  }
  scheduleArchiveJob();
}

startServer().catch(console.error);
