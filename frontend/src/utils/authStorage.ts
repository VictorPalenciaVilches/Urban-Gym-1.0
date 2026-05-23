/** Claves de sesión; no borrar todo localStorage para no perder datos de conveniencia (ej. correo recordado). */
const AUTH_KEYS = ['accessToken', 'refreshToken', 'user'] as const;

export const REMEMBERED_LOGIN_EMAIL_KEY = 'rememberLoginEmail';

/** Quita solo tokens y usuario actual; preserva otros datos (correo recordado, pendingPlan, etc.). */
export function clearAuthCredentials(): void {
  AUTH_KEYS.forEach((k) => localStorage.removeItem(k));
}
