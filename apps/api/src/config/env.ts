import { z } from "zod";

// In production (Render), all environment variables are set directly.
// In development, create a .env file locally and it will be loaded by your development server.
// Note: dotenv.config() is intentionally skipped in production deployments.

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APP_BASE_URL: z.string().default("http://localhost:4000"),
  MOBILE_BASE_URL: z.string().default("ahmedabadcar://"),
  JWT_ACCESS_SECRET: z.string().default("replace-access-secret"),
  JWT_REFRESH_SECRET: z.string().default("replace-refresh-secret"),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("30d"),
  POSTGRES_URL: z.string().optional(),
  COMMISSION_PERCENT: z.coerce.number().min(0).max(50).default(12),
  MSG91_FLOW_ID: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SENDER: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  ORS_API_KEY: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_DATABASE_URL: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .pipe(z.string().url().optional())
});

export type Env = z.infer<typeof envSchema>;
export const env = envSchema.parse(process.env);
