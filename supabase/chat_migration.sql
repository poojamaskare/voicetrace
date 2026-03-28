-- VoiceTrace: Chat sessions and message history
-- Run this SQL in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'New Chat',
  mode TEXT NOT NULL CHECK (mode IN ('chat', 'voice')) DEFAULT 'chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  mode TEXT NOT NULL CHECK (mode IN ('chat', 'voice')),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at ASC);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Demo policy: allow anonymous access.
DROP POLICY IF EXISTS "Allow anonymous access" ON chat_sessions;
CREATE POLICY "Allow anonymous access" ON chat_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous access" ON chat_messages;
CREATE POLICY "Allow anonymous access" ON chat_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Keep session updated_at fresh when a message is inserted.
CREATE OR REPLACE FUNCTION touch_chat_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions SET updated_at = NOW() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_chat_session_updated_at ON chat_messages;
CREATE TRIGGER trg_touch_chat_session_updated_at
AFTER INSERT ON chat_messages
FOR EACH ROW EXECUTE FUNCTION touch_chat_session_updated_at();
