// Simple in-memory micro-cache with TTL
// Usage:
// import { microCache } from '@/lib/micro-cache'
// const data = await microCache.getOrSet(key, ttlMs, async () => fetchData())

type Value<T> = { v: T; t: number; ttl: number }

class MicroCache {
  private store = new Map<string, Value<any>>()

  get<T>(key: string): T | undefined {
    const hit = this.store.get(key)
    if (!hit) return undefined
    if (Date.now() - hit.t > hit.ttl) {
      this.store.delete(key)
      return undefined
    }
    return hit.v as T
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { v: value, t: Date.now(), ttl: ttlMs })
  }

  async getOrSet<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== undefined) return cached
    const v = await loader()
    this.set(key, v, ttlMs)
    return v
  }

  clear(key?: string) {
    if (key) this.store.delete(key)
    else this.store.clear()
  }
}

export const microCache = new MicroCache()
