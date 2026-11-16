import "dotenv/config";

const NODE_ENV = process.env.NODE_ENV || "development";

/**
 * Secrets must never fall back to a public default in production.
 * Dev keeps the placeholder so `npm run dev` works out of the box.
 */
function secret(name: string, devFallback: string): string {
  const value = (process.env[name] || "").trim();
  if (NODE_ENV !== "production") return value || devFallback;
  if (!value) throw new Error(`${name} must be set when NODE_ENV=production`);
  if (value.includes("change-me") || value.length < 32) {
    throw new Error(`${name} must be a strong secret (32+ chars, no placeholder) when NODE_ENV=production`);
  }
  return value;
}

export const env = {
  NODE_ENV,
  PORT: Number(process.env.PORT) || 4000,
  WEB_URL: process.env.WEB_URL || "http://localhost:3000",
  API_URL: process.env.API_URL || "http://localhost:4000",
  CORS_ORIGINS: (process.env.CORS_ORIGINS || "http://localhost:3000").split(","),
  DATABASE_URL: process.env.DATABASE_URL || "",
  REDIS_URL: process.env.REDIS_URL || "",
  JWT_SECRET: secret("JWT_SECRET", "dev-access-secret-change-me"),
  REFRESH_SECRET: secret("REFRESH_SECRET", "dev-refresh-secret-change-me"),
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  EMAIL_FROM: process.env.EMAIL_FROM || "noreply@example.com",
  S3_ENDPOINT: process.env.S3_ENDPOINT || "",
  S3_BUCKET: process.env.S3_BUCKET || "salesflow",
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || "",
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || "",
  S3_REGION: process.env.S3_REGION || "us-east-1",
  ACCESS_TTL_MS: 15 * 60 * 1000,
  REFRESH_TTL_MS: 7 * 24 * 60 * 60 * 1000,
};
