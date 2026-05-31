/** Extract a user-facing message from API JSON error bodies */
export function messageFromApiBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const data = body as { error?: string | { fieldErrors?: Record<string, string[] | undefined> } };
  if (typeof data.error === "string") return data.error;
  if (data.error && typeof data.error === "object" && "fieldErrors" in data.error) {
    const fields = data.error.fieldErrors;
    if (fields) {
      const first = Object.values(fields).flat().find((m) => typeof m === "string");
      if (first) return first;
    }
  }
  return fallback;
}

export async function readApiResponse<T>(
  res: Response,
  fallbackError = "Request failed"
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const text = await res.text();

  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        ok: false,
        message: res.ok
          ? "Invalid server response"
          : `${fallbackError} (${res.status})`,
      };
    }
  }

  if (!res.ok) {
    return {
      ok: false,
      message: messageFromApiBody(parsed, text ? fallbackError : `${fallbackError} (${res.status})`),
    };
  }

  if (parsed === null) {
    return { ok: false, message: "Empty server response" };
  }

  return { ok: true, data: parsed as T };
}
