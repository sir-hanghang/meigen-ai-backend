export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  AI_QUEUE: Queue;
  ASSETS: Fetcher;

  // Config vars
  SITE_NAME: string;
  APP_ORIGIN: string;
  AI_PROVIDER: string;
  PAYMENT_PROVIDER: string;
  ANONYMOUS_DAILY_FREE_LIMIT: string;
  SIGNUP_BONUS_CREDITS: string;
  CREDITS_PER_GENERATION: string;

  // Secrets
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  SESSION_SECRET: string;
  ADMIN_BOOTSTRAP_TOKEN: string;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
  PAYPAL_WEBHOOK_ID: string;
}

export interface User {
  id: number;
  email: string;
  name: string | null;
  avatar: string | null;
  google_id: string | null;
  plan: string;
  credits_total: number;
  credits_expiring: number;
  credits_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerationJob {
  id: number;
  user_id: number | null;
  client_id: string | null;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  topic: string | null;
  style: string | null;
  length: string | null;
  quote_text: string | null;
  quote_author: string | null;
  template_id: string | null;
  brand_config: string | null;
  size: string | null;
  image_url: string | null;
  error_message: string | null;
  credits_used: number;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
