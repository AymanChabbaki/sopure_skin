import { isSnapshotted, staticDataPath } from './staticData.js';

const BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

export async function api(path, { method = 'GET', body, params, headers, signal } = {}) {
  const url = new URL(`${BASE}/api${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== false) url.searchParams.set(k, v);
    });
  }
  // Public catalog data: static snapshot first (free CDN file), live API only when it does not exist
  if (method === 'GET' && !BASE && isSnapshotted(path, url.searchParams)) {
    try {
      const res = await fetch(staticDataPath(path, url.searchParams), { signal });
      if (res.ok && res.headers.get('content-type')?.includes('json')) return await res.json();
    } catch (err) {
      if (signal?.aborted) throw err;
    }
  }
  const isForm = body instanceof FormData;
  const res = await fetch(url, {
    method,
    signal,
    credentials: 'include',
    headers: { ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}
