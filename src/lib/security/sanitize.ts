const SENSITIVE_QUERY_PARAMS = new Set([
  "token",
  "access_token",
  "refresh_token",
  "apikey",
  "api_key",
  "authorization",
  "signature",
]);

export function stripSensitiveUrlParams(value: string) {
  try {
    const url = new URL(value);
    for (const key of Array.from(url.searchParams.keys())) {
      if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) {
        url.searchParams.set(key, "[REDACTED]");
      }
    }
    return url.toString();
  } catch {
    const [path] = value.split("?");
    return path;
  }
}

export function redactSensitiveValue(value: unknown): unknown {
  if (typeof value === "string") {
    if (/^Bearer\s+/i.test(value)) return "Bearer [REDACTED]";
    if (/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(value)) {
      return "[REDACTED_JWT]";
    }
    if (value.includes("/storage/v1/object/sign/")) {
      return stripSensitiveUrlParams(value);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(redactSensitiveValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes("token") ||
          lowerKey.includes("secret") ||
          lowerKey.includes("authorization") ||
          lowerKey.includes("api_key") ||
          lowerKey.includes("apikey")
        ) {
          return [key, "[REDACTED]"];
        }
        return [key, redactSensitiveValue(entry)];
      }),
    );
  }

  return value;
}
