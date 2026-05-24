import { z } from 'zod'

export const RegisterSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalı')
    .max(72, 'Şifre en fazla 72 karakter olabilir'),
  full_name: z.string().min(2, 'Ad en az 2 karakter olmalı').max(100),
  phone: z.string().regex(/^\+?[0-9\s\-()]{7,20}$/, 'Geçerli bir telefon numarası girin').optional(),
})

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const RefreshSchema = z.object({
  refresh_token: z.string().min(1),
})

export const LogoutSchema = z.object({
  all_devices: z.boolean().default(false),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type RefreshInput = z.infer<typeof RefreshSchema>
export type LogoutInput = z.infer<typeof LogoutSchema>
