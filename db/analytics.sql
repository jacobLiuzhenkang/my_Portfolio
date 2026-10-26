CREATE TABLE IF NOT EXISTS analytics_events (
 id serial PRIMARY KEY, occurred_at timestamptz NOT NULL DEFAULT now(),
 name varchar(24) NOT NULL, path varchar(100) NOT NULL,
 project_slug varchar(80), visitor_id varchar(36) NOT NULL, session_id varchar(36),
 referrer_host varchar(253), utm_source varchar(100), utm_medium varchar(100), utm_campaign varchar(100),
 device varchar(10) NOT NULL, country varchar(64), region varchar(100)
);
CREATE INDEX IF NOT EXISTS analytics_occurred_idx ON analytics_events(occurred_at);
CREATE INDEX IF NOT EXISTS analytics_name_occurred_idx ON analytics_events(name, occurred_at);
CREATE INDEX IF NOT EXISTS analytics_project_occurred_idx ON analytics_events(project_slug, occurred_at);
