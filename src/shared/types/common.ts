export type UUID = string
export type ISODateString = string
export type Nullable<T> = T | null

export type SortOrder = 'asc' | 'desc'

export interface TimestampFields {
  created_at: ISODateString
  updated_at: ISODateString
}

export interface SoftDeleteFields extends TimestampFields {
  deleted_at: Nullable<ISODateString>
}

export type WithoutTimestamps<T> = Omit<T, keyof TimestampFields>
export type WithoutSoftDelete<T> = Omit<T, keyof SoftDeleteFields>
