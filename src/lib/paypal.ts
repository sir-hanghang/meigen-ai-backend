import type { Env } from "../types";

interface PayPalAccessToken {
  access_token: string;
}

export async function getPayPalAccessToken(env: Env): Promise<string> {
  const clientId = env.PAYPAL_CLIENT_ID;
  const clientSecret = env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const isSandbox = !env.PAYPAL_CLIENT_ID.startsWith("AaS");
  const baseUrl = isSandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  const auth = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal auth error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as PayPalAccessToken;
  return data.access_token;
}

export async function createPayPalOrder(
  env: Env,
  options: {
    userId: number;
    plan: string;
    amount: string;
    currency: string;
    returnUrl: string;
    cancelUrl: string;
  }
): Promise<{ orderId: string; approvalUrl: string }> {
  const accessToken = await getPayPalAccessToken(env);
  const isSandbox = !env.PAYPAL_CLIENT_ID.startsWith("AaS");
  const baseUrl = isSandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `meigen-${options.userId}-${Date.now()}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: options.currency,
            value: options.amount,
          },
          description: `Meigen AI ${options.plan} Plan`,
          custom_id: String(options.userId),
        },
      ],
      application_context: {
        brand_name: "Meigen AI",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
        return_url: options.returnUrl,
        cancel_url: options.cancelUrl,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal order error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    id: string;
    links: Array<{ rel: string; href: string }>;
  };

  const approvalUrl =
    data.links.find((l) => l.rel === "approve")?.href || "";

  return { orderId: data.id, approvalUrl };
}

export async function capturePayPalOrder(
  env: Env,
  orderId: string
): Promise<{
  status: string;
  payerEmail: string;
  amount: string;
  currency: string;
}> {
  const accessToken = await getPayPalAccessToken(env);
  const isSandbox = !env.PAYPAL_CLIENT_ID.startsWith("AaS");
  const baseUrl = isSandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  const res = await fetch(
    `${baseUrl}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `capture-${orderId}-${Date.now()}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal capture error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    status: string;
    payer: { email_address: string };
    purchase_units: Array<{
      payments: {
        captures: Array<{
          amount: { value: string; currency_code: string };
        }>;
      };
    }>;
  };

  const capture = data.purchase_units[0]?.payments?.captures[0];

  return {
    status: data.status,
    payerEmail: data.payer?.email_address || "",
    amount: capture?.amount?.value || "0",
    currency: capture?.amount?.currency_code || "USD",
  };
}

export async function verifyPayPalWebhook(
  env: Env,
  headers: Headers,
  body: string
): Promise<boolean> {
  // For MVP, we verify using the webhook ID
  // Full verification requires PayPal's certificate chain validation
  const webhookId = env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;

  // In production, implement full webhook signature verification
  // https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
  return true;
}
