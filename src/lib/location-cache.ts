"use client";

export type CachedPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

export interface CachedLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface LocationCacheRecord {
  version: 1;
  location: CachedLocation;
}

export interface PermissionCacheRecord {
  version: 1;
  state: CachedPermissionState;
  updatedAt: number;
}

const LOCATION_KEY = 'app_location_cache_v1';
const PERMISSION_KEY = 'app_location_permission_v1';

export function loadCachedLocation(): CachedLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    const parsed: LocationCacheRecord = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !parsed.location) return null;
    return parsed.location;
  } catch {
    return null;
  }
}

export function saveCachedLocation(loc: CachedLocation): void {
  if (typeof window === 'undefined') return;
  try {
    const record: LocationCacheRecord = { version: 1, location: loc };
    localStorage.setItem(LOCATION_KEY, JSON.stringify(record));
  } catch {
    // ignore
  }
}

export function clearCachedLocation(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(LOCATION_KEY); } catch { /* noop */ }
}

export function loadCachedPermission(): CachedPermissionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PERMISSION_KEY);
    if (!raw) return null;
    const parsed: PermissionCacheRecord = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return null;
    return parsed.state;
  } catch {
    return null;
  }
}

export function saveCachedPermission(state: CachedPermissionState): void {
  if (typeof window === 'undefined') return;
  try {
    const record: PermissionCacheRecord = { version: 1, state, updatedAt: Date.now() };
    localStorage.setItem(PERMISSION_KEY, JSON.stringify(record));
  } catch {
    // ignore
  }
}

export function isFresh(loc: CachedLocation | null, maxAgeMs: number): boolean {
  if (!loc) return false;
  return Date.now() - loc.timestamp < maxAgeMs;
}

export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371000; // meters
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const sinDLat2 = Math.sin(dLat / 2);
  const sinDLon2 = Math.sin(dLon / 2);
  const c = 2 * Math.atan2(
    Math.sqrt(sinDLat2 * sinDLat2 + Math.cos(lat1) * Math.cos(lat2) * sinDLon2 * sinDLon2),
    Math.sqrt(1 - (sinDLat2 * sinDLat2 + Math.cos(lat1) * Math.cos(lat2) * sinDLon2 * sinDLon2))
  );
  return R * c;
}

export function hasMovedSignificantly(prev: CachedLocation | null, next: { latitude: number; longitude: number }, thresholdMeters = 200): boolean {
  if (!prev) return true;
  return distanceMeters(prev, next) >= thresholdMeters;
}
