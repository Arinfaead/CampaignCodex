CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE instance_role AS ENUM ('admin', 'member');
CREATE TYPE campaign_role AS ENUM ('owner', 'gm', 'player', 'viewer');
CREATE TYPE page_visibility AS ENUM ('public', 'campaign', 'gm', 'private');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'revoked');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  role instance_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX campaigns_owner_id_idx ON campaigns(owner_id);

CREATE TABLE campaign_members (
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role campaign_role NOT NULL DEFAULT 'player',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, user_id)
);

CREATE INDEX campaign_members_user_id_idx ON campaign_members(user_id);

CREATE TABLE wiki_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES wiki_pages(id) ON DELETE SET NULL,
  slug text NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  visibility page_visibility NOT NULL DEFAULT 'campaign',
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, slug)
);

CREATE INDEX wiki_pages_campaign_id_idx ON wiki_pages(campaign_id);

CREATE TABLE campaign_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  email text NOT NULL,
  role campaign_role NOT NULL DEFAULT 'player',
  token_hash text NOT NULL UNIQUE,
  status invite_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_by_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  accepted_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX campaign_invites_campaign_id_idx ON campaign_invites(campaign_id);

CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE,
  file_name text NOT NULL,
  content_type text NOT NULL,
  size bigint NOT NULL,
  visibility page_visibility NOT NULL DEFAULT 'campaign',
  uploaded_by_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assets_campaign_id_idx ON assets(campaign_id);
