import { z } from "zod";

/** Postgres accepts any 8-4-4-4-12 hex UUID; Zod's .uuid() rejects non-RFC variants (e.g. seed rows). */
const POSTGRES_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuidSchema = z.string().refine((v) => POSTGRES_UUID_RE.test(v), {
  message: "Invalid UUID format",
});

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && POSTGRES_UUID_RE.test(value);
}

export function assertUuid(value: unknown, name: string): asserts value is string {
  if (!isUuid(value)) {
    throw new Error(`${name} must be a valid UUID. Received "${String(value)}".`);
  }
}
