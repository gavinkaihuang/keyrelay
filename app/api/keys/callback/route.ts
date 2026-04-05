import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

type CallbackPayload = {
  keyId?: string;
  rawError?: unknown;
  projectName?: string;
};

type ErrorAction = {
  code:
    | "API_KEY_INVALID"
    | "RATE_LIMIT_EXCEEDED"
    | "QUOTA_EXHAUSTED"
    | "SERVICE_UNAVAILABLE"
    | "UNKNOWN";
  status: "DISABLED" | "COOLING" | "DEPLETED";
  coolDownMs: number | null;
};

function parseStatusCode(rawErrorText: string) {
  const statusMatch = rawErrorText.match(/\b(\d{3})\b/);

  if (!statusMatch) {
    return null;
  }

  const code = Number(statusMatch[1]);
  return Number.isNaN(code) ? null : code;
}

function normalizeRawError(rawError: unknown) {
  if (typeof rawError === "string") {
    return rawError;
  }

  try {
    return JSON.stringify(rawError);
  } catch {
    return String(rawError);
  }
}

function detectAction(rawErrorText: string): ErrorAction {
  const upper = rawErrorText.toUpperCase();
  const statusCode = parseStatusCode(upper);

  if (upper.includes("API_KEY_INVALID") || upper.includes("PERMISSION_DENIED")) {
    return {
      code: "API_KEY_INVALID",
      status: "DISABLED",
      coolDownMs: null,
    };
  }

  if (upper.includes("RATE_LIMIT_EXCEEDED") || statusCode === 429) {
    return {
      code: "RATE_LIMIT_EXCEEDED",
      status: "COOLING",
      coolDownMs: 5 * 60 * 1000,
    };
  }

  if (upper.includes("QUOTA_EXHAUSTED")) {
    return {
      code: "QUOTA_EXHAUSTED",
      status: "DEPLETED",
      coolDownMs: null,
    };
  }

  if (
    upper.includes("INTERNAL") ||
    upper.includes("SERVICE_UNAVAILABLE") ||
    statusCode === 503
  ) {
    return {
      code: "SERVICE_UNAVAILABLE",
      status: "COOLING",
      coolDownMs: 30 * 1000,
    };
  }

  return {
    code: "UNKNOWN",
    status: "COOLING",
    coolDownMs: 30 * 1000,
  };
}

async function getKeyTableColumns() {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'keys'
  `;

  return new Set(rows.map((row) => row.column_name.toLowerCase()));
}

function getColumnProfile(columns: Set<string>) {
  const statusColumn = columns.has("status") ? "status" : null;
  const coolDownColumn = columns.has("cool_down_until")
    ? "cool_down_until"
    : columns.has("cooling_until")
  ? "cooling_until"
      : null;
  const lastErrorColumn = columns.has("last_error") ? "last_error" : null;

  return {
    statusColumn,
    coolDownColumn,
    lastErrorColumn,
  };
}

function schemaHintMessage(missing: string[]) {
  return [
    "Key schema is missing required lifecycle fields.",
    `Missing columns: ${missing.join(", ")}.`,
    "Please update Prisma model Key to include:",
    "- status: String (ACTIVE/COOLING/DISABLED/DEPLETED)",
    "- coolDownUntil: DateTime? (mapped to cool_down_until)",
    "- lastError: String? (mapped to last_error)",
  ].join(" ");
}

export async function POST(request: NextRequest) {
  const callbackToken = request.headers.get("x-callback-token")?.trim();
  const secret = process.env.CALLBACK_SECRET?.trim();

  if (!secret || callbackToken !== secret) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as CallbackPayload | null;

  if (!body?.keyId || body.rawError === undefined) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid payload. keyId and rawError are required.",
      },
      { status: 400 },
    );
  }

  const keyId = body.keyId.trim();
  const rawErrorText = normalizeRawError(body.rawError);
  const projectName =
    (body.projectName ?? "").trim() ||
    process.env.CALLBACK_DEFAULT_PROJECT_NAME?.trim() ||
    "gemini-callback";

  console.log("[KeyRelay][GeminiCallback] incoming:", {
    keyId,
    projectName,
    rawError: rawErrorText,
  });

  const columns = await getKeyTableColumns();
  const profile = getColumnProfile(columns);

  const missingColumns: string[] = [];

  if (!profile.statusColumn) {
    missingColumns.push("status");
  }
  if (!profile.coolDownColumn) {
    missingColumns.push("cool_down_until");
  }
  if (!profile.lastErrorColumn) {
    missingColumns.push("last_error");
  }

  if (missingColumns.length > 0) {
    return NextResponse.json(
      {
        success: false,
        message: schemaHintMessage(missingColumns),
      },
      { status: 500 },
    );
  }

  const action = detectAction(rawErrorText);
  const coolDownUntil =
    action.coolDownMs === null ? null : new Date(Date.now() + action.coolDownMs);

  const updatedCount = await prisma.$transaction(async (tx) => {
    let result = 0;

    if (profile.coolDownColumn === "cooling_until") {
      result = Number(await tx.$executeRaw`
        UPDATE keys
        SET status = ${action.status},
            cooling_until = ${coolDownUntil},
            last_error = ${rawErrorText}
        WHERE id = ${keyId}
      `);
    } else {
      result = Number(await tx.$executeRaw`
        UPDATE keys
        SET status = ${action.status},
            cool_down_until = ${coolDownUntil},
            last_error = ${rawErrorText}
        WHERE id = ${keyId}
      `);
    }

    if (result > 0) {
      await tx.usageLog.create({
        data: {
          key_id: keyId,
          project_name: projectName,
          request_status: "fail",
          error_message: rawErrorText,
        },
      });
    }

    return result;
  });

  if (updatedCount === 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Key not found.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      keyId,
      actionCode: action.code,
      status: action.status,
      coolDownUntil: coolDownUntil?.toISOString() ?? null,
    },
    { status: 200 },
  );
}
