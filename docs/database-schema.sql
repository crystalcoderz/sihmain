-- Provider-neutral PostgreSQL schema for the approved backend integration.
-- Apply only after selecting the managed database/authentication provider.

create type route_status as enum ('OPEN', 'RESTRICTED', 'BLOCKED');
create type risk_level as enum ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');
create type incident_severity as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
create type alert_status as enum ('NEW', 'ACKNOWLEDGED', 'RESOLVED');
create type sync_status as enum ('DRAFT', 'QUEUED_OFFLINE', 'SYNCING', 'SYNCED', 'FAILED');

create table users (
  id uuid primary key, email text unique not null, display_name text not null,
  role text not null check (role in ('ADMIN', 'COORDINATOR', 'FIELD_OFFICER')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table districts (
  id uuid primary key, state text not null, name text not null, latitude numeric(9,6) not null, longitude numeric(9,6) not null,
  accessibility_score smallint not null check (accessibility_score between 0 and 100), supply_status text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (state, name)
);
create table routes (
  id uuid primary key, name text not null, origin text not null, destination text not null, status route_status not null,
  distance_km numeric(8,2) not null check (distance_km >= 0), eta_minutes integer not null check (eta_minutes >= 0),
  accessibility_score smallint not null check (accessibility_score between 0 and 100), geometry jsonb not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table route_risk_scores (
  id uuid primary key, route_id uuid not null references routes(id) on delete cascade, score smallint not null check (score between 0 and 100),
  level risk_level not null, weather_risk smallint not null check (weather_risk between 0 and 100), flood_risk smallint not null check (flood_risk between 0 and 100),
  landslide_risk smallint not null check (landslide_risk between 0 and 100), traffic_risk smallint not null check (traffic_risk between 0 and 100),
  road_condition_risk smallint not null check (road_condition_risk between 0 and 100), historical_incident_risk smallint not null check (historical_incident_risk between 0 and 100),
  confidence smallint not null check (confidence between 0 and 100), predicted_delay_minutes integer not null check (predicted_delay_minutes >= 0), calculated_at timestamptz not null default now()
);
create table incidents (
  id uuid primary key, incident_type text not null, severity incident_severity not null, location text not null,
  latitude numeric(9,6) not null, longitude numeric(9,6) not null, description text not null, reporter_id uuid references users(id),
  created_at timestamptz not null default now(), resolved_at timestamptz
);
create table incident_routes (incident_id uuid references incidents(id) on delete cascade, route_id uuid references routes(id) on delete cascade, primary key (incident_id, route_id));
create table vehicles (
  id uuid primary key, vehicle_id text unique not null, commodity text not null, origin text not null, destination text not null,
  latitude numeric(9,6), longitude numeric(9,6), speed_kph numeric(6,2), eta timestamptz, status text not null, risk_level risk_level not null,
  last_updated timestamptz not null default now()
);
create table supply_points (id uuid primary key, district_id uuid not null references districts(id), name text not null, commodity text not null, status text not null, latitude numeric(9,6) not null, longitude numeric(9,6) not null);
create table logistics_deliveries (id uuid primary key, vehicle_id uuid references vehicles(id), origin text not null, destination text not null, commodity text not null, quantity numeric(12,2), priority text not null, status text not null, eta timestamptz, risk_level risk_level not null, created_at timestamptz not null default now());
create table alerts (id uuid primary key, title text not null, description text not null, severity risk_level not null, location text not null, status alert_status not null default 'NEW', related_entity_type text not null, related_entity_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table weather_conditions (id uuid primary key, district_id uuid references districts(id), rainfall_mm numeric(8,2), severity risk_level not null, observed_at timestamptz not null, source text not null);
create table field_reports (id uuid primary key, client_report_id uuid unique not null, incident_id uuid references incidents(id), reporter_id uuid references users(id), photo_url text, sync_status sync_status not null, created_at timestamptz not null, synced_at timestamptz);
create table sync_queue (id uuid primary key, client_report_id uuid unique not null, payload jsonb not null, status sync_status not null, retry_count integer not null default 0 check (retry_count >= 0), last_attempt_at timestamptz, server_id uuid, created_at timestamptz not null default now());

create index route_risk_scores_route_calculated_idx on route_risk_scores (route_id, calculated_at desc);
create index incidents_created_idx on incidents (created_at desc);
create index incidents_location_idx on incidents (latitude, longitude);
create index alerts_status_created_idx on alerts (status, created_at desc);
create index vehicles_status_updated_idx on vehicles (status, last_updated desc);
create index sync_queue_status_idx on sync_queue (status, created_at);
