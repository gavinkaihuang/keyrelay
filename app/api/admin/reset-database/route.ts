import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

const RESET_HEADER = "x-keyrelay-reset-token";
const REQUIRED_CONFIRM_TEXT = "RESET_DATABASE";

function readResetToken(request: NextRequest) {
  const explicitToken = request.headers.get(RESET_HEADER)?.trim();

  if (explicitToken) {
    return explicitToken;
  }

  const auth = request.headers.get("authorization")?.trim();

  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  return "";
}

export async function POST(request: NextRequest) {
  const allowReset = process.env.KEYRELAY_ALLOW_DATABASE_RESET?.trim() === "true";

  if (!allowReset) {
    return NextResponse.json(
      {
        success: false,
        code: "RESET_DISABLED",
        message: "Database reset is disabled. Set KEYRELAY_ALLOW_DATABASE_RESET=true to enable.",
      },
      { status: 403 },
    );
  }

  const configuredResetToken = process.env.KEYRELAY_DATABASE_RESET_TOKEN?.trim();

  if (!configuredResetToken) {
    return NextResponse.json(
      {
        success: false,
        code: "MISCONFIGURED_RESET_TOKEN",
        message: "Missing KEYRELAY_DATABASE_RESET_TOKEN.",
      },
      { status: 500 },
    );
  }

  const requestToken = readResetToken(request);

  if (!requestToken) {
    return NextResponse.json(
      {
        success: false,
        code: "UNAUTHORIZED",
        message: "Missing reset token.",
      },
      { status: 401 },
    );
  }

  if (requestToken !== configuredResetToken) {
    return NextResponse.json(
      {
        success: false,
        code: "FORBIDDEN",
        message: "Invalid reset token.",
      },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        confirm?: string;
      }
    | null;

  if (!body || body.confirm !== REQUIRED_CONFIRM_TEXT) {
    return NextResponse.json(
      {
        success: false,
        code: "BAD_REQUEST",
        message: `Body must include { \"confirm\": \"${REQUIRED_CONFIRM_TEXT}\" }`,
      },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`TRUNCATE TABLE usage_logs, keys RESTART IDENTITY CASCADE`;
    });

    return NextResponse.json({
      success: true,
      message: "Database data has been reinitialized.",
      resetScope: "keys + usage_logs",
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[KeyRelay] Database reset failed:", error);

    return NextResponse.json(
      {
        success: false,
        code: "INTERNAL_ERROR",
        message: "Failed to reset database.",
      },
      { status: 500 },
    );
  }
}