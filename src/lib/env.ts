import type { Env } from "../types";

export function getEnv(c: { env: Env }): Env {
  return c.env;
}

export function requireEnv(c: { env: Env }, key: keyof Env): string {
  const value = c.env[key];
  if (!value || (typeof value === "string" && value.trim() === "")) {
    throw new Error(`${String(key)} is not configured`);
  }
  return value as string;
}
