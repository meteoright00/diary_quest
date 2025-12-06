-- Initial database schema for diary_quest
-- SQLite version

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
);

-- Diaries table
CREATE TABLE IF NOT EXISTS diaries (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  character_id TEXT NOT NULL,
  world_id TEXT NOT NULL,
  original_content TEXT NOT NULL,
  converted_content TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  FOREIGN KEY (world_id) REFERENCES worlds(id),
  UNIQUE(character_id, date)
);

-- Quests table
CREATE TABLE IF NOT EXISTS quests (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- Worlds table
CREATE TABLE IF NOT EXISTS worlds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  settings_file_path TEXT NOT NULL,
  data TEXT NOT NULL,
  is_built_in INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Stories table
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  world_id TEXT NOT NULL,
  title TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  FOREIGN KEY (world_id) REFERENCES worlds(id)
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  type TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  data TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- App config table
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
