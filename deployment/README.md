# 动「QI」来 CRM 系统部署文档

## 服务器信息
- **IP**: 172.93.32.222
- **域名**: app.detusts.com
- **系统**: Ubuntu/Debian Linux

## 快速部署（推荐）

### 1. 准备服务器

SSH连接到服务器：
```bash
ssh root@172.93.32.222
```

### 2. 上传部署包

**方法A: 使用SCP（推荐）**
```bash
# 在本地执行（将整个项目上传到服务器）
scp -r /path/to/dongqilai root@172.93.32.222:/tmp/dongqilai
```

**方法B: 使用Git**
```bash
# 在服务器上执行
cd /tmp
git clone https://github.com/yourusername/dongqilai.git
```

### 3. 运行一键部署脚本

```bash
cd /tmp/dongqilai
chmod +x deployment/deploy.sh
sudo ./deployment/deploy.sh
```

脚本会自动完成：
- ✅ 安装Node.js、Nginx、PostgreSQL
- ✅ 配置数据库
- ✅ 安装应用依赖
- ✅ 配置Nginx反向代理
- ✅ 申请SSL证书
- ✅ 启动应用并设置开机自启

### 4. 配置防火墙

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

### 5. 访问应用

打开浏览器访问：https://app.detusts.com

默认管理员账号：
- 用户名：`qixi`
- 密码：`hu626388`

---

## 手动部署步骤

如果自动脚本失败，可以按照以下步骤手动部署：

### 1. 安装基础软件

```bash
# 更新系统
apt update && apt upgrade -y

# 安装Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 安装其他依赖
apt install -y nginx postgresql postgresql-contrib git certbot python3-certbot-nginx

# 安装PM2
npm install -g pm2
```

### 2. 配置PostgreSQL

```bash
# 切换到postgres用户
sudo -u postgres psql

# 在psql中执行
CREATE DATABASE dongqilai;
CREATE USER dongqilai_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE dongqilai TO dongqilai_user;
\c dongqilai
GRANT ALL ON SCHEMA public TO dongqilai_user;
\q
```

### 3. 部署应用

```bash
# 创建应用目录
mkdir -p /var/www/dongqilai
cd /var/www/dongqilai

# 上传/克隆代码（根据您的方式选择）
# git clone ... 或 scp ...

# 配置环境变量
cp deployment/env.production.template .env
nano .env  # 编辑配置文件

# 安装依赖
npm install --production

# 初始化数据库
npm run db:push
```

### 4. 配置Nginx

```bash
# 复制配置文件
cp deployment/nginx.conf /etc/nginx/sites-available/dongqilai
ln -s /etc/nginx/sites-available/dongqilai /etc/nginx/sites-enabled/

# 删除默认配置
rm /etc/nginx/sites-enabled/default

# 测试配置
nginx -t

# 重启Nginx
systemctl restart nginx
```

### 5. 配置SSL证书

```bash
certbot --nginx -d app.detusts.com
```

### 6. 启动应用

```bash
cd /var/www/dongqilai

# 使用PM2启动
pm2 start deployment/ecosystem.config.js

# 设置开机自启
pm2 startup systemd
pm2 save
```

---

## 常用管理命令

### 应用管理

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs dongqilai-crm

# 重启应用
pm2 restart dongqilai-crm

# 停止应用
pm2 stop dongqilai-crm

# 删除应用
pm2 delete dongqilai-crm
```

### 数据库管理

```bash
# 连接数据库
sudo -u postgres psql -d dongqilai

# 备份数据库
pg_dump -U dongqilai_user -d dongqilai > backup_$(date +%Y%m%d).sql

# 恢复数据库
psql -U dongqilai_user -d dongqilai < backup.sql
```

### Nginx管理

```bash
# 测试配置
nginx -t

# 重启Nginx
systemctl restart nginx

# 查看日志
tail -f /var/log/nginx/dongqilai_error.log
tail -f /var/log/nginx/dongqilai_access.log
```

### SSL证书续期

```bash
# 手动续期
certbot renew

# 测试续期
certbot renew --dry-run
```

---

## 故障排除

### 应用无法访问

1. 检查应用是否运行：`pm2 status`
2. 检查Nginx状态：`systemctl status nginx`
3. 检查端口占用：`netstat -tulpn | grep 5000`
4. 查看应用日志：`pm2 logs dongqilai-crm`

### 数据库连接失败

1. 检查PostgreSQL状态：`systemctl status postgresql`
2. 检查.env文件中的DATABASE_URL是否正确
3. 测试数据库连接：
   ```bash
   psql postgresql://dongqilai_user:password@localhost:5432/dongqilai
   ```

### SSL证书问题

1. 检查证书状态：`certbot certificates`
2. 手动续期：`certbot renew`
3. 如果失败，删除重新申请：
   ```bash
   certbot delete --cert-name app.detusts.com
   certbot --nginx -d app.detusts.com
   ```

---

## 更新应用

```bash
cd /var/www/dongqilai

# 拉取最新代码
git pull origin main

# 安装新依赖
npm install --production

# 更新数据库
npm run db:push

# 重启应用
pm2 restart dongqilai-crm
```

---

## 性能优化建议

1. **启用Nginx缓存**（已在配置中）
2. **使用PM2集群模式**（已配置2个实例）
3. **定期清理日志**：
   ```bash
   pm2 flush  # 清空PM2日志
   ```
4. **监控服务器资源**：
   ```bash
   pm2 monit  # 实时监控
   ```

---

## 安全建议

1. **修改默认管理员密码**（首次登录后）
2. **配置防火墙**（只开放必要端口）
3. **定期更新系统**：`apt update && apt upgrade`
4. **定期备份数据库**
5. **配置fail2ban防止暴力破解**

---

## 技术支持

如遇问题，请检查：
1. PM2日志：`/var/log/pm2/dongqilai-error.log`
2. Nginx日志：`/var/log/nginx/dongqilai_error.log`
3. 应用日志：`pm2 logs dongqilai-crm`
