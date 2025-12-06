-- Add indexes for better query performance

-- Diaries indexes
CREATE INDEX IF NOT EXISTS idx_diaries_character_date
  ON diaries(character_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_diaries_date
  ON diaries(date DESC);

CREATE INDEX IF NOT EXISTS idx_diaries_world
  ON diaries(world_id);

-- Quests indexes
CREATE INDEX IF NOT EXISTS idx_quests_character_status
  ON quests(character_id, status);

CREATE INDEX IF NOT EXISTS idx_quests_character_created
  ON quests(character_id, created_at DESC);

-- Characters indexes
CREATE INDEX IF NOT EXISTS idx_characters_world
  ON characters(world_id);

CREATE INDEX IF NOT EXISTS idx_characters_updated
  ON characters(updated_at DESC);

-- Stories indexes
CREATE INDEX IF NOT EXISTS idx_stories_character
  ON stories(character_id, created_at DESC);

-- Reports indexes
CREATE INDEX IF NOT EXISTS idx_reports_character_type
  ON reports(character_id, type, period_start DESC);

-- Worlds indexes
CREATE INDEX IF NOT EXISTS idx_worlds_category
  ON worlds(category);

CREATE INDEX IF NOT EXISTS idx_worlds_builtin
  ON worlds(is_built_in);
