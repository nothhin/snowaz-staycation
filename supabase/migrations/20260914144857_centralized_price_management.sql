-- Central pricing catalog. Historical booking rows retain their own rate snapshots.
create table if not exists public.snowaz_price_settings (
  price_key text primary key,
  amount_minor bigint not null check (amount_minor between 0 and 99999999),
  unit text not null,
  description text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
create table if not exists public.snowaz_price_revision (
  singleton boolean primary key default true check (singleton),
  version bigint not null check (version > 0)
);
create table if not exists public.snowaz_price_history (
  id bigint generated always as identity primary key,
  price_key text not null references public.snowaz_price_settings(price_key),
  old_amount_minor bigint not null,
  new_amount_minor bigint not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id),
  note text
);
alter table public.snowaz_price_settings enable row level security;
alter table public.snowaz_price_revision enable row level security;
alter table public.snowaz_price_history enable row level security;
revoke all on public.snowaz_price_settings, public.snowaz_price_revision, public.snowaz_price_history from public, anon, authenticated;

insert into public.snowaz_price_revision(singleton,version) values(true,1) on conflict (singleton) do nothing;
insert into public.snowaz_price_settings(price_key,amount_minor,unit,description) values
('bedroom_1_nightly_rate',180000,'per night','Bedroom 1 for 1–2 guests'),
('bedroom_2_nightly_rate',180000,'per night','Bedroom 2 for 2 guests'),
('both_bedrooms_nightly_rate',230000,'per night','Both bedrooms for 4–5 guests'),
('additional_guest_nightly_rate',30000,'per guest/night','Third guest in Bedroom 2 or sixth guest with both bedrooms'),
('car_parking_nightly_rate',35000,'per night','Optional car parking'),
('motorcycle_parking_nightly_rate',15000,'per night','Optional motorcycle parking'),
('early_checkin_hourly_rate',20000,'per hour','Early check-in, subject to availability'),
('late_checkout_hourly_rate',20000,'per hour','Late checkout, up to three hours'),
('refundable_security_deposit',100000,'per booking','Refundable security deposit'),
('no_smoking_penalty',500000,'per violation','No-smoking house-rule penalty')
on conflict (price_key) do nothing;

create or replace function public.get_snowaz_active_pricing() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('version',(select version from public.snowaz_price_revision where singleton),
    'prices',(select jsonb_object_agg(price_key,amount_minor) from public.snowaz_price_settings))
$$;
revoke all on function public.get_snowaz_active_pricing() from public;
grant execute on function public.get_snowaz_active_pricing() to anon, authenticated;

create or replace function public.staff_get_snowaz_price_management() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if private.snowaz_staff_role() is distinct from 'admin' then raise exception 'not authorized'; end if;
  return jsonb_build_object(
    'prices',coalesce((select jsonb_agg(jsonb_build_object('key',p.price_key,'amount_minor',p.amount_minor,
      'unit',p.unit,'description',p.description,'version',r.version,'updated_at',p.updated_at,
      'updated_by_email',u.email) order by p.price_key)
      from public.snowaz_price_settings p cross join public.snowaz_price_revision r
      left join auth.users u on u.id=p.updated_by), '[]'::jsonb),
    'history',coalesce((select jsonb_agg(jsonb_build_object('key',h.price_key,'old_amount_minor',h.old_amount_minor,
      'new_amount_minor',h.new_amount_minor,'changed_at',h.changed_at,'changed_by_email',u.email,'note',h.note)
      order by h.changed_at desc)
      from (select * from public.snowaz_price_history order by changed_at desc limit 100) h
      left join auth.users u on u.id=h.changed_by), '[]'::jsonb));
end $$;
revoke all on function public.staff_get_snowaz_price_management() from public, anon;
grant execute on function public.staff_get_snowaz_price_management() to authenticated;

create or replace function public.staff_update_snowaz_price(price_key text,new_amount_minor bigint,expected_version bigint,change_note text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare previous_amount bigint; active_version bigint;
begin
  if private.snowaz_staff_role() is distinct from 'admin' then raise exception 'not authorized'; end if;
  if new_amount_minor is null or new_amount_minor not between 0 and 99999999
    or length(coalesce(change_note,'')) > 300 then raise exception 'invalid price'; end if;
  select version into active_version from public.snowaz_price_revision where singleton for update;
  if expected_version <> active_version then raise exception 'stale price revision'; end if;
  select amount_minor into previous_amount from public.snowaz_price_settings where snowaz_price_settings.price_key=staff_update_snowaz_price.price_key for update;
  if not found then raise exception 'unknown price key'; end if;
  if previous_amount = new_amount_minor then return true; end if;
  update public.snowaz_price_settings set amount_minor=new_amount_minor,updated_at=now(),updated_by=auth.uid()
    where snowaz_price_settings.price_key=staff_update_snowaz_price.price_key;
  update public.snowaz_price_revision set version=active_version+1 where singleton;
  insert into public.snowaz_price_history(price_key,old_amount_minor,new_amount_minor,changed_by,note)
    values(staff_update_snowaz_price.price_key,previous_amount,new_amount_minor,auth.uid(),nullif(trim(change_note),''));
  -- snowaz_price_history is the append-only price audit with old/new amounts and actor.
  return true;
end $$;
revoke all on function public.staff_update_snowaz_price(text,bigint,bigint,text) from public, anon;
grant execute on function public.staff_update_snowaz_price(text,bigint,bigint,text) to authenticated;

-- Rate-derived constraints must allow each booking's historical snapshot.
alter table public.booking_requests add column if not exists excess_checkout_hours integer not null default 0,
  add column if not exists excess_checkout_charge_minor bigint not null default 0;
alter table public.booking_requests drop constraint if exists booking_requests_parking_valid;
alter table public.booking_requests add constraint booking_requests_parking_valid check (
  (parking_type='none' and parking_nightly_rate_minor=0 and parking_charge_minor=0)
  or (parking_type in ('car','motorcycle') and parking_nightly_rate_minor>=0 and parking_charge_minor=parking_nightly_rate_minor*stay_nights));
alter table public.booking_requests drop constraint if exists booking_requests_excess_checkout_valid;
alter table public.booking_requests add constraint booking_requests_excess_checkout_valid check (
  excess_checkout_hours between 0 and 3 and excess_checkout_charge_minor>=0);
-- A legacy booking may have more than today's six-guest limit. Preserve it.
alter table public.booking_requests drop constraint if exists booking_requests_bedroom_capacity_valid;
alter table public.booking_requests add column if not exists price_version bigint,
  add column if not exists additional_guest_nightly_rate_minor bigint,
  add column if not exists late_checkout_hourly_rate_minor bigint;
-- Legacy reservations keep their original guest count and agreed amounts.
-- New/edited rows must follow today's 1–6 guest room-selection rules.
alter table public.booking_requests add constraint booking_requests_bedroom_capacity_valid check (
  price_version is null
  or (bedroom_choice='bedroom_1' and guest_count between 1 and 2)
  or (bedroom_choice='bedroom_2' and guest_count between 2 and 3)
  or (bedroom_choice='both_bedrooms' and guest_count between 4 and 6)) not valid;
alter table public.booking_requests drop constraint if exists booking_requests_pricing_snapshot_valid;
alter table public.booking_requests add constraint booking_requests_pricing_snapshot_valid check (
  stay_nights>0 and base_nightly_rate_minor>=0 and additional_guest_count>=0
  and additional_guest_charge_minor>=0 and total_minor>=0 and deposit_amount_minor>=0);

create or replace function public.submit_snowaz_priced_booking_request(
  request_idempotency uuid, guest_name text, guest_email text, guest_phone text,
  arrival date, departure date, guests integer, bedroom_selection text, requests text,
  contact_method text, consent_version text, token_hash text, parking_selection text,
  excess_hours integer, expected_version bigint, quoted_total_minor bigint)
returns table(booking_id uuid, booking_reference text, deposit_expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  target_id uuid; expiry timestamptz := now() + interval '24 hours';
  nights integer; base_rate bigint; extra_count integer; extra_rate bigint; extra_charge bigint;
  parking_rate bigint; parking_charge bigint; late_rate bigint; excess_charge bigint;
  deposit_rate bigint; booking_total bigint; current_version bigint;
begin
  if request_idempotency is null or char_length(trim(guest_name)) not between 2 and 120
    or char_length(trim(guest_phone)) not between 7 and 30
    or char_length(trim(coalesce(guest_email,''))) > 254
    or (trim(coalesce(guest_email,'')) <> '' and position('@' in guest_email) < 2)
    or contact_method not in ('whatsapp','messenger','phone','email')
    or guests not between 1 and 6
    or parking_selection not in ('none','car','motorcycle')
    or excess_hours not between 0 and 3
    or not ((bedroom_selection='bedroom_1' and guests between 1 and 2)
      or (bedroom_selection='bedroom_2' and guests between 2 and 3)
      or (bedroom_selection='both_bedrooms' and guests between 4 and 6))
    or departure <= arrival or arrival < current_date or departure > current_date + 366
    or consent_version <> 'booking-request-v2' or char_length(token_hash) <> 64
    or char_length(coalesce(requests,'')) > 1000 or quoted_total_minor is null
  then raise exception 'invalid booking request'; end if;

  select version into current_version from public.snowaz_price_revision where singleton for share;
  if current_version is distinct from expected_version then raise exception 'stale price revision'; end if;

  if exists (select 1 from public.snowaz_calendar_ranges r
    where r.check_in < departure and r.check_out > arrival
      and not (r.source_kind='booking_request' and r.source_id = coalesce(
        (select id from public.booking_requests where idempotency_key=request_idempotency),
        '00000000-0000-0000-0000-000000000000'::uuid)))
  then raise exception 'dates unavailable'; end if;
  if excess_hours > 0 and exists(select 1 from public.snowaz_calendar_ranges r where r.check_in=departure)
  then raise exception 'late checkout unavailable on turnover date'; end if;

  nights := departure-arrival;
  select amount_minor into base_rate from public.snowaz_price_settings where price_key=
    case bedroom_selection when 'bedroom_1' then 'bedroom_1_nightly_rate'
      when 'bedroom_2' then 'bedroom_2_nightly_rate' else 'both_bedrooms_nightly_rate' end;
  select amount_minor into extra_rate from public.snowaz_price_settings where price_key='additional_guest_nightly_rate';
  select amount_minor into parking_rate from public.snowaz_price_settings where price_key=
    case parking_selection when 'car' then 'car_parking_nightly_rate' else 'motorcycle_parking_nightly_rate' end;
  select amount_minor into late_rate from public.snowaz_price_settings where price_key='late_checkout_hourly_rate';
  select amount_minor into deposit_rate from public.snowaz_price_settings where price_key='refundable_security_deposit';
  extra_count := case when bedroom_selection='bedroom_2' then greatest(guests-2,0)
    when bedroom_selection='both_bedrooms' then greatest(guests-5,0) else 0 end;
  extra_charge := extra_count*extra_rate*nights;
  if parking_selection='none' then parking_rate := 0; end if;
  parking_charge := parking_rate*nights;
  excess_charge := excess_hours*late_rate;
  booking_total := base_rate*nights+extra_charge+parking_charge+excess_charge;
  if booking_total <> quoted_total_minor then raise exception 'stale price total'; end if;

  insert into public.booking_requests(
    idempotency_key,full_name,normalized_email,phone,preferred_contact,check_in,check_out,
    guest_count,bedroom_choice,stay_nights,base_nightly_rate_minor,additional_guest_count,
    additional_guest_charge_minor,additional_guest_nightly_rate_minor,parking_type,
    parking_nightly_rate_minor,parking_charge_minor,excess_checkout_hours,excess_checkout_charge_minor,
    late_checkout_hourly_rate_minor,price_version,total_minor,special_requests,status,source,consent_version,
    deposit_status,deposit_amount_minor,deposit_token_hash,deposit_token_expires_at)
  values(request_idempotency,trim(guest_name),lower(trim(coalesce(guest_email,''))),trim(guest_phone),contact_method,
    arrival,departure,guests,bedroom_selection,nights,base_rate,extra_count,extra_charge,extra_rate,
    parking_selection,parking_rate,parking_charge,excess_hours,excess_charge,late_rate,current_version,
    booking_total,nullif(trim(coalesce(requests,'')),''),'pending','snowaz_guest_web',consent_version,
    'awaiting_payment',deposit_rate,token_hash,expiry)
  on conflict(idempotency_key) do update set
    deposit_token_hash=case when public.booking_requests.deposit_status='awaiting_payment' then excluded.deposit_token_hash else public.booking_requests.deposit_token_hash end,
    deposit_token_expires_at=case when public.booking_requests.deposit_status='awaiting_payment' then excluded.deposit_token_expires_at else public.booking_requests.deposit_token_expires_at end,
    updated_at=now()
  returning id into target_id;
  return query select target_id,'SNOWAZ-'||upper(substr(replace(target_id::text,'-',''),1,8)),expiry;
end $$;
revoke all on function public.submit_snowaz_priced_booking_request(uuid,text,text,text,date,date,integer,text,text,text,text,text,text,integer,bigint,bigint) from public, authenticated;
grant execute on function public.submit_snowaz_priced_booking_request(uuid,text,text,text,date,date,integer,text,text,text,text,text,text,integer,bigint,bigint) to anon;

create or replace function public.staff_create_snowaz_priced_booking(
  guest_name text, guest_email text, guest_phone text, arrival date, departure date,
  guests integer, bedroom_selection text, contact_method text, requests text,
  token_hash text, excess_hours integer)
returns table(booking_id uuid, booking_reference text)
language plpgsql security definer set search_path = '' as $$
declare
  new_id uuid; nights integer; base_rate bigint; extra_count integer; extra_rate bigint;
  extra_charge bigint; late_rate bigint; excess_charge bigint; deposit_rate bigint;
  booking_total bigint; current_version bigint;
begin
  if private.snowaz_staff_role() not in ('manager','admin') then raise exception 'not authorized'; end if;
  if char_length(trim(guest_name)) not between 2 and 120
    or char_length(trim(guest_phone)) not between 7 and 30
    or char_length(trim(coalesce(guest_email,''))) > 254
    or (trim(coalesce(guest_email,'')) <> '' and position('@' in guest_email) < 2)
    or contact_method not in ('whatsapp','messenger','phone','email')
    or guests not between 1 and 6 or excess_hours not between 0 and 3
    or not ((bedroom_selection='bedroom_1' and guests between 1 and 2)
      or (bedroom_selection='bedroom_2' and guests between 2 and 3)
      or (bedroom_selection='both_bedrooms' and guests between 4 and 6))
    or departure<=arrival or arrival<current_date or departure>current_date+366
    or char_length(token_hash)<>64 or char_length(coalesce(requests,''))>1000
  then raise exception 'invalid manual booking'; end if;
  select version into current_version from public.snowaz_price_revision where singleton for share;
  if exists(select 1 from public.snowaz_calendar_ranges r where r.check_in<departure and r.check_out>arrival)
    or exists(select 1 from public.property_date_blocks x where x.status='active' and x.check_in<departure and x.check_out>arrival)
  then raise exception 'dates unavailable'; end if;
  if excess_hours>0 and exists(select 1 from public.snowaz_calendar_ranges r where r.check_in=departure)
  then raise exception 'late checkout unavailable on turnover date'; end if;
  nights:=departure-arrival;
  select amount_minor into base_rate from public.snowaz_price_settings where price_key=
    case bedroom_selection when 'bedroom_1' then 'bedroom_1_nightly_rate'
      when 'bedroom_2' then 'bedroom_2_nightly_rate' else 'both_bedrooms_nightly_rate' end;
  select amount_minor into extra_rate from public.snowaz_price_settings where price_key='additional_guest_nightly_rate';
  select amount_minor into late_rate from public.snowaz_price_settings where price_key='late_checkout_hourly_rate';
  select amount_minor into deposit_rate from public.snowaz_price_settings where price_key='refundable_security_deposit';
  extra_count:=case when bedroom_selection='bedroom_2' then greatest(guests-2,0)
    when bedroom_selection='both_bedrooms' then greatest(guests-5,0) else 0 end;
  extra_charge:=extra_count*extra_rate*nights;
  excess_charge:=excess_hours*late_rate;
  booking_total:=base_rate*nights+extra_charge+excess_charge;
  insert into public.booking_requests(
    idempotency_key,full_name,normalized_email,phone,preferred_contact,check_in,check_out,
    guest_count,bedroom_choice,stay_nights,base_nightly_rate_minor,additional_guest_count,
    additional_guest_charge_minor,additional_guest_nightly_rate_minor,excess_checkout_hours,
    excess_checkout_charge_minor,late_checkout_hourly_rate_minor,price_version,total_minor,
    special_requests,status,source,consent_version,deposit_status,deposit_amount_minor,
    deposit_token_hash,deposit_token_expires_at)
  values(gen_random_uuid(),trim(guest_name),lower(trim(coalesce(guest_email,''))),trim(guest_phone),
    contact_method,arrival,departure,guests,bedroom_selection,nights,base_rate,extra_count,
    extra_charge,extra_rate,excess_hours,excess_charge,late_rate,current_version,booking_total,
    nullif(trim(coalesce(requests,'')),''),'pending','staff_manual','booking-request-v2',
    'awaiting_payment',deposit_rate,token_hash,now()+interval '24 hours') returning id into new_id;
  return query select new_id,'SNOWAZ-'||upper(substr(replace(new_id::text,'-',''),1,8));
end $$;
revoke all on function public.staff_create_snowaz_priced_booking(text,text,text,date,date,integer,text,text,text,text,integer) from public,anon;
grant execute on function public.staff_create_snowaz_priced_booking(text,text,text,date,date,integer,text,text,text,text,integer) to authenticated;

-- Explicit staff edits reprice at current rates; status-only changes keep the agreed snapshot.
create or replace function public.staff_update_snowaz_priced_booking(target_id uuid, arrival date, departure date,
  guests integer, bedroom_selection text, excess_hours integer, next_stay_status text, id_type text default null, id_last4 text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare booking public.booking_requests%rowtype; nights integer; base_rate bigint; extra_rate bigint;
  extra_count integer; extra_charge bigint; parking_rate bigint; parking_charge bigint;
  late_rate bigint; excess_charge bigint; booking_total bigint; already_paid bigint; current_version bigint;
  change_to_stay boolean;
begin
  if private.snowaz_staff_role() not in ('manager','admin') then raise exception 'not authorized'; end if;
  select * into booking from public.booking_requests where id=target_id for update;
  if not found or booking.status in ('declined','cancelled') then return false; end if;
  if departure<=arrival or excess_hours not between 0 and 3
    or next_stay_status not in ('upcoming','checked_in','checked_out','no_show')
    or not ((bedroom_selection=booking.bedroom_choice and guests=booking.guest_count)
      or (bedroom_selection='bedroom_1' and guests between 1 and 2)
      or (bedroom_selection='bedroom_2' and guests between 2 and 3)
      or (bedroom_selection='both_bedrooms' and guests between 4 and 6))
  then raise exception 'invalid booking update'; end if;
  if exists(select 1 from public.snowaz_calendar_ranges r where r.check_in<departure and r.check_out>arrival
      and not(r.source_kind='booking_request' and r.source_id=target_id))
    or exists(select 1 from public.property_date_blocks x where x.status='active' and x.check_in<departure and x.check_out>arrival)
  then raise exception 'dates unavailable'; end if;
  if excess_hours>0 and exists(select 1 from public.snowaz_calendar_ranges r where r.check_in=departure)
  then raise exception 'late checkout unavailable on turnover date'; end if;
  change_to_stay := arrival<>booking.check_in or departure<>booking.check_out
    or guests<>booking.guest_count or bedroom_selection<>booking.bedroom_choice
    or excess_hours<>coalesce(booking.excess_checkout_hours,0);
  if change_to_stay and booking.status not in ('pending','contacted')
  then raise exception 'confirmed booking price is locked; create an explicit adjustment instead'; end if;
  nights:=departure-arrival;
  if change_to_stay then
    select version into current_version from public.snowaz_price_revision where singleton for share;
    select amount_minor into base_rate from public.snowaz_price_settings where price_key=
      case bedroom_selection when 'bedroom_1' then 'bedroom_1_nightly_rate'
        when 'bedroom_2' then 'bedroom_2_nightly_rate' else 'both_bedrooms_nightly_rate' end;
    select amount_minor into extra_rate from public.snowaz_price_settings where price_key='additional_guest_nightly_rate';
    select amount_minor into late_rate from public.snowaz_price_settings where price_key='late_checkout_hourly_rate';
    parking_rate:=coalesce(booking.parking_nightly_rate_minor,0);
    extra_count:=case when bedroom_selection='bedroom_2' then greatest(guests-2,0)
      when bedroom_selection='both_bedrooms' then greatest(guests-5,0) else 0 end;
    extra_charge:=extra_count*extra_rate*nights;
    parking_charge:=parking_rate*nights;
    excess_charge:=excess_hours*late_rate;
    booking_total:=base_rate*nights+extra_charge+parking_charge+excess_charge;
    select coalesce(sum(case when direction='payment' then amount_minor else -amount_minor end),0)
      into already_paid from public.booking_payments where booking_request_id=target_id and status='recorded';
    if already_paid>booking_total then raise exception 'new total below payments received'; end if;
    update public.booking_requests set check_in=arrival,check_out=departure,guest_count=guests,
      bedroom_choice=bedroom_selection,stay_nights=nights,base_nightly_rate_minor=base_rate,
      additional_guest_count=extra_count,additional_guest_charge_minor=extra_charge,
      additional_guest_nightly_rate_minor=extra_rate,parking_charge_minor=parking_charge,
      excess_checkout_hours=excess_hours,excess_checkout_charge_minor=excess_charge,late_checkout_hourly_rate_minor=late_rate,
      price_version=current_version,total_minor=booking_total where id=target_id;
  end if;
  update public.booking_requests set stay_status=next_stay_status,
    primary_guest_id_type=nullif(trim(coalesce(id_type,'')),''),
    primary_guest_id_last4=upper(nullif(trim(coalesce(id_last4,'')),'')),
    primary_guest_verified_at=case when trim(coalesce(id_type,''))<>'' and trim(coalesce(id_last4,''))~'^[A-Za-z0-9]{4}$' then now() else null end,
    primary_guest_verified_by=case when trim(coalesce(id_type,''))<>'' then auth.uid() else null end,
    updated_at=now() where id=target_id;
  update public.snowaz_calendar_ranges set check_in=arrival,check_out=departure,
    display_status=case when booking.status='confirmed' then 'booked' else 'pending' end
    where source_kind='booking_request' and source_id=target_id;
  if not found then insert into public.snowaz_calendar_ranges(source_kind,source_id,check_in,check_out,display_status)
    values('booking_request',target_id,arrival,departure,case when booking.status='confirmed' then 'booked' else 'pending' end); end if;
  insert into public.audit_log(actor_id,actor_type,action,entity_type,entity_id,request_id,redacted_metadata)
    values(auth.uid(),'staff','booking.updated','booking_request',target_id,gen_random_uuid(),
      jsonb_build_object('checkIn',arrival,'checkOut',departure,'guests',guests,'bedroom',bedroom_selection,
        'stayStatus',next_stay_status,'repriced',change_to_stay));
  insert into public.booking_notifications(booking_request_id,notification_type,recipient,channel)
    select id,'booking_updated',case when preferred_contact='email' then normalized_email else phone end,preferred_contact
    from public.booking_requests where id=target_id;
  return true;
end $$;
revoke all on function public.staff_update_snowaz_priced_booking(uuid,date,date,integer,text,integer,text,text,text) from public,anon;
grant execute on function public.staff_update_snowaz_priced_booking(uuid,date,date,integer,text,integer,text,text,text) to authenticated;

create or replace function public.update_snowaz_priced_pending_booking(token_hash text, guests integer,
  bedroom_selection text, parking_selection text, excess_hours integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare booking public.booking_requests%rowtype; base_rate bigint; extra_rate bigint; extra_count integer;
  parking_rate bigint; late_rate bigint; nights integer; current_version bigint;
begin
  if guests not between 1 and 6 or parking_selection not in ('none','car','motorcycle')
    or excess_hours not between 0 and 3
    or not ((bedroom_selection='bedroom_1' and guests between 1 and 2)
      or (bedroom_selection='bedroom_2' and guests between 2 and 3)
      or (bedroom_selection='both_bedrooms' and guests between 4 and 6))
  then raise exception 'invalid booking change'; end if;
  select * into booking from public.booking_requests where deposit_token_hash=token_hash for update;
  if not found or booking.status not in ('pending','contacted')
    or booking.deposit_status<>'awaiting_payment' or booking.deposit_token_expires_at<=now()
  then return false; end if;
  if guests=booking.guest_count and bedroom_selection=booking.bedroom_choice
    and parking_selection=booking.parking_type and excess_hours=booking.excess_checkout_hours
  then return true; end if;
  if excess_hours>0 and exists(select 1 from public.snowaz_calendar_ranges r where r.check_in=booking.check_out)
  then raise exception 'late checkout unavailable on turnover date'; end if;
  select version into current_version from public.snowaz_price_revision where singleton for share;
  select amount_minor into base_rate from public.snowaz_price_settings where price_key=
    case bedroom_selection when 'bedroom_1' then 'bedroom_1_nightly_rate'
      when 'bedroom_2' then 'bedroom_2_nightly_rate' else 'both_bedrooms_nightly_rate' end;
  select amount_minor into extra_rate from public.snowaz_price_settings where price_key='additional_guest_nightly_rate';
  select amount_minor into late_rate from public.snowaz_price_settings where price_key='late_checkout_hourly_rate';
  select amount_minor into parking_rate from public.snowaz_price_settings where price_key=
    case parking_selection when 'car' then 'car_parking_nightly_rate' else 'motorcycle_parking_nightly_rate' end;
  if parking_selection='none' then parking_rate:=0; end if;
  nights:=booking.stay_nights;
  extra_count:=case when bedroom_selection='bedroom_2' then greatest(guests-2,0)
    when bedroom_selection='both_bedrooms' then greatest(guests-5,0) else 0 end;
  update public.booking_requests set guest_count=guests,bedroom_choice=bedroom_selection,
    base_nightly_rate_minor=base_rate,additional_guest_count=extra_count,
    additional_guest_nightly_rate_minor=extra_rate,additional_guest_charge_minor=extra_count*extra_rate*nights,
    parking_type=parking_selection,parking_nightly_rate_minor=parking_rate,
    parking_charge_minor=parking_rate*nights,excess_checkout_hours=excess_hours,
    late_checkout_hourly_rate_minor=late_rate,excess_checkout_charge_minor=excess_hours*late_rate,
    total_minor=base_rate*nights+extra_count*extra_rate*nights+parking_rate*nights+excess_hours*late_rate,
    price_version=current_version,updated_at=now() where id=booking.id;
  return true;
end $$;
revoke all on function public.update_snowaz_priced_pending_booking(text,integer,text,text,integer) from public,authenticated;
grant execute on function public.update_snowaz_priced_pending_booking(text,integer,text,text,integer) to anon;

create or replace function public.get_snowaz_priced_deposit_request(token_hash text)
returns table(full_name text,check_in date,check_out date,guest_count integer,bedroom_choice text,
  parking_type text,excess_checkout_hours integer,deposit_status text,deposit_amount_minor bigint,
  deposit_token_expires_at timestamptz,base_nightly_rate_minor bigint,additional_guest_count integer,
  additional_guest_charge_minor bigint,parking_nightly_rate_minor bigint,parking_charge_minor bigint,
  excess_checkout_charge_minor bigint,total_minor bigint,stay_nights integer)
language sql stable security definer set search_path = '' as $$
  select b.full_name,b.check_in,b.check_out,b.guest_count,b.bedroom_choice,b.parking_type,
    b.excess_checkout_hours,b.deposit_status::text,b.deposit_amount_minor,b.deposit_token_expires_at,
    b.base_nightly_rate_minor,b.additional_guest_count,b.additional_guest_charge_minor,
    b.parking_nightly_rate_minor,b.parking_charge_minor,b.excess_checkout_charge_minor,
    b.total_minor,b.stay_nights
  from public.booking_requests b where b.deposit_token_hash=token_hash
    and b.deposit_token_expires_at>now() limit 1
$$;
revoke all on function public.get_snowaz_priced_deposit_request(text) from public,authenticated;
grant execute on function public.get_snowaz_priced_deposit_request(text) to anon;
