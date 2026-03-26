import { z } from "zod";

export const createPracticeSchema = z.object({
  reference_code: z.string().trim().min(3),
  client: z.object({
    full_name: z.string().trim().min(2),
    email: z.string().email(),
    phone: z.string().trim().optional(),
    company_name: z.string().trim().optional(),
    vat_number: z.string().trim().optional(),
    city: z.string().trim().optional(),
    business_type: z.string().trim().optional(),
  }),
  square_meters: z.number().int().positive().optional(),
  quote_amount: z.number().nonnegative().default(0),
  deposit_amount: z.number().nonnegative().default(0),
  balance_amount: z.number().nonnegative().default(0),
  assigned_designer_id: z.string().uuid().nullable().optional(),
});

export const updatePracticeSchema = z.object({
  reference_code: z.string().trim().min(3).optional(),
  square_meters: z.number().int().positive().nullable().optional(),
  quote_amount: z.number().nonnegative().optional(),
  deposit_amount: z.number().nonnegative().optional(),
  balance_amount: z.number().nonnegative().optional(),
  assigned_designer_id: z.string().uuid().nullable().optional(),
});

export const workflowActionPayloadSchema = z.object({
  actor_user_id: z.string().uuid().optional().nullable(),
});
