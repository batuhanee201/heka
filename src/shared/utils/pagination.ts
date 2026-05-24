import type { PaginationMeta } from '@/shared/types/index.js'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export interface CursorPayload {
  id: string
  sort_value?: string
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as CursorPayload
  } catch {
    return null
  }
}

export function parseLimit(raw?: unknown): number {
  const n = Number(raw)
  if (!isFinite(n) || n < 1) return DEFAULT_LIMIT
  return Math.min(n, MAX_LIMIT)
}

export function buildPaginationMeta(
  total: number,
  limit: number,
  items: Array<{ id: string }>,
  sortField?: string,
): PaginationMeta {
  const hasMore = items.length === limit
  const lastItem = items[items.length - 1]
  const firstItem = items[0]

  const nextCursor =
    hasMore && lastItem
      ? encodeCursor({
          id: lastItem.id,
          ...(sortField && { sort_value: String((lastItem as Record<string, unknown>)[sortField]) }),
        })
      : null

  const prevCursor =
    firstItem
      ? encodeCursor({
          id: firstItem.id,
          ...(sortField && { sort_value: String((firstItem as Record<string, unknown>)[sortField]) }),
        })
      : null

  return { total, limit, next_cursor: nextCursor, prev_cursor: prevCursor, has_more: hasMore }
}
