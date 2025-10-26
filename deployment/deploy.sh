#!/bin/bash
# 动「QI」来 CRM 一键部署脚本
# 服务器: 172.93.32.222
# 域名: app.detusts.com

set -e  # 遇到错误立即退出

echo "======================================"
echo "动「QI」来 CRM 系统部署开始"
echo "======================================"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

APP_DIR="/var/www/dongqilai"
NGINX_CONF="/etc/nginx/sites-available/dongqilai"
DOMAIN="app.detusts.com"

# 检查是否是root用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用 sudo 运行此脚本${NC}"
    exit 1
fi

echo -e "${GREEN}步骤1: 安装必要软件${NC}"
apt update
apt install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx

# 安装Node.js 20.x
if ! command -v node &> /dev/null; then
    echo "安装 Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# 安装PM2
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    npm install -g pm2
fi

echo -e "${GREEN}步骤2: 配置PostgreSQL数据库${NC}"
sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='dongqilai'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE DATABASE dongqilai;"

# 创建数据库用户（如果不存在）
echo -e "${YELLOW}请设置数据库密码（记住此密码，稍后需要填写到.env文件）:${NC}"
read -s DB_PASSWORD
sudo -u postgres psql -c "CREATE USER dongqilai_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE dongqilai TO dongqilai_user;"
sudo -u postgres psql -d dongqilai -c "GRANT ALL ON SCHEMA public TO dongqilai_user;"

echo -e "${GREEN}步骤3: 创建应用目录${NC}"
mkdir -p $APP_DIR
mkdir -p /var/log/pm2

echo -e "${GREEN}步骤4: 复制应用文件${NC}"
echo -e "${YELLOW}请将应用文件上传到 $APP_DIR${NC}"
echo "您可以使用以下方法之一:"
echo "1. scp -r /path/to/app root@172.93.32.222:$APP_DIR"
echo "2. git clone 您的仓库地址 $APP_DIR"
echo "3. 使用FTP/SFTP工具上传"
echo ""
read -p "文件是否已上传? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}请先上传文件，然后重新运行此脚本${NC}"
    exit 1
fi

cd $APP_DIR

echo -e "${GREEN}步骤5: 配置环境变量${NC}"
if [ ! -f .env ]; then
    cp deployment/env.production.template .env
    echo -e "${YELLOW}请编辑 .env 文件，填写以下配置:${NC}"
    echo "1. DATABASE_URL=postgresql://dongqilai_user:$DB_PASSWORD@localhost:5432/dongqilai"
    echo "2. PGPASSWORD=$DB_PASSWORD"
    echo "3. SESSION_SECRET=（生成32位随机字符串）"
    echo "4. OPENAI_API_KEY=（您的OpenAI API密钥）"
    echo ""
    nano .env
fi

echo -e "${GREEN}步骤6: 安装依赖并构建${NC}"
npm install --production
npm run build 2>/dev/null || echo "No build script found, skipping..."

echo -e "${GREEN}步骤7: 初始化数据库${NC}"
npm run db:push

echo -e "${GREEN}步骤8: 配置Nginx${NC}"
cp deployment/nginx.conf $NGINX_CONF
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/dongqilai

# 删除默认站点
rm -f /etc/nginx/sites-enabled/default

# 测试Nginx配置
nginx -t

echo -e "${GREEN}步骤9: 配置SSL证书（Let's Encrypt）${NC}"
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@detusts.com || \
echo -e "${YELLOW}SSL证书配置失败，请手动运行: certbot --nginx -d $DOMAIN${NC}"

echo -e "${GREEN}步骤10: 启动应用${NC}"
# 复制PM2配置
cp deployment/ecosystem.config.js .

# 停止旧进程（如果存在）
pm2 delete dongqilai-crm 2>/dev/null || true

# 启动新进程
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup systemd -u root --hp /root
pm2 save

echo -e "${GREEN}步骤11: 重启Nginx${NC}"
systemctl restart nginx
systemctl enable nginx

echo ""
echo "======================================"
echo -e "${GREEN}部署完成！${NC}"
echo "======================================"
echo ""
echo "应用信息:"
echo "  - 域名: https://$DOMAIN"
echo "  - 应用目录: $APP_DIR"
echo "  - 数据库: dongqilai"
echo ""
echo "管理命令:"
echo "  - 查看日志: pm2 logs dongqilai-crm"
echo "  - 重启应用: pm2 restart dongqilai-crm"
echo "  - 查看状态: pm2 status"
echo "  - 查看Nginx日志: tail -f /var/log/nginx/dongqilai_error.log"
echo ""
echo -e "${YELLOW}下一步:${NC}"
echo "1. 访问 https://$DOMAIN 测试应用"
echo "2. 使用默认账号登录: qixi / hu626388"
echo "3. 配置防火墙: ufw allow 80/tcp && ufw allow 443/tcp"
echo ""
