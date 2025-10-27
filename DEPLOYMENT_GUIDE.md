# 🚀 动「QI」来 1.0 聊天模块 - 生产部署指南

## 📋 版本概述

**版本**: 1.0 (聊天模块完整重构)  
**服务器**: 172.93.32.222  
**路径**: /var/www/dongqilai  
**域名**: https://app.detusts.com  
**数据库**: PostgreSQL (Neon)  
**部署时间**: 预计30-45分钟  

---

## 🎯 核心功能

1. ✅ **多聊天室架构** - 群聊、私聊、聊天室列表管理
2. ✅ **群组管理** - 创建群组、添加成员、权限控制（owner/admin/member）
3. ✅ **搜索功能** - 搜索用户、搜索聊天记录（模糊匹配姓名/ID/内容）
4. ✅ **消息持久化** - 3天以上历史记录保留，数据库存储
5. ✅ **安全隔离** - 严格的成员权限检查，WebSocket消息只发送给聊天室成员
6. ✅ **实时通信** - WebSocket支持，多聊天室消息隔离

**架构师审查**: ✅ 通过（所有安全检查就绪）

---

## 📦 数据库Schema变更

### 新增表

**1. chats（聊天室表）**
```sql
CREATE TABLE chats (
  id VARCHAR PRIMARY KEY,
  type VARCHAR NOT NULL CHECK (type IN ('group', 'direct')),
  name VARCHAR NOT NULL,
  created_by VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**2. chat_participants（聊天室成员表）**
```sql
CREATE TABLE chat_participants (
  chat_id VARCHAR NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL,
  role VARCHAR NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);
```

### 修改表

**chat_messages（聊天消息表）**
- 新增字段: `chat_id VARCHAR NOT NULL DEFAULT '1'`
- 新增外键: `fk_chat_messages_chat_id` → `chats(id)`
- 新增索引: `idx_chat_messages_chat_id`

---

## 🎯 推荐部署方案：使用Git

### 步骤1: 在Replit上推送代码到GitHub

```bash
# 在Replit Shell中执行
cd /home/runner/workspace

# 配置Git (如果还没配置)
git config --global user.email "your@email.com"
git config --global user.name "Your Name"

# 添加所有修改
git add shared/schema.ts server/storage.ts server/routes.ts \
  client/src/pages/ChatPage.tsx deployment_v1.0.sql replit.md

# 提交修改
git commit -m "🚀 Release v1.0: Complete chat module with groups, private chat, search & security"

# 推送到GitHub (假设remote已配置)
git push origin main
```

### 步骤2: 在服务器上部署

SSH连接到服务器 `172.93.32.222`：

```bash
ssh root@172.93.32.222
```

执行以下部署脚本：

```bash
#!/bin/bash
set -e  # 遇到错误立即停止

echo "=========================================="
echo "  动「QI」来 1.0 聊天模块部署"
echo "=========================================="
echo ""

# 配置变量
APP_DIR="/var/www/dongqilai"
BACKUP_DIR="/var/backups/dongqilai"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 1. 创建备份目录
echo "📦 1/8 创建备份目录..."
mkdir -p "$BACKUP_DIR"

# 2. 备份当前代码
echo "📦 2/8 备份当前代码..."
cd "$APP_DIR"
tar -czf "$BACKUP_DIR/code_backup_$TIMESTAMP.tar.gz" \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  .
echo "✅ 代码备份: $BACKUP_DIR/code_backup_$TIMESTAMP.tar.gz"
echo ""

# 3. 备份数据库
echo "🗄️  3/8 备份数据库..."
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
echo "✅ 数据库备份: $BACKUP_DIR/db_backup_$TIMESTAMP.sql"
echo ""

# 4. 停止应用
echo "🛑 4/8 停止PM2应用..."
pm2 stop dongqilai || echo "应用未运行，跳过停止步骤"
echo ""

# 5. 拉取最新代码
echo "📥 5/8 从GitHub拉取最新代码..."
git fetch origin
git reset --hard origin/main
echo "✅ 代码更新完成"
echo ""

# 6. 执行数据库迁移
echo "🗄️  6/8 执行数据库迁移..."
psql "$DATABASE_URL" -f deployment_v1.0.sql
echo "✅ 数据库迁移完成"
echo ""

# 7. 重新构建应用
echo "🔨 7/8 重新构建应用..."
npm install
npm run build
echo "✅ 构建完成"
echo ""

# 8. 重启应用
echo "🔄 8/8 重启PM2应用..."
pm2 start ecosystem.config.cjs || pm2 restart dongqilai
pm2 save
echo ""

echo "⏳ 等待应用启动..."
sleep 5
pm2 status
echo ""

echo "=========================================="
echo "  ✅ 部署完成！"
echo "=========================================="
echo ""
echo "📋 验证步骤："
echo "1. 访问 https://app.detusts.com"
echo "2. 登录账号: qixi / hu626388"
echo "3. 进入团队聊天页面"
echo "4. 测试以下功能："
echo "   - 查看"销售团队"聊天室"
echo "   - 发送消息并验证持久化"
echo "   - 创建新群组"
echo "   - 创建私聊"
echo "   - 搜索用户和消息"
echo ""
echo "🔧 故障排查："
echo "   pm2 logs dongqilai --lines 100"
echo ""
echo "🔄 如需回滚："
echo "   cd $APP_DIR"
echo "   tar -xzf $BACKUP_DIR/code_backup_$TIMESTAMP.tar.gz"
echo "   psql \$DATABASE_URL < $BACKUP_DIR/db_backup_$TIMESTAMP.sql"
echo "   pm2 restart dongqilai"
echo "=========================================="
```

---

## 🔧 备选方案：手动部署（不使用Git）

### 文件传输清单

需要上传以下文件到服务器：

1. **`deployment_v1.0.sql`** → `/var/www/dongqilai/deployment_v1.0.sql`
2. **`shared/schema.ts`** → `/var/www/dongqilai/shared/schema.ts`
3. **`server/storage.ts`** → `/var/www/dongqilai/server/storage.ts`
4. **`server/routes.ts`** → `/var/www/dongqilai/server/routes.ts`
5. **`client/src/pages/ChatPage.tsx`** → `/var/www/dongqilai/client/src/pages/ChatPage.tsx`

### 使用SCP传输

```bash
# 从本地机器执行（先从Replit下载文件到本地）
scp deployment_v1.0.sql root@172.93.32.222:/var/www/dongqilai/
scp shared/schema.ts root@172.93.32.222:/var/www/dongqilai/shared/
scp server/storage.ts root@172.93.32.222:/var/www/dongqilai/server/
scp server/routes.ts root@172.93.32.222:/var/www/dongqilai/server/
scp client/src/pages/ChatPage.tsx root@172.93.32.222:/var/www/dongqilai/client/src/pages/
```

### 在服务器上执行部署

```bash
cd /var/www/dongqilai

# 备份
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p /var/backups/dongqilai
tar -czf /var/backups/dongqilai/backup_$TIMESTAMP.tar.gz \
  --exclude='node_modules' --exclude='dist' .
pg_dump "$DATABASE_URL" > /var/backups/dongqilai/db_$TIMESTAMP.sql

# 停止应用
pm2 stop dongqilai

# 执行数据库迁移
psql "$DATABASE_URL" -f deployment_v1.0.sql

# 重新构建
npm install
npm run build

# 重启应用
pm2 restart dongqilai
pm2 save
```

---

## ✅ 部署验证

### 1. 基础功能检查

访问 https://app.detusts.com，使用账号 `qixi / hu626388` 登录

### 2. 聊天功能完整测试

#### 测试1：默认团队聊天室
```
1. 点击侧边栏"团队聊天"
2. 应看到"销售团队"聊天室
3. 发送测试消息："测试消息1"
4. 刷新页面
5. 验证消息仍然存在（持久化成功）
```

#### 测试2：创建群组
```
1. 点击"创建群聊"按钮
2. 输入群组名称："测试群组"
3. 搜索并添加成员（至少2人）
4. 点击"创建"
5. 验证新群组出现在左侧列表
6. 进入群组，发送消息
7. 验证消息只显示在该群组中
```

#### 测试3：私聊功能
```
1. 点击"新私聊"按钮
2. 搜索用户（输入昵称或ID）
3. 选择用户，创建私聊
4. 发送私聊消息
5. 切换到其他聊天室
6. 切换回私聊
7. 验证私聊消息仍然存在
```

#### 测试4：搜索功能
```
1. 在搜索框输入用户昵称
2. 验证用户搜索结果正确
3. 输入消息关键词
4. 验证消息搜索结果正确（只显示有权限的聊天室消息）
```

#### 测试5：消息隔离验证
```
1. 在"销售团队"发送消息A
2. 切换到私聊，发送消息B
3. 切换回"销售团队"
4. 验证只看到消息A，不显示消息B
5. 刷新页面
6. 再次验证消息隔离正确
```

### 3. 安全验证

使用Chrome DevTools检查WebSocket消息：

```
1. F12打开开发者工具
2. 切换到Network → WS标签
3. 点击WebSocket连接
4. 在"销售团队"发送消息
5. 查看WebSocket消息，验证包含chatId字段
6. 切换到私聊，发送消息
7. 验证chatId不同，消息隔离
```

### 4. 数据库验证

```bash
# SSH登录服务器
ssh root@172.93.32.222

# 检查新表是否创建
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM chats;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM chat_participants;"

# 检查默认聊天室
psql "$DATABASE_URL" -c "SELECT * FROM chats WHERE id = '1';"

# 检查成员
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM chat_participants WHERE chat_id = '1';"

# 检查消息表是否有chat_id字段
psql "$DATABASE_URL" -c "\d chat_messages"
```

---

## 🐛 故障排查

### 问题1：数据库连接失败

**症状**: `Error: connect ECONNREFUSED`

**解决**:
```bash
# 检查DATABASE_URL
echo $DATABASE_URL

# 测试连接
psql "$DATABASE_URL" -c "SELECT 1;"

# 如果失败，检查Neon数据库状态
```

### 问题2：默认聊天室不存在

**症状**: 聊天列表为空

**解决**:
```bash
# 手动创建默认聊天室
psql "$DATABASE_URL" << 'SQL'
INSERT INTO chats (id, type, name, created_by) 
VALUES ('1', 'group', '销售团队', '7')
ON CONFLICT (id) DO NOTHING;

INSERT INTO chat_participants (chat_id, user_id, role)
SELECT '1', id::VARCHAR, 
  CASE WHEN id = 7 THEN 'owner' ELSE 'member' END
FROM users;
SQL
```

### 问题3：WebSocket连接失败

**症状**: 消息发送后不显示，控制台显示WebSocket错误

**解决**:
```bash
# 检查Nginx配置（如果使用反向代理）
cat /etc/nginx/sites-available/dongqilai

# WebSocket必须配置以下头部：
# proxy_http_version 1.1;
# proxy_set_header Upgrade $http_upgrade;
# proxy_set_header Connection "upgrade";

# 重启Nginx
nginx -t && nginx -s reload
```

### 问题4：消息不持久化

**症状**: 刷新页面后消息消失

**解决**:
```bash
# 检查chat_messages表
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM chat_messages;"

# 检查chat_id字段
psql "$DATABASE_URL" -c "SELECT chat_id, content FROM chat_messages ORDER BY timestamp DESC LIMIT 5;"

# 如果chat_id字段不存在，重新执行迁移
psql "$DATABASE_URL" -f deployment_v1.0.sql
```

### 问题5：PM2启动失败

**症状**: `pm2 status` 显示应用为 `errored`

**解决**:
```bash
# 查看详细错误日志
pm2 logs dongqilai --lines 100

# 常见错误：
# - TypeScript编译错误：检查文件是否正确上传
# - 端口占用：pm2 delete dongqilai && pm2 start ecosystem.config.cjs
# - 环境变量缺失：检查.env文件
```

---

## 🔄 回滚步骤

如果部署失败，执行以下回滚：

```bash
cd /var/www/dongqilai

# 停止应用
pm2 stop dongqilai

# 恢复代码（替换为实际备份文件名）
tar -xzf /var/backups/dongqilai/code_backup_YYYYMMDD_HHMMSS.tar.gz

# 恢复数据库（替换为实际备份文件名）
psql "$DATABASE_URL" < /var/backups/dongqilai/db_backup_YYYYMMDD_HHMMSS.sql

# 重新构建并启动
npm run build
pm2 restart dongqilai
pm2 save
```

---

## 📊 关键文件变更摘要

### 1. shared/schema.ts
- 新增 `chats` 表定义
- 新增 `chatParticipants` 表定义
- 更新 `chatMessages` 表（添加 `chatId` 字段）
- 新增相关insert/select类型

### 2. server/storage.ts
- 新增 `IStorage` 接口方法：
  - `getUserChats()` - 获取用户聊天室列表
  - `createChat()` - 创建聊天室
  - `getOrCreateDirectChat()` - 获取或创建私聊
  - `addChatParticipant()` - 添加成员
  - `getChatParticipants()` - 获取成员列表
  - `isUserInChat()` - 检查成员资格
  - `searchUsers()` - 搜索用户
  - `searchChatMessages()` - 搜索消息
  - `getChatMessagesByChatId()` - 按chatId获取消息
- 完整的 `PostgresStorage` 实现

### 3. server/routes.ts
- 新增6个API端点：
  - `GET /api/chats` - 获取聊天列表
  - `POST /api/chats/create` - 创建群组
  - `POST /api/chats/direct` - 创建私聊
  - `POST /api/chats/:chatId/participants` - 添加成员
  - `GET /api/search/users` - 搜索用户
  - `GET /api/search/messages` - 搜索消息
- 更新 `GET /api/chat/messages` - 添加成员权限检查
- 更新WebSocket消息处理 - 添加成员过滤
- 新增 `broadcastToParticipants()` 函数

### 4. client/src/pages/ChatPage.tsx
- 完全移除mock数据
- 使用React Query获取真实数据
- 实现创建群组UI对话框
- 实现用户搜索和消息搜索
- 实现WebSocket实时消息接收
- 实现多聊天室切换和消息隔离

---

## ⚠️ 重要提醒

1. **必须清除浏览器缓存**: 旧的JavaScript文件会导致功能异常
2. **关闭所有标签页**: 确保加载的是新版本代码
3. **首次测试建议**: 使用隐私/无痕模式打开，避免缓存干扰
4. **验证数据库**: 确认所有表和字段创建成功后再测试功能
5. **WebSocket连接**: 确保Nginx/反向代理正确配置WebSocket支持

---

## ✅ 部署成功检查清单

- [ ] 备份已创建（代码 + 数据库）
- [ ] 代码文件已更新（4个文件）
- [ ] 数据库迁移成功执行（3个表）
- [ ] 应用成功构建（npm run build）
- [ ] PM2进程正常运行
- [ ] "销售团队"聊天室存在
- [ ] 发送消息功能正常
- [ ] 消息持久化验证通过
- [ ] 创建群组功能正常
- [ ] 私聊功能正常
- [ ] 搜索用户功能正常
- [ ] 搜索消息功能正常
- [ ] 多聊天室隔离验证通过
- [ ] WebSocket实时消息正常
- [ ] 监控日志无错误

**全部完成后，部署成功！** 🚀

---

**部署日期**: 2025-01-27  
**版本**: 1.0  
**架构师审查**: ✅ 通过  
**安全级别**: ✅ 所有端点成员权限检查就绪  
**预计部署时间**: 30-45分钟
