# 动「QI」来 CRM 系统 - 部署文档

## 📋 目录

1. [系统要求](#系统要求)
2. [快速部署](#快速部署)
3. [详细部署步骤](#详细部署步骤)
4. [AI服务配置](#ai服务配置)
5. [常见问题](#常见问题)
6. [维护和监控](#维护和监控)

---

## 系统要求

### 服务器配置
- **CPU**: 2核或以上
- **内存**: 4GB或以上
- **硬盘**: 20GB或以上
- **系统**: Ubuntu 20.04/22.04、CentOS 7/8、或其他Linux发行版

### 软件要求
- **Node.js**: 18.0.0 或更高版本
- **PostgreSQL**: 13 或更高版本
- **npm**: 8.0.0 或更高版本

---

## 快速部署

如果您已经准备好服务器和数据库，只需3步：

```bash
# 1. 上传代码到服务器
git clone <你的代码仓库> dongqilai
cd dongqilai

# 2. 运行一键部署脚本
chmod +x deploy.sh
./deploy.sh

# 3. 启动系统
npm start
```

部署脚本会自动完成：
- ✅ 检查系统环境
- ✅ 安装项目依赖
- ✅ 配置环境变量
- ✅ 初始化数据库
- ✅ 构建前端代码
- ✅ 测试AI连接

---

## 详细部署步骤

### 第1步：准备服务器

#### 1.1 购买云服务器

推荐服务商：
- **阿里云**: https://www.aliyun.com/
- **腾讯云**: https://cloud.tencent.com/
- **华为云**: https://www.huaweicloud.com/

推荐配置：
- 2核4GB内存（最低配置）
- 4核8GB内存（推荐配置）
- Ubuntu 22.04 LTS

#### 1.2 连接到服务器

**Windows用户：**
```bash
# 使用PuTTY或Windows Terminal
ssh root@您的服务器IP
```

**Mac/Linux用户：**
```bash
ssh root@您的服务器IP
```

### 第2步：安装基础软件

#### 2.1 安装 Node.js

```bash
# 下载并安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node -v  # 应该显示 v20.x.x
npm -v   # 应该显示 10.x.x
```

#### 2.2 安装 PostgreSQL

```bash
# 安装PostgreSQL 14
sudo apt update
sudo apt install postgresql postgresql-contrib

# 启动PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 验证安装
sudo systemctl status postgresql
```

#### 2.3 创建数据库

```bash
# 切换到postgres用户
sudo -u postgres psql

# 在PostgreSQL命令行中执行：
CREATE DATABASE dongqilai;
CREATE USER dongqilai_user WITH PASSWORD '您的密码';
GRANT ALL PRIVILEGES ON DATABASE dongqilai TO dongqilai_user;
\q
```

### 第3步：部署应用

#### 3.1 上传代码

方法1：使用Git（推荐）
```bash
cd /home
git clone <您的代码仓库> dongqilai
cd dongqilai
```

方法2：手动上传
```bash
# 使用 scp 或 SFTP 工具上传压缩包
scp dongqilai.zip root@您的服务器IP:/home/
ssh root@您的服务器IP
cd /home
unzip dongqilai.zip
cd dongqilai
```

#### 3.2 运行部署脚本

```bash
chmod +x deploy.sh
./deploy.sh
```

部署脚本会引导您完成配置，需要提供：
- 数据库连接信息
- AI API密钥和服务地址
- 其他配置项

#### 3.3 手动配置（如果不使用部署脚本）

创建 `.env` 文件：
```bash
cp .env.example .env
nano .env
```

编辑内容：
```bash
# 数据库配置
DATABASE_URL=postgresql://dongqilai_user:您的密码@localhost:5432/dongqilai
PGHOST=localhost
PGPORT=5432
PGUSER=dongqilai_user
PGPASSWORD=您的密码
PGDATABASE=dongqilai

# AI 服务配置
AI_API_KEY=您的AI_API密钥
AI_BASE_URL=https://您的AI服务地址/v1
AI_MODEL=default

# 会话密钥（运行：openssl rand -base64 32 生成）
SESSION_SECRET=生成的随机密钥

# 服务器配置
PORT=5000
NODE_ENV=production
```

安装依赖并初始化：
```bash
npm install
npm run db:push
npm run build
```

### 第4步：启动服务

#### 方法1：直接启动（测试用）
```bash
npm start
```

#### 方法2：使用 PM2（生产环境推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start npm --name dongqilai -- start

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs dongqilai
```

### 第5步：配置防火墙

```bash
# 开放端口5000
sudo ufw allow 5000

# 如果使用Nginx反向代理，开放80和443
sudo ufw allow 80
sudo ufw allow 443

# 启用防火墙
sudo ufw enable
```

### 第6步：访问系统

在浏览器中访问：
```
http://您的服务器IP:5000
```

---

## AI服务配置

### 支持的AI服务

系统支持任何OpenAI兼容的API服务，包括：

#### 1. OpenAI官方
```bash
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-...
AI_MODEL=gpt-4
```

#### 2. 阿里云通义千问
```bash
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_API_KEY=sk-...
AI_MODEL=qwen-plus
```

#### 3. 百度文心一言
```bash
AI_BASE_URL=https://aip.baidubce.com/rpc/2.0/ai_custom/v1
AI_API_KEY=您的API_KEY
AI_MODEL=ERNIE-Bot-4
```

#### 4. 智谱AI
```bash
AI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
AI_API_KEY=您的API_KEY
AI_MODEL=glm-4
```

#### 5. 其他兼容服务
任何支持OpenAI API格式的服务都可以使用。

### 测试AI连接

```bash
# 启动服务后，在浏览器访问：
http://您的服务器IP:5000/api/ai/test

# 或使用curl：
curl http://localhost:5000/api/ai/test
```

返回示例：
```json
{
  "success": true,
  "message": "AI连接正常",
  "response": "连接成功"
}
```

---

## 常见问题

### Q1: 部署脚本运行失败

**A**: 检查以下几点：
1. 确保有可执行权限：`chmod +x deploy.sh`
2. 查看错误信息，通常会提示缺少什么
3. 检查Node.js版本：`node -v`（需要18+）
4. 检查PostgreSQL是否运行：`sudo systemctl status postgresql`

### Q2: AI连接失败

**A**: 检查配置：
1. `.env` 文件中的 `AI_API_KEY` 是否正确
2. `AI_BASE_URL` 是否正确（包括 `/v1` 后缀）
3. 服务器能否访问AI服务（检查网络和防火墙）
4. 测试连接：`curl http://localhost:5000/api/ai/test`

### Q3: 数据库连接失败

**A**: 检查配置：
1. 数据库是否已创建：`sudo -u postgres psql -c "\l"`
2. 用户权限是否正确
3. `.env` 中的 `DATABASE_URL` 是否正确
4. PostgreSQL是否运行：`sudo systemctl status postgresql`

### Q4: 端口5000被占用

**A**: 两种解决方案：
1. 停止占用端口的程序：`sudo lsof -ti:5000 | xargs kill -9`
2. 修改端口：在 `.env` 中设置 `PORT=其他端口`

### Q5: npm install 失败

**A**: 尝试以下方法：
```bash
# 清理缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install

# 使用国内镜像
npm config set registry https://registry.npmmirror.com
npm install
```

### Q6: 前端无法连接后端

**A**: 检查：
1. 后端是否正常运行：`pm2 status`
2. 防火墙是否开放端口：`sudo ufw status`
3. 浏览器控制台是否有错误信息

---

## 维护和监控

### 日常维护

#### 查看服务状态
```bash
pm2 status
```

#### 查看日志
```bash
# 实时日志
pm2 logs dongqilai

# 查看最近的错误
pm2 logs dongqilai --err

# 清空日志
pm2 flush
```

#### 重启服务
```bash
pm2 restart dongqilai
```

#### 停止服务
```bash
pm2 stop dongqilai
```

### 数据库备份

```bash
# 创建备份目录
mkdir -p /home/backups

# 备份数据库
pg_dump -U dongqilai_user dongqilai > /home/backups/dongqilai_$(date +%Y%m%d).sql

# 恢复数据库
psql -U dongqilai_user dongqilai < /home/backups/dongqilai_20231201.sql
```

### 自动备份脚本

创建文件 `/home/backup.sh`：
```bash
#!/bin/bash
BACKUP_DIR="/home/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U dongqilai_user dongqilai > $BACKUP_DIR/dongqilai_$DATE.sql

# 删除7天前的备份
find $BACKUP_DIR -name "dongqilai_*.sql" -mtime +7 -delete
```

设置定时任务：
```bash
chmod +x /home/backup.sh
crontab -e

# 添加：每天凌晨2点自动备份
0 2 * * * /home/backup.sh
```

### 更新系统

```bash
# 拉取最新代码
cd /home/dongqilai
git pull

# 安装新依赖
npm install

# 更新数据库
npm run db:push

# 重新构建
npm run build

# 重启服务
pm2 restart dongqilai
```

### 监控资源使用

```bash
# 查看服务器资源
htop

# 查看磁盘使用
df -h

# 查看内存使用
free -h

# 查看PM2资源使用
pm2 monit
```

---

## 使用Nginx反向代理（可选）

如果您想使用域名访问，推荐配置Nginx：

### 安装Nginx
```bash
sudo apt install nginx
```

### 配置Nginx
创建配置文件：
```bash
sudo nano /etc/nginx/sites-available/dongqilai
```

内容：
```nginx
server {
    listen 80;
    server_name 您的域名.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/dongqilai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 配置SSL（HTTPS）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d 您的域名.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 技术支持

如遇到问题：

1. **查看日志**: `pm2 logs dongqilai`
2. **检查状态**: `pm2 status`
3. **测试AI**: 访问 `http://您的IP:5000/api/ai/test`
4. **查看文档**: 阅读本文档的常见问题部分

---

## 下一步

部署完成后，您可以：
1. 创建管理员账号
2. 添加团队成员
3. 配置客户数据
4. 开始使用AI分析功能

祝您使用愉快！🎉
