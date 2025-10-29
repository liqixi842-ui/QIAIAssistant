#!/bin/bash

# 完整生产环境部署脚本
# 包含前端打包 + 后端重启

echo "=== 开始完整部署流程 ==="

# 1. 拉取最新代码
echo "1. 拉取最新代码..."
git pull origin main

if [ $? -ne 0 ]; then
  echo "❌ 代码拉取失败"
  exit 1
fi

# 2. 安装依赖（如有新增）
echo "2. 检查依赖..."
npm install --production=false

# 3. 重新打包前端
echo "3. 打包前端代码..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ 前端打包失败"
  exit 1
fi

# 4. 重启PM2应用
echo "4. 重启应用..."
pm2 restart dongqilai-crm

if [ $? -ne 0 ]; then
  echo "❌ 应用重启失败"
  exit 1
fi

# 5. 验证应用状态
echo "5. 验证应用状态..."
sleep 3
pm2 status dongqilai-crm

echo ""
echo "=== 部署完成 ==="
echo ""
echo "✅ 更新内容:"
echo "  1. 后端: 请求体限制提升至10MB（修复413错误）"
echo "  2. 前端: 新增文件上传按钮（.txt文件直接上传）"
echo "  3. 前端: 显示文件大小和上传反馈"
echo ""
echo "📝 使用说明:"
echo "  - 刷新浏览器页面（Ctrl+F5 强制刷新）"
echo "  - 客户详情 > 对话记录 > 上传聊天记录"
echo "  - 现在可以看到'选择文件'按钮"
echo "  - 支持粘贴文本或上传.txt文件（最大10MB）"
echo ""
