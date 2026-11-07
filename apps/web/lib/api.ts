export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: 'no-store',
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  if (response.status === 401 && typeof window !== 'undefined' && !location.pathname.startsWith('/login')) {
    location.href = '/login';
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(Array.isArray(body.message) ? body.message.join(', ') : body.message || `Request failed (${response.status})`);
  }
  return response.json();
}
