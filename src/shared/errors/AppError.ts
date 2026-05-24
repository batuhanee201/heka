import type { ErrorCode } from './error-codes.js'

export class AppError extends Error {
  readonly statusCode: number
  readonly code: ErrorCode
  readonly details?: unknown

  constructor(message: string, code: ErrorCode, statusCode = 400, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }

  static unauthorized(message = 'Kimlik doğrulama gerekli'): AppError {
    return new AppError(message, 'UNAUTHORIZED', 401)
  }

  static forbidden(message = 'Bu işlem için yetkiniz yok'): AppError {
    return new AppError(message, 'FORBIDDEN', 403)
  }

  static notFound(resource = 'Kaynak'): AppError {
    return new AppError(`${resource} bulunamadı`, 'NOT_FOUND', 404)
  }

  static conflict(message: string): AppError {
    return new AppError(message, 'CONFLICT', 409)
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError(message, 'VALIDATION_ERROR', 422, details)
  }

  static internal(message = 'Sunucu hatası'): AppError {
    return new AppError(message, 'INTERNAL_ERROR', 500)
  }
}
