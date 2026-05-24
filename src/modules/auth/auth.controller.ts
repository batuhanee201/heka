import type { FastifyRequest, FastifyReply } from 'fastify'
import { AuthService } from './auth.service.js'
import {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
  LogoutSchema,
} from './auth.schema.js'
import { sendSuccess, sendCreated, sendNoContent, sendError } from '@/shared/utils/response.js'
import { AppError } from '@/shared/errors/index.js'

export class AuthController {
  private readonly service: AuthService

  constructor(service: AuthService) {
    this.service = service
  }

  register = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const parsed = RegisterSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(reply, AppError.validation('Geçersiz kayıt verisi', parsed.error.flatten()))
      return
    }

    try {
      const user = await this.service.register(parsed.data)
      sendCreated(reply, { user })
    } catch (err) {
      sendError(reply, err instanceof Error ? err : AppError.internal())
    }
  }

  login = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const parsed = LoginSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(reply, AppError.validation('Geçersiz giriş verisi', parsed.error.flatten()))
      return
    }

    try {
      const result = await this.service.login(parsed.data, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })
      sendSuccess(reply, result)
    } catch (err) {
      sendError(reply, err instanceof Error ? err : AppError.internal())
    }
  }

  refresh = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const parsed = RefreshSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(reply, AppError.validation('refresh_token gerekli'))
      return
    }

    try {
      const result = await this.service.refresh(parsed.data)
      sendSuccess(reply, result)
    } catch (err) {
      sendError(reply, err instanceof Error ? err : AppError.internal())
    }
  }

  logout = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const parsed = LogoutSchema.safeParse(req.body ?? {})

    try {
      await this.service.logout(req.userId, parsed.success ? parsed.data.all_devices : false)
      sendNoContent(reply)
    } catch (err) {
      sendError(reply, err instanceof Error ? err : AppError.internal())
    }
  }

  me = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const user = await this.service.getMe(req.userId)
      sendSuccess(reply, { user })
    } catch (err) {
      sendError(reply, err instanceof Error ? err : AppError.internal())
    }
  }
}
