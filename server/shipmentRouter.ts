import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { listShipments, getShipmentById, createShipment, updateShipment, deleteShipment, getShipmentStats, getSupplierByUsername, getSupplierById, listSuppliers, deleteShipmentMultiple, updateShipmentMultiple } from "./db";
import { notifyOwner } from "./_core/notification";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import * as jose from "jose";

const shipmentSchema = z.object({
  clientName: z.string().min(1),
  galvanica: z.string().min(1),
  proofImageUrl: z.string().url(),
});

const updateShipmentSchema = z.object({
  status: z.enum(["Pendente", "Processado", "Enviado"]).optional(),
  notes: z.string().nullable().optional(),
});

const SUPPLIER_COOKIE = "zeglam_supplier_session";
const SUPPLIER_JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "zeglam-supplier-secret-2025");

export const shipmentsRouter = router({
  list: publicProcedure
    .input(z.object({
      page: z.number().optional().default(1),
      pageSize: z.number().optional().default(20),
      status: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return await listShipments(input);
    }),

  getById: publicProcedure
    .input(z.number())
    .query(async ({ input }) => {
      return await getShipmentById(input);
    }),

  create: publicProcedure
    .input(shipmentSchema)
    .mutation(async ({ input }) => {
      const shipment = await createShipment({
        supplierId: 1,
        supplier: "sp" as const,
        clientName: input.clientName,
        galvanica: input.galvanica,
        proofImageUrl: input.proofImageUrl,
        status: "Pendente",
      });

      try {
        await notifyOwner({
          title: "Novo comprovante de frete recebido",
          content: `Cliente: ${input.clientName}\nGalvânica: ${input.galvanica}`,
        });
      } catch (error) {
        console.error("[SHIPMENT] Erro ao enviar notificação:", error);
      }

      return shipment;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: updateShipmentSchema,
    }))
    .mutation(async ({ input }) => {
      return await updateShipment(input.id, input.data);
    }),

  delete: protectedProcedure
    .input(z.number())
    .mutation(async ({ input }) => {
      await deleteShipment(input);
      return { success: true };
    }),

  deleteMultiple: protectedProcedure
    .input(z.array(z.number()))
    .mutation(async ({ input }) => {
      await deleteShipmentMultiple(input);
      return { success: true };
    }),

  updateMultiple: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()),
      status: z.enum(["Pendente", "Processado", "Enviado"]),
    }))
    .mutation(async ({ input }) => {
      await updateShipmentMultiple(input.ids, { status: input.status });
      return { success: true };
    }),

  stats: publicProcedure
    .query(async () => {
      return await getShipmentStats();
    }),

  // Supplier Auth
  suppliers: router({
    list: publicProcedure.query(async () => {
      return await listSuppliers();
    }),

    login: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const supplier = await getSupplierByUsername(input.username);
        if (!supplier) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha incorretos" });
        const valid = bcrypt.compareSync(input.password, supplier.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha incorretos" });

        const token = await new jose.SignJWT({ supplierId: supplier.id, name: supplier.name })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("7d")
          .sign(SUPPLIER_JWT_SECRET);

        const isSecure = ctx.req.protocol === "https" || ctx.req.headers["x-forwarded-proto"] === "https";
        ctx.res.cookie(SUPPLIER_COOKIE, token, {
          httpOnly: true,
          secure: isSecure,
          sameSite: isSecure ? "none" : "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: "/",
        });

        return { success: true, name: supplier.name };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const isSecure = ctx.req.protocol === "https" || ctx.req.headers["x-forwarded-proto"] === "https";
      ctx.res.clearCookie(SUPPLIER_COOKIE, { path: "/", sameSite: isSecure ? "none" : "lax", secure: isSecure });
      return { success: true };
    }),

    me: publicProcedure.query(async ({ ctx }) => {
      const { parse: parseCookies } = await import("cookie");
      const cookies = parseCookies(ctx.req.headers.cookie || "");
      const token = cookies[SUPPLIER_COOKIE];
      if (!token) return null;
      try {
        const { payload } = await jose.jwtVerify(token, SUPPLIER_JWT_SECRET);
        return { supplierId: payload.supplierId as number, name: payload.name as string };
      } catch {
        return null;
      }
    }),

    myShipments: publicProcedure
      .input(z.object({
        page: z.number().optional().default(1),
        pageSize: z.number().optional().default(20),
        status: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const { parse: parseCookies } = await import("cookie");
        const cookies = parseCookies(ctx.req.headers.cookie || "");
        const token = cookies[SUPPLIER_COOKIE];
        if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Não autenticado" });

        try {
          const { payload } = await jose.jwtVerify(token, SUPPLIER_JWT_SECRET);
          const supplier = await getSupplierById(payload.supplierId as number);
          if (!supplier) throw new TRPCError({ code: "UNAUTHORIZED", message: "Fornecedor não encontrado" });

          // FIX: Filter shipments by supplierId instead of searching by supplier name
          // This ensures all shipments for the logged-in supplier are returned
          return await listShipments({
            page: input.page,
            pageSize: input.pageSize,
            status: input.status,
            supplier: supplier.name, // Filter by supplier name
          });
        } catch (error) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Sessão inválida" });
        }
      }),
  }),
});
