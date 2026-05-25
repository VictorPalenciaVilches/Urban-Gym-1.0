/** Quita solo tokens y usuario actual. */
export function clearAuthCredentials(): void {
  ['accessToken', 'refreshToken', 'user'].forEach((k) => localStorage.removeItem(k));
}
