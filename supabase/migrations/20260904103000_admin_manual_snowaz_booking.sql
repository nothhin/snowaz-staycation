create or replace function public.staff_create_snowaz_booking(
  guest_name text, guest_email text, guest_phone text, arrival date,
  departure date, guests integer, bedroom_selection text, contact_method text,
  requests text, token_hash text
)
returns table(booking_id uuid, booking_reference text)
language plpgsql security definer set search_path = '' as $$
declare
  new_id uuid; nights integer; base_rate bigint; extra_count integer;
  extra_charge bigint; booking_total bigint;
begin
  if private.snowaz_staff_role() not in ('manager','admin') then raise exception 'not authorized'; end if;
  if char_length(trim(guest_name)) not between 2 and 120
    or char_length(trim(guest_phone)) not between 7 and 30
    or char_length(trim(coalesce(guest_email,''))) > 254
    or (trim(coalesce(guest_email,'')) <> '' and position('@' in guest_email) < 2)
    or contact_method not in ('whatsapp','messenger','phone','email')
    or guests not between 1 and 6 or bedroom_selection not in ('bedroom_1','bedroom_2','both_bedrooms')
    or (bedroom_selection = 'bedroom_1' and guests not between 1 and 2)
    or (bedroom_selection = 'bedroom_2' and guests not between 2 and 3)
    or (bedroom_selection = 'both_bedrooms' and guests not between 4 and 6)
    or departure <= arrival or arrival < current_date or departure > current_date + 366
    or char_length(token_hash) <> 64 or char_length(coalesce(requests,'')) > 1000
  then raise exception 'invalid manual booking'; end if;
  if exists(select 1 from public.snowaz_calendar_ranges r where r.check_in < departure and r.check_out > arrival)
    or exists(select 1 from public.property_date_blocks x where x.status='active' and x.check_in < departure and x.check_out > arrival)
  then raise exception 'dates unavailable'; end if;
  nights := departure - arrival;
  base_rate := case when bedroom_selection = 'both_bedrooms' then 230000 else 180000 end;
  extra_count := case
    when bedroom_selection = 'bedroom_2' then greatest(guests - 2, 0)
    when bedroom_selection = 'both_bedrooms' then greatest(guests - 5, 0)
    else 0
  end;
  extra_charge := extra_count * 30000 * nights;
  booking_total := base_rate * nights + extra_charge;
  insert into public.booking_requests(
    idempotency_key,full_name,normalized_email,phone,preferred_contact,check_in,check_out,
    guest_count,bedroom_choice,stay_nights,base_nightly_rate_minor,additional_guest_count,
    additional_guest_charge_minor,total_minor,special_requests,status,source,consent_version,
    deposit_status,deposit_amount_minor,deposit_token_hash,deposit_token_expires_at
  ) values (
    gen_random_uuid(),trim(guest_name),lower(trim(coalesce(guest_email,''))),trim(guest_phone),contact_method,
    arrival,departure,guests,bedroom_selection,nights,base_rate,extra_count,extra_charge,booking_total,
    nullif(trim(coalesce(requests,'')),''),'pending','staff_manual','booking-request-v2','awaiting_payment',100000,
    token_hash,now() + interval '24 hours'
  ) returning id into new_id;
  return query select new_id, 'SNOWAZ-' || upper(substr(replace(new_id::text,'-',''),1,8));
end;
$$;
revoke all on function public.staff_create_snowaz_booking(text,text,text,date,date,integer,text,text,text,text) from public,anon;
grant execute on function public.staff_create_snowaz_booking(text,text,text,date,date,integer,text,text,text,text) to authenticated;
