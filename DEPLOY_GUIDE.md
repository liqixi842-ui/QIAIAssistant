# 动「QI」来 1.0 部署指南

## 📦 项目信息
- **版本**: 1.0
- **类型**: Node.js + React 全栈应用
- **数据库**: PostgreSQL (可选，当前使用内存存储)

---

## 🎯 部署前准备

### 1. 服务器要求
- Ubuntu 20.04/22.04/24.04
- 至少 2GB RAM
- 20GB 硬盘空间
- 公网 IP 地址

### 2. 所需软件
- Node.js 20+
- Nginx
- PM2
- Git

### 3. 准备信息
- [ ] 服务器 IP 地址
- [ ] 域名（可选）
- [ ] skynetchat.io API密钥

---

## 🚀 快速部署（5步完成）

### 第1步：下载项目文件

在 Replit 中导出项目：
1. 点击右上角三点菜单
2. 选择 "Download as zip"
3. 下载到本地

### 第2步：上传到服务器

```bash
# 在您的电脑上执行（替换YOUR_SERVER_IP）
scp dongqilai-1.0.zip root@YOUR_SERVER_IP:/root/
```

### 第3步：SSH登录服务器并安装环境

```bash
# SSH登录服务器
ssh root@YOUR_SERVER_IP

# 执行一键安装脚本
curl -o setup.sh https://raw.githubusercontent.com/yourusername/yourrepo/main/setup.sh
chmod +x setup.sh
./setup.sh
```

### 第4步：解压并配置项目

```bash
# 解压项目
unzip dongqilai-1.0.zip -d /var/www/dongqilai
cd /var/www/dongqilai

# 安装依赖
npm install

# 构建前端
npm run build

# 配置环境变量
nano .env
```

在 `.env` 文件中添加：
```
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-random-secret-key-here
AI_INTEGRATIONS_OPENAI_API_KEY=your-skynetchat-api-key
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.skynetchat.io/v1
```

### 第5步：启动应用

```bash
# 用 PM2 启动
pm2 start npm --name "dongqilai" -- start
pm2 save
pm2 startup
```

---

## 🌐 配置域名和SSL

### 配置Nginx

```bash
sudo nano /etc/nginx/sites-available/dongqilai
```

添加配置：
```nginx
server {
    listen 80;
    server_name yourdomain.com;

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

启用站点：
```bash
sudo ln -s /etc/nginx/sites-available/dongqilai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 配置SSL（免费）

```bash
sudo certbot --nginx -d yourdomain.com
```

---

## ✅ 验证部署

访问：`http://YOUR_SERVER_IP` 或 `https://yourdomain.com`

默认主管账号：
- 用户名: `qixi`
- 密码: `hu626388`
- 花名: 七喜

---

## 🔧 日常维护

### 查看应用状态
```bash
pm2 status
pm2 logs dongqilai
```

### 重启应用
```bash
pm2 restart dongqilai
```

### 更新应用
```bash
cd /var/www/dongqilai
git pull  # 如果使用Git
npm install
npm run build
pm2 restart dongqilai
```

---

## 📞 维护联系方式

维护版本：**动「QI」来 1.0**

需要维护时，请说："需要维护动「QI」来 1.0"

---

## 🆘 常见问题

### 应用无法访问
```bash
# 检查防火墙
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443

# 检查PM2
pm2 logs dongqilai --lines 50
```

### 端口被占用
```bash
# 查看端口占用
sudo lsof -i :5000
# 修改 .env 中的 PORT 为其他端口
```

### AI功能不工作
检查 `.env` 文件中的 AI 配置是否正确：
```bash
cat .env | grep AI_
```

---

**祝部署顺利！** 🎉
