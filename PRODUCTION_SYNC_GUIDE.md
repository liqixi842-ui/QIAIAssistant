# 🔄 生产环境完整同步指南

## 概述

本指南帮助您将Replit开发环境的所有功能完整同步到生产服务器（172.93.32.222）。

## 🎯 本次更新内容

1. ✅ **混合存储方案** - Replit使用对象存储，生产环境使用本地文件系统
2. ✅ **环境自动检测** - 系统自动判断运行环境并选择对应存储方式
3. ✅ **本地文件上传** - 新增本地文件存储服务和上传API
4. ✅ **团队管理优化** - 显示用户ID列，删除虚构数据
5. ✅ **Office文档预览** - 生产环境通过Nginx直接提供静态文件

## 📦 新增文件

- `server/localFileStorage.ts` - 本地文件存储服务
- `deploy_production.sh` - 自动化部署脚本
- `nginx_config_example.conf` - Nginx配置示例

## 🚀 快速部署（3步完成）

### 第1步：推送代码到GitHub

```bash
# 在Replit Shell中执行
git add .
git commit -m "支持生产环境本地文件存储和完整功能同步"
git push origin main
```

### 第2步：运行部署脚本

```bash
# 在您的本地电脑执行（需要SSH访问权限）
chmod +x deploy_production.sh
./deploy_production.sh
```

脚本会自动完成：
- ✅ 连接服务器
- ✅ 拉取最新代码
- ✅ 创建uploads目录
- ✅ 安装依赖
- ✅ 构建项目
- ✅ 重启PM2服务

### 第3步：配置Nginx

SSH登录服务器：
```bash
ssh root@172.93.32.222
```

编辑Nginx配置：
```bash
nano /etc/nginx/conf.d/dongqilai.conf
```

添加以下内容（如果还没有）：
```nginx
server {
    listen 443 ssl http2;
    server_name app.detusts.com;
    
    # 增加上传大小限制
    client_max_body_size 100M;
    
    # 静态文件访问（学习资料）
    location /uploads/ {
        alias /var/www/dongqilai/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin *;
        
        # Office文件MIME类型
        types {
            application/pdf pdf;
            application/vnd.openxmlformats-officedocument.wordprocessingml.document docx;
            application/vnd.openxmlformats-officedocument.spreadsheetml.sheet xlsx;
            application/vnd.openxmlformats-officedocument.presentationml.presentation pptx;
        }
    }
    
    # 主应用代理
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

重启Nginx：
```bash
nginx -t && nginx -s reload
```

## ✅ 验证部署

访问 https://app.detusts.com 并测试：

1. **登录** - qixi / hu626388
2. **团队管理** - 查看用户ID列，确认没有虚构数据
3. **学习资料** - 上传Word/Excel/PPT文档
4. **Office预览** - 点击文档查看在线预览
5. **聊天功能** - 测试销售团队聊天

## 🔧 技术实现

### 环境检测逻辑

```javascript
// 系统自动判断运行环境
const hasObjectStorage = !!process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;

if (hasObjectStorage) {
  // Replit环境：使用对象存储
  console.log("📦 使用Replit对象存储");
} else {
  // 生产环境：使用本地文件系统
  console.log("💾 使用本地文件存储");
}
```

### 文件上传流程对比

**Replit环境：**
```
前端 → GET签名URL → PUT到Google Cloud → 返回公开URL
```

**生产环境：**
```
前端 → POST到/api/objects/local-upload → 保存到本地 → 返回/uploads/URL
```

## 📁 目录结构

```
/var/www/dongqilai/
├── uploads/                    # 上传文件（新增）
│   └── learning-materials/
├── dist/                       # 构建输出
├── server/
│   ├── localFileStorage.ts    # 本地存储服务（新增）
│   ├── objectStorage.ts       # 对象存储服务
│   └── routes.ts              # 路由（已更新）
└── client/
    └── src/
        ├── components/
        │   └── ObjectUploader.tsx  # 上传组件（已更新）
        └── pages/
            └── TeamManagement.tsx   # 团队管理（已更新）
```

## 🐛 故障排查

### 问题：上传失败
```bash
# 检查目录权限
ls -la /var/www/dongqilai/uploads

# 创建目录
mkdir -p /var/www/dongqilai/uploads/learning-materials
chmod 755 /var/www/dongqilai/uploads /var/www/dongqilai/uploads/learning-materials
```

### 问题：文件无法访问
```bash
# 检查Nginx配置
nginx -t

# 查看错误日志
tail -f /var/log/nginx/dongqilai_error.log
```

### 问题：PM2进程错误
```bash
# 查看日志
pm2 logs dongqilai-crm --lines 100

# 重启服务
pm2 restart dongqilai-crm
```

## 📊 监控命令

```bash
# 服务状态
pm2 status

# 实时日志
pm2 logs dongqilai-crm

# 磁盘空间
df -h

# 上传目录大小
du -sh /var/www/dongqilai/uploads
```

## 🎉 完成！

现在您的生产服务器已与Replit开发环境完全同步，所有功能应该正常工作。
