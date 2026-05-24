import type { FastifyReply } from 'fastify'
import type { ApiResponse, ApiListResponse, ApiErrorResponse, PaginationMeta } from '@/shared/types/index.js'
import type { AppError } from '@/shared/errors/index.js'

export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode = 200): void {
  const body: ApiResponse<T> = { success: true, data }
  reply.status(statusCode).send(body)
}

export function sendList<T>(
  reply: FastifyReply,
  data: T[],
  pagination: PaginationMeta,
  statusCode = 200,
): void {
  const body: ApiListResponse<T> = { success: true, data, pagination }
  reply.status(statusCode).send(body)
}

export function sendError(
  reply: FastifyReply,
  error: AppError | Error,
  statusCode?: number,
): void {
  const isAppError = error.name === 'AppError'
  const code = isAppError ? (error as AppError).code : 'INTERNAL_ERROR'
  const status = statusCode ?? (isAppError ? (error as AppError).statusCode : 500)
  const details = isAppError ? (error as AppError).details : undefined

  const body: ApiErrorResponse = {
    success: false,
    error: { code, message: error.message, ...(details !== undefined && { details }) },
  }

  reply.status(status).send(body)
}

export function sendCreated<T>(reply: FastifyReply, data: T): void {
  sendSuccess(reply, data, 201)
}

export function sendNoContent(reply: FastifyReply): void {
  reply.status(204).send()
}
