export type VisibilityRole = 'admin' | 'gm' | 'manager' | 'area_manager' | 'line_manager' | 'medical_rep' | 'accountant' | 'user' | string;

import type { User, Clinic } from './types';

export function getVisibleClinicsForUser(user: User | null | undefined, clinics: Clinic[], users?: User[]): Clinic[] {
  if (!user) return clinics;
  const role = (user.role as VisibilityRole) || 'user';
  if (role === 'admin' || role === 'gm') return clinics;

  // Area/Line based visibility
  const userArea = user.area;
  const userLine = user.line;

  // Managers: include team clinics (direct reports), plus own scope
  const directReports = users && user ? users.filter(u => u.manager === user.id) : [];
  const reportAreas = new Set((directReports || []).map(r => r.area).filter(Boolean) as string[]);
  const reportLines = new Set((directReports || []).map(r => r.line).filter(Boolean) as string[]);

  if (role === 'area_manager' || role === 'manager') {
    const own = userArea ? clinics.filter(c => c.area === userArea) : clinics;
    const team = clinics.filter(c => (c.area && reportAreas.has(c.area)) || (c.line && reportLines.has(c.line!)));
    const merged = new Map<string, Clinic>();
    [...own, ...team].forEach(c => merged.set(c.id, c));
    return [...merged.values()];
  }
  if (role === 'line_manager') {
    const own = clinics.filter(c => c.line === userLine && (!userArea || c.area === userArea));
    const team = clinics.filter(c => (c.area && reportAreas.has(c.area)) || (c.line && reportLines.has(c.line!)));
    const merged = new Map<string, Clinic>();
    [...own, ...team].forEach(c => merged.set(c.id, c));
    return [...merged.values()];
  }

  // Medical reps and others: restrict to exact area + line if both exist, else area-only or line-only
  if (userArea && userLine) {
    return clinics.filter(c => c.area === userArea && c.line === userLine);
  }
  if (userArea) return clinics.filter(c => c.area === userArea);
  if (userLine) return clinics.filter(c => c.line === userLine);
  return clinics;
}

export function getVisibleAreasForUser(user: User | null | undefined, allAreas: string[], clinics: Clinic[]): string[] {
  if (!user) return allAreas;
  const role = (user.role as VisibilityRole) || 'user';
  if (role === 'admin' || role === 'gm') return allAreas;
  if (role === 'area_manager' || role === 'manager') {
    return user.area ? [user.area] : allAreas;
  }
  if (role === 'line_manager') {
    // Areas that contain clinics in the user's line
    const set = new Set<string>();
    clinics.filter(c => c.line === user.line).forEach(c => c.area && set.add(c.area));
    return Array.from(set);
  }
  return user.area ? [user.area] : allAreas;
}

function toStringArray(input: any): string[] {
  try {
    if (Array.isArray(input)) return input.filter(Boolean).map(String);
    if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
        if (parsed && typeof parsed === 'object') return Object.values(parsed).filter(Boolean).map(String);
        return [input];
      } catch { return [input]; }
    }
    if (input && typeof input === 'object') return Object.values(input).filter(Boolean).map(String);
  } catch {}
  return [];
}

export function getVisibleLinesForUser(user: User | null | undefined, allLines: string[] | any, clinics: Clinic[]): string[] {
  const lines = toStringArray(allLines);
  if (!user) return lines;
  const role = (user.role as VisibilityRole) || 'user';
  if (role === 'admin' || role === 'gm') return lines;
  if (role === 'line_manager') {
    return user.line ? [String(user.line)] : lines;
  }
  if (role === 'area_manager' || role === 'manager') {
    // Lines that exist within user's area
    const set = new Set<string>();
    clinics.filter(c => c.area === user.area && c.line).forEach(c => set.add(String(c.line!)));
    return Array.from(set);
  }
  return user.line ? [String(user.line)] : lines;
}
