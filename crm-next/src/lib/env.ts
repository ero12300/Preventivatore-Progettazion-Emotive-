import { z } from "zod";
import { SCHEDULER_PROVIDERS } from "./crm-types";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  CRM_SCHEDULER_PROVIDER: z.enum(SCHEDULER_PROVIDERS).default("calendly"),
  CRON_SECRET: z.string().optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  CRM_SCHEDULER_PROVIDER: process.env.CRM_SCHEDULER_PROVIDER,
  CRON_SECRET: process.env.CRON_SECRET,
});
