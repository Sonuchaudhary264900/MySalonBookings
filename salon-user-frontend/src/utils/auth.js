// ── Customer auth helpers ──────────────────────────────────────

export function getCustomerToken() {
  return localStorage.getItem("customerToken");
}

/**
 * Returns true if a valid customer-role JWT is present.
 * Catches malformed tokens without throwing.
 */
export function isCustomer() {
  const token = getCustomerToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role === "customer";
  } catch {
    return false;
  }
}

export function clearCustomerAuth() {
  localStorage.removeItem("customerToken");
  localStorage.removeItem("customerRefreshToken");
  localStorage.removeItem("customerFavorites");
}
