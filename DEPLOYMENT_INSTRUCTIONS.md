# 部署指南 - UX修复

## 修复内容

### 1. 注册页面 - 上级选择下拉框
- **问题**: 用户需要手动输入UUID格式的上级ID
- **修复**: 改为下拉选择框，显示"花名 (角色)"
- **技术实现**:
  - 新增公开API: `GET /api/auth/supervisors`
  - 返回经理/总监/主管列表
  - 前端根据角色自动过滤可选上级
  - 提交时仍发送UUID到后端验证

### 2. 团队管理 - 显示当前用户
- **问题**: 团队成员看不到自己在列表中
- **修复**: 从localStorage读取真实登录用户信息
- **技术实现**:
  - 读取`localStorage.getItem('user')`
  - 保留props作为兜底方案

## 部署步骤

### 本地测试（开发环境）
```bash
# 系统已自动重启，检查运行状态
curl http://localhost:5000/api/auth/supervisors

# 测试注册页面
# 访问 http://localhost:5000/register
# 选择角色后，应看到相应的上级下拉框
```

### 生产环境部署

#### 1. 推送代码到Git
```bash
git add server/routes.ts client/src/pages/RegisterPage.tsx client/src/pages/TeamManagement.tsx replit.md
git commit -m "UX优化: 注册页面改为下拉选择上级 + 团队管理显示当前用户"
git push origin main
```

#### 2. SSH到生产服务器
```bash
ssh root@172.93.32.222
```

#### 3. 更新代码
```bash
cd /root/dongqilai-crm
git pull origin main
```

#### 4. 重新构建
```bash
npm run build
```

#### 5. 重启PM2
```bash
pm2 restart dongqilai-crm
pm2 status
```

#### 6. 验证部署
```bash
# 检查API是否正常
curl https://app.detusts.com/api/auth/supervisors

# 应返回类似:
# {"success":true,"data":[{"id":"7","nickname":"七夕","role":"主管"}]}
```

#### 7. 浏览器测试
1. 访问: https://app.detusts.com/register
2. 选择角色"业务"
3. 确认"选择经理"下拉框显示
4. 选择一位经理
5. 填写其他信息并注册
6. 登录后进入"团队管理"
7. 确认自己在列表中

## 注意事项

### 安全性
- `/api/auth/supervisors` 是公开API（注册需要）
- 只返回id/nickname/role，不暴露敏感信息
- 后端仍然验证所有注册数据
- 角色层级验证保持不变

### 兼容性
- TeamManagement保留props兜底
- 旧版本用户不受影响
- localStorage优先级高于props

### 回滚方案
如需回滚到之前版本：
```bash
cd /root/dongqilai-crm
git log --oneline -5  # 查看最近5次提交
git reset --hard <之前的commit-hash>
npm run build
pm2 restart dongqilai-crm
```

## 验证清单

- [ ] API `/api/auth/supervisors` 返回supervisor列表
- [ ] 注册页面下拉框根据角色过滤
- [ ] 业务 → 只显示经理
- [ ] 经理 → 只显示总监
- [ ] 总监/后勤 → 只显示主管
- [ ] 选择上级后显示"花名 (角色)"
- [ ] 注册成功后能正常登录
- [ ] 团队管理页面显示自己
- [ ] 能编辑自己的装备

## 联系方式
如遇问题，检查PM2日志：
```bash
pm2 logs dongqilai-crm --lines 50
```
