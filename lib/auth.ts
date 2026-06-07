/** Shared auth helpers. Login and provisioning MUST agree on the username→email mapping. */

export type Role = "director" | "manager" | "seller";

/** Sellers/staff log in with a username; Supabase Auth needs an email, so we map to a hidden synthetic one. */
export const SYNTHETIC_EMAIL_DOMAIN = "tradeflow.local";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

/** Human label per role (Azerbaijani). */
export function roleLabel(role: Role): string {
  return role === "director" ? "Direktor" : role === "manager" ? "Menecer" : "Satıcı";
}

/** Landing route for each role after login. */
export function roleHome(role: Role): string {
  switch (role) {
    case "director":
      return "/director";
    case "manager":
      return "/manager";
    case "seller":
      return "/seller";
  }
}
