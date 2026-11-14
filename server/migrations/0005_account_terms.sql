ALTER TABLE auth_users
  ADD COLUMN terms_version text,
  ADD COLUMN terms_accepted_at timestamptz;
