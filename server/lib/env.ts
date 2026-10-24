import "dotenv/config";
const production = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

function required(name: string): string {
  const value = process.env[name];
  if (!value && production) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  isProduction: production,
  databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || required("DATABASE_URL"),
};
