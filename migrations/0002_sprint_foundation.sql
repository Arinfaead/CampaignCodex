CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TYPE instance_role RENAME TO instance_role_old;
CREATE TYPE instance_role AS ENUM ('instance_admin', 'user');
ALTER TABLE users
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE instance_role
  USING (
    CASE role::text
      WHEN 'admin' THEN 'instance_admin'
      ELSE 'user'
    END
  )::instance_role,
  ALTER COLUMN role SET DEFAULT 'user';
DROP TYPE instance_role_old;

ALTER TYPE campaign_role RENAME TO campaign_role_old;
CREATE TYPE campaign_role AS ENUM ('campaign_admin', 'member', 'viewer');
ALTER TABLE campaign_members
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE campaign_role
  USING (
    CASE role::text
      WHEN 'owner' THEN 'campaign_admin'
      WHEN 'gm' THEN 'campaign_admin'
      WHEN 'player' THEN 'member'
      ELSE 'viewer'
    END
  )::campaign_role,
  ALTER COLUMN role SET DEFAULT 'member';
ALTER TABLE campaign_invites
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE campaign_role
  USING (
    CASE role::text
      WHEN 'owner' THEN 'campaign_admin'
      WHEN 'gm' THEN 'campaign_admin'
      WHEN 'player' THEN 'member'
      ELSE 'viewer'
    END
  )::campaign_role,
  ALTER COLUMN role SET DEFAULT 'member';
DROP TYPE campaign_role_old;

CREATE TYPE campaign_visibility AS ENUM ('private', 'shared', 'public');

ALTER TABLE sessions DROP CONSTRAINT sessions_pkey;
ALTER TABLE sessions ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE sessions ADD PRIMARY KEY (id);
CREATE UNIQUE INDEX sessions_token_hash_unique ON sessions(token_hash);

ALTER TABLE campaigns RENAME COLUMN owner_id TO created_by_user_id;
DROP INDEX IF EXISTS campaigns_owner_id_idx;
CREATE INDEX campaigns_created_by_user_id_idx ON campaigns(created_by_user_id);
ALTER TABLE campaigns ADD COLUMN visibility campaign_visibility NOT NULL DEFAULT 'private';

ALTER TABLE campaign_members DROP CONSTRAINT campaign_members_pkey;
ALTER TABLE campaign_members ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE campaign_members ADD PRIMARY KEY (id);
CREATE UNIQUE INDEX campaign_members_campaign_user_unique ON campaign_members(campaign_id, user_id);

CREATE TABLE oauth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX oauth_accounts_provider_account_unique ON oauth_accounts(provider, provider_account_id);
CREATE INDEX oauth_accounts_user_id_idx ON oauth_accounts(user_id);
