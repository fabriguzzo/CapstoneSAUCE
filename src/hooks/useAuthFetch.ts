import { useAuth } from '../context/AuthContext';
import { useCallback } from 'react';

/**
 * Hook that returns a fetch wrapper which automatically includes
 * the Authorization header from the current auth context.
 */
export function useAuthFetch() {
  const { token } = useAuth();

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const headers = new Headers(init?.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(input, { ...init, headers });
    },
    [token]
  );

  return authFetch;
}
