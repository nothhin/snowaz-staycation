import { checkDatabaseConnection } from "@casa-marga/db";
import { parseServerEnvironment } from "@/lib/server/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  const configuration = parseServerEnvironment();

  if (!configuration.success) {
    return Response.json(
      {
        status: "not_ready",
        code: "REQUIRED_CONFIGURATION_MISSING",
        checks: { application: "ok", configuration: "failed", database: "not_checked" },
      },
      { status: 503, headers: noStoreHeaders },
    );
  }

  try {
    await checkDatabaseConnection(configuration.data.DATABASE_URL);
    return Response.json(
      { status: "ready", checks: { application: "ok", configuration: "ok", database: "ok" } },
      { headers: noStoreHeaders },
    );
  } catch {
    return Response.json(
      {
        status: "not_ready",
        code: "DATABASE_UNAVAILABLE",
        checks: { application: "ok", configuration: "ok", database: "failed" },
      },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
