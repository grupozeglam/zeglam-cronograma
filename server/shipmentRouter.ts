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
