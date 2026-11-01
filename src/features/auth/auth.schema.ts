import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export type SignInInput = z.infer<typeof signInSchema>;
