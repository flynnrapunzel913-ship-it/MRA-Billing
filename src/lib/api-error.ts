import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

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

export function prismaErrorMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P1001") {
      return "Database is unavailable. Please check your connection and try again.";
    }
    if (error.code === "P2021" || error.code === "P2022") {
      return "Database schema is out of date. Run: npx prisma migrate deploy";
    }
    if (error.code === "P2002") {
      return "A record with this value already exists.";
    }
    if (error.code === "P2028") {
      return "Database is busy. Please wait a moment and try again.";
    }
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("unable to start a transaction")) {
      return "Database is busy. Please wait a moment and try again.";
    }
    if (process.env.NODE_ENV === "production") {
      return "Request failed";
    }
    return error.message;
  }
  return "Request failed";
}

/** Standard JSON 500 for API route catch blocks */
export function apiErrorResponse(error: unknown, fallback = "Unknown error", status = 500) {
  console.error("API ERROR:", error);
  const message = prismaErrorMessage(error);
  return NextResponse.json(
    { error: message !== "Request failed" ? message : fallback },
    { status: error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P1001" ? 503 : status }
  );
}
