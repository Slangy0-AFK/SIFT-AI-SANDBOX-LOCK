ALTER TABLE auth_users ADD COLUMN email_verified_at timestamptz;

CREATE TABLE email_verifications (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_verifications_user_id_idx ON email_verifications (user_id);
CREATE INDEX email_verifications_expires_at_idx ON email_verifications (expires_at);
