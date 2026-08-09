import "server-only";
import { createDatabase, staffUsers } from "@casa-marga/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { parseDatabaseEnvironment } from "./env";
import { createSupabaseServerClient } from "../supabase/server";

export type AuthorizedStaff = {
  id: string;
  email: string;
  role: "front_desk" | "manager" | "admin";
};

export async function requireStaff(allowedRoles?: AuthorizedStaff["role"][]) {
  const startedAt = Date.now();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;
  console.info("[admin-auth] claims verified", { durationMs: Date.now() - startedAt, authenticated: Boolean(subject) });
  if (error || !subject) redirect("/admin/login");

  const configuration = parseDatabaseEnvironment();
  if (!configuration.success) throw new Error("Database configuration is unavailable.");
  const database = createDatabase(configuration.data.DATABASE_URL);

  try {
    const [staff] = await database.db
      .select({ id: staffUsers.id, email: staffUsers.email, role: staffUsers.role, status: staffUsers.status })
      .from(staffUsers)
      .where(eq(staffUsers.identityProviderSubject, subject))
      .limit(1);

    console.info("[admin-auth] staff authorization checked", { durationMs: Date.now() - startedAt, authorized: staff?.status === "active" });

    if (!staff || staff.status !== "active") redirect("/admin/login?error=not-authorized");
    if (allowedRoles && !allowedRoles.includes(staff.role)) redirect("/admin?error=forbidden");
    return { id: staff.id, email: staff.email, role: staff.role } satisfies AuthorizedStaff;
  } finally {
    await database.close();
  }
}
