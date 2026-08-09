import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(new URL("./0001_initial.sql", import.meta.url));
const migration = readFileSync(migrationPath, "utf8");
const provisionalSeedPath = fileURLToPath(new URL("./0002_provisional_catalog.sql", import.meta.url));
const provisionalSeed = readFileSync(provisionalSeedPath, "utf8");

describe("initial database migration", () => {
  it("enforces a single property settings row", () => {
    expect(migration).toContain("id boolean primary key default true check (id)");
  });

  it("uses a half-open range exclusion constraint for active stays", () => {
    expect(migration).toContain("daterange(check_in, check_out, '[)') with &&");
    expect(migration).toContain("where (status in ('confirmed', 'checked_in'))");
  });

  it("indexes foreign keys and operational queues", () => {
    expect(migration).toContain("reservations_room_id_idx");
    expect(migration).toContain("reservations_guest_id_idx");
    expect(migration).toContain("email_outbox_pending_available_idx");
  });

  it("stores prices as integer minor units", () => {
    expect(migration).toContain("base_nightly_rate_minor bigint");
    expect(migration).toContain("total_minor bigint");
  });

  it("enables row-level security on every Data API table", () => {
    const protectedTables = [
      "resort_settings", "room_types", "amenities", "room_type_amenities",
      "rooms", "rate_plans", "guests", "reservations", "staff_users",
      "email_outbox", "audit_log", "idempotency_keys",
    ];

    for (const table of protectedTables) {
      expect(migration).toContain(`alter table ${table} enable row level security;`);
    }
  });
});

describe("provisional catalogue seed", () => {
  it("keeps the SnowAZ template unpublished", () => {
    expect(provisionalSeed).toContain("'SnowAZ Condo Stay'");
    expect(provisionalSeed).toContain("'draft'");
    expect(provisionalSeed).not.toContain("'published'");
  });

  it("keeps the unapproved physical unit unavailable", () => {
    expect(provisionalSeed).toContain("'SNOWAZ-PENDING'");
    expect(provisionalSeed).toContain("'out_of_service'");
    expect(provisionalSeed).not.toContain("'available'");
  });

  it("does not invent a rate before owner approval", () => {
    expect(provisionalSeed).toContain("null, 0, 10, 'draft'");
  });
});
