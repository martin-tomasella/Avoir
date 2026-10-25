-- Vista: última posición por activo (lat/lon numéricos). security_invoker => RLS heredada.
create or replace view asset_live with (security_invoker = on) as
select a.id as asset_id, a.company_id, a.alias, a.person_name, a.cargo, a.group_id,
       g.name as group_name, p.ts, p.speed, p.attributes,
       ST_Y(p.geom::geometry) as lat, ST_X(p.geom::geometry) as lon
from asset a
left join "group" g on g.id = a.group_id
left join lateral (
  select ts, speed, geom, attributes from position pp
  where pp.asset_id = a.id order by ts desc limit 1
) p on true
where a.active;
grant select on asset_live to anon, authenticated;
