import argon2 from 'argon2'
import { env } from '@/config/env.js'

const hashOptions = {
  type: argon2.argon2id,
  memoryCost: env.ARGON2_MEMORY_COST,
  timeCost: env.ARGON2_TIME_COST,
  parallelism: env.ARGON2_PARALLELISM,
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, hashOptions)
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password)
}
