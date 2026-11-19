import { createHash } from 'crypto';

/**
 * Removes what does not identify a page: the fragment, a trailing slash, tracking parameters
 * and the case of the host. Anything that is not a valid address is used as written.
 */
function canonicalUrl(address: string): string {
  try {
    const url = new URL(address.trim());
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_')) url.searchParams.delete(key);
    }
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString();
  } catch {
    return address.trim();
  }
}

/**
 * Stable identifier of a vacancy: a SHA-256 of the source and the canonical address of its
 * page. The same listing always gets the same id (so it is never announced twice), a
 * different source never collides, and the length does not depend on the address.
 */
export function vacancyId(source: string, address: string): string {
  return createHash('sha256')
    .update(`${source}|${canonicalUrl(address)}`)
    .digest('hex');
}
