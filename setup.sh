#!/bin/bash

# 动「QI」来 1.0 一键部署脚本
# 适用于 Ubuntu 20.04/22.04/24.04

set -e

echo "========================================"
echo "动「QI」来 1.0 自动部署脚本"
echo "========================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo "请使用 root 用户运行此脚本"
    echo "使用命令: sudo bash setup.sh"
    exit 1
fi

echo -e "${YELLOW}步骤 1/6: 更新系统...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}步骤 2/6: 安装 Node.js 20...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo -e "${GREEN}✓ Node.js 版本: $(node -v)${NC}"

echo -e "${YELLOW}步骤 3/6: 安装 Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
fi
echo -e "${GREEN}✓ Nginx 已安装${NC}"

echo -e "${YELLOW}步骤 4/6: 安装 PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
echo -e "${GREEN}✓ PM2 已安装${NC}"

echo -e "${YELLOW}步骤 5/6: 配置防火墙...${NC}"
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443
echo -e "${GREEN}✓ 防火墙配置完成${NC}"

echo -e "${YELLOW}步骤 6/6: 安装 Certbot (SSL证书工具)...${NC}"
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
fi
echo -e "${GREEN}✓ Certbot 已安装${NC}"

echo ""
echo "========================================"
echo -e "${GREEN}✓ 环境安装完成！${NC}"
echo "========================================"
echo ""
echo "接下来的步骤："
echo "1. 上传项目文件到 /var/www/dongqilai"
echo "2. 运行: cd /var/www/dongqilai && npm install"
echo "3. 配置 .env 文件"
echo "4. 运行: pm2 start npm --name dongqilai -- start"
echo ""
echo "详细说明请查看 DEPLOY_GUIDE.md"
echo ""
