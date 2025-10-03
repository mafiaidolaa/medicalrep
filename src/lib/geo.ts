// Minimal geohash encoder (base32) for server-side use
// Precision default 10 (~1.2m at equator)
export function encodeGeohash(lat: number, lon: number, precision = 10): string {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = '';

  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const lonMid = (lonMin + lonMax) / 2;
      if (lon >= lonMid) {
        idx = idx * 2 + 1;
        lonMin = lonMid;
      } else {
        idx = idx * 2;
        lonMax = lonMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) {
        idx = idx * 2 + 1;
        latMin = latMid;
      } else {
        idx = idx * 2;
        latMax = latMid;
      }
    }

    evenBit = !evenBit;

    if (++bit == 5) {
      geohash += base32.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }

  return geohash;
}
