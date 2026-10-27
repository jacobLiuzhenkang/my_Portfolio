CREATE TABLE IF NOT EXISTS guestbook_messages (
  id serial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  name varchar(100) NOT NULL,
  email varchar(320) NOT NULL,
  company varchar(160),
  body text NOT NULL CONSTRAINT guestbook_messages_body_check CHECK (length(body) BETWEEN 1 AND 2000),
  status varchar(8) NOT NULL DEFAULT 'new' CONSTRAINT guestbook_messages_status_check CHECK (status IN ('new', 'read', 'spam'))
);
CREATE INDEX IF NOT EXISTS guestbook_messages_created_idx ON guestbook_messages (created_at, id);
