import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(new URL("./0001_initial.sql", import.meta.url));
const migration = readFileSync(migrationPath, "utf8");
const provisionalSeedPath = fileURLToPath(new URL("./0002_provisional_catalog.sql", import.meta.url));
const provisionalSeed = readFileSync(provisionalSeedPath, "utf8");
const depositMigrationPath = fileURLToPath(new URL("./0006_snowaz_manual_deposit_workflow.sql", import.meta.url));
const depositMigration = readFileSync(depositMigrationPath, "utf8");
const immediateDepositPath = fileURLToPath(new URL("./0008_immediate_deposit_checkout.sql", import.meta.url));
const immediateDeposit = readFileSync(immediateDepositPath, "utf8");
const adminOperationsPath = fileURLToPath(new URL("./0009_admin_booking_operations.sql", import.meta.url));
const adminOperations = readFileSync(adminOperationsPath, "utf8");
const bookingLookupPath = fileURLToPath(new URL("./0010_public_booking_status_lookup.sql", import.meta.url));
const bookingLookup = readFileSync(bookingLookupPath, "utf8");
const privateLinkLifecyclePath = fileURLToPath(new URL("./0011_private_deposit_link_lifecycle.sql", import.meta.url));
const privateLinkLifecycle = readFileSync(privateLinkLifecyclePath, "utf8");

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

describe("SnowAZ manual deposit workflow", () => {
  it("stores tokens as hashes and requires complete payment evidence", () => {
    expect(depositMigration).toContain("deposit_token_hash text");
    expect(depositMigration).toContain("booking_requests_deposit_token_hash_unique");
    expect(depositMigration).toContain("booking_requests_deposit_submission_complete");
  });

  it("keeps verified booking requests blocked on the public calendar", () => {
    expect(depositMigration).toContain("new.status in ('pending', 'contacted', 'confirmed')");
    expect(depositMigration).toContain("new.status = 'confirmed' then 'booked'");
  });
});

describe("SnowAZ immediate deposit checkout", () => {
  it("uses one controlled RPC instead of anonymous table inserts", () => {
    expect(immediateDeposit).toContain("revoke insert on public.booking_requests from anon, authenticated");
    expect(immediateDeposit).toContain("submit_snowaz_booking_request");
  });

  it("expires unpaid holds after two hours", () => {
    expect(immediateDeposit).toContain("now() + interval '2 hours'");
    expect(immediateDeposit).toContain("expire_snowaz_deposit_holds");
  });
});

describe("SnowAZ admin booking operations", () => {
  it("restricts status changes to managers and admins", () => {
    expect(adminOperations).toContain("private.snowaz_staff_role() not in ('manager', 'admin')");
    expect(adminOperations).toContain("revoke all on function public.staff_update_snowaz_booking_status(uuid,text) from public, anon");
  });

  it("routes verified cancellations into the refund workflow", () => {
    expect(adminOperations).toContain("then 'refund_pending'::public.deposit_status");
    expect(adminOperations).toContain("insert into public.audit_log");
  });
});

describe("SnowAZ public booking status lookup", () => {
  it("requires the booking reference and exact normalized guest phone", () => {
    expect(bookingLookup).toContain("upper(trim(booking_reference))");
    expect(bookingLookup).toContain("regexp_replace(b.phone, '[^0-9]', '', 'g')");
  });

  it("returns operational status without guest or bank identity", () => {
    expect(bookingLookup).toContain("booking_status text");
    expect(bookingLookup).toContain("deposit_status text");
    expect(bookingLookup).not.toContain("full_name");
    expect(bookingLookup).not.toContain("deposit_reference");
  });
});

describe("SnowAZ private deposit link lifecycle", () => {
  it("makes submitted and verified links expire after checkout", () => {
    expect(privateLinkLifecycle).toContain("check_out + 30");
    expect(privateLinkLifecycle).toContain("b.deposit_token_expires_at>now()");
  });

  it("keeps refund links for thirty days and supports refund pending", () => {
    expect(privateLinkLifecycle).toContain("deposit_token_expires_at=now()+interval '30 days'");
    expect(privateLinkLifecycle).toContain("deposit_status in ('verified','refund_pending')");
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
