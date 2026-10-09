import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import postgres from "postgres";
import { z } from "zod";
import { getDatabase } from "./db.server";
import { isAdminSession } from "./site-auth.server";
import {
  analyticsResultSchema,
  analyticsSchema,
  createSchema,
  manageSchema,
  resultSchema,
  scanSchema,
  urlSchema,
} from "./qr-schema";

type Transaction = postgres.TransactionSql;
interface QRRow {
  id: string;
  destination: string;
  label: string;
  password_hash: string;
  failed_attempts: number;
  locked_until: Date | string | null;
}

async function verifyPassword(tx: Transaction, id: string, password: string) {
  const [raw] = await tx`
    SELECT id, destination, label, password_hash, failed_attempts, locked_until
    FROM public.qr_links
    WHERE id = ${id}::uuid
    FOR UPDATE
  `;
  const code = raw as unknown as QRRow | undefined;
  if (!code) return { error: "Code not found or password incorrect." } as const;

  if (code.locked_until && new Date(code.locked_until).getTime() > Date.now()) {
    return { error: "Too many attempts. Try again in 15 minutes." } as const;
  }

  const [passwordCheck] = await tx`
    SELECT crypt(${password}, ${code.password_hash}) = ${code.password_hash} AS valid
  `;
  if (!passwordCheck?.["valid"]) {
    // Lock out on the fifth consecutive failure, matching the original behavior.
    await tx`
      UPDATE public.qr_links
      SET failed_attempts = CASE WHEN failed_attempts >= 4 THEN 0 ELSE failed_attempts + 1 END,
          locked_until = CASE WHEN failed_attempts >= 4 THEN now() + interval '15 minutes' ELSE NULL END
      WHERE id = ${id}::uuid
    `;
    return { error: "Code not found or password incorrect." } as const;
  }

  return { code } as const;
}

function safeDatabaseError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === "DATABASE_URL is not configured.") return error;
  return new Error(fallback);
}

function requireStudioAdmin() {
  if (!isAdminSession(getRequest())) throw new Error("Please sign in to the Airavoto Qraf studio.");
}

export const createQR = createServerFn({ method: "POST" })
  .validator(createSchema)
  .handler(async ({ data }) => {
    requireStudioAdmin();
    try {
      const db = getDatabase();
      const [row] = await db`
        INSERT INTO public.qr_links (destination, label, password_hash)
        VALUES (${data.destination}, ${data.label}, crypt(${data.password}, gen_salt('bf', 12)))
        RETURNING id, destination, label
      `;
      return resultSchema.parse(row);
    } catch (error) {
      throw safeDatabaseError(error, "Your code could not be saved. Please try again.");
    }
  });

export const manageQR = createServerFn({ method: "POST" })
  .validator(manageSchema)
  .handler(async ({ data }) => {
    requireStudioAdmin();
    try {
      const db = getDatabase();
      const outcome = await db.begin(async (tx) => {
        const verified = await verifyPassword(tx, data.id, data.password);
        if ("error" in verified) return verified;

        const [row] = data.destination
          ? await tx`
              UPDATE public.qr_links
              SET destination = ${data.destination}, failed_attempts = 0, locked_until = NULL, updated_at = now()
              WHERE id = ${data.id}::uuid
              RETURNING id, destination, label
            `
          : await tx`
              UPDATE public.qr_links
              SET failed_attempts = 0, locked_until = NULL
              WHERE id = ${data.id}::uuid
              RETURNING id, destination, label
            `;
        return { record: row } as const;
      });
      if (!("record" in outcome)) throw new Error(outcome.error);
      return resultSchema.parse(outcome.record);
    } catch (error) {
      if (error instanceof Error && /^(Code not found|Too many attempts)/.test(error.message))
        throw error;
      throw safeDatabaseError(error, "Your code could not be opened. Please try again.");
    }
  });

export const resolveQR = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const db = getDatabase();
      const [row] = await db`SELECT destination FROM public.qr_links WHERE id = ${data.id}::uuid`;
      return row ? urlSchema.parse(row["destination"]) : null;
    } catch (error) {
      throw safeDatabaseError(error, "This QR link is temporarily unavailable.");
    }
  });

export const recordScan = createServerFn({ method: "POST" })
  .validator(scanSchema)
  .handler(async ({ data }) => {
    try {
      const db = getDatabase();
      const rows = await db`
        INSERT INTO public.qr_scans (id, qr_id)
        SELECT ${data.event}::uuid, id FROM public.qr_links WHERE id = ${data.id}::uuid
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `;
      return { recorded: rows.length > 0 };
    } catch {
      // Scan tracking must never block a visitor from reaching the destination.
      return { recorded: false };
    }
  });

export const getQRAnalytics = createServerFn({ method: "POST" })
  .validator(analyticsSchema)
  .handler(async ({ data }) => {
    requireStudioAdmin();
    try {
      const db = getDatabase();
      const outcome = await db.begin(async (tx) => {
        const verified = await verifyPassword(tx, data.id, data.password);
        if ("error" in verified) return verified;
        await tx`
          UPDATE public.qr_links SET failed_attempts = 0, locked_until = NULL
          WHERE id = ${data.id}::uuid
        `;

        const [counts] = await tx`
          SELECT
            count(*) AS total,
            count(*) FILTER (WHERE scanned_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS today,
            count(*) FILTER (WHERE scanned_at >= now() - interval '7 days') AS week,
            max(scanned_at) AS last_scan
          FROM public.qr_scans
          WHERE qr_id = ${data.id}::uuid
        `;
        const scans = await tx`
          SELECT id, scanned_at
          FROM public.qr_scans
          WHERE qr_id = ${data.id}::uuid
          ORDER BY scanned_at DESC, id
          LIMIT 20 OFFSET ${data.page * 20}
        `;
        return {
          code: {
            id: verified.code.id,
            destination: verified.code.destination,
            label: verified.code.label,
          },
          total: Number(counts?.["total"] ?? 0),
          today: Number(counts?.["today"] ?? 0),
          week: Number(counts?.["week"] ?? 0),
          lastScan: counts?.["last_scan"]
            ? new Date(counts["last_scan"] as string | Date).toISOString()
            : null,
          scans: scans.map((scan) => ({
            id: scan["id"],
            scannedAt: new Date(scan["scanned_at"] as string | Date).toISOString(),
          })),
          page: data.page,
        };
      });
      if ("error" in outcome) throw new Error(outcome.error);
      return analyticsResultSchema.parse(outcome);
    } catch (error) {
      if (error instanceof Error && /^(Code not found|Too many attempts)/.test(error.message))
        throw error;
      throw safeDatabaseError(error, "Scan history could not be loaded. Please try again.");
    }
  });
