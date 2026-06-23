import path from "node:path";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv({
  path: path.resolve(process.cwd(), ".env"),
});

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3001),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT,
});
