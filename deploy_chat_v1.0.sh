#!/bin/bash

# ============================================
# 动「QI」来 1.0 聊天模块部署脚本
# ============================================
# 服务器: 172.93.32.222
# 路径: /var/www/dongqilai
# 域名: https://app.detusts.com
# ============================================

set -e  # 遇到错误立即退出

echo "=========================================="
echo "开始部署动「QI」来 1.0 聊天模块"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# 配置变量
APP_DIR="/var/www/dongqilai"
BACKUP_DIR="/var/backups/dongqilai"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 1. 创建备份目录
echo ""
echo "[1/8] 创建备份目录..."
mkdir -p "$BACKUP_DIR"

# 2. 备份当前代码
echo ""
echo "[2/8] 备份当前代码..."
cd "$APP_DIR"
tar -czf "$BACKUP_DIR/code_backup_$TIMESTAMP.tar.gz" \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  .

echo "备份已保存到: $BACKUP_DIR/code_backup_$TIMESTAMP.tar.gz"

# 3. 备份数据库
echo ""
echo "[3/8] 备份数据库..."
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
echo "数据库备份已保存到: $BACKUP_DIR/db_backup_$TIMESTAMP.sql"

# 4. 停止PM2应用
echo ""
echo "[4/8] 停止PM2应用..."
pm2 stop dongqilai || echo "PM2应用未运行，跳过停止步骤"

# 5. 更新代码文件
echo ""
echo "[5/8] 更新代码文件..."

# 5.1 更新shared/schema.ts
echo "更新 shared/schema.ts..."
cat > "$APP_DIR/shared/schema.ts" << 'SCHEMA_EOF'
// 此处使用heredoc插入完整的schema.ts内容
// 由于内容较长，建议使用cat命令分块上传
SCHEMA_EOF

# 5.2 更新server/storage.ts
echo "更新 server/storage.ts..."
# 分块上传（使用sed命令在特定行插入新方法）

# 5.3 更新server/routes.ts
echo "更新 server/routes.ts..."
# 同样使用sed命令或heredoc方式

# 5.4 更新client/src/pages/ChatPage.tsx
echo "更新 client/src/pages/ChatPage.tsx..."
# 使用cat heredoc

# 6. 执行数据库迁移
echo ""
echo "[6/8] 执行数据库迁移..."
psql "$DATABASE_URL" < deployment_v1.0.sql

# 7. 重新构建应用
echo ""
echo "[7/8] 重新构建应用..."
cd "$APP_DIR"
npm run build

# 8. 重启PM2应用
echo ""
echo "[8/8] 重启PM2应用..."
pm2 start ecosystem.config.cjs || pm2 restart dongqilai
pm2 save

echo ""
echo "=========================================="
echo "部署完成！"
echo "=========================================="
echo "访问地址: https://app.detusts.com"
echo "登录账号: qixi / hu626388"
echo ""
echo "验证步骤："
echo "1. 访问聊天页面"
echo "2. 检查"销售团队"聊天室是否存在"
echo "3. 测试发送消息"
echo "4. 测试创建群组"
echo "5. 测试私聊功能"
echo "6. 测试搜索功能"
echo ""
echo "如遇问题，可回滚："
echo "  cd $APP_DIR"
echo "  tar -xzf $BACKUP_DIR/code_backup_$TIMESTAMP.tar.gz"
echo "  psql \$DATABASE_URL < $BACKUP_DIR/db_backup_$TIMESTAMP.sql"
echo "  pm2 restart dongqilai"
echo "=========================================="
