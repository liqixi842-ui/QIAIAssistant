#!/bin/bash

# ============================================
# 动「QI」来 CRM 系统 - 一键部署脚本
# ============================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[信息]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[成功]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

log_error() {
    echo -e "${RED}[错误]${NC} $1"
}

# 显示欢迎信息
clear
echo -e "${GREEN}"
echo "============================================"
echo "   动「QI」来 CRM 系统 - 一键部署"
echo "============================================"
echo -e "${NC}"
echo ""

# 1. 检查系统环境
log_info "正在检查系统环境..."
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    log_error "未安装 Node.js"
    echo "请先安装 Node.js 18 或更高版本"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
log_success "Node.js 版本: $NODE_VERSION"

# 检查 npm
if ! command -v npm &> /dev/null; then
    log_error "未安装 npm"
    exit 1
fi

NPM_VERSION=$(npm -v)
log_success "npm 版本: $NPM_VERSION"

# 检查 PostgreSQL
if ! command -v psql &> /dev/null; then
    log_warning "未安装 PostgreSQL 客户端工具"
    log_info "您仍然可以使用远程数据库继续部署"
else
    PSQL_VERSION=$(psql --version)
    log_success "PostgreSQL: $PSQL_VERSION"
fi

echo ""

# 2. 安装依赖
log_info "正在安装项目依赖..."
echo ""

if [ -f "package.json" ]; then
    npm install
    log_success "依赖安装完成"
else
    log_error "未找到 package.json 文件"
    exit 1
fi

echo ""

# 3. 配置环境变量
log_info "正在配置环境变量..."
echo ""

if [ ! -f ".env" ]; then
    log_warning "未找到 .env 文件，将创建新的配置文件"
    cp .env.example .env
    
    echo -e "${YELLOW}"
    echo "============================================"
    echo "   环境变量配置"
    echo "============================================"
    echo -e "${NC}"
    echo ""
    
    # 数据库配置
    echo -e "${BLUE}数据库配置:${NC}"
    read -p "数据库主机 (默认: localhost): " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "数据库端口 (默认: 5432): " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    
    read -p "数据库用户名: " DB_USER
    
    read -sp "数据库密码: " DB_PASSWORD
    echo ""
    
    read -p "数据库名称 (默认: dongqilai): " DB_NAME
    DB_NAME=${DB_NAME:-dongqilai}
    
    # 构建 DATABASE_URL
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    
    echo ""
    echo -e "${BLUE}AI 服务配置:${NC}"
    read -p "AI API密钥: " AI_API_KEY
    
    read -p "AI服务地址 (例: https://api.openai.com/v1): " AI_BASE_URL
    
    read -p "AI模型名称 (可选，按回车跳过): " AI_MODEL
    AI_MODEL=${AI_MODEL:-default}
    
    echo ""
    echo -e "${BLUE}会话密钥配置:${NC}"
    SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    log_info "已自动生成随机会话密钥"
    
    # 写入 .env 文件
    cat > .env << EOF
# 数据库配置
DATABASE_URL=${DATABASE_URL}
PGHOST=${DB_HOST}
PGPORT=${DB_PORT}
PGUSER=${DB_USER}
PGPASSWORD=${DB_PASSWORD}
PGDATABASE=${DB_NAME}

# AI 服务配置
AI_API_KEY=${AI_API_KEY}
AI_BASE_URL=${AI_BASE_URL}
AI_MODEL=${AI_MODEL}

# 会话密钥
SESSION_SECRET=${SESSION_SECRET}

# 服务器配置
PORT=5000
NODE_ENV=production
EOF
    
    log_success "环境变量配置完成"
else
    log_success "已存在 .env 文件"
fi

echo ""

# 4. 数据库初始化
log_info "正在初始化数据库..."
echo ""

# 测试数据库连接
log_info "测试数据库连接..."

# 安全地读取环境变量（不导出到shell）
DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d '=' -f2-)

if [ -n "$DATABASE_URL" ] && psql "${DATABASE_URL}" -c "SELECT 1;" &> /dev/null; then
    log_success "数据库连接成功"
else
    log_warning "数据库连接失败，请检查配置"
    log_info "您可以稍后手动运行: npm run db:push"
fi

# 运行数据库迁移
if npm run db:push; then
    log_success "数据库初始化完成"
else
    log_warning "数据库初始化失败，请检查配置后重试"
fi

echo ""

# 5. 构建前端
log_info "正在构建前端..."
echo ""

npm run build

log_success "前端构建完成"
echo ""

# 6. 测试 AI 连接
log_info "正在测试 AI 服务连接..."
echo ""

# 启动服务器测试（后台运行）
npm start &
SERVER_PID=$!

# 等待服务器启动
sleep 5

# 测试 AI 连接
if curl -s http://localhost:5000/api/ai/test > /dev/null 2>&1; then
    log_success "AI 服务连接正常"
else
    log_warning "AI 服务连接失败，请检查 AI 配置"
fi

# 停止测试服务器
kill $SERVER_PID 2>/dev/null || true

echo ""

# 7. 完成
echo -e "${GREEN}"
echo "============================================"
echo "   部署完成！"
echo "============================================"
echo -e "${NC}"
echo ""
echo -e "${BLUE}下一步操作:${NC}"
echo ""
echo "1. 启动服务："
echo "   npm start"
echo ""
echo "2. 或者使用 PM2 保持后台运行："
echo "   npm install -g pm2"
echo "   pm2 start npm --name dongqilai -- start"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "3. 访问系统："
echo "   http://您的服务器IP:5000"
echo ""
echo -e "${YELLOW}提示：${NC}"
echo "- 请妥善保管 .env 文件，不要泄露给他人"
echo "- 建议配置防火墙，只开放必要端口"
echo "- 定期备份数据库数据"
echo ""
log_success "感谢使用动「QI」来 CRM 系统！"
echo ""
