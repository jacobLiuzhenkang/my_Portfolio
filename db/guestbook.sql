CREATE TABLE IF NOT EXISTS gb_settings (key varchar(80) PRIMARY KEY, value text NOT NULL);
CREATE TABLE IF NOT EXISTS gb_visitors (id uuid PRIMARY KEY, token_hash varchar(64) UNIQUE NOT NULL, expires_at timestamptz NOT NULL, blocked_until timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS gb_posts (id uuid PRIMARY KEY, visitor_id uuid NOT NULL REFERENCES gb_visitors(id), admin_id integer, nickname varchar(32) NOT NULL, body text NOT NULL, state varchar(16) NOT NULL DEFAULT 'published', flags jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS gb_posts_feed ON gb_posts(state,created_at,id);
CREATE TABLE IF NOT EXISTS gb_media (id uuid PRIMARY KEY, visitor_id uuid NOT NULL REFERENCES gb_visitors(id), post_id uuid REFERENCES gb_posts(id), source_key text NOT NULL, final_key text NOT NULL, mime varchar(48) NOT NULL, size integer NOT NULL, reserved_bytes integer NOT NULL, final_size integer, width integer, height integer, state varchar(16) NOT NULL DEFAULT 'reserved', upload_token_hash varchar(64) NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS gb_media_post ON gb_media(post_id);
CREATE INDEX IF NOT EXISTS gb_media_expiry ON gb_media(state,expires_at);
CREATE TABLE IF NOT EXISTS gb_likes (post_id uuid NOT NULL REFERENCES gb_posts(id), visitor_id uuid NOT NULL REFERENCES gb_visitors(id), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(post_id,visitor_id));
CREATE TABLE IF NOT EXISTS gb_comments (id uuid PRIMARY KEY, post_id uuid NOT NULL REFERENCES gb_posts(id), visitor_id uuid NOT NULL REFERENCES gb_visitors(id), admin_id integer, nickname varchar(32) NOT NULL, body text NOT NULL, state varchar(16) NOT NULL DEFAULT 'published', flags jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS gb_comments_post ON gb_comments(post_id,state,created_at);
CREATE TABLE IF NOT EXISTS gb_reports (id uuid PRIMARY KEY, visitor_id uuid NOT NULL REFERENCES gb_visitors(id), target_type varchar(10) NOT NULL, target_id uuid NOT NULL, reason varchar(32) NOT NULL, resolved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS gb_reports_once ON gb_reports(visitor_id,target_type,target_id);
CREATE TABLE IF NOT EXISTS gb_limits (key varchar(200) PRIMARY KEY, count integer NOT NULL, resets_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS gb_limits_expiry ON gb_limits(resets_at);

CREATE INDEX IF NOT EXISTS gb_reports_target ON gb_reports(target_type,target_id);
