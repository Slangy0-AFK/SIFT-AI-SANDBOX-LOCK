CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX audit_log_occurred_at_idx ON audit_log (occurred_at);
