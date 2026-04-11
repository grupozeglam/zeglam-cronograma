import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { shipmentsRouter } from "./shipmentRouter";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import bcrypt from "bcryptjs";
import * as jose from "jose";
import {
  listLinks, getLinkById, createLink, updateLink, deleteLink,
  countLinks, getStatusStats, bulkInsertLinks,
  listStatuses, createStatus, updateStatus, deleteStatus,
  listDepartments, createDepartment, deleteDepartment,
  getAdminByUsername,
  listShipments, getShipmentById, createShipment, updateShipment, deleteShipment, getShipmentStats,
} from "./db";

const ADMIN_COOKIE = "zeglam_admin_session";
const ADMIN_JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "zeglam-admin-secret-2025");

// ─── Seed data — 3 examples from different departments ───────────────────────
const seedData = [
  {
    numero: 338,
    nome: "Link de Luxo",
    status: "Concluída",
    departamento: "Setor de Envios",
    observacoes: "Envio liberado",
    encerramento_link: "2025-03-14",
    conferencia_estoque: "2025-03-18",
    romaneios_clientes: "2025-03-18",
    postado_fornecedor: "2025-03-19",
    data_inicio_separacao: "2025-03-21",
    prazo_max_finalizar: "2025-03-28",
    liberado_envio: "2025-03-25",
  },
  {
    numero: 339,
    nome: "Aço Inox",
    status: "Em Separação",
    departamento: "Separação",
    observacoes: "Aguardando separação",
    encerramento_link: "2025-03-16",
    conferencia_estoque: null,
    romaneios_clientes: null,
    postado_fornecedor: null,
    data_inicio_separacao: "2025-03-21",
    prazo_max_finalizar: "2025-03-28",
    liberado_envio: null,
  },
  {
    numero: 340,
    nome: "Acessórios de cabelo",
    status: "Link Aberto",
    departamento: "Grupo Zeglam",
    observacoes: null,
    encerramento_link: null,
    conferencia_estoque: null,
    romaneios_clientes: null,
    postado_fornecedor: null,
    data_inicio_separacao: null,
    prazo_max_finalizar: null,
    liberado_envio: null,
  },
];

// ─── Schemas ──────────────────────────────────────────────────────────────────
const linkSchema = z.object({
  numero: z.number(),
  nome: z.string(),
  status: z.string().optional().default("Link Aberto"),
  departamento: z.string().optional().default(""),
  observacoes: z.string().nullable().optional(),
  encerramentoLink: z.string().nullable().optional(),
  encerramentoHorario: z.string().nullable().optional(),
  conferenciaEstoque: z.string().nullable().optional(),
  romaneiosClientes: z.string().nullable().optional(),
  postadoFornecedor: z.string().nullable().optional(),
  dataInicioSeparacao: z.string().nullable().optional(),
  prazoMaxFinalizar: z.string().nullable().optional(),
  liberadoEnvio: z.string().nullable().optional(),
});

const updateLinkSchema = z.object({
  numero: z.number().optional(),
  nome: z.string().optional(),
  status: z.string().nullable().optional(),
  departamento: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  encerramentoLink: z.string().nullable().optional(),
  encerramentoHorario: z.string().nullable().optional(),
  conferenciaEstoque: z.string().nullable().optional(),
  romaneiosClientes: z.string().nullable().optional(),
  postadoFornecedor: z.string().nullable().optional(),
  dataInicioSeparacao: z.string().nullable().optional(),
  prazoMaxFinalizar: z.string().nullable().optional(),
  liberadoEnvio: z.string().nullable().optional(),
});

const shipmentSchema = z.object({
  clientName: z.string().min(1),
  galvanica: z.string().min(1),
  proofImageUrl: z.string().url(),
});

const updateShipmentSchema = z.object({
  status: z.enum(["Pendente", "Processado", "Enviado"]).optional(),
  notes: z.string().nullable().optional(),
});

// ─── Router ───────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  shipments: shipmentsRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Links ────────────────────────────────────────────────────────────────
  links: router({
    list: publicProcedure
      .input(z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        departamento: z.string().optional(),
        page: z.number().optional().default(1),
        pageSize: z.number().optional().default(50),
        sortBy: z.string().optional().default("numero"),
        sortDir: z.enum(["asc", "desc"]).optional().default("asc"),
      }))
      .query(({ input }) => listLinks({ ...input, isPublic: true })),

    stats: publicProcedure.query(async () => {
      const [total, statusStats] = await Promise.all([countLinks(), getStatusStats()]);
      return { total, statusStats };
    }),

    create: publicProcedure
      .input(linkSchema)
      .mutation(({ input }) => createLink(input as any)),

    update: publicProcedure
      .input(z.object({ id: z.number(), data: updateLinkSchema }))
      .mutation(({ input }) => updateLink(input.id, input.data as any)),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteLink(input.id)),

    seed: publicProcedure.mutation(async () => {
      const count = await countLinks();
      if (count > 0) {
        return { skipped: true, message: "Dados já importados", total: count };
      }
      const rows = seedData.map(d => ({
        numero: d.numero,
        nome: d.nome,
        status: d.status,
        departamento: d.departamento,
        observacoes: d.observacoes ?? null,
        encerramentoLink: d.encerramento_link ?? null,
        conferenciaEstoque: d.conferencia_estoque ?? null,
        romaneiosClientes: d.romaneios_clientes ?? null,
        postadoFornecedor: d.postado_fornecedor ?? null,
        dataInicioSeparacao: d.data_inicio_separacao ?? null,
        prazoMaxFinalizar: d.prazo_max_finalizar ?? null,
        liberadoEnvio: d.liberado_envio ?? null,
      }));
      await bulkInsertLinks(rows as any);
      return { skipped: false, inserted: rows.length, message: `${rows.length} registros importados` };
    }),
  }),

  // ─── Status dinâmicos ─────────────────────────────────────────────────────
  statuses: router({
    list: publicProcedure.query(() => listStatuses()),

    create: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        color: z.string().default("#b8a060"),
        bgColor: z.string().default("rgba(184,160,96,0.15)"),
        sortOrder: z.number().optional().default(0),
      }))
      .mutation(({ input }) => createStatus(input)),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        color: z.string().optional(),
        bgColor: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(({ input: { id, ...data } }) => updateStatus(id, data)),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteStatus(input.id)),
  }),

  // ─── Departamentos dinâmicos ──────────────────────────────────────────────
  departments: router({
    list: publicProcedure.query(() => listDepartments()),

    create: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        sortOrder: z.number().optional().default(0),
      }))
      .mutation(({ input }) => createDepartment(input)),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteDepartment(input.id)),
  }),

  // ─── Admin Auth (login próprio) ───────────────────────────────────────────
  adminAuth: router({
    login: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { username, password } = input;
        if (!username || !password) throw new TRPCError({ code: "BAD_REQUEST", message: "Usuário e senha são obrigatórios" });
        const admin = await getAdminByUsername(username);
        if (!admin) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha incorretos" });
        const valid = bcrypt.compareSync(password, admin.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha incorretos" });
        // Gerar JWT
        const token = await new jose.SignJWT({ adminId: admin.id, name: admin.name })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("7d")
          .sign(ADMIN_JWT_SECRET);
        // Setar cookie
        ctx.res.cookie(ADMIN_COOKIE, token, {
          httpOnly: true,
          secure: ctx.req.protocol === "https",
          sameSite: "none",
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: "/",
        });
        return { success: true, name: admin.name };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(ADMIN_COOKIE, { path: "/", sameSite: "none", secure: true });
      return { success: true };
    }),

    me: publicProcedure.query(async ({ ctx }) => {
      const { parse: parseCookies } = await import("cookie");
      const cookies = parseCookies(ctx.req.headers.cookie || "");
      const token = cookies[ADMIN_COOKIE];
      if (!token) return null;
      try {
        const { payload } = await jose.jwtVerify(token, ADMIN_JWT_SECRET);
        return { adminId: payload.adminId as number, name: payload.name as string };
      } catch {
        return null;
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
