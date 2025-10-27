-- ============================================
-- 动「QI」来 1.0 聊天模块数据库迁移
-- ============================================
-- 执行方式：在production数据库执行此脚本
-- psql -h [host] -U [user] -d [database] -f deployment_v1.0.sql

-- 1. 创建聊天室表
CREATE TABLE IF NOT EXISTS chats (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR NOT NULL CHECK (type IN ('group', 'direct')),
  name VARCHAR NOT NULL,
  created_by VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. 创建聊天室成员表
CREATE TABLE IF NOT EXISTS chat_participants (
  chat_id VARCHAR NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL,
  role VARCHAR NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

-- 3. 更新chat_messages表，添加chat_id列（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'chat_id'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN chat_id VARCHAR NOT NULL DEFAULT '1';
    -- 添加外键约束
    ALTER TABLE chat_messages ADD CONSTRAINT fk_chat_messages_chat_id 
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE;
    -- 添加索引以提升查询性能
    CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id);
  END IF;
END $$;

-- 4. 创建默认聊天室："销售团队"（团队群聊）
INSERT INTO chats (id, type, name, created_by, created_at)
VALUES ('1', 'group', '销售团队', '7', NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. 将所有现有用户加入默认聊天室
INSERT INTO chat_participants (chat_id, user_id, role, joined_at)
SELECT '1', id::VARCHAR, 
  CASE 
    WHEN id = 7 THEN 'owner'  -- 七喜（主管）为群主
    WHEN role = '总监' OR role = '经理' THEN 'admin'
    ELSE 'member'
  END,
  NOW()
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM chat_participants 
  WHERE chat_id = '1' AND user_id = users.id::VARCHAR
);

-- 6. 创建索引以提升性能
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_by ON chats(created_by);

-- 7. 验证数据
SELECT 'Chats created:' AS info, COUNT(*) AS count FROM chats;
SELECT 'Chat participants:' AS info, COUNT(*) AS count FROM chat_participants;
SELECT 'Chat messages linked:' AS info, COUNT(*) AS count FROM chat_messages WHERE chat_id = '1';

-- ============================================
-- 迁移完成！
-- ============================================
