import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { apiKeys, type ApiKey } from "../../drizzle/schema";

export interface ApiKeyRequest extends Request {
  apiKey?: ApiKey;
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const random = crypto.randomBytes(24).toString("hex");
  const raw = `zglm_live_${random}`;
  const prefix = raw.slice(0, 14);
  const hash = hashApiKey(raw);
  return { raw, prefix, hash };
}

function extractKey(req: Request): string | null {
  const auth = req.header("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  const headerKey = req.header("x-api-key");
  if (headerKey) return headerKey.trim();
  return null;
}

export function requireApiKey(requiredScope: "read" | "write" = "read") {
  return async (req: ApiKeyRequest, res: Response, next: NextFunction) => {
    try {
      const raw = extractKey(req);
      if (!raw) {
        return res.status(401).json({
          error: "missing_api_key",
          message: "Forneça uma chave de API no header Authorization: Bearer <key> ou X-API-Key.",
        });
      }
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "database_unavailable" });

      const hash = hashApiKey(raw);
      const rows = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).limit(1);
      const key = rows[0];
      if (!key || !key.ativo) {
        return res.status(401).json({ error: "invalid_api_key", message: "Chave inválida ou revogada." });
      }

      const scopes = (key.scopes ?? "").split(",").map(s => s.trim());
      if (requiredScope === "write" && !scopes.includes("write") && !scopes.includes("*")) {
        return res.status(403).json({ error: "insufficient_scope", message: "Chave sem permissão de escrita." });
      }

      db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id)).execute().catch(() => {});

      req.apiKey = key;
      next();
    } catch (err) {
      console.error("[apiAuth] error:", err);
      return res.status(500).json({ error: "auth_failure" });
    }
  };
}
