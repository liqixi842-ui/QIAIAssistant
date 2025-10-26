# 使用 Git 仓库部署到服务器 - 完整指南

## 📋 整体流程

```
步骤1: 在 Replit 推送代码到 Git 仓库（GitHub/Gitee）
         ↓
步骤2: 在服务器上从 Git 拉取代码
         ↓  
步骤3: 运行自动部署脚本
         ↓
步骤4: 访问 https://app.detusts.com
```

---

## 🚀 详细步骤

### 步骤1：准备 Git 仓库

您有两个选择：

#### 选择A：使用 GitHub（国际版，可能慢）
1. 访问 https://github.com
2. 注册/登录账号
3. 点击右上角 "+" → "New repository"
4. 仓库名：`dongqilai-crm`
5. 选择 **Private**（私有）
6. 点击 "Create repository"

#### 选择B：使用 Gitee（国内版，快）⭐ 推荐
1. 访问 https://gitee.com
2. 注册/登录账号
3. 点击右上角 "+" → "新建仓库"
4. 仓库名：`dongqilai-crm`
5. 选择 **私有**
6. 点击 "创建"

---

### 步骤2：从 Replit 推送代码

**在 Replit 左侧工具栏找到 "Version control"（版本控制）**

然后按照以下步骤：

#### 2.1 关联远程仓库

在 Replit 的 Shell 中执行（替换成您的仓库地址）：

**如果用 GitHub：**
```bash
git remote add origin https://github.com/您的用户名/dongqilai-crm.git
```

**如果用 Gitee：**
```bash
git remote add origin https://gitee.com/您的用户名/dongqilai-crm.git
```

#### 2.2 推送代码

```bash
git add .
git commit -m "初始提交：动「QI」来CRM系统"
git branch -M main
git push -u origin main
```

> 💡 **提示**：第一次推送会要求输入 Git 账号密码

---

### 步骤3：在服务器上部署

#### 3.1 SSH 登录服务器

**Windows 用户**：
- 下载 PuTTY 或使用 Windows Terminal
- 输入服务器IP：`172.93.32.222`
- 输入用户名：`root`
- 输入密码

**Mac/Linux 用户**：
```bash
ssh root@172.93.32.222
```

#### 3.2 下载并运行部署脚本

登录服务器后，执行以下命令：

```bash
# 1. 下载部署脚本
curl -O https://您的仓库地址/deployment/deploy-from-git.sh

# 或者手动创建（如果上面命令失败）
nano deploy.sh
# 将 deployment/deploy-from-git.sh 的内容粘贴进去
# 按 Ctrl+X, 然后 Y, 然后 Enter 保存

# 2. 修改脚本中的仓库地址
nano deploy.sh
# 找到这一行：
# GIT_REPO="https://github.com/yourusername/dongqilai.git"
# 改成您的仓库地址，例如：
# GIT_REPO="https://gitee.com/您的用户名/dongqilai-crm.git"

# 3. 给脚本执行权限
chmod +x deploy.sh

# 4. 运行部署脚本
sudo ./deploy.sh
```

#### 3.3 按照提示操作

脚本会提示您：

1. **设置数据库密码**：输入一个强密码（记住它）
2. **编辑环境变量**：填写 OpenAI API Key
3. **其他操作**：脚本会自动完成

---

### 步骤4：配置域名 DNS

登录您的域名服务商（购买 detusts.com 的地方）：

#### 添加 A 记录

```
类型: A
主机记录: app
记录值: 172.93.32.222
TTL: 600
```

等待 10-30 分钟后，访问：https://app.detusts.com

---

## 🔄 以后如何更新代码？

### 在 Replit 修改代码后：

```bash
git add .
git commit -m "更新说明"
git push
```

### 在服务器上更新：

```bash
ssh root@172.93.32.222
cd /var/www/dongqilai
git pull
npm install
pm2 restart dongqilai-crm
```

---

## ❓ 常见问题

### Q1: Git 推送失败？

**解决方法**：
```bash
# 设置 Git 用户信息
git config --global user.name "您的名字"
git config --global user.email "您的邮箱"

# 再次推送
git push -u origin main
```

### Q2: 服务器拉取代码失败？

**解决方法**：
```bash
# 如果是私有仓库，需要配置 SSH 密钥或使用 Personal Access Token

# 方法1：使用 HTTPS + Token（简单）
git clone https://用户名:token@gitee.com/用户名/dongqilai-crm.git

# 方法2：配置 SSH 密钥（推荐）
ssh-keygen -t rsa -b 4096
cat ~/.ssh/id_rsa.pub
# 复制输出的内容，添加到 Gitee/GitHub 的 SSH Keys 设置中
```

### Q3: 部署脚本运行失败？

**解决方法**：
1. 查看错误信息
2. 检查是否使用了 `sudo` 运行
3. 确认服务器是 Ubuntu/Debian 系统
4. 联系我帮助排查

### Q4: 无法访问域名？

**解决方法**：
1. 检查 DNS 是否生效：`ping app.detusts.com`
2. 检查防火墙：`ufw allow 80/tcp && ufw allow 443/tcp`
3. 检查 Nginx：`systemctl status nginx`

---

## 📞 需要帮助？

如果遇到任何问题：

1. **查看错误日志**：
   ```bash
   pm2 logs dongqilai-crm
   tail -f /var/log/nginx/error.log
   ```

2. **检查服务状态**：
   ```bash
   pm2 status
   systemctl status nginx
   systemctl status postgresql
   ```

3. **联系支持**：
   - 截图错误信息
   - 告诉我您执行到哪一步

---

## ✅ 部署成功检查清单

- [ ] 代码已推送到 Git 仓库
- [ ] 服务器上成功克隆代码
- [ ] 数据库创建成功
- [ ] 环境变量配置正确
- [ ] 应用启动成功（pm2 status 显示 online）
- [ ] Nginx 运行正常
- [ ] SSL 证书申请成功
- [ ] DNS 解析正确
- [ ] 可以访问 https://app.detusts.com
- [ ] 能够登录系统（qixi / hu626388）

全部完成后，您的 CRM 系统就部署好了！
