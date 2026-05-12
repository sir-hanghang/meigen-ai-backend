import { Hono } from "hono";
import type { Env } from "../types";
import { success, error, jsonResponse } from "../lib/response";
import {
  createSession,
  getCurrentUser,
  setSessionCookie,
  clearSessionCookie,
} from "../lib/session";

const app = new Hono<{ Bindings: Env }>();

// Generate random state
function generateState(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

// GET /api/auth/login
app.get("/login", async (c) => {
  const env = c.env;
  const returnTo = c.req.query("returnTo") || "/";

  const clientId = env.GOOGLE_CLIENT_ID;
  const redirectUri = env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return jsonResponse(error("AUTH_NOT_CONFIGURED", "Google OAuth not configured"), 500);
  }

  const state = generateState();
  const stateWithReturn = `${state}:${encodeURIComponent(returnTo)}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: stateWithReturn,
    access_type: "online",
    prompt: "select_account",
  });

  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  // Set state cookie
  const headers = new Headers();
  headers.set(
    "Set-Cookie",
    `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
  );
  headers.set("Location", oauthUrl);

  return new Response(null, { status: 302, headers });
});

// GET /api/auth/callback/google
app.get("/callback/google", async (c) => {
  const env = c.env;
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code || !state) {
    return jsonResponse(error("AUTH_CALLBACK_ERROR", "Missing code or state"), 400);
  }

  // Verify state
  const cookie = c.req.header("cookie");
  const stateMatch = cookie?.match(/oauth_state=([^;]+)/);
  const cookieState = stateMatch ? decodeURIComponent(stateMatch[1]) : null;

  const [stateValue, returnToEncoded] = state.split(":");
  const returnTo = returnToEncoded ? decodeURIComponent(returnToEncoded) : "/";

  if (!cookieState || cookieState !== stateValue) {
    return jsonResponse(error("AUTH_STATE_MISMATCH", "Invalid state parameter"), 400);
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return jsonResponse(error("AUTH_TOKEN_ERROR", `Token exchange failed: ${err}`), 400);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    id_token?: string;
  };

  // Get user info
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    return jsonResponse(error("AUTH_USER_INFO_ERROR", "Failed to fetch user info"), 400);
  }

  const googleUser = (await userRes.json()) as {
    id: string;
    email: string;
    name: string;
    picture: string;
  };

  // Upsert user in D1
  const db = env.DB;

  // Check if user exists
  let user = await db
    .prepare("SELECT * FROM users WHERE google_id = ?")
    .bind(googleUser.id)
    .first<{
      id: number;
      email: string;
      name: string | null;
      avatar: string | null;
      plan: string;
      credits_total: number;
    }>();

  if (!user) {
    // Create new user with signup bonus
    const signupBonus = parseInt(env.SIGNUP_BONUS_CREDITS || "10");
    const result = await db
      .prepare(
        `INSERT INTO users (email, name, avatar, google_id, plan, credits_total)
         VALUES (?, ?, ?, ?, 'free', ?)`
      )
      .bind(googleUser.email, googleUser.name, googleUser.picture, googleUser.id, signupBonus)
      .run();

    const userId = result.meta?.last_row_id;
    if (userId) {
      // Record signup bonus transaction
      await db
        .prepare(
          `INSERT INTO credit_transactions (user_id, amount, type, description)
           VALUES (?, ?, 'signup_bonus', 'Welcome bonus for new user')`
        )
        .bind(userId, signupBonus)
        .run();

      user = {
        id: userId,
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.picture,
        plan: "free",
        credits_total: signupBonus,
      };
    }
  }

  if (!user) {
    return jsonResponse(error("AUTH_USER_CREATE_ERROR", "Failed to create user"), 500);
  }

  // Create session
  const session = await createSession(env, {
    userId: user.id,
    email: user.email,
    name: user.name || undefined,
    avatar: user.avatar || undefined,
    plan: user.plan,
  });

  // Set session cookie and redirect
  const headers = new Headers();
  headers.set("Set-Cookie", setSessionCookie(session));
  headers.set("Set-Cookie", "oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");
  headers.set("Location", returnTo);

  return new Response(null, { status: 302, headers });
});

// GET /api/auth/me
app.get("/me", async (c) => {
  const user = await getCurrentUser(c.req.raw, c.env);
  if (!user) {
    return jsonResponse(error("AUTH_REQUIRED", "Not authenticated"), 401);
  }

  // Get fresh credit balance
  const db = c.env.DB;
  const row = await db
    .prepare("SELECT credits_total, credits_expiring, credits_expires_at FROM users WHERE id = ?")
    .bind(user.userId)
    .first<{ credits_total: number; credits_expiring: number; credits_expires_at: string | null }>();

  return c.json(
    success({
      userId: user.userId,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      plan: user.plan,
      credits: {
        total: row?.credits_total ?? 0,
        expiring: row?.credits_expiring ?? 0,
        expiresAt: row?.credits_expires_at ?? null,
      },
    })
  );
});

// POST /api/auth/logout
app.post("/logout", async (c) => {
  const headers = new Headers();
  headers.set("Set-Cookie", clearSessionCookie());
  return jsonResponse(success({ message: "Logged out" }), 200, Object.fromEntries(headers));
});

export default app;
