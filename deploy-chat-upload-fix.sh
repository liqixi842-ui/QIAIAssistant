#!/bin/bash

# 部署WhatsApp聊天上传增强功能到生产环境
# 修复: 413错误 + 添加文件上传功能

echo "=== 开始部署聊天上传增强功能 ==="

# 1. 拉取最新代码
echo "1. 拉取最新代码..."
git pull origin main

if [ $? -ne 0 ]; then
  echo "❌ 代码拉取失败"
  exit 1
fi

# 2. 重启PM2应用
echo "2. 重启应用..."
pm2 restart dongqilai

if [ $? -ne 0 ]; then
  echo "❌ 应用重启失败"
  exit 1
fi

# 3. 验证应用状态
echo "3. 验证应用状态..."
sleep 3
pm2 status dongqilai

echo ""
echo "=== 部署完成 ==="
echo ""
echo "✅ 更新内容:"
echo "  1. 修复: 上传大型聊天记录时的413错误（请求体限制从100KB提升至10MB）"
echo "  2. 新增: 支持直接上传.txt文件（无需复制粘贴）"
echo "  3. 优化: 文件上传成功后显示文件名和大小"
echo "  4. 优化: 文件输入自动重置，支持重复上传"
echo ""
echo "📝 使用说明:"
echo "  - 客户详情 > 对话记录 > 上传聊天记录"
echo "  - 可以粘贴文本或点击"选择文件"上传.txt文件"
echo "  - 支持最大10MB的聊天记录文件"
echo ""
