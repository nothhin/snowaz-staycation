-- Optional late checkout: 11:00 AM standard checkout, up to three paid hours.
alter table public.booking_requests
  add column if not exists excess_checkout_hours integer not null default 0,
  add column if not exists excess_checkout_charge_minor bigint not null default 0;

alter table public.booking_requests drop constraint if exists booking_requests_excess_checkout_valid;
alter table public.booking_requests add constraint booking_requests_excess_checkout_valid
  check (excess_checkout_hours between 0 and 3 and excess_checkout_charge_minor = excess_checkout_hours * 20000);

-- Extend the public booking RPC without changing its existing return shape.
do $$
declare fn record; definition text;
begin
  select p.oid, pg_get_functiondef(p.oid) into fn
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='submit_snowaz_booking_request'
    and pg_get_function_identity_arguments(p.oid)='request_idempotency uuid, guest_name text, guest_email text, guest_phone text, arrival date, departure date, guests integer, bedroom_selection text, requests text, contact_method text, consent_version text, token_hash text, parking_selection text';
  if fn.oid is null then raise exception 'submit_snowaz_booking_request source function not found'; end if;
  definition := replace(fn.pg_get_functiondef, 'parking_selection text\n)', 'parking_selection text, excess_hours integer\n)');
  definition := replace(definition, 'parking_rate bigint; parking_charge bigint; booking_total bigint;', 'parking_rate bigint; parking_charge bigint; excess_charge bigint; booking_total bigint;');
  definition := replace(definition, 'or parking_selection not in (''none'',''car'',''motorcycle'')', 'or parking_selection not in (''none'',''car'',''motorcycle'') or excess_hours not between 0 and 3');
  definition := replace(definition, 'then raise exception ''dates unavailable''; end if;', 'then raise exception ''dates unavailable''; end if;\n  if excess_hours > 0 and exists (select 1 from public.snowaz_calendar_ranges r where r.check_in = departure) then raise exception ''late checkout unavailable on turnover date''; end if;');
  definition := replace(definition, 'parking_charge := parking_rate*nights;', 'parking_charge := parking_rate*nights; excess_charge := excess_hours * 20000;');
  definition := replace(definition, 'booking_total := base_rate*nights + extra_charge + parking_charge;', 'booking_total := base_rate*nights + extra_charge + parking_charge + excess_charge;');
  definition := replace(definition, 'additional_guest_charge_minor,parking_type,parking_nightly_rate_minor,parking_charge_minor,total_minor', 'additional_guest_charge_minor,parking_type,parking_nightly_rate_minor,parking_charge_minor,excess_checkout_hours,excess_checkout_charge_minor,total_minor');
  definition := replace(definition, 'extra_charge,parking_selection,parking_rate,parking_charge,booking_total', 'extra_charge,parking_selection,parking_rate,parking_charge,excess_hours,excess_charge,booking_total');
  execute definition;
end $$;
drop function if exists public.submit_snowaz_booking_request(uuid,text,text,text,date,date,integer,text,text,text,text,text,text);
revoke all on function public.submit_snowaz_booking_request(uuid,text,text,text,date,date,integer,text,text,text,text,text,text,integer) from public,authenticated;
grant execute on function public.submit_snowaz_booking_request(uuid,text,text,text,date,date,integer,text,text,text,text,text,text,integer) to anon;

do $$
declare fn record; definition text;
begin
  select p.oid, pg_get_functiondef(p.oid) into fn
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='update_snowaz_pending_guest_count'
    and pg_get_function_identity_arguments(p.oid)='token_hash text, guests integer, bedroom_selection text, parking_selection text';
  if fn.oid is null then raise exception 'pending guest source function not found'; end if;
  definition := replace(fn.pg_get_functiondef, 'parking_selection text)', 'parking_selection text, excess_hours integer)');
  definition := replace(definition, 'parking_rate bigint; extra_count integer; extra_charge bigint; parking_charge bigint;', 'parking_rate bigint; extra_count integer; extra_charge bigint; parking_charge bigint; excess_charge bigint;');
  definition := replace(definition, 'or parking_selection not in (''none'',''car'',''motorcycle'')', 'or parking_selection not in (''none'',''car'',''motorcycle'') or excess_hours not between 0 and 3');
  definition := replace(definition, 'parking_charge := parking_rate*nights;', 'parking_charge := parking_rate*nights; excess_charge := excess_hours * 20000;');
  definition := replace(definition, 'parking_nightly_rate_minor=parking_rate,parking_charge_minor=parking_charge,\n    total_minor=base_rate*nights+extra_charge+parking_charge,updated_at=now()', 'parking_nightly_rate_minor=parking_rate,parking_charge_minor=parking_charge,\n    excess_checkout_hours=excess_hours,excess_checkout_charge_minor=excess_charge,\n    total_minor=base_rate*nights+extra_charge+parking_charge+excess_charge,updated_at=now()');
  execute definition;
end $$;
drop function if exists public.update_snowaz_pending_guest_count(text,integer,text,text);
revoke all on function public.update_snowaz_pending_guest_count(text,integer,text,text,integer) from public,authenticated;
grant execute on function public.update_snowaz_pending_guest_count(text,integer,text,text,integer) to anon;

-- Private deposit page reads the stored late-checkout selection.
create or replace function public.get_snowaz_deposit_request_with_excess(token_hash text)
returns table(full_name text,check_in date,check_out date,guest_count integer,bedroom_choice text,parking_type text,excess_checkout_hours integer,excess_checkout_charge_minor bigint,deposit_status text,deposit_amount_minor bigint,deposit_token_expires_at timestamptz)
language sql stable security definer set search_path='' as $$
  select b.full_name,b.check_in,b.check_out,b.guest_count,b.bedroom_choice,b.parking_type,
    b.excess_checkout_hours,b.excess_checkout_charge_minor,b.deposit_status::text,b.deposit_amount_minor,b.deposit_token_expires_at
  from public.booking_requests b
  where b.deposit_token_hash=token_hash and b.deposit_token_expires_at>now() limit 1
$$;
revoke all on function public.get_snowaz_deposit_request_with_excess(text) from public,authenticated;
grant execute on function public.get_snowaz_deposit_request_with_excess(text) to anon;

-- Extend staff-created bookings with the same validated late-checkout charge.
do $$
declare fn record; definition text;
begin
  select p.oid, pg_get_functiondef(p.oid) into fn
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='staff_create_snowaz_booking'
    and pg_get_function_identity_arguments(p.oid)='guest_name text, guest_email text, guest_phone text, arrival date, departure date, guests integer, bedroom_selection text, contact_method text, requests text, token_hash text';
  if fn.oid is null then raise exception 'staff booking source function not found'; end if;
  definition := replace(fn.pg_get_functiondef, 'token_hash text\n)', 'token_hash text, excess_hours integer\n)');
  definition := replace(definition, 'extra_charge bigint; booking_total bigint;', 'extra_charge bigint; excess_charge bigint; booking_total bigint;');
  definition := replace(definition, 'or char_length(token_hash) <> 64', 'or char_length(token_hash) <> 64 or excess_hours not between 0 and 3');
  definition := replace(definition, 'extra_charge := extra_count * 30000 * nights;', 'extra_charge := extra_count * 30000 * nights; excess_charge := excess_hours * 20000;');
  definition := replace(definition, 'booking_total := base_rate * nights + extra_charge;', 'booking_total := base_rate * nights + extra_charge + excess_charge;');
  definition := replace(definition, 'additional_guest_charge_minor,total_minor', 'additional_guest_charge_minor,excess_checkout_hours,excess_checkout_charge_minor,total_minor');
  definition := replace(definition, 'extra_charge,booking_total', 'extra_charge,excess_hours,excess_charge,booking_total');
  execute definition;
end $$;
drop function if exists public.staff_create_snowaz_booking(text,text,text,date,date,integer,text,text,text,text);
revoke all on function public.staff_create_snowaz_booking(text,text,text,date,date,integer,text,text,text,text,integer) from public,anon;
grant execute on function public.staff_create_snowaz_booking(text,text,text,date,date,integer,text,text,text,text,integer) to authenticated;

-- Include late-checkout details in the staff booking-request feed.
do $$
declare fn_oid oid; definition text;
begin
  select p.oid into fn_oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_snowaz_admin_dashboard' and pg_get_function_identity_arguments(p.oid)='';
  if fn_oid is null then raise exception 'admin dashboard function not found'; end if;
  definition := pg_get_functiondef(fn_oid);
  definition := replace(definition, '''additionalGuestChargeMinor'',b.additional_guest_charge_minor,', '''additionalGuestChargeMinor'',b.additional_guest_charge_minor,''excessCheckoutHours'',b.excess_checkout_hours,''excessCheckoutChargeMinor'',b.excess_checkout_charge_minor,');
  execute definition;
end $$;
