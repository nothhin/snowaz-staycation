-- SnowAZ inventory remains deliberately unpublished until the owner confirms
-- the final capacity, bed configuration, rates, rules, and sellable unit label.

insert into room_types (
  id, name, slug, short_description, max_adults, max_children,
  bed_configuration, room_size_sqm, base_nightly_rate_minor, display_order, status
) values (
  '10000000-0000-4000-8000-000000000001',
  'SnowAZ Condo Stay',
  'snowaz-condo-stay',
  'Private condo stay at Urban Deca Homes Banilad. Final capacity, rates, and policies require owner approval.',
  2, 0, '[]'::jsonb, null, 0, 10, 'draft'
)
on conflict (slug) do update set
  short_description = excluded.short_description,
  updated_at = now()
where room_types.status = 'draft';

insert into rooms (id, room_type_id, room_number, floor, status) values (
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'SNOWAZ-PENDING',
  'Tower 1',
  'out_of_service'
)
on conflict (room_number) do nothing;

comment on table rooms is 'Physical inventory. SNOWAZ-PENDING remains out_of_service until the owner approves the final unit details.';
