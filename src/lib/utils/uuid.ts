/**
 * Cross-platform UUID generator
 * Provides a fallback for environments where crypto.randomUUID is not available
 */

export function generateUUID(): string {
  try {
    // Try using crypto.randomUUID first (available in modern browsers and Node.js 16+)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {
    // Fallback if crypto.randomUUID fails or is not available
  }
  
  // Fallback UUID v4 generator (RFC 4122 compliant)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a short random ID (non-UUID format)
 * Useful for temporary IDs or when a full UUID is not needed
 */
export function generateShortId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Generate a secure random string for tokens, nonces, etc.
 */
export function generateSecureRandomString(length: number = 32): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      // Generate multiple UUIDs and combine them
      const uuids = [];
      const neededUUIDs = Math.ceil(length / 32);
      for (let i = 0; i < neededUUIDs; i++) {
        uuids.push(crypto.randomUUID().replace(/-/g, ''));
      }
      return uuids.join('').substring(0, length);
    }
  } catch (e) {
    // Fallback
  }
  
  // Fallback secure random string generator
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}