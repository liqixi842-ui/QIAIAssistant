# 动「QI」来 CRM系统 - 生产部署指南

## 部署目标
- 服务器: 172.93.32.222
- 域名: app.detusts.com
- 管理员账号: qixi / hu626388

## 本次修复内容（已完成✅）

### 1. 安全修复 - Session认证系统
**问题**: 前端可以伪造userId和role参数，绕过权限控制
**修复**: 
- ✅ 实现express-session认证中间件
- ✅ 所有客户CRUD路由使用requireAuth保护
- ✅ createdBy字段强制从session获取，前端无法伪造
- ✅ 登录流程正确设置session用户信息

### 2. Dashboard欢迎语
**问题**: 欢迎语硬编码"张伟"
**修复**: ✅ 动态显示当前登录用户的昵称或姓名

### 3. 客户标签UI颜色
**问题**: 标签颜色不明显，区分度不够
**修复**: ✅ 3种清晰颜色：灰色（未跟进）、蓝色（跟进中）、绿色（已成交）

### 4. AI客户分析API集成
**问题**: handleAIAnalyze使用占位符
**修复**: ✅ 调用真实后端API `/api/ai/analyze-customer`，使用AI模型分析

### 5. 团队群聊WebSocket实时通信
**问题**: 群聊无法实时通信
**修复**: 
- ✅ 后端WebSocket服务器（路径 /ws）
- ✅ 前端WebSocket客户端连接
- ✅ 实时消息广播
- ✅ 在线状态追踪

### 6. AI助手优化
**问题**: AI助手回复质量不高
**修复**: ✅ 优化系统prompt，专注金融证券销售领域，增强专业性和合规意识

---

## 部署步骤

### 步骤1: SSH登录服务器
```bash
ssh root@172.93.32.222
# 或使用配置的SSH密钥
```

### 步骤2: 进入项目目录
```bash
cd /root/dongqilai-crm
```

### 步骤3: 备份当前版本（推荐）
```bash
# 备份数据库
pg_dump -U postgres dongqilai_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 查看当前git状态
git status
```

### 步骤4: 拉取最新代码
```bash
git pull origin main
```

### 步骤5: 安装依赖
```bash
npm install
```

### 步骤6: 同步数据库schema
```bash
# 方式1：安全推送（推荐）
npm run db:push

# 方式2：如果上述命令失败，使用强制推送
npm run db:push --force
```

**注意**: 
- `db:push` 会自动同步schema变更到PostgreSQL数据库
- 不会丢失现有数据
- 如果有schema冲突，使用 `--force` 强制同步

### 步骤7: 重启应用
```bash
pm2 restart dongqilai-crm
```

### 步骤8: 验证部署
```bash
# 检查应用状态
pm2 status

# 查看应用日志
pm2 logs dongqilai-crm --lines 50

# 检查应用是否正常运行
curl http://localhost:5000/api/health
# 或
curl https://app.detusts.com/api/health
```

---

## 验证功能

### 1. 测试Session认证
1. 打开浏览器访问 https://app.detusts.com
2. 使用管理员账号登录: qixi / hu626388
3. 打开浏览器开发者工具 > Application > Cookies
4. 确认有 `connect.sid` cookie
5. 尝试添加客户，检查是否成功（验证requireAuth中间件）

### 2. 测试Dashboard欢迎语
1. 登录后查看Dashboard页面
2. 确认欢迎语显示 "欢迎回来，{您的昵称或姓名}！"
3. 不应显示"张伟"

### 3. 测试客户标签颜色
1. 进入客户管理页面
2. 查看不同状态的客户标签：
   - 未跟进：灰色
   - 跟进中：蓝色
   - 已成交：绿色
3. 确认颜色清晰可辨

### 4. 测试AI客户分析
1. 进入客户详情页面
2. 点击"AI分析"按钮
3. 填写销售对话内容
4. 确认返回AI分析结果（不是占位符）
5. 检查网络请求调用 `/api/ai/analyze-customer`

### 5. 测试团队群聊
1. 打开两个浏览器窗口，分别登录不同账号
2. 进入"团队群聊"页面
3. 在一个窗口发送消息
4. 确认另一个窗口实时收到消息（无需刷新）
5. 检查在线用户列表是否正确显示

### 6. 测试AI助手
1. 进入AI助手页面
2. 提问关于金融销售的问题
3. 确认回复专业、详细、有合规意识

---

## 环境变量检查

确保服务器上配置了以下环境变量（在 `.env` 文件或PM2配置中）：

```bash
# 数据库
DATABASE_URL=postgresql://...
PGHOST=...
PGPORT=5432
PGUSER=...
PGPASSWORD=...
PGDATABASE=dongqilai_db

# Session
SESSION_SECRET=your-secret-key-here

# AI模型
AI_API_KEY=...
AI_BASE_URL=...
AI_MODEL=gpt-4o-mini  # 或其他模型

# OpenAI（用于AI助手和AI分析）
OPENAI_API_KEY=...
```

---

## 故障排查

### 问题1: 应用启动失败
```bash
# 查看详细日志
pm2 logs dongqilai-crm --err --lines 100

# 常见原因：
# - 数据库连接失败：检查DATABASE_URL
# - 端口被占用：检查5000端口
# - 依赖缺失：重新运行 npm install
```

### 问题2: 数据库连接错误
```bash
# 测试数据库连接
psql $DATABASE_URL

# 检查数据库是否存在
psql -U postgres -l | grep dongqilai

# 如果数据库不存在，创建
createdb -U postgres dongqilai_db
```

### 问题3: WebSocket连接失败
```bash
# 检查Nginx配置是否支持WebSocket
# /etc/nginx/sites-available/app.detusts.com

location /ws {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}

# 重启Nginx
nginx -t
systemctl reload nginx
```

### 问题4: Session不持久
```bash
# 检查SESSION_SECRET是否配置
echo $SESSION_SECRET

# 检查connect.sid cookie是否设置
# 浏览器开发者工具 > Application > Cookies
```

### 问题5: AI功能不工作
```bash
# 检查AI API密钥
echo $OPENAI_API_KEY
echo $AI_API_KEY

# 测试API连接
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

---

## PM2配置示例

如果需要更新PM2配置，参考：

```json
{
  "apps": [{
    "name": "dongqilai-crm",
    "script": "npm",
    "args": "run dev",
    "cwd": "/root/dongqilai-crm",
    "env": {
      "NODE_ENV": "production",
      "PORT": "5000"
    },
    "error_file": "/root/.pm2/logs/dongqilai-crm-error.log",
    "out_file": "/root/.pm2/logs/dongqilai-crm-out.log",
    "log_date_format": "YYYY-MM-DD HH:mm:ss"
  }]
}
```

保存为 `ecosystem.config.json`，然后运行：
```bash
pm2 start ecosystem.config.json
pm2 save
```

---

## 回滚步骤（如果需要）

如果部署出现问题，回滚到之前的版本：

```bash
# 查看git历史
git log --oneline -10

# 回滚到特定commit
git reset --hard <commit-hash>

# 重新安装依赖
npm install

# 恢复数据库备份（如果需要）
psql -U postgres dongqilai_db < backup_YYYYMMDD_HHMMSS.sql

# 重启应用
pm2 restart dongqilai-crm
```

---

## 联系方式

如有问题，请联系开发团队。

---

## 部署清单

部署完成后，请逐项确认：

- [ ] 代码已拉取到最新版本 (git pull)
- [ ] 依赖已安装 (npm install)
- [ ] 数据库schema已同步 (npm run db:push)
- [ ] 应用已重启 (pm2 restart)
- [ ] 应用状态正常 (pm2 status)
- [ ] 日志无严重错误 (pm2 logs)
- [ ] Session认证功能正常（登录后有connect.sid cookie）
- [ ] Dashboard欢迎语显示正确昵称
- [ ] 客户标签颜色清晰可辨
- [ ] AI客户分析调用真实API
- [ ] 团队群聊实时通信正常
- [ ] AI助手回复专业准确
- [ ] WebSocket连接正常（/ws路径）
- [ ] 所有环境变量已配置

**部署完成时间**: ___________

**部署人员**: ___________

**验证人员**: ___________
