#!/bin/bash
# 从 Git 仓库部署动「QI」来 CRM 系统 - CentOS/RHEL 版本
# 适合非技术人员使用

set -e

echo "======================================"
echo "从 Git 仓库部署动「QI」来 CRM"
echo "======================================"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 配置变量
APP_DIR="/var/www/dongqilai"
GIT_REPO="https://github.com/liqixi842-ui/QIAIAssistant.git"
DOMAIN="app.detusts.com"

echo -e "${YELLOW}请先确认：${NC}"
echo "1. 您已经将代码推送到 Git 仓库"
echo "2. 域名 DNS 已经指向此服务器"
echo ""
read -p "确认继续? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# 检查是否是root用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用 root 用户运行此脚本${NC}"
    exit 1
fi

echo -e "${GREEN}步骤1: 安装基础软件${NC}"
yum update -y
yum install -y curl git nginx postgresql postgresql-server postgresql-contrib

# 安装 Node.js 20.x
if ! command -v node &> /dev/null; then
    echo "安装 Node.js 20.x..."
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
fi

# 安装 PM2
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    npm install -g pm2
fi

echo -e "${GREEN}步骤2: 初始化 PostgreSQL${NC}"
# 初始化数据库（如果还没初始化）
if [ ! -f /var/lib/pgsql/data/PG_VERSION ]; then
    echo "初始化 PostgreSQL 数据库..."
    postgresql-setup initdb
fi

# 启动并设置开机自启
systemctl start postgresql
systemctl enable postgresql

echo -e "${GREEN}步骤3: 配置数据库${NC}"
echo -e "${YELLOW}请设置数据库密码（请记住这个密码）:${NC}"
read -s DB_PASSWORD
echo ""

# 配置 PostgreSQL 允许密码认证
if ! grep -q "host.*all.*all.*127.0.0.1/32.*md5" /var/lib/pgsql/data/pg_hba.conf; then
    echo "配置 PostgreSQL 认证方式..."
    sed -i 's/host.*all.*all.*127.0.0.1\/32.*ident/host    all             all             127.0.0.1\/32            md5/' /var/lib/pgsql/data/pg_hba.conf
    systemctl restart postgresql
    sleep 2
fi

# 创建数据库和用户
sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='dongqilai'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE DATABASE dongqilai;"

sudo -u postgres psql -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'dongqilai_user') THEN CREATE USER dongqilai_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD'; END IF; END \$\$;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE dongqilai TO dongqilai_user;"
sudo -u postgres psql -d dongqilai -c "GRANT ALL ON SCHEMA public TO dongqilai_user;"

echo -e "${GREEN}步骤4: 从 Git 克隆代码${NC}"
if [ -d "$APP_DIR" ]; then
    echo "应用目录已存在，更新代码..."
    cd $APP_DIR
    git pull origin main
else
    echo "克隆代码仓库..."
    git clone $GIT_REPO $APP_DIR
    cd $APP_DIR
fi

echo -e "${GREEN}步骤5: 配置环境变量${NC}"
if [ ! -f .env ]; then
    cat > .env << EOF
NODE_ENV=production
PORT=5000

DATABASE_URL=postgresql://dongqilai_user:${DB_PASSWORD}@localhost:5432/dongqilai
PGHOST=localhost
PGPORT=5432
PGUSER=dongqilai_user
PGPASSWORD=${DB_PASSWORD}
PGDATABASE=dongqilai

SESSION_SECRET=$(openssl rand -base64 32)

AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=PLEASE_SET_YOUR_OPENAI_KEY
AI_MODEL=gpt-4o

AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
AI_INTEGRATIONS_OPENAI_API_KEY=PLEASE_SET_YOUR_OPENAI_KEY
OPENAI_API_KEY=PLEASE_SET_YOUR_OPENAI_KEY

ALLOWED_ORIGINS=https://app.detusts.com
LOG_LEVEL=info
EOF

    echo -e "${YELLOW}环境变量已创建${NC}"
    echo -e "${YELLOW}现在需要编辑 .env 文件填写 OpenAI API Key${NC}"
    echo -e "${YELLOW}请按任意键打开编辑器...${NC}"
    read -n 1 -s
    vi .env
fi

echo -e "${GREEN}步骤6: 安装依赖${NC}"
npm install

echo -e "${GREEN}步骤7: 构建前端${NC}"
npm run build

echo -e "${GREEN}步骤8: 初始化数据库${NC}"
npm run db:push

echo -e "${GREEN}步骤9: 配置 Nginx${NC}"
cat > /etc/nginx/conf.d/dongqilai.conf << 'NGINX_EOF'
server {
    listen 80;
    server_name app.detusts.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        client_max_body_size 50M;
    }
}
NGINX_EOF

# 检查 Nginx 配置
nginx -t

echo -e "${GREEN}步骤10: 配置防火墙${NC}"
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
fi

echo -e "${GREEN}步骤11: 启动应用${NC}"
pm2 delete dongqilai-crm 2>/dev/null || true
pm2 start npm --name "dongqilai-crm" -- start
pm2 startup systemd -u root --hp /root
pm2 save

systemctl enable nginx
systemctl restart nginx

echo ""
echo "======================================"
echo -e "${GREEN}部署完成！${NC}"
echo "======================================"
echo ""
echo "访问: http://app.detusts.com"
echo "默认账号: qixi / hu626388"
echo ""
echo "管理命令:"
echo "  pm2 logs dongqilai-crm    # 查看日志"
echo "  pm2 restart dongqilai-crm # 重启应用"
echo "  pm2 status                # 查看状态"
echo ""
echo "更新代码:"
echo "  cd $APP_DIR"
echo "  git pull"
echo "  npm install --omit=dev"
echo "  npm run build"
echo "  pm2 restart dongqilai-crm"
echo ""
echo -e "${YELLOW}注意: 目前使用 HTTP 访问${NC}"
echo -e "${YELLOW}如需 HTTPS，请手动安装 certbot 并配置 SSL 证书${NC}"
echo ""
