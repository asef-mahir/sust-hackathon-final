import { headers, cookies } from 'next/headers';

/**
 * @param {string} path - e.g. '/api/dashboard' or '/api/alerts?status=PENDING'
 * @param {RequestInit} [options]
 * @returns {Promise<{ ok: boolean, status: number, body: any }>}
 */
export async function serverApiFetch(path, options = {}) {
  const headerList = await headers();
  const cookieStore = await cookies();

  const host = headerList.get('host');
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `${protocol}://${host}`;

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      cookie: cookieStore.toString(),
    },
    cache: options.cache ?? 'no-store',
  });

  const body = await response.json().catch(() => null);

  return { ok: response.ok, status: response.status, body };
}