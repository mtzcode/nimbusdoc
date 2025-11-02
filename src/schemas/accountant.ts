import { z } from "zod";

export const accountantCreateSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
});

export const accountantUpdateSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  newPassword: z.string().min(8, "Senha deve ter ao menos 8 caracteres").optional().or(z.literal("")),
});

export type AccountantCreateInput = z.infer<typeof accountantCreateSchema>;
export type AccountantUpdateInput = z.infer<typeof accountantUpdateSchema>;