import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  cnpj: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((digits) => digits.length === 14, {
      message: "CNPJ deve conter 14 dígitos",
    }),
});

export type ClientInput = z.infer<typeof clientSchema>;