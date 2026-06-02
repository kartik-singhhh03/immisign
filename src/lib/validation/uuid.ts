import { z } from "zod";

export const uuidSchema = z.string().uuid();

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidSchema.safeParse(value).success;
}

export function assertUuid(value: unknown, name: string): asserts value is string {
  if (!isUuid(value)) {
    throw new Error(`${name} must be a valid UUID. Received "${String(value)}".`);
  }
}
