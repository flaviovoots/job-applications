export function parseAllowlist(raw: string): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email !== ""),
  );
}

export function isAllowed(allowlist: Set<string>, email: string): boolean {
  return allowlist.has(email.toLowerCase());
}
