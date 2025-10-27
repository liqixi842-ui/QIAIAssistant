#!/bin/bash

# 动「QI」来 CRM - 生产环境部署脚本
# 用于将Replit开发环境完整同步到生产服务器

set -e

echo "========================================="
echo "动「QI」来 CRM 生产环境部署脚本"
echo "========================================="
echo ""

# 配置信息
SERVER_IP="172.93.32.222"
SERVER_USER="root"
DEPLOY_PATH="/var/www/dongqilai"
PM2_PROCESS_NAME="dongqilai-crm"

# 检查SSH连接
echo "📡 检查服务器连接..."
if ! ssh -o ConnectTimeout=5 ${SERVER_USER}@${SERVER_IP} "echo 'SSH连接成功'"; then
    echo "❌ 无法连接到服务器 ${SERVER_IP}"
    exit 1
fi
echo "✅ 服务器连接正常"
echo ""

# 在服务器上执行部署
echo "🚀 开始部署到生产服务器..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'

cd /var/www/dongqilai

echo "📦 备份现有代码..."
BACKUP_DIR="/var/www/dongqilai_backup_$(date +%Y%m%d_%H%M%S)"
cp -r . ${BACKUP_DIR} 2>/dev/null || echo "备份创建失败（可能是第一次部署）"

echo "🔄 拉取最新代码..."
# 暂存本地修改
git stash

# 拉取远程更新
git pull origin main

# 如果需要，可以恢复本地修改
# git stash pop

echo "📁 创建上传目录..."
mkdir -p uploads/learning-materials
chmod 755 uploads
chmod 755 uploads/learning-materials

echo "📦 安装依赖..."
npm install

echo "🔨 构建项目..."
npm run build

echo "🔄 重启PM2服务..."
pm2 restart dongqilai-crm

echo "✅ 查看服务状态..."
pm2 status

echo ""
echo "========================================="
echo "部署完成！"
echo "========================================="

ENDSSH

echo ""
echo "🎉 部署完成！"
echo ""
echo "接下来请手动配置Nginx静态文件访问："
echo "1. 编辑 /etc/nginx/conf.d/dongqilai.conf"
echo "2. 添加以下location配置："
echo ""
echo "    # 静态文件访问（学习资料）"
echo "    location /uploads/ {"
echo "        alias /var/www/dongqilai/uploads/;"
echo "        expires 30d;"
echo "        add_header Cache-Control \"public, immutable\";"
echo "    }"
echo ""
echo "3. 重启Nginx: nginx -s reload"
echo ""
echo "访问地址: https://app.detusts.com"
