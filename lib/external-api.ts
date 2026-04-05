import { NextRequest, NextResponse } from "next/server";

const TOKEN_HEADER = "x-keyrelay-token";

type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "NO_KEYS_AVAILABLE"
  | "INTERNAL_ERROR"
  | "MISCONFIGURED_EXTERNAL_TOKEN";

export function apiSuccess(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(
    {
      success: true,
      ...data,
    },
    { status },
  );
}

export function apiError(status: number, code: ErrorCode, message: string) {
  return NextResponse.json(
    {
      success: false,
      code,
      message,
    },
    { status },
  );
}

function readRequestToken(request: NextRequest) {
  const explicitToken = request.headers.get(TOKEN_HEADER)?.trim();

  if (explicitToken) {
    return explicitToken;
  }

  const auth = request.headers.get("authorization")?.trim();

  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  return "";
}

export function requireExternalApiAuth(request: NextRequest) {
  const configuredToken = process.env.KEYRELAY_EXTERNAL_API_TOKEN?.trim();

  if (!configuredToken) {
    return apiError(
      500,
      "MISCONFIGURED_EXTERNAL_TOKEN",
      "Missing KEYRELAY_EXTERNAL_API_TOKEN",
    );
  }

  const requestToken = readRequestToken(request);

  if (!requestToken) {
    return apiError(401, "UNAUTHORIZED", "Missing API token");
  }

  if (requestToken !== configuredToken) {
    return apiError(403, "FORBIDDEN", "Invalid API token");
  }

  return null;
}