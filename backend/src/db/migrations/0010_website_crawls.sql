-- Run this SQL in your PostgreSQL database if the migrate script fails.
-- Creates the website_crawls table (migration 0010).

CREATE TABLE IF NOT EXISTS website_crawls (
  id SERIAL PRIMARY KEY,
  workspace_id INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id INT REFERENCES agents(id) ON DELETE SET NULL,
  url VARCHAR(2048) NOT NULL,
  title VARCHAR(1024),
  description TEXT,
  logo_url VARCHAR(2048),
  use_case VARCHAR(64) NOT NULL DEFAULT 'general',
  training_content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_website_crawls_workspace_id ON website_crawls(workspace_id);
CREATE INDEX IF NOT EXISTS idx_website_crawls_agent_id ON website_crawls(agent_id);

-- Optional: mark this migration as executed (if you use the migrations table)
-- INSERT INTO migrations (version, name) VALUES ('0010', 'website_crawls') ON CONFLICT (version) DO NOTHING;
