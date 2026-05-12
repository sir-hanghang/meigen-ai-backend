import { SignJWT, jwtVerify } from "jose";
import type { Env } from "../types";

export interface SessionPayload {
  userId: number;
  email: string;
  name?: string;
  avatar?: string;
  plan: string;
}

const COOKIE_NAME = "meigen_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(env: Env): Uint8Array {
  return new TextEncoder().encode(env.SESSION_SECRET);
}

export async function createSession(
  env: Env,
  payload: SessionPayload
): Promise<string> {
  const secret = getSecret(env);
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  return token;
}

export async function verifySession(
  env: Env,
  token: string
): Promise<SessionPayload | null> {
  try {
    const secret = getSecret(env);
    const { payload } = await jwtVerify(token, secret, {
      clockTolerance: 60,
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function getSessionCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export async function getCurrentUser(
  request: Request,
  env: Env
): Promise<SessionPayload | null> {
  const token = getSessionCookie(request);
  if (!token) return null;
  return verifySession(env, token);
}
