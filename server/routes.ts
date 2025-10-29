import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertCustomerSchema, insertTaskSchema } from "@shared/schema";
import { requireAuth, getCurrentUser } from "./middleware/auth";
import { db } from "./db";
import { sql } from "drizzle-orm";
import {
  analyzeCustomerProfile,
  analyzeConversationSentiment,
  generateSalesScript,
  assessCustomerRisk,
  supervisorReview,
  comprehensiveAnalysis,
  generateTask
} from "./ai/agents";
import { analysisCache } from "./ai/cache";
import {
  validateRequest,
  analyzeCustomerSchema,
  analyzeSentimentSchema,
  generateScriptSchema,
  assessRiskSchema,
  supervisorReviewSchema,
  comprehensiveAnalysisSchema
} from "./ai/validation";
import { aggregateByDimension, type GroupByDimension } from "./services/aggregation";
import type { Request } from "express";

// WhatsApp聊天记录解析器
function parseWhatsAppChat(chatText: string): Array<{
  timestamp: string;
  sender: string;
  message: string;
}> {
  const conversations: Array<{
    timestamp: string;
    sender: string;
    message: string;
  }> = [];

  // 支持真实WhatsApp导出格式：
  // [11/9/25 17:57:02] Bea: Vale, el lunes me pondré en contacto contigo
  // [26/10/25 06:41:30] Lisa: 你在干嘛
  // 注意：日期和月份可能是单个或两个数字
  
  // 统一处理不同的换行符格式和移除零宽字符
  const cleanText = chatText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // 移除零宽字符
    
  const lines = cleanText.split('\n');
  let currentMessage: { timestamp: string; sender: string; message: string } | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 跳过空行
    if (!trimmedLine) {
      continue;
    }
    
    // 匹配格式: [D/M/YY HH:MM:SS] 或 [DD/MM/YY HH:MM:SS]
    // 支持单个或双个数字的日期和月份
    const match = trimmedLine.match(/^\[(\d{1,2}\/\d{1,2}\/\d{2}\s+\d{2}:\d{2}:\d{2})\]\s+([^:]+):\s*(.*)$/);
    
    if (match) {
      // 如果有当前消息，先保存
      if (currentMessage && currentMessage.message.trim()) {
        conversations.push(currentMessage);
      }

      const [, timestamp, sender, message] = match;
      
      // 过滤系统消息和附件消息
      const systemMessagePatterns = [
        '消息和通话已进行端到端加密',
        '已成为联系人',
        '音频已忽略',
        '图像已忽略',
        '视频已忽略',
        '文件已忽略',
        '语音通话',
        '未接语音通话',
        '未接听',
        '轻触回拨',
        '<附件：',
        '<这条消息已经过编辑>',
        '‎' // 零宽字符开头的消息
      ];
      
      const isSystemMessage = systemMessagePatterns.some(pattern => 
        message.includes(pattern) || trimmedLine.includes(pattern)
      );
      
      if (isSystemMessage || !message.trim()) {
        currentMessage = null;
        continue;
      }

      currentMessage = {
        timestamp,
        sender: sender.trim().replace(/[.:：\s]+$/, ''), // 移除发送者名字末尾的符号
        message: message.trim()
      };
    } else if (currentMessage && trimmedLine) {
      // 多行消息的续行（但排除系统消息）
      const isSystemLine = trimmedLine.includes('‎') || 
                          trimmedLine.includes('已忽略') ||
                          trimmedLine.includes('语音通话');
      
      if (!isSystemLine) {
        currentMessage.message += '\n' + trimmedLine;
      }
    }
  }

  // 保存最后一条消息
  if (currentMessage && currentMessage.message.trim()) {
    conversations.push(currentMessage);
  }

  return conversations;
}

// 使用AI识别对话中的客服和客户角色（带schema验证防止prompt injection）
async function identifyRolesWithAI(
  conversations: Array<{ timestamp: string; sender: string; message: string }>,
  customerName: string
): Promise<Array<{ timestamp: string; sender: string; role: 'agent' | 'customer'; message: string }>> {
  try {
    // 获取所有不同的发送者
    const senders = Array.from(new Set(conversations.map(c => c.sender)));
    
    if (senders.length === 0) {
      return [];
    }

    // 如果只有一个发送者，全部标记为客户
    if (senders.length === 1) {
      return conversations.map(c => ({ ...c, role: 'customer' as const }));
    }

    // 使用AI分析前10条消息，识别谁是客服，谁是客户
    const sampleMessages = conversations.slice(0, Math.min(10, conversations.length))
      .map(c => `${c.sender}: ${c.message}`).join('\n');

    const prompt = `分析以下WhatsApp聊天记录，识别谁是客服（销售人员），谁是客户。

客户姓名可能是：${customerName}

聊天记录：
${sampleMessages}

所有参与者：${senders.join(', ')}

请根据对话内容和语气，判断每个参与者的角色。客服通常：
- 使用更专业的语言
- 主动提问和引导
- 介绍产品或服务
- 使用敬语

客户通常：
- 提出需求和问题
- 语气更随意
- 询问价格、功能等

请以JSON格式返回：{"客服": ["姓名1"], "客户": ["姓名2"]}`;

    const response = await fetch(process.env.AI_BASE_URL + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      console.error('AI角色识别失败，使用默认策略');
      // 降级策略：第一个人是客服，其他是客户
      const agentName = senders[0];
      return conversations.map(c => ({
        ...c,
        role: c.sender === agentName ? 'agent' as const : 'customer' as const
      }));
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '';
    
    // 尝试从AI响应中提取JSON
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const roleMapping = JSON.parse(jsonMatch[0]);
      
      // 严格验证AI响应schema，防止prompt injection
      if (!roleMapping || typeof roleMapping !== 'object') {
        console.warn('AI返回格式无效，使用默认策略');
        const agentName = senders[0];
        return conversations.map(c => ({
          ...c,
          role: c.sender === agentName ? 'agent' as const : 'customer' as const
        }));
      }
      
      const agentList = roleMapping['客服'];
      const customerList = roleMapping['客户'];
      
      // 验证返回的名单是否为数组
      if (!Array.isArray(agentList) || !Array.isArray(customerList)) {
        console.warn('AI返回的角色列表格式无效，使用默认策略');
        const agentName = senders[0];
        return conversations.map(c => ({
          ...c,
          role: c.sender === agentName ? 'agent' as const : 'customer' as const
        }));
      }
      
      // 验证所有返回的名字都在实际参与者列表中（防止injection）
      const allMentioned = [...agentList, ...customerList];
      const invalidNames = allMentioned.filter(name => !senders.includes(name));
      if (invalidNames.length > 0) {
        console.warn('AI返回了不存在的参与者名字，可能存在prompt injection，使用默认策略');
        const agentName = senders[0];
        return conversations.map(c => ({
          ...c,
          role: c.sender === agentName ? 'agent' as const : 'customer' as const
        }));
      }
      
      // 验证通过，应用AI识别的角色
      const agents = new Set(agentList);
      return conversations.map(c => ({
        ...c,
        role: agents.has(c.sender) ? 'agent' as const : 'customer' as const
      }));
    }

    // 如果AI响应解析失败，使用默认策略
    const agentName = senders[0];
    return conversations.map(c => ({
      ...c,
      role: c.sender === agentName ? 'agent' as const : 'customer' as const
    }));
  } catch (error) {
    console.error('AI角色识别出错:', error);
    // 降级策略
    const senders = Array.from(new Set(conversations.map(c => c.sender)));
    const agentName = senders[0];
    return conversations.map(c => ({
      ...c,
      role: c.sender === agentName ? 'agent' as const : 'customer' as const
    }));
  }
}

// 辅助函数：记录审计日志
async function logAudit(params: {
  action: string;
  operatorId?: string;
  operatorUsername?: string;
  operatorRole?: string;
  targetUserId?: string;
  targetUsername?: string;
  details?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
  req?: Request;
}) {
  try {
    await storage.createAuditLog({
      action: params.action,
      operatorId: params.operatorId || null,
      operatorUsername: params.operatorUsername || null,
      operatorRole: params.operatorRole || null,
      targetUserId: params.targetUserId || null,
      targetUsername: params.targetUsername || null,
      details: params.details || null,
      ipAddress: params.req?.ip || params.req?.socket?.remoteAddress || null,
      userAgent: params.req?.get('user-agent') || null,
      success: params.success !== false ? 1 : 0,
      errorMessage: params.errorMessage || null,
    });
    console.log(`📋 审计日志: ${params.action} by ${params.operatorUsername || '未知'} - ${params.success !== false ? '成功' : '失败'}`);
  } catch (error) {
    console.error('❌ 审计日志记录失败:', error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ============================================
  // 调试端点（仅用于开发）
  // ============================================
  
  app.get("/debug/users", async (req, res) => {
    const token = req.query.token;
    if (token !== "debug2025") {
      return res.status(403).send("Forbidden");
    }
    
    try {
      const allUsers = await storage.getAllUsers();
      const userInfo = allUsers.map(u => ({
        id: u.id,
        username: u.username,
        password: u.password,
        nickname: u.nickname,
        role: u.role
      }));
      
      res.json({
        count: userInfo.length,
        users: userInfo
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/debug/update-tianchen-id", async (req, res) => {
    const token = req.query.token;
    if (token !== "debug2025") {
      return res.status(403).send("Forbidden");
    }
    
    try {
      // 更新天晨的ID从UUID改为8
      await db.execute(sql`UPDATE users SET id = '8' WHERE username = 'tianchen'`);
      
      res.json({
        success: true,
        message: "天晨的ID已更新为8"
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  app.post("/debug/add-all-users-to-chat", async (req, res) => {
    const token = req.query.token;
    if (token !== "debug2025") {
      return res.status(403).send("Forbidden");
    }
    
    try {
      const allUsers = await storage.getAllUsers();
      const chatId = '1'; // 默认聊天室
      const results = [];

      for (const user of allUsers) {
        try {
          // 检查是否已在聊天室
          const isInChat = await storage.isUserInChat(chatId, user.id);
          if (!isInChat) {
            await storage.addChatParticipant({
              chatId,
              userId: user.id,
            });
            results.push(`✅ ${user.nickname || user.name} 已加入聊天室`);
          } else {
            results.push(`ℹ️  ${user.nickname || user.name} 已在聊天室中`);
          }
        } catch (error: any) {
          results.push(`❌ ${user.nickname || user.name} 加入失败: ${error.message}`);
        }
      }
      
      res.json({
        success: true,
        message: "批量添加完成",
        results
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

  app.get("/deploy/server-index", async (req, res) => {
    const token = req.query.token;
    if (token !== "deploy2025") {
      return res.status(403).send("Forbidden");
    }
    
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(import.meta.dirname, 'index.ts');
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="index.ts"');
    res.sendFile(filePath);
  });

  app.get("/deploy/register-page", async (req, res) => {
    const token = req.query.token;
    if (token !== "deploy2025") {
      return res.status(403).send("Forbidden");
    }
    
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(import.meta.dirname, '..', 'client', 'src', 'pages', 'RegisterPage.tsx');
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="RegisterPage.tsx"');
    res.sendFile(filePath);
  });

  app.get("/deploy/team-page", async (req, res) => {
    const token = req.query.token;
    if (token !== "deploy2025") {
      return res.status(403).send("Forbidden");
    }
    
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(import.meta.dirname, '..', 'client', 'src', 'pages', 'TeamManagement.tsx');
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="TeamManagement.tsx"');
    res.sendFile(filePath);
  });

  // ============================================
  // 认证 API 路由
  // ============================================

  /**
   * 用户注册
   * POST /api/auth/register
   */
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, nickname, role, supervisorId } = req.body;

      // 严格验证所有必填字段（防止空字符串和纯空格）
      if (!username?.trim() || !password?.trim() || !nickname?.trim() || !role?.trim() || !supervisorId?.trim()) {
        return res.status(400).json({ 
          error: "请填写所有必填字段（用户名、密码、花名、职位、上级ID）" 
        });
      }

      // Trim所有输入
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();
      const trimmedNickname = nickname.trim();
      const trimmedRole = role.trim();
      const trimmedSupervisorId = supervisorId.trim();

      // 验证用户名格式：只允许英文字母和数字
      const usernameRegex = /^[a-zA-Z0-9]+$/;
      if (!usernameRegex.test(trimmedUsername)) {
        return res.status(400).json({ 
          error: "用户名只能包含英文字母和数字，例如：zhangsan、lisi123" 
        });
      }

      // 验证角色是否在允许的列表中
      const allowedRoles = ['总监', '经理', '业务', '后勤'];
      if (!allowedRoles.includes(trimmedRole)) {
        return res.status(400).json({ 
          error: "无效的职位，只能选择：总监、经理、业务、后勤" 
        });
      }

      // 禁止注册主管角色（双重检查）
      if (trimmedRole === "主管") {
        return res.status(403).json({ error: "主管账号不可注册" });
      }

      // 检查用户名是否已存在
      const existingUser = await storage.getUserByUsername(trimmedUsername);
      if (existingUser) {
        return res.status(409).json({ error: "用户名已存在" });
      }

      // 验证上级ID存在并检查角色层级关系
      const supervisor = await storage.getUser(trimmedSupervisorId);
      if (!supervisor) {
        return res.status(400).json({ error: "上级ID不存在，请填写正确的上级ID" });
      }

      // 验证角色层级关系（严格匹配）
      const roleHierarchy: { [key: string]: string[] } = {
        '业务': ['经理'],           // 业务的上级必须是经理
        '经理': ['总监'],           // 经理的上级必须是总监
        '总监': ['主管'],           // 总监的上级必须是主管
        '后勤': ['主管']            // 后勤的上级必须是主管
      };

      const allowedSupervisorRoles = roleHierarchy[trimmedRole];
      if (allowedSupervisorRoles && !allowedSupervisorRoles.includes(supervisor.role)) {
        return res.status(400).json({ 
          error: `${trimmedRole}的上级必须是${allowedSupervisorRoles.join('或')}，您填写的上级是${supervisor.role}` 
        });
      }

      // 创建用户（使用trim后的值）
      const user = await storage.createUser({
        username: trimmedUsername,
        password: trimmedPassword, // 注意：实际生产环境应使用bcrypt等加密
        name: trimmedNickname, // 使用花名作为name
        nickname: trimmedNickname,
        role: trimmedRole,
        supervisorId: trimmedSupervisorId,
      });

      // 自动把新用户加入默认聊天室（销售团队，ID='1'）
      try {
        await storage.addChatParticipant({
          chatId: '1',
          userId: user.id,
        });
        console.log(`新用户 ${user.nickname} 已自动加入聊天室`);
      } catch (error) {
        console.error('添加用户到聊天室失败:', error);
        // 不阻断注册流程，只记录错误
      }

      // 记录审计日志
      await logAudit({
        action: 'register',
        targetUserId: user.id,
        targetUsername: user.username,
        details: { 
          role: user.role,
          supervisorId: user.supervisorId,
          nickname: user.nickname
        },
        success: true,
        req
      });

      res.json({ 
        success: true,
        message: "注册成功",
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          nickname: user.nickname,
          role: user.role,
          supervisorId: user.supervisorId
        }
      });
    } catch (error) {
      console.error('注册失败:', error);
      
      // 记录失败的审计日志
      await logAudit({
        action: 'register',
        targetUsername: req.body.username,
        details: { error: error instanceof Error ? error.message : '未知错误' },
        success: false,
        errorMessage: error instanceof Error ? error.message : '注册失败',
        req
      });
      
      res.status(500).json({ error: "注册失败" });
    }
  });

  /**
   * 用户登出
   * POST /api/auth/logout
   */
  app.post("/api/auth/logout", async (req, res) => {
    const userId = req.session.userId;
    const username = req.session.username;
    
    req.session.destroy(async (err) => {
      if (err) {
        console.error('登出失败:', err);
        
        // 记录失败的审计日志
        await logAudit({
          action: 'logout',
          operatorId: userId,
          operatorUsername: username,
          success: false,
          errorMessage: '登出失败',
          req
        });
        
        return res.status(500).json({ error: "登出失败" });
      }
      
      // 记录成功的审计日志
      await logAudit({
        action: 'logout',
        operatorId: userId,
        operatorUsername: username,
        success: true,
        req
      });
      
      res.clearCookie('connect.sid'); // 清除session cookie
      res.json({ success: true, message: "已成功退出登录" });
    });
  });

  /**
   * 用户登录
   * POST /api/auth/login
   */
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      console.log('🔐 登录请求:', {
        username,
        passwordLength: password?.length,
        hasUsername: !!username,
        hasPassword: !!password
      });

      if (!username || !password) {
        console.log('❌ 缺少用户名或密码');
        return res.status(400).json({ error: "请输入用户名和密码" });
      }

      // 查找用户
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log('❌ 用户不存在:', username);
        return res.status(401).json({ error: "用户名或密码错误" });
      }
      
      console.log('✅ 找到用户:', {
        username: user.username,
        dbPassword: user.password,
        inputPassword: password,
        match: user.password === password
      });

      // 验证密码（注意：实际生产环境应使用bcrypt验证）
      if (user.password !== password) {
        console.log('❌ 密码不匹配');
        return res.status(401).json({ error: "用户名或密码错误" });
      }

      // 设置session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;

      // 显式保存session，确保cookie被发送
      req.session.save(async (err) => {
        if (err) {
          console.error('❌ Session保存失败:', err);
          
          // 记录失败的审计日志
          await logAudit({
            action: 'login',
            operatorId: user.id,
            operatorUsername: user.username,
            operatorRole: user.role,
            success: false,
            errorMessage: 'Session保存失败',
            req
          });
          
          return res.status(500).json({ error: "登录失败，请重试" });
        }

        // 记录成功的审计日志
        await logAudit({
          action: 'login',
          operatorId: user.id,
          operatorUsername: user.username,
          operatorRole: user.role,
          details: { role: user.role, team: user.team },
          success: true,
          req
        });

        console.log('✅ Session保存成功，userId:', user.id);
        res.json({
          success: true,
          message: "登录成功",
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            nickname: user.nickname,
            role: user.role,
            position: user.position,
            team: user.team,
            supervisorId: user.supervisorId
          }
        });
      });
    } catch (error) {
      console.error('登录失败:', error);
      
      // 记录失败的审计日志
      await logAudit({
        action: 'login',
        targetUsername: req.body.username,
        details: { error: error instanceof Error ? error.message : '未知错误' },
        success: false,
        errorMessage: error instanceof Error ? error.message : '登录失败',
        req
      });
      
      res.status(500).json({ error: "登录失败" });
    }
  });

  /**
   * 获取可选上级列表（公开API，用于注册页面）
   * GET /api/auth/supervisors
   */
  app.get("/api/auth/supervisors", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // 只返回可以作为上级的角色：经理、总监、主管
      const supervisors = users
        .filter(user => ['经理', '总监', '主管'].includes(user.role))
        .map(user => ({
          id: user.id,
          nickname: user.nickname || user.name,
          role: user.role
        }));

      res.json({ success: true, data: supervisors });
    } catch (error) {
      console.error('获取上级列表失败:', error);
      res.status(500).json({ error: "获取上级列表失败" });
    }
  });

  /**
   * 获取所有业务人员列表（用于筛选）
   * GET /api/users
   */
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // 返回用户列表（包含设备信息，不包含密码）
      const userList = users.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        nickname: user.nickname,
        role: user.role,
        supervisorId: user.supervisorId,
        phone: user.phone,
        computer: user.computer,
        charger: user.charger,
        dormitory: user.dormitory,
        joinDate: user.joinDate,
        wave: user.wave
      }));

      res.json({ success: true, data: userList });
    } catch (error) {
      console.error('获取用户列表失败:', error);
      res.status(500).json({ error: "获取用户列表失败" });
    }
  });

  /**
   * 获取用户信息（用于测试和验证）
   * GET /api/users/:username
   */
  app.get("/api/users/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(404).json({ error: "用户不存在" });
      }

      // 返回用户信息（不包含密码）
      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        nickname: user.nickname,
        role: user.role,
        supervisorId: user.supervisorId
      });
    } catch (error) {
      console.error('获取用户信息失败:', error);
      res.status(500).json({ error: "获取用户信息失败" });
    }
  });

  /**
   * 更新用户信息（仅主管可用）
   * PATCH /api/users/:id
   */
  app.patch("/api/users/:id", async (req, res) => {
    try {
      // 验证用户已登录
      if (!req.session.userId) {
        return res.status(401).json({ error: "未登录" });
      }

      // 验证是否为主管
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser || currentUser.role !== '主管') {
        return res.status(403).json({ error: "只有主管可以修改用户信息" });
      }

      const { id } = req.params;
      const { supervisorId, nickname, role, position, team } = req.body;

      // 验证用户存在
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ error: "用户不存在" });
      }

      // 如果修改上级ID，需要验证上级存在且角色层级正确
      if (supervisorId !== undefined) {
        const trimmedSupervisorId = supervisorId.trim();
        
        // 验证上级存在
        const supervisor = await storage.getUser(trimmedSupervisorId);
        if (!supervisor) {
          return res.status(400).json({ error: "上级ID不存在" });
        }

        // 验证角色层级关系
        const userRole = role || targetUser.role; // 使用新角色或原有角色
        const expectedSupervisorRole: Record<string, string> = {
          '业务': '经理',
          '经理': '总监',
          '总监': '主管',
          '后勤': '主管'
        };

        const expected = expectedSupervisorRole[userRole];
        if (expected && supervisor.role !== expected) {
          return res.status(400).json({ 
            error: `${userRole}的上级必须是${expected}，但提供的上级ID是${supervisor.role}` 
          });
        }
      }

      // 保存旧值用于审计日志
      const oldValues: Record<string, any> = {};
      const newValues: Record<string, any> = {};
      
      // 更新用户信息
      const updates: any = {};
      if (supervisorId !== undefined) {
        oldValues.supervisorId = targetUser.supervisorId;
        newValues.supervisorId = supervisorId.trim();
        updates.supervisorId = supervisorId.trim();
      }
      if (nickname !== undefined) {
        oldValues.nickname = targetUser.nickname;
        newValues.nickname = nickname.trim();
        updates.nickname = nickname.trim();
      }
      if (role !== undefined) {
        oldValues.role = targetUser.role;
        newValues.role = role.trim();
        updates.role = role.trim();
      }
      if (position !== undefined) {
        oldValues.position = targetUser.position;
        newValues.position = position.trim();
        updates.position = position.trim();
      }
      if (team !== undefined) {
        oldValues.team = targetUser.team;
        newValues.team = team.trim();
        updates.team = team.trim();
      }

      const updatedUser = await storage.updateUser(id, updates);

      if (!updatedUser) {
        return res.status(404).json({ error: "更新失败" });
      }

      // 记录审计日志
      await logAudit({
        action: 'update_user',
        operatorId: currentUser.id,
        operatorUsername: currentUser.username,
        operatorRole: currentUser.role,
        targetUserId: updatedUser.id,
        targetUsername: updatedUser.username,
        details: {
          changes: Object.keys(newValues).map(key => `${key}: ${oldValues[key]} → ${newValues[key]}`).join(', '),
          oldValues,
          newValues
        },
        success: true,
        req
      });

      res.json({
        success: true,
        message: "用户信息已更新",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          name: updatedUser.name,
          nickname: updatedUser.nickname,
          role: updatedUser.role,
          supervisorId: updatedUser.supervisorId,
          position: updatedUser.position,
          team: updatedUser.team
        }
      });
    } catch (error) {
      console.error('更新用户信息失败:', error);
      
      // 记录失败的审计日志
      await logAudit({
        action: 'update_user',
        operatorId: req.session.userId,
        targetUserId: req.params.id,
        details: { error: error instanceof Error ? error.message : '未知错误' },
        success: false,
        errorMessage: error instanceof Error ? error.message : '更新用户信息失败',
        req
      });
      
      res.status(500).json({ error: "更新用户信息失败" });
    }
  });

  /**
   * 更新用户设备信息
   * PATCH /api/users/:id/equipment
   */
  app.patch("/api/users/:id/equipment", async (req, res) => {
    try {
      // 验证用户已登录
      if (!req.session.userId) {
        return res.status(401).json({ error: "未登录" });
      }

      const { id } = req.params;
      const currentUser = await storage.getUser(req.session.userId);
      
      if (!currentUser) {
        return res.status(401).json({ error: "用户不存在" });
      }

      // 权限检查：只能修改自己的设备信息，或者主管可以修改任何人
      if (currentUser.id !== id && currentUser.role !== '主管') {
        return res.status(403).json({ error: "只能修改自己的设备信息" });
      }

      // 验证目标用户存在
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ error: "用户不存在" });
      }

      const { phone, computer, charger, dormitory, joinDate, wave } = req.body;

      console.log('📥 接收到的设备信息请求:', {
        userId: id,
        requestBody: req.body,
        phone, computer, charger, dormitory, joinDate, wave
      });

      // 更新设备信息
      const updates: any = {};
      if (phone !== undefined) updates.phone = phone;
      if (computer !== undefined) updates.computer = computer;
      if (charger !== undefined) updates.charger = charger;
      if (dormitory !== undefined) updates.dormitory = dormitory;
      if (joinDate !== undefined) updates.joinDate = joinDate;
      if (wave !== undefined) updates.wave = wave;

      console.log('💾 准备保存的updates对象:', updates);

      const updatedUser = await storage.updateUser(id, updates);
      
      console.log('✅ 保存后的用户数据:', {
        id: updatedUser?.id,
        phone: updatedUser?.phone,
        computer: updatedUser?.computer,
        charger: updatedUser?.charger,
        dormitory: updatedUser?.dormitory,
        joinDate: updatedUser?.joinDate,
        wave: updatedUser?.wave
      });
      
      if (!updatedUser) {
        return res.status(500).json({ error: "更新失败" });
      }

      res.json({
        success: true,
        message: "设备信息已更新",
        user: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          computer: updatedUser.computer,
          charger: updatedUser.charger,
          dormitory: updatedUser.dormitory,
          joinDate: updatedUser.joinDate,
          wave: updatedUser.wave
        }
      });
    } catch (error) {
      console.error('更新设备信息失败:', error);
      res.status(500).json({ error: "更新设备信息失败" });
    }
  });

  /**
   * 删除用户（仅主管可用）
   * DELETE /api/users/:id
   */
  app.delete("/api/users/:id", async (req, res) => {
    try {
      // 验证用户已登录
      if (!req.session.userId) {
        return res.status(401).json({ error: "未登录" });
      }

      // 验证是否为主管
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser || currentUser.role !== '主管') {
        return res.status(403).json({ error: "只有主管可以删除用户" });
      }

      const { id } = req.params;

      // 验证用户存在
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ error: "用户不存在" });
      }

      // 禁止删除自己
      if (id === req.session.userId) {
        return res.status(400).json({ error: "不能删除自己的账户" });
      }

      // TODO: 这里应该先检查用户是否有关联数据（客户、任务等），确保数据完整性
      // 但为了简单起见，我们暂时只删除用户账户

      // 删除用户（需要在storage中实现deleteUser方法）
      const success = await storage.deleteUser(id);

      if (!success) {
        return res.status(500).json({ error: "删除失败" });
      }

      // 记录审计日志
      await logAudit({
        action: 'delete_user',
        operatorId: currentUser.id,
        operatorUsername: currentUser.username,
        operatorRole: currentUser.role,
        targetUserId: targetUser.id,
        targetUsername: targetUser.username,
        details: {
          deletedUser: {
            username: targetUser.username,
            name: targetUser.name,
            role: targetUser.role
          }
        },
        success: true,
        req
      });

      res.json({
        success: true,
        message: "用户已删除"
      });
    } catch (error) {
      console.error('删除用户失败:', error);
      
      // 记录失败的审计日志
      await logAudit({
        action: 'delete_user',
        operatorId: req.session.userId,
        targetUserId: req.params.id,
        details: { error: error instanceof Error ? error.message : '未知错误' },
        success: false,
        errorMessage: error instanceof Error ? error.message : '删除用户失败',
        req
      });
      
      res.status(500).json({ error: "删除用户失败" });
    }
  });

  // ============================================
  // AI 分析 API 路由
  // ============================================

  /**
   * 客户画像分析
   * POST /api/ai/analyze-customer
   */
  app.post("/api/ai/analyze-customer", async (req, res) => {
    try {
      // 验证请求数据
      const validation = validateRequest(analyzeCustomerSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "请求数据无效", details: validation.error });
      }

      const { customerId, customer, useCache } = validation.data;

      // 检查缓存
      if (useCache) {
        const cached = analysisCache.get(customerId, 'profile');
        if (cached) {
          return res.json({ data: cached, fromCache: true });
        }
      }

      // AI分析
      const result = await analyzeCustomerProfile(customer);

      // 保存缓存
      analysisCache.set(customerId, 'profile', result);

      res.json({ data: result, fromCache: false });
    } catch (error) {
      console.error('客户画像分析失败:', error);
      res.status(500).json({ 
        error: "分析失败", 
        message: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  /**
   * 对话情绪分析
   * POST /api/ai/analyze-sentiment
   */
  app.post("/api/ai/analyze-sentiment", async (req, res) => {
    try {
      // 验证请求数据
      const validation = validateRequest(analyzeSentimentSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "请求数据无效", details: validation.error });
      }

      const { customerId, conversations, useCache } = validation.data;

      // 检查缓存
      if (useCache) {
        const cached = analysisCache.get(customerId, 'sentiment');
        if (cached) {
          return res.json({ data: cached, fromCache: true });
        }
      }

      // AI分析
      const result = await analyzeConversationSentiment(conversations);

      // 保存缓存
      analysisCache.set(customerId, 'sentiment', result);

      res.json({ data: result, fromCache: false });
    } catch (error) {
      console.error('对话情绪分析失败:', error);
      res.status(500).json({ 
        error: "分析失败", 
        message: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  /**
   * 生成销售话术
   * POST /api/ai/generate-script
   */
  app.post("/api/ai/generate-script", async (req, res) => {
    try {
      // 验证请求数据
      const validation = validateRequest(generateScriptSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "请求数据无效", details: validation.error });
      }

      const { customerProfile, stage } = validation.data;
      const result = await generateSalesScript(customerProfile, stage);
      res.json({ data: result });
    } catch (error) {
      console.error('话术生成失败:', error);
      res.status(500).json({ 
        error: "生成失败", 
        message: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  /**
   * 风险评估
   * POST /api/ai/assess-risk
   */
  app.post("/api/ai/assess-risk", async (req, res) => {
    try {
      // 验证请求数据
      const validation = validateRequest(assessRiskSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "请求数据无效", details: validation.error });
      }

      const { customerId, customer, behaviorData, useCache } = validation.data;

      // 检查缓存
      if (useCache) {
        const cached = analysisCache.get(customerId, 'risk');
        if (cached) {
          return res.json({ data: cached, fromCache: true });
        }
      }

      // AI分析
      const result = await assessCustomerRisk(customer, behaviorData);

      // 保存缓存
      analysisCache.set(customerId, 'risk', result);

      res.json({ data: result, fromCache: false });
    } catch (error) {
      console.error('风险评估失败:', error);
      res.status(500).json({ 
        error: "评估失败", 
        message: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  /**
   * 主管AI质检
   * POST /api/ai/supervisor-review
   */
  app.post("/api/ai/supervisor-review", async (req, res) => {
    try {
      // 验证请求数据
      const validation = validateRequest(supervisorReviewSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "请求数据无效", details: validation.error });
      }

      const { analysisResults } = validation.data;
      const result = await supervisorReview(analysisResults);
      res.json({ data: result });
    } catch (error) {
      console.error('主管AI审查失败:', error);
      res.status(500).json({ 
        error: "审查失败", 
        message: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  /**
   * 综合分析（一次调用所有AI）
   * POST /api/ai/comprehensive-analysis
   */
  app.post("/api/ai/comprehensive-analysis", async (req, res) => {
    try {
      // 验证请求数据
      const validation = validateRequest(comprehensiveAnalysisSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "请求数据无效", details: validation.error });
      }

      const { customerId, customer, conversations, stage, behaviorData } = validation.data;

      const result = await comprehensiveAnalysis({
        customer,
        conversations,
        stage,
        behaviorData
      });

      // 缓存各部分结果
      if (result.profile) analysisCache.set(customerId, 'profile', result.profile);
      if (result.sentiment) analysisCache.set(customerId, 'sentiment', result.sentiment);
      if (result.risk) analysisCache.set(customerId, 'risk', result.risk);

      res.json({ data: result });
    } catch (error) {
      console.error('综合分析失败:', error);
      res.status(500).json({ 
        error: "分析失败", 
        message: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  /**
   * 清除客户缓存
   * DELETE /api/ai/cache/:customerId
   */
  app.delete("/api/ai/cache/:customerId", (req, res) => {
    try {
      const { customerId } = req.params;
      analysisCache.clearCustomer(customerId);
      res.json({ success: true, message: "缓存已清除" });
    } catch (error) {
      res.status(500).json({ error: "清除缓存失败" });
    }
  });

  /**
   * 获取缓存统计
   * GET /api/ai/cache/stats
   */
  app.get("/api/ai/cache/stats", (req, res) => {
    try {
      const stats = analysisCache.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "获取统计失败" });
    }
  });

  /**
   * 测试AI连接
   * GET /api/ai/test
   */
  app.get("/api/ai/test", async (req, res) => {
    try {
      const { createAI } = await import("./ai/adapter");
      const ai = createAI();
      const response = await ai.ask("你好，请回复'连接成功'");
      res.json({ 
        success: true, 
        message: "AI连接正常", 
        response 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: "AI连接失败", 
        message: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  /**
   * AI聊天对话
   * POST /api/ai/chat
   */
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "缺少消息内容" });
      }

      // 添加系统提示词，告诉AI它的角色
      const systemMessage = {
        role: 'system',
        content: `你是"动QI来"智能CRM系统的专业AI销售顾问助手，专注于金融证券行业。

## 你的核心职责
1. **生成专业话术**：根据客户画像和沟通场景，生成自然、专业、有说服力的销售话术
2. **客户分析**：深度分析客户特征、投资偏好、风险承受能力，提供精准的沟通策略
3. **投资建议**：提供合规的投资建议和市场分析，帮助销售人员建立专业形象
4. **流程指导**：指导销售人员完成客户开户、入金、持续服务等全流程

## 沟通原则
- **专业性**：使用金融行业术语，但避免过于晦涩，适应客户理解水平
- **合规性**：所有建议必须符合证券行业规范，避免承诺收益、诱导交易等违规行为
- **个性化**：根据客户的年龄、职业、投资经验、风险偏好定制沟通方案
- **信任建立**：强调长期服务关系，而非短期交易，注重客户教育和价值传递

## 话术生成要点
- 开场：根据客户标签（如"股民"、"小白"）选择合适的切入点
- 中期：了解客户需求，展示专业知识，建立信任
- 推进：自然过渡到开户、入金等转化环节，不强迫
- 跟进：提供持续价值，保持客户活跃度

## 客户类型识别
- **小白客户**：需要耐心教育，使用通俗语言，强调风险控制
- **经验股民**：展示专业分析能力，提供市场洞察和策略建议
- **高价值客户**：提供定制化服务方案，强调专属服务和高端产品

请用专业、友好、有温度的语气回答，确保建议可执行、合规、有效。`
      };

      const { createAI } = await import("./ai/adapter");
      const ai = createAI();

      // 调用AI服务
      const response = await ai.chat(
        [systemMessage, ...messages],
        {
          temperature: 0.7,
          maxTokens: 2000
        }
      );

      res.json({ 
        success: true,
        message: response.content,
        usage: response.usage
      });
    } catch (error) {
      console.error('AI聊天失败:', error);
      res.status(500).json({ 
        error: "AI服务调用失败", 
        message: error instanceof Error ? error.message : '未知错误' 
      });
    }
  });

  // ============================================
  // 客户管理 API 路由
  // ============================================

  /**
   * 获取客户列表（基于角色的权限控制）
   * GET /api/customers
   */
  app.get("/api/customers", requireAuth, async (req, res) => {
    try {
      const currentUser = getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ error: "未登录" });
      }
      
      // 从session获取用户信息，而不是query参数（安全）
      const customers = await storage.getCustomersByUser(currentUser.id, currentUser.role);
      
      res.json({ success: true, data: customers });
    } catch (error) {
      console.error('获取客户列表失败:', error);
      res.status(500).json({ error: "获取客户列表失败" });
    }
  });

  /**
   * 获取单个客户
   * GET /api/customers/:id
   */
  app.get("/api/customers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ error: "客户不存在" });
      }

      res.json({ success: true, data: customer });
    } catch (error) {
      console.error('获取客户详情失败:', error);
      res.status(500).json({ error: "获取客户详情失败" });
    }
  });

  /**
   * 创建新客户
   * POST /api/customers
   */
  app.post("/api/customers", requireAuth, async (req, res) => {
    try {
      const currentUser = getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ error: "未登录" });
      }

      // 验证请求数据（排除createdBy，从session获取）
      const validation = insertCustomerSchema.omit({ createdBy: true }).safeParse(req.body);
      
      if (!validation.success) {
        const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        return res.status(400).json({ error: "数据验证失败", details: errors });
      }

      // 强制使用session中的用户ID作为创建者（安全）
      const customerData = {
        ...validation.data,
        createdBy: currentUser.id
      };

      const customer = await storage.createCustomer(customerData);

      res.json({ success: true, data: customer, message: "客户添加成功" });
    } catch (error) {
      console.error('创建客户失败:', error);
      res.status(500).json({ 
        error: "创建客户失败",
        message: error instanceof Error ? error.message : "未知错误"
      });
    }
  });

  /**
   * 更新客户信息
   * PATCH /api/customers/:id
   */
  app.patch("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // 部分验证：只验证提供的字段（排除createdBy，防止篡改）
      const validation = insertCustomerSchema.partial().omit({ createdBy: true }).safeParse(req.body);
      
      if (!validation.success) {
        const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        return res.status(400).json({ error: "数据验证失败", details: errors });
      }

      // 过滤掉undefined值，避免Drizzle "No values to set"错误
      const updateData = Object.fromEntries(
        Object.entries(validation.data).filter(([_, v]) => v !== undefined)
      );

      // 如果没有要更新的字段，直接返回当前客户
      if (Object.keys(updateData).length === 0) {
        const existingCustomer = await storage.getCustomer(id);
        if (!existingCustomer) {
          return res.status(404).json({ error: "客户不存在" });
        }
        return res.json({ success: true, data: existingCustomer, message: "无需更新" });
      }

      const customer = await storage.updateCustomer(id, updateData);
      
      if (!customer) {
        return res.status(404).json({ error: "客户不存在" });
      }

      res.json({ success: true, data: customer, message: "客户信息更新成功" });
    } catch (error) {
      console.error('更新客户失败:', error);
      res.status(500).json({ 
        error: "更新客户失败",
        message: error instanceof Error ? error.message : "未知错误"
      });
    }
  });

  /**
   * 删除客户
   * DELETE /api/customers/:id
   */
  app.delete("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCustomer(id);
      
      if (!success) {
        return res.status(404).json({ error: "客户不存在" });
      }

      res.json({ success: true, message: "客户删除成功" });
    } catch (error) {
      console.error('删除客户失败:', error);
      res.status(500).json({ error: "删除客户失败" });
    }
  });

  /**
   * 上传并解析WhatsApp聊天记录
   * POST /api/customers/:id/upload-chat
   */
  app.post("/api/customers/:id/upload-chat", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { chatText } = req.body;

      if (!chatText || typeof chatText !== 'string') {
        return res.status(400).json({ error: "请提供聊天记录文本" });
      }

      // 检查客户是否存在
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ error: "客户不存在" });
      }

      // 解析WhatsApp聊天记录
      const conversations = parseWhatsAppChat(chatText);
      
      if (conversations.length === 0) {
        return res.status(400).json({ error: "无法解析聊天记录，请确保格式正确" });
      }

      // 使用AI分析并识别客服和客户
      const analyzedConversations = await identifyRolesWithAI(conversations, customer.name || '客户');

      // 更新客户的聊天记录
      const updatedCustomer = await storage.updateCustomer(id, {
        conversations: analyzedConversations
      });

      res.json({
        success: true,
        data: updatedCustomer,
        message: `成功导入${analyzedConversations.length}条对话记录`
      });
    } catch (error) {
      console.error('上传聊天记录失败:', error);
      res.status(500).json({
        error: "上传聊天记录失败",
        message: error instanceof Error ? error.message : "未知错误"
      });
    }
  });

  // ============================================
  // 任务 API 路由
  // ============================================

  /**
   * 获取所有任务
   * GET /api/tasks
   */
  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "未登录" });
      }

      // 获取该用户的所有任务
      const tasks = await storage.getTasksByUser(user.id);
      
      res.json({ success: true, data: tasks });
    } catch (error) {
      console.error('获取任务列表失败:', error);
      res.status(500).json({ error: "获取任务列表失败" });
    }
  });

  /**
   * 获取单个任务详情
   * GET /api/tasks/:id
   */
  app.get("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "未登录" });
      }

      const { id } = req.params;
      const task = await storage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ error: "任务不存在" });
      }

      // 验证权限：检查任务是否属于当前用户
      if (task.createdBy !== user.id && task.assignedAgentId !== user.id) {
        return res.status(403).json({ error: "无权限查看此任务" });
      }

      res.json({ success: true, data: task });
    } catch (error) {
      console.error('获取任务详情失败:', error);
      res.status(500).json({ error: "获取任务详情失败" });
    }
  });

  /**
   * 创建新任务
   * POST /api/tasks
   */
  app.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "未登录" });
      }

      // 验证请求数据
      const validation = insertTaskSchema.omit({ createdBy: true }).safeParse(req.body);
      if (!validation.success) {
        const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        return res.status(400).json({ error: "数据验证失败", details: errors });
      }

      const taskData = {
        ...validation.data,
        createdBy: user.id,
        assignedAgentId: validation.data.assignedAgentId || user.id,
      };

      const task = await storage.createTask(taskData);
      
      res.json({ success: true, data: task, message: "任务创建成功" });
    } catch (error) {
      console.error('创建任务失败:', error);
      res.status(500).json({ error: "创建任务失败" });
    }
  });

  /**
   * 更新任务（包括标记完成）
   * PATCH /api/tasks/:id
   */
  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "未登录" });
      }

      const { id } = req.params;
      
      // 验证权限：检查任务是否属于当前用户
      const existingTask = await storage.getTask(id);
      if (!existingTask) {
        return res.status(404).json({ error: "任务不存在" });
      }

      if (existingTask.createdBy !== user.id && existingTask.assignedAgentId !== user.id) {
        return res.status(403).json({ error: "无权限修改此任务" });
      }

      // 验证请求数据
      const validation = insertTaskSchema.partial().omit({ createdBy: true }).safeParse(req.body);
      if (!validation.success) {
        const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        return res.status(400).json({ error: "数据验证失败", details: errors });
      }

      const task = await storage.updateTask(id, validation.data);
      
      if (!task) {
        return res.status(404).json({ error: "任务不存在" });
      }

      res.json({ success: true, data: task, message: "任务更新成功" });
    } catch (error) {
      console.error('更新任务失败:', error);
      res.status(500).json({ error: "更新任务失败" });
    }
  });

  /**
   * AI自动生成任务
   * POST /api/tasks/auto-generate
   */
  app.post("/api/tasks/auto-generate", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "未登录" });
      }

      const { customerId } = req.body;
      if (!customerId) {
        return res.status(400).json({ error: "缺少客户ID" });
      }

      // 获取客户信息
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: "客户不存在" });
      }

      // 使用AI生成任务
      const aiTaskData = await generateTask(customer, customer.stage || '初次接触');

      // 创建任务
      const taskData = {
        customerId: customer.id,
        title: aiTaskData.title,
        description: aiTaskData.description,
        guidanceSteps: aiTaskData.guidanceSteps,
        script: aiTaskData.script,
        status: 'pending' as const,
        createdBy: user.id,
        assignedAgentId: user.id,
        // 根据优先级设置截止时间
        dueAt: aiTaskData.priority === 'high' 
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 1天后
          : aiTaskData.priority === 'medium'
          ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3天后
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7天后
      };

      const task = await storage.createTask(taskData);
      
      res.json({ 
        success: true, 
        data: task, 
        message: "AI任务生成成功",
        aiMeta: {
          priority: aiTaskData.priority,
          estimatedDuration: aiTaskData.estimatedDuration,
          expectedOutcome: aiTaskData.expectedOutcome
        }
      });
    } catch (error) {
      console.error('AI生成任务失败:', error);
      res.status(500).json({ error: "AI生成任务失败" });
    }
  });

  /**
   * AI生成随机客户场景任务
   * POST /api/tasks/auto-generate-random
   */
  app.post("/api/tasks/auto-generate-random", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "未登录" });
      }

      // 导入generateRandomTask函数
      const { generateRandomTask } = await import('./ai/agents.js');
      
      // 使用AI生成随机客户场景
      const aiTaskData = await generateRandomTask();

      // 创建任务（使用虚拟客户ID）
      const taskData = {
        customerId: `virtual-${Date.now()}`, // 虚拟客户ID
        title: aiTaskData.title || `${aiTaskData.stage} - ${aiTaskData.customerName}`,
        description: aiTaskData.description || aiTaskData.customerProfile,
        guidanceSteps: aiTaskData.guidanceSteps || [],
        script: aiTaskData.script || '',
        status: 'pending' as const,
        createdBy: user.id,
        assignedAgentId: user.id,
        dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 默认3天后
      };

      const task = await storage.createTask(taskData);
      
      res.json({ 
        success: true, 
        data: task, 
        message: "AI随机任务场景生成成功",
        scenarioInfo: {
          customerName: aiTaskData.customerName,
          customerProfile: aiTaskData.customerProfile,
          stage: aiTaskData.stage
        }
      });
    } catch (error) {
      console.error('AI生成随机任务失败:', error);
      res.status(500).json({ error: "AI生成随机任务失败" });
    }
  });

  // ============================================
  // 数据报表 API 路由
  // ============================================

  /**
   * 获取报表数据（支持多维度筛选）
   * GET /api/reports
   * Query params: channel, createdBy, team, dateStart, dateEnd
   */
  app.get("/api/reports", requireAuth, async (req, res) => {
    try {
      const currentUser = getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ error: "未登录" });
      }

      const { channel, createdBy, team, dateStart, dateEnd } = req.query;

      // 获取筛选后的客户数据（应用层级权限）
      const customers = await storage.getReportsData(
        currentUser.id,
        currentUser.role,
        {
          channel: channel as string,
          createdBy: createdBy as string,
          team: team as string,
          dateStart: dateStart as string,
          dateEnd: dateEnd as string
        }
      );

      // 获取所有用户（用于关联业务员信息）
      const users = await storage.getAllUsers();
      const usersMap = new Map(users.map(u => [u.id, u]));

      // 统计各项指标
      const stats = {
        // 基础指标
        total: customers.length, // 进线（总数）
        
        // 标签类指标
        noReadNoReply: customers.filter(c => c.tags?.some(t => t.label === '不读不回')).length,
        readNoReply: customers.filter(c => c.tags?.some(t => t.label === '已读不回')).length,
        joinedGroup: customers.filter(c => c.tags?.some(t => t.label === '进群')).length,
        answeredCall: customers.filter(c => c.tags?.some(t => t.label === '接电话')).length,
        investor: customers.filter(c => c.tags?.some(t => t.label === '股民')).length,
        beginner: customers.filter(c => c.tags?.some(t => t.label === '小白')).length,
        followStock: customers.filter(c => c.tags?.some(t => t.label?.includes('跟票'))).length,
        hotChat: customers.filter(c => 
          c.tags?.some(t => t.label === '热聊') || (c.conversationCount && c.conversationCount >= 3)
        ).length,
        sincere: customers.filter(c => c.tags?.some(t => t.label === '走心')).length,
        openedAccount: customers.filter(c => c.tags?.some(t => t.label === '开户')).length,
        
        // 首冲：有"入金"标签的客户（视为首次充值）
        firstDeposit: customers.filter(c => c.tags?.some(t => t.label === '入金')).length,
        
        // 加金：有"入金"标签的客户（当前与首冲相同，未来可扩展为多次入金记录）
        addedFunds: customers.filter(c => c.tags?.some(t => t.label === '入金')).length,
        
        // 互动指标
        repliedToday: customers.filter(c => {
          if (!c.lastReplyAt) return false;
          const today = new Date().toISOString().split('T')[0];
          const replyDate = c.lastReplyAt.split('T')[0];
          return today === replyDate;
        }).length,
        
        stockTracking: customers.filter(c => c.tags?.some(t => t.label?.includes('持股'))).length,
      };

      // 获取可筛选的选项列表
      const channels = Array.from(new Set(customers.map(c => c.channel).filter(Boolean)));
      const teams = Array.from(new Set(users.map(u => u.team).filter(Boolean)));
      const agents = users.filter(u => u.role === '业务' || u.role === '经理').map(u => ({
        id: u.id,
        name: u.name,
        nickname: u.nickname
      }));

      res.json({ 
        success: true, 
        data: {
          stats,
          customers,
          filterOptions: {
            channels,
            teams,
            agents
          }
        }
      });
    } catch (error) {
      console.error('获取报表数据失败:', error);
      res.status(500).json({ error: "获取报表数据失败" });
    }
  });

  /**
   * 获取固定的汇总报表（3个表格）
   * GET /api/reports/summary-tables
   * Query params: dateStart, dateEnd (可选筛选条件)
   * 
   * 返回3种表格：
   * 1. 日期×渠道交叉表（每天每个渠道的进线数据）
   * 2. 按渠道汇总
   * 3. 按业务员汇总
   */
  app.get("/api/reports/summary-tables", requireAuth, async (req, res) => {
    try {
      const { dateStart, dateEnd } = req.query;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ error: "用户未登录" });
      }

      // 构建筛选条件
      const filters = {
        dateStart: dateStart as string,
        dateEnd: dateEnd as string
      };

      // 获取筛选后的客户数据（自动应用层级权限）
      const customers = await storage.getReportsData(userId, user.role, filters);

      // 获取所有用户（用于关联业务员信息）
      const users = await storage.getAllUsers();
      const usersMap = new Map(users.map(u => [u.id, u]));

      // 1. 生成日期×渠道交叉表
      const dateChannelTable: { [date: string]: { [channel: string]: number } } = {};
      const channels = new Set<string>();
      const dates = new Set<string>();

      customers.forEach(c => {
        const date = c.date || '未知日期';
        const channel = c.channel || '未知渠道';
        
        channels.add(channel);
        dates.add(date);
        
        if (!dateChannelTable[date]) {
          dateChannelTable[date] = {};
        }
        if (!dateChannelTable[date][channel]) {
          dateChannelTable[date][channel] = 0;
        }
        dateChannelTable[date][channel]++;
      });

      // 转换为数组格式，方便前端渲染
      const channelArray = Array.from(channels).sort();
      const dateArray = Array.from(dates).sort().reverse(); // 最新日期在前

      const dateChannelMatrix = dateArray.map(date => ({
        date,
        channels: channelArray.reduce((acc, channel) => {
          acc[channel] = dateChannelTable[date]?.[channel] || 0;
          return acc;
        }, {} as { [channel: string]: number }),
        total: channelArray.reduce((sum, channel) => sum + (dateChannelTable[date]?.[channel] || 0), 0)
      }));

      // 2. 按渠道汇总（计算15个指标）
      const channelSummary = channelArray.map(channel => {
        const channelCustomers = customers.filter(c => (c.channel || '未知渠道') === channel);
        
        return {
          channel,
          total: channelCustomers.length,
          noReadNoReply: channelCustomers.filter(c => c.tags?.some(t => t.label === '不读不回')).length,
          readNoReply: channelCustomers.filter(c => c.tags?.some(t => t.label === '已读不回')).length,
          joinedGroup: channelCustomers.filter(c => c.tags?.some(t => t.label === '进群')).length,
          answeredCall: channelCustomers.filter(c => c.tags?.some(t => t.label === '接电话')).length,
          investor: channelCustomers.filter(c => c.tags?.some(t => t.label === '股民')).length,
          beginner: channelCustomers.filter(c => c.tags?.some(t => t.label === '小白')).length,
          followStock: channelCustomers.filter(c => c.tags?.some(t => t.label?.includes('跟票'))).length,
          hotChat: channelCustomers.filter(c => 
            c.tags?.some(t => t.label === '热聊') || (c.conversationCount && c.conversationCount >= 3)
          ).length,
          sincere: channelCustomers.filter(c => c.tags?.some(t => t.label === '走心')).length,
          openedAccount: channelCustomers.filter(c => c.tags?.some(t => t.label === '开户')).length,
          firstDeposit: channelCustomers.filter(c => c.tags?.some(t => t.label === '入金')).length,
          addedFunds: channelCustomers.filter(c => c.tags?.some(t => t.label === '入金')).length,
          repliedToday: channelCustomers.filter(c => {
            if (!c.lastReplyAt) return false;
            const today = new Date().toISOString().split('T')[0];
            const replyDate = c.lastReplyAt.split('T')[0];
            return today === replyDate;
          }).length,
          stockTracking: channelCustomers.filter(c => c.tags?.some(t => t.label?.includes('持股'))).length,
        };
      });

      // 3. 按业务员汇总（计算15个指标）
      // 获取所有创建了客户的用户ID
      const creatorIds = new Set(customers.map(c => c.createdBy).filter(Boolean));
      const agents = users.filter(u => creatorIds.has(u.id));
      
      // 创建用户ID到用户对象的映射
      const userMap = new Map(users.map(u => [u.id, u]));
      
      // 找出没有对应用户的客户（orphaned customers）
      const orphanedCustomers = customers.filter(c => c.createdBy && !userMap.has(c.createdBy));
      
      const agentSummary = agents.map(agent => {
        const agentCustomers = customers.filter(c => c.createdBy === agent.id);
        
        return {
          agentId: agent.id,
          agentName: agent.name,
          agentNickname: agent.nickname,
          total: agentCustomers.length,
          noReadNoReply: agentCustomers.filter(c => c.tags?.some(t => t.label === '不读不回')).length,
          readNoReply: agentCustomers.filter(c => c.tags?.some(t => t.label === '已读不回')).length,
          joinedGroup: agentCustomers.filter(c => c.tags?.some(t => t.label === '进群')).length,
          answeredCall: agentCustomers.filter(c => c.tags?.some(t => t.label === '接电话')).length,
          investor: agentCustomers.filter(c => c.tags?.some(t => t.label === '股民')).length,
          beginner: agentCustomers.filter(c => c.tags?.some(t => t.label === '小白')).length,
          followStock: agentCustomers.filter(c => c.tags?.some(t => t.label?.includes('跟票'))).length,
          hotChat: agentCustomers.filter(c => 
            c.tags?.some(t => t.label === '热聊') || (c.conversationCount && c.conversationCount >= 3)
          ).length,
          sincere: agentCustomers.filter(c => c.tags?.some(t => t.label === '走心')).length,
          openedAccount: agentCustomers.filter(c => c.tags?.some(t => t.label === '开户')).length,
          firstDeposit: agentCustomers.filter(c => c.tags?.some(t => t.label === '入金')).length,
          addedFunds: agentCustomers.filter(c => c.tags?.some(t => t.label === '入金')).length,
          repliedToday: agentCustomers.filter(c => {
            if (!c.lastReplyAt) return false;
            const today = new Date().toISOString().split('T')[0];
            const replyDate = c.lastReplyAt.split('T')[0];
            return today === replyDate;
          }).length,
          stockTracking: agentCustomers.filter(c => c.tags?.some(t => t.label?.includes('持股'))).length,
        };
      });
      
      // 如果有orphaned customers，添加一个"未知业务员"行
      if (orphanedCustomers.length > 0) {
        agentSummary.push({
          agentId: '__unknown__',
          agentName: '未知业务员',
          agentNickname: '',
          total: orphanedCustomers.length,
          noReadNoReply: orphanedCustomers.filter(c => c.tags?.some(t => t.label === '不读不回')).length,
          readNoReply: orphanedCustomers.filter(c => c.tags?.some(t => t.label === '已读不回')).length,
          joinedGroup: orphanedCustomers.filter(c => c.tags?.some(t => t.label === '进群')).length,
          answeredCall: orphanedCustomers.filter(c => c.tags?.some(t => t.label === '接电话')).length,
          investor: orphanedCustomers.filter(c => c.tags?.some(t => t.label === '股民')).length,
          beginner: orphanedCustomers.filter(c => c.tags?.some(t => t.label === '小白')).length,
          followStock: orphanedCustomers.filter(c => c.tags?.some(t => t.label?.includes('跟票'))).length,
          hotChat: orphanedCustomers.filter(c => 
            c.tags?.some(t => t.label === '热聊') || (c.conversationCount && c.conversationCount >= 3)
          ).length,
          sincere: orphanedCustomers.filter(c => c.tags?.some(t => t.label === '走心')).length,
          openedAccount: orphanedCustomers.filter(c => c.tags?.some(t => t.label === '开户')).length,
          firstDeposit: orphanedCustomers.filter(c => c.tags?.some(t => t.label === '入金')).length,
          addedFunds: orphanedCustomers.filter(c => c.tags?.some(t => t.label === '入金')).length,
          repliedToday: orphanedCustomers.filter(c => {
            if (!c.lastReplyAt) return false;
            const today = new Date().toISOString().split('T')[0];
            const replyDate = c.lastReplyAt.split('T')[0];
            return today === replyDate;
          }).length,
          stockTracking: orphanedCustomers.filter(c => c.tags?.some(t => t.label?.includes('持股'))).length,
        });
      }

      // 4. 按日期汇总（计算15个指标）
      const dateSummary = dateArray.map(date => {
        const dateCustomers = customers.filter(c => (c.date || '未知日期') === date);
        
        return {
          date,
          total: dateCustomers.length,
          noReadNoReply: dateCustomers.filter(c => c.tags?.some(t => t.label === '不读不回')).length,
          readNoReply: dateCustomers.filter(c => c.tags?.some(t => t.label === '已读不回')).length,
          joinedGroup: dateCustomers.filter(c => c.tags?.some(t => t.label === '进群')).length,
          answeredCall: dateCustomers.filter(c => c.tags?.some(t => t.label === '接电话')).length,
          investor: dateCustomers.filter(c => c.tags?.some(t => t.label === '股民')).length,
          beginner: dateCustomers.filter(c => c.tags?.some(t => t.label === '小白')).length,
          followStock: dateCustomers.filter(c => c.tags?.some(t => t.label?.includes('跟票'))).length,
          hotChat: dateCustomers.filter(c => 
            c.tags?.some(t => t.label === '热聊') || (c.conversationCount && c.conversationCount >= 3)
          ).length,
          sincere: dateCustomers.filter(c => c.tags?.some(t => t.label === '走心')).length,
          openedAccount: dateCustomers.filter(c => c.tags?.some(t => t.label === '开户')).length,
          firstDeposit: dateCustomers.filter(c => c.tags?.some(t => t.label === '入金')).length,
          addedFunds: dateCustomers.filter(c => c.tags?.some(t => t.label === '入金')).length,
          repliedToday: dateCustomers.filter(c => {
            if (!c.lastReplyAt) return false;
            const today = new Date().toISOString().split('T')[0];
            const replyDate = c.lastReplyAt.split('T')[0];
            return today === replyDate;
          }).length,
          stockTracking: dateCustomers.filter(c => c.tags?.some(t => t.label?.includes('持股'))).length,
        };
      });

      // 5. 按团队汇总（计算15个指标）
      const teams = new Set<string>();
      customers.forEach(c => {
        if (c.createdBy) {
          const creator = userMap.get(c.createdBy);
          if (creator?.team) {
            teams.add(creator.team);
          }
        }
      });
      
      const teamArray = Array.from(teams).sort();
      const teamSummary = teamArray.map(team => {
        const teamCustomers = customers.filter(c => {
          if (!c.createdBy) return false;
          const creator = userMap.get(c.createdBy);
          return creator?.team === team;
        });
        
        return {
          team,
          total: teamCustomers.length,
          noReadNoReply: teamCustomers.filter(c => c.tags?.some(t => t.label === '不读不回')).length,
          readNoReply: teamCustomers.filter(c => c.tags?.some(t => t.label === '已读不回')).length,
          joinedGroup: teamCustomers.filter(c => c.tags?.some(t => t.label === '进群')).length,
          answeredCall: teamCustomers.filter(c => c.tags?.some(t => t.label === '接电话')).length,
          investor: teamCustomers.filter(c => c.tags?.some(t => t.label === '股民')).length,
          beginner: teamCustomers.filter(c => c.tags?.some(t => t.label === '小白')).length,
          followStock: teamCustomers.filter(c => c.tags?.some(t => t.label?.includes('跟票'))).length,
          hotChat: teamCustomers.filter(c => 
            c.tags?.some(t => t.label === '热聊') || (c.conversationCount && c.conversationCount >= 3)
          ).length,
          sincere: teamCustomers.filter(c => c.tags?.some(t => t.label === '走心')).length,
          openedAccount: teamCustomers.filter(c => c.tags?.some(t => t.label === '开户')).length,
          firstDeposit: teamCustomers.filter(c => c.tags?.some(t => t.label === '入金')).length,
          addedFunds: teamCustomers.filter(c => c.tags?.some(t => t.label === '入金')).length,
          repliedToday: teamCustomers.filter(c => {
            if (!c.lastReplyAt) return false;
            const today = new Date().toISOString().split('T')[0];
            const replyDate = c.lastReplyAt.split('T')[0];
            return today === replyDate;
          }).length,
          stockTracking: teamCustomers.filter(c => c.tags?.some(t => t.label?.includes('持股'))).length,
        };
      });
      
      // 为没有团队的客户添加"未知团队"行
      const customersWithoutTeam = customers.filter(c => {
        if (!c.createdBy) return true;
        const creator = userMap.get(c.createdBy);
        return !creator || !creator.team;
      });
      
      if (customersWithoutTeam.length > 0) {
        teamSummary.push({
          team: '未知团队',
          total: customersWithoutTeam.length,
          noReadNoReply: customersWithoutTeam.filter(c => c.tags?.some(t => t.label === '不读不回')).length,
          readNoReply: customersWithoutTeam.filter(c => c.tags?.some(t => t.label === '已读不回')).length,
          joinedGroup: customersWithoutTeam.filter(c => c.tags?.some(t => t.label === '进群')).length,
          answeredCall: customersWithoutTeam.filter(c => c.tags?.some(t => t.label === '接电话')).length,
          investor: customersWithoutTeam.filter(c => c.tags?.some(t => t.label === '股民')).length,
          beginner: customersWithoutTeam.filter(c => c.tags?.some(t => t.label === '小白')).length,
          followStock: customersWithoutTeam.filter(c => c.tags?.some(t => t.label?.includes('跟票'))).length,
          hotChat: customersWithoutTeam.filter(c => 
            c.tags?.some(t => t.label === '热聊') || (c.conversationCount && c.conversationCount >= 3)
          ).length,
          sincere: customersWithoutTeam.filter(c => c.tags?.some(t => t.label === '走心')).length,
          openedAccount: customersWithoutTeam.filter(c => c.tags?.some(t => t.label === '开户')).length,
          firstDeposit: customersWithoutTeam.filter(c => c.tags?.some(t => t.label === '入金')).length,
          addedFunds: customersWithoutTeam.filter(c => c.tags?.some(t => t.label === '入金')).length,
          repliedToday: customersWithoutTeam.filter(c => {
            if (!c.lastReplyAt) return false;
            const today = new Date().toISOString().split('T')[0];
            const replyDate = c.lastReplyAt.split('T')[0];
            return today === replyDate;
          }).length,
          stockTracking: customersWithoutTeam.filter(c => c.tags?.some(t => t.label?.includes('持股'))).length,
        });
      }

      res.json({ 
        success: true, 
        data: {
          dateChannelMatrix,
          channelSummary,
          agentSummary,
          dateSummary,
          teamSummary,
          meta: {
            channels: channelArray,
            dates: dateArray,
            teams: teamArray
          }
        }
      });
    } catch (error) {
      console.error('获取汇总报表失败:', error);
      res.status(500).json({ error: "获取汇总报表失败" });
    }
  });

  // ============================================
  // 聊天室管理 API 路由
  // ============================================
  
  /**
   * GET /api/chats
   * 获取当前用户的聊天室列表
   */
  app.get("/api/chats", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const chats = await storage.getUserChats(req.session.userId);
      
      // 为每个聊天室获取完整的用户信息
      const chatsWithUsers = await Promise.all(chats.map(async (chat) => {
        const participantsWithUsers = await Promise.all(chat.participants.map(async (p) => {
          const user = await storage.getUser(p.userId);
          return {
            ...p,
            user: user ? {
              id: user.id,
              name: user.name,
              nickname: user.nickname,
              username: user.username,
              position: user.position,
              team: user.team
            } : null
          };
        }));
        
        // 对于私聊，使用对方的名字作为聊天室名称
        let displayName = chat.name;
        if (chat.type === 'direct' && !displayName) {
          const otherParticipant = participantsWithUsers.find(p => p.userId !== req.session.userId);
          if (otherParticipant?.user) {
            displayName = otherParticipant.user.nickname || otherParticipant.user.name;
          }
        }
        
        return {
          ...chat,
          name: displayName,
          participants: participantsWithUsers
        };
      }));
      
      res.json({ success: true, data: chatsWithUsers });
    } catch (error: any) {
      console.error('获取聊天列表失败:', error);
      res.status(500).json({ error: "获取聊天列表失败", details: error.message });
    }
  });
  
  /**
   * POST /api/chats/create
   * 创建群聊
   * Body: { name: string, memberIds: string[] }
   */
  app.post("/api/chats/create", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const { name, memberIds } = req.body;
      
      if (!name || !memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({ error: "请提供群组名称和成员列表" });
      }
      
      // 创建群聊
      const chat = await storage.createChat({
        type: 'group',
        name,
        createdBy: req.session.userId
      });
      
      // 添加创建者为owner
      await storage.addChatParticipant({
        chatId: chat.id,
        userId: req.session.userId,
        role: 'owner'
      });
      
      // 添加其他成员
      for (const memberId of memberIds) {
        if (memberId !== req.session.userId) {
          await storage.addChatParticipant({
            chatId: chat.id,
            userId: memberId,
            role: 'member'
          });
        }
      }
      
      res.json({ success: true, data: chat });
    } catch (error: any) {
      console.error('创建群聊失败:', error);
      res.status(500).json({ error: "创建群聊失败", details: error.message });
    }
  });
  
  /**
   * POST /api/chats/direct
   * 创建或获取私聊
   * Body: { userId: string }
   */
  app.post("/api/chats/direct", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "请提供对方用户ID" });
      }
      
      if (userId === req.session.userId) {
        return res.status(400).json({ error: "不能和自己创建私聊" });
      }
      
      // 获取或创建私聊
      const chat = await storage.getOrCreateDirectChat(req.session.userId, userId);
      
      res.json({ success: true, data: chat });
    } catch (error: any) {
      console.error('创建私聊失败:', error);
      res.status(500).json({ error: "创建私聊失败", details: error.message });
    }
  });
  
  /**
   * POST /api/chats/:chatId/participants
   * 添加成员到群聊
   * Body: { userIds: string[] }
   */
  app.post("/api/chats/:chatId/participants", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const { chatId } = req.params;
      const { userIds } = req.body;
      
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "请提供要添加的用户ID列表" });
      }
      
      // 检查当前用户是否在群里
      const isInChat = await storage.isUserInChat(chatId, req.session.userId);
      if (!isInChat) {
        return res.status(403).json({ error: "您不在此群聊中" });
      }
      
      // 添加成员
      const addedParticipants = [];
      for (const userId of userIds) {
        // 检查用户是否已在群里
        const alreadyInChat = await storage.isUserInChat(chatId, userId);
        if (!alreadyInChat) {
          const participant = await storage.addChatParticipant({
            chatId,
            userId,
            role: 'member'
          });
          addedParticipants.push(participant);
        }
      }
      
      res.json({ success: true, data: addedParticipants });
    } catch (error: any) {
      console.error('添加成员失败:', error);
      res.status(500).json({ error: "添加成员失败", details: error.message });
    }
  });
  
  /**
   * GET /api/search/users
   * 搜索用户
   * Query: keyword
   */
  app.get("/api/search/users", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const keyword = req.query.keyword as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      if (!keyword) {
        return res.status(400).json({ error: "请提供搜索关键词" });
      }
      
      const users = await storage.searchUsers(keyword, limit);
      
      // 不返回密码字段
      const safeUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        nickname: u.nickname,
        position: u.position,
        team: u.team,
        role: u.role
      }));
      
      res.json({ success: true, data: safeUsers });
    } catch (error: any) {
      console.error('搜索用户失败:', error);
      res.status(500).json({ error: "搜索用户失败", details: error.message });
    }
  });
  
  /**
   * GET /api/search/messages
   * 搜索聊天消息
   * Query: keyword
   */
  app.get("/api/search/messages", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const keyword = req.query.keyword as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      if (!keyword) {
        return res.status(400).json({ error: "请提供搜索关键词" });
      }
      
      const messages = await storage.searchChatMessages(keyword, limit);
      
      // 只返回用户有权访问的消息（用户所在的聊天室）
      const userChats = await storage.getUserChats(req.session.userId);
      const userChatIds = userChats.map(c => c.id);
      
      const filteredMessages = messages.filter(m => userChatIds.includes(m.chatId));
      
      res.json({ success: true, data: filteredMessages });
    } catch (error: any) {
      console.error('搜索消息失败:', error);
      res.status(500).json({ error: "搜索消息失败", details: error.message });
    }
  });

  // 获取聊天历史消息
  app.get("/api/chat/messages", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const chatId = req.query.chatId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      if (chatId) {
        // 检查用户是否在该聊天室中
        const isInChat = await storage.isUserInChat(chatId, req.session.userId);
        if (!isInChat) {
          return res.status(403).json({ error: "您不在此聊天室中" });
        }
        
        // 获取聊天室消息
        const messages = await storage.getChatMessagesByChatId(chatId, limit);
        res.json({ success: true, data: messages.reverse() });
      } else {
        // 查询用户所有聊天室的消息
        const userChats = await storage.getUserChats(req.session.userId);
        const userChatIds = userChats.map(c => c.id);
        
        if (userChatIds.length === 0) {
          return res.json({ success: true, data: [] });
        }
        
        // 获取所有聊天室的消息
        const allMessages = await storage.getAllChatMessages(limit);
        const filteredMessages = allMessages.filter(m => userChatIds.includes(m.chatId));
        
        res.json({ success: true, data: filteredMessages.reverse() });
      }
    } catch (error: any) {
      console.error('获取聊天消息失败:', error);
      res.status(500).json({ error: "获取聊天消息失败", details: error.message });
    }
  });

  /**
   * POST /api/chat/messages
   * 发送并保存聊天消息
   * Body: { chatId, content }
   */
  app.post("/api/chat/messages", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const { chatId, content } = req.body;
      
      if (!chatId || !content) {
        return res.status(400).json({ error: "请提供chatId和content" });
      }
      
      // 检查用户是否在该聊天室中
      const isInChat = await storage.isUserInChat(chatId, req.session.userId);
      if (!isInChat) {
        return res.status(403).json({ error: "您不在此聊天室中" });
      }
      
      // 获取发送者信息
      const sender = await storage.getUser(req.session.userId);
      if (!sender) {
        return res.status(401).json({ error: "用户不存在" });
      }
      
      // 保存消息到数据库
      const message = await storage.createChatMessage({
        chatId,
        senderId: req.session.userId,
        senderName: sender.nickname || sender.name,
        content: content.trim()
      });
      
      // 通过WebSocket广播消息
      const wsMessage = {
        type: 'chat',
        chatId,
        messageId: message.id,
        senderId: sender.id,
        senderName: sender.nickname || sender.name,
        content: message.content,
        timestamp: message.timestamp
      };
      
      // 广播给聊天室所有在线用户
      if (wss) {
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            try {
              client.send(JSON.stringify(wsMessage));
            } catch (error) {
              console.error('广播消息失败:', error);
            }
          }
        });
      }
      
      res.json({ success: true, data: message });
    } catch (error: any) {
      console.error('发送消息失败:', error);
      res.status(500).json({ error: "发送消息失败", details: error.message });
    }
  });

  /**
   * PATCH /api/chats/:chatId/read
   * 标记聊天室为已读
   */
  app.patch("/api/chats/:chatId/read", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const { chatId } = req.params;
      
      // 检查用户是否在该聊天室中
      const isInChat = await storage.isUserInChat(chatId, req.session.userId);
      if (!isInChat) {
        return res.status(403).json({ error: "您不在此聊天室中" });
      }
      
      // 标记为已读（更新lastReadAt时间戳）
      await storage.markChatAsRead(chatId, req.session.userId);
      
      res.json({ success: true, message: "已标记为已读" });
    } catch (error: any) {
      console.error('标记已读失败:', error);
      res.status(500).json({ error: "标记已读失败", details: error.message });
    }
  });

  // ============================================
  // 学习资料管理 API
  // ============================================
  
  /**
   * GET /api/learning-materials
   * 获取学习资料列表
   */
  app.get("/api/learning-materials", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const materials = await storage.getAllLearningMaterials();
      res.json({ success: true, data: materials });
    } catch (error: any) {
      console.error('获取学习资料失败:', error);
      res.status(500).json({ error: "获取学习资料失败", details: error.message });
    }
  });
  
  /**
   * POST /api/learning-materials
   * 创建学习资料记录（上传后调用）
   * Body: { title, categoryId, fileUrl, fileType, fileSize }
   */
  app.post("/api/learning-materials", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const { title, categoryId, fileUrl, fileType, fileSize } = req.body;
      
      if (!title || !categoryId || !fileUrl || !fileType || !fileSize) {
        return res.status(400).json({ error: "缺少必填字段" });
      }

      const material = await storage.createLearningMaterial({
        title,
        categoryId,
        fileUrl,
        fileType,
        fileSize,
        uploadedBy: req.session.userId
      });
      
      res.json({ success: true, data: material });
    } catch (error: any) {
      console.error('创建学习资料失败:', error);
      res.status(500).json({ error: "创建学习资料失败", details: error.message });
    }
  });
  
  /**
   * GET /api/learning-materials/:id/preview-url
   * 获取学习资料的临时预览URL（供Office Online使用）
   * 支持对象存储（签名URL）和本地文件（直接URL）
   */
  app.get("/api/learning-materials/:id/preview-url", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const { id } = req.params;
      const materials = await storage.getAllLearningMaterials();
      const material = materials.find(m => m.id === id);
      
      if (!material) {
        return res.status(404).json({ error: "学习资料不存在" });
      }

      // 判断是本地文件还是对象存储
      if (material.fileUrl.startsWith('/uploads/')) {
        // 本地文件：构造完整URL（Nginx会提供静态文件访问）
        const protocol = req.protocol;
        const host = req.get('host');
        const fullUrl = `${protocol}://${host}${material.fileUrl}`;
        
        console.log('📄 本地文件预览URL:', fullUrl);
        res.json({ success: true, previewUrl: fullUrl });
      } else {
        // 对象存储：生成签名URL
        const { signObjectURL } = await import("./objectStorage");
        const url = new URL(material.fileUrl);
        const pathParts = url.pathname.split('/');
        const bucketName = pathParts[1];
        const objectName = pathParts.slice(2).join('/');

        // 生成7天有效期的签名URL
        const signedURL = await signObjectURL({
          bucketName,
          objectName,
          method: 'GET',
          ttlSec: 7 * 24 * 60 * 60 // 7天
        });

        console.log('☁️ 对象存储签名URL已生成');
        res.json({ success: true, previewUrl: signedURL });
      }
    } catch (error: any) {
      console.error('获取预览URL失败:', error);
      res.status(500).json({ error: "获取预览URL失败", details: error.message });
    }
  });

  /**
   * DELETE /api/learning-materials/:id
   * 删除学习资料
   */
  app.delete("/api/learning-materials/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const { id } = req.params;
      await storage.deleteLearningMaterial(id);
      res.json({ success: true, message: "删除成功" });
    } catch (error: any) {
      console.error('删除学习资料失败:', error);
      res.status(500).json({ error: "删除学习资料失败", details: error.message });
    }
  });

  /**
   * GET /api/knowledge-base
   * 获取学习资料知识库摘要（供AI使用）
   * 返回所有学习资料的标题和分类信息
   */
  app.get("/api/knowledge-base", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const materials = await storage.getAllLearningMaterials();
      const categories = await storage.getAllScriptCategories();
      
      // 构建分类ID到名称的映射
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));
      
      // 构建知识库摘要
      const knowledgeBase = materials.map(m => ({
        id: m.id,
        title: m.title,
        category: categoryMap.get(m.categoryId) || '未分类',
        fileType: m.fileType,
        uploadDate: m.uploadDate
      }));

      // 按分类分组
      const byCategory = knowledgeBase.reduce((acc, item) => {
        const category = item.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item.title);
        return acc;
      }, {} as Record<string, string[]>);

      res.json({
        success: true,
        data: {
          totalMaterials: knowledgeBase.length,
          categories: byCategory,
          materials: knowledgeBase
        }
      });
    } catch (error: any) {
      console.error('获取知识库失败:', error);
      res.status(500).json({ error: "获取知识库失败", details: error.message });
    }
  });

  // ============================================
  // 学习资料分类管理 API
  // ============================================
  
  /**
   * GET /api/script-categories
   * 获取所有学习资料分类
   */
  app.get("/api/script-categories", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const categories = await storage.getAllScriptCategories();
      res.json({ success: true, data: categories });
    } catch (error: any) {
      console.error('获取分类列表失败:', error);
      res.status(500).json({ error: "获取分类列表失败" });
    }
  });

  /**
   * POST /api/script-categories
   * 创建新分类
   */
  app.post("/api/script-categories", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const { name, parentId } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "分类名称不能为空" });
      }

      const category = await storage.createScriptCategory({
        name,
        parentId: parentId || null,
        createdBy: req.session.userId
      });
      
      res.json({ success: true, data: category });
    } catch (error: any) {
      console.error('创建分类失败:', error);
      res.status(500).json({ error: "创建分类失败", details: error.message });
    }
  });

  /**
   * PATCH /api/script-categories/:id
   * 更新分类
   */
  app.patch("/api/script-categories/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const { id } = req.params;
      const { name, parentId } = req.body;
      
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (parentId !== undefined) updates.parentId = parentId;

      const category = await storage.updateScriptCategory(id, updates);
      
      if (!category) {
        return res.status(404).json({ error: "分类不存在" });
      }
      
      res.json({ success: true, data: category });
    } catch (error: any) {
      console.error('更新分类失败:', error);
      res.status(500).json({ error: "更新分类失败", details: error.message });
    }
  });

  /**
   * DELETE /api/script-categories/:id
   * 删除分类
   */
  app.delete("/api/script-categories/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const { id } = req.params;
      
      // 检查是否有子分类
      const allCategories = await storage.getAllScriptCategories();
      const hasChildren = allCategories.some(cat => cat.parentId === id);
      
      if (hasChildren) {
        return res.status(400).json({ error: "该分类下还有子分类，无法删除" });
      }
      
      // 检查是否有关联的学习资料
      const materials = await storage.getAllLearningMaterials();
      const hasmat = materials.some(mat => mat.categoryId === id);
      
      if (hasmat) {
        return res.status(400).json({ error: "该分类下还有学习资料，无法删除" });
      }
      
      await storage.deleteScriptCategory(id);
      res.json({ success: true, message: "删除成功" });
    } catch (error: any) {
      console.error('删除分类失败:', error);
      res.status(500).json({ error: "删除分类失败", details: error.message });
    }
  });

  // ============================================
  // Dashboard 统计数据 API
  // ============================================

  /**
   * GET /api/dashboard/stats
   * 获取Dashboard统计数据（今日发送、回应率、转化率、活跃客户）
   */
  app.get("/api/dashboard/stats", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser) {
        return res.status(401).json({ error: "用户不存在" });
      }

      const stats = await storage.getDashboardStats(currentUser.id, currentUser.role);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('获取Dashboard统计数据失败:', error);
      res.status(500).json({ error: "获取统计数据失败" });
    }
  });

  /**
   * GET /api/dashboard/today-tasks
   * 获取今日任务列表（包含客户信息）
   */
  app.get("/api/dashboard/today-tasks", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const todayTasks = await storage.getTodayTasks(req.session.userId);
      res.json({ success: true, data: todayTasks });
    } catch (error: any) {
      console.error('获取今日任务失败:', error);
      res.status(500).json({ error: "获取今日任务失败" });
    }
  });

  // ============================================
  // 反馈投诉建议 API
  // ============================================

  /**
   * GET /api/feedbacks
   * 获取所有反馈列表
   */
  app.get("/api/feedbacks", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const feedbacks = await storage.getAllFeedbacks();
      res.json({ success: true, data: feedbacks });
    } catch (error: any) {
      console.error('获取反馈列表失败:', error);
      res.status(500).json({ error: "获取反馈列表失败" });
    }
  });

  /**
   * POST /api/feedbacks
   * 提交新的反馈
   * Body: { title, content }
   */
  app.post("/api/feedbacks", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser) {
        return res.status(401).json({ error: "用户不存在" });
      }

      const { title, content } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: "标题和内容不能为空" });
      }

      const newFeedback = await storage.createFeedback({
        title,
        content,
        submitterId: currentUser.id,
        submitterName: currentUser.nickname || currentUser.name,
        isResolved: 0,
      });

      res.json({ success: true, data: newFeedback });
    } catch (error: any) {
      console.error('提交反馈失败:', error);
      res.status(500).json({ error: "提交反馈失败" });
    }
  });

  /**
   * PATCH /api/feedbacks/:id/resolve
   * 标记反馈为已处理/未处理（仅总监和主管可用）
   * Body: { isResolved: 0 | 1 }
   */
  app.patch("/api/feedbacks/:id/resolve", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser) {
        return res.status(401).json({ error: "用户不存在" });
      }

      // 权限检查：只有总监和主管可以标记已处理
      if (!['总监', '主管'].includes(currentUser.role)) {
        return res.status(403).json({ error: "只有总监和主管可以处理反馈" });
      }

      const { id } = req.params;
      const { isResolved } = req.body;

      const updates: any = { isResolved };
      if (isResolved === 1) {
        updates.resolvedAt = new Date().toISOString();
        updates.resolvedBy = currentUser.id;
      } else {
        updates.resolvedAt = null;
        updates.resolvedBy = null;
      }

      const updatedFeedback = await storage.updateFeedback(id, updates);

      if (!updatedFeedback) {
        return res.status(404).json({ error: "反馈不存在" });
      }

      res.json({ success: true, data: updatedFeedback });
    } catch (error: any) {
      console.error('更新反馈状态失败:', error);
      res.status(500).json({ error: "更新反馈状态失败" });
    }
  });

  // ============================================
  // 话术（Scripts）API
  // ============================================
  
  // GET /api/scripts - 获取所有话术
  app.get("/api/scripts", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "未登录" });
      }
      
      const scripts = await storage.getAllScripts();
      res.json({ success: true, data: scripts });
    } catch (error: any) {
      console.error('获取话术列表失败:', error);
      res.status(500).json({ error: "获取话术列表失败" });
    }
  });
  
  // GET /api/scripts/search - 搜索话术
  app.get("/api/scripts/search", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "未登录" });
      }
      
      const { keyword } = req.query;
      if (!keyword || typeof keyword !== 'string') {
        return res.status(400).json({ error: "缺少搜索关键词" });
      }
      
      const scripts = await storage.searchScripts(keyword);
      res.json({ success: true, data: scripts });
    } catch (error: any) {
      console.error('搜索话术失败:', error);
      res.status(500).json({ error: "搜索话术失败" });
    }
  });
  
  // GET /api/scripts/:id - 获取单个话术详情
  app.get("/api/scripts/:id", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "未登录" });
      }
      
      const { id } = req.params;
      const script = await storage.getScript(id);
      
      if (!script) {
        return res.status(404).json({ error: "话术不存在" });
      }
      
      res.json({ success: true, data: script });
    } catch (error: any) {
      console.error('获取话术详情失败:', error);
      res.status(500).json({ error: "获取话术详情失败" });
    }
  });
  
  // POST /api/scripts - 创建话术
  app.post("/api/scripts", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "未登录" });
      }
      
      const scriptData = {
        ...req.body,
        createdBy: user.id,
        isAIGenerated: req.body.isAIGenerated || 0
      };
      
      const script = await storage.createScript(scriptData);
      res.json({ success: true, data: script, message: "话术创建成功" });
    } catch (error: any) {
      console.error('创建话术失败:', error);
      res.status(500).json({ error: "创建话术失败", details: error.message });
    }
  });
  
  // PATCH /api/scripts/:id - 更新话术
  app.patch("/api/scripts/:id", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "未登录" });
      }
      
      const { id } = req.params;
      const script = await storage.getScript(id);
      
      if (!script) {
        return res.status(404).json({ error: "话术不存在" });
      }
      
      // 验证权限：只有创建者可以更新
      if (script.createdBy !== user.id) {
        return res.status(403).json({ error: "无权限编辑此话术" });
      }
      
      const updatedScript = await storage.updateScript(id, req.body);
      res.json({ success: true, data: updatedScript, message: "话术更新成功" });
    } catch (error: any) {
      console.error('更新话术失败:', error);
      res.status(500).json({ error: "更新话术失败" });
    }
  });
  
  // DELETE /api/scripts/:id - 删除话术
  app.delete("/api/scripts/:id", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "未登录" });
      }
      
      const { id } = req.params;
      const script = await storage.getScript(id);
      
      if (!script) {
        return res.status(404).json({ error: "话术不存在" });
      }
      
      // 验证权限：只有创建者可以删除
      if (script.createdBy !== user.id) {
        return res.status(403).json({ error: "无权限删除此话术" });
      }
      
      await storage.deleteScript(id);
      res.json({ success: true, message: "话术删除成功" });
    } catch (error: any) {
      console.error('删除话术失败:', error);
      res.status(500).json({ error: "删除话术失败" });
    }
  });
  
  // POST /api/scripts/generate - AI生成话术
  app.post("/api/scripts/generate", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "未登录" });
      }
      
      const { customerId, customerContext } = req.body;
      
      if (!customerId && !customerContext) {
        return res.status(400).json({ error: "需要提供客户ID或客户上下文信息" });
      }
      
      let customer;
      if (customerId) {
        customer = await storage.getCustomer(customerId);
        if (!customer) {
          return res.status(404).json({ error: "客户不存在" });
        }
      }
      
      // 使用AI生成话术
      const aiScript = await generateSalesScript(
        customer || customerContext,
        customer?.stage || customerContext?.stage || '初次接触'
      );
      
      // 生成话术标题
      const title = `${customer?.stage || customerContext?.stage || '初次接触'} - ${customer?.name || customerContext?.name || 'AI生成话术'}`;
      
      // 保存话术
      const scriptData = {
        title,
        content: aiScript,
        categoryId: null,
        stage: customer?.stage || customerContext?.stage || '初次接触',
        tags: customer?.tags || customerContext?.tags || [],
        createdBy: user.id,
        isAIGenerated: 1
      };
      
      const script = await storage.createScript(scriptData);
      
      res.json({ 
        success: true, 
        data: script, 
        message: "AI话术生成成功" 
      });
    } catch (error: any) {
      console.error('AI生成话术失败:', error);
      res.status(500).json({ error: "AI生成话术失败", details: error.message });
    }
  });

  // ============================================
  // 对象存储 API（Reference: blueprint:javascript_object_storage）
  // ============================================
  
  /**
   * POST /api/objects/upload
   * 获取文件上传的预签名URL（学习资料使用公开上传）
   * 支持Replit对象存储和生产环境本地存储
   */
  app.post("/api/objects/upload", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const { contentType } = req.body;
      
      // 检查是否在Replit环境（有对象存储环境变量）
      const hasObjectStorage = !!process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      
      if (hasObjectStorage) {
        // Replit环境：使用对象存储
        console.log("📦 使用Replit对象存储");
        const { ObjectStorageService } = await import("./objectStorage");
        const objectStorageService = new ObjectStorageService();
        const uploadURL = await objectStorageService.getPublicUploadURL();
        res.json({ uploadURL, storageType: 'object' });
      } else {
        // 生产环境：使用本地文件存储
        console.log("💾 使用本地文件存储");
        const { localFileStorage } = await import("./localFileStorage");
        const uploadConfig = await localFileStorage.getPublicUploadURL(contentType || 'application/octet-stream');
        res.json({ 
          uploadURL: uploadConfig,
          storageType: 'local'
        });
      }
    } catch (error: any) {
      console.error('获取上传URL失败:', error);
      res.status(500).json({ error: "获取上传URL失败", details: error.message });
    }
  });

  /**
   * POST /api/objects/local-upload/:fileId
   * 本地文件上传端点（生产环境使用）
   * 安全设计：服务器端验证fileId，不信任客户端路径
   */
  app.post("/api/objects/local-upload/:fileId", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const { fileId } = req.params;
      const contentType = req.headers['content-type'] || 'application/octet-stream';
      
      // 验证fileId格式（UUID）
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(fileId)) {
        return res.status(400).json({ error: "无效的文件ID" });
      }

      const { localFileStorage } = await import("./localFileStorage");
      
      // 获取上传的文件数据（带大小限制）
      const chunks: Buffer[] = [];
      let totalSize = 0;
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      
      req.on('data', (chunk) => {
        totalSize += chunk.length;
        if (totalSize > MAX_FILE_SIZE) {
          req.pause();
          return res.status(413).json({ error: "文件过大，最大100MB" });
        }
        chunks.push(chunk);
      });
      
      req.on('end', async () => {
        try {
          const fileBuffer = Buffer.concat(chunks);
          
          // 服务器端生成安全的文件路径（不信任客户端）
          const publicUrl = await localFileStorage.saveUploadedFileById(
            fileId,
            fileBuffer,
            contentType
          );
          
          console.log("✅ 本地文件上传成功:", publicUrl);
          res.json({ success: true, publicUrl });
        } catch (error: any) {
          console.error("❌ 保存文件失败:", error);
          res.status(500).json({ error: "保存文件失败", details: error.message });
        }
      });
      
      req.on('error', (error) => {
        console.error("❌ 上传请求错误:", error);
        res.status(500).json({ error: "上传失败" });
      });
    } catch (error: any) {
      console.error('本地上传失败:', error);
      res.status(500).json({ error: "本地上传失败", details: error.message });
    }
  });
  
  /**
   * GET /objects/:objectPath
   * 下载受保护的文件（公开访问 - 学习资料）
   */
  app.get("/objects/:objectPath(*)", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const { ObjectStorageService, ObjectNotFoundError } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error: any) {
      console.error('下载文件失败:', error);
      if (error.name === 'ObjectNotFoundError') {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // ============================================
  // WebSocket 团队群聊服务器
  // ============================================

  // 保护/ws路径不被静态文件服务拦截
  app.get('/ws', (req, res) => {
    // 如果请求头没有Upgrade字段，说明不是WebSocket升级请求
    if (!req.headers.upgrade || req.headers.upgrade.toLowerCase() !== 'websocket') {
      return res.status(426).send('Upgrade Required - This endpoint is for WebSocket connections only');
    }
    // WebSocket升级请求会被ws库处理，这里不需要做任何事
    // 这个路由只是防止静态文件服务器返回index.html
  });

  const httpServer = createServer(app);

  // 创建WebSocket服务器在/ws路径，避免与Vite HMR冲突
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // 存储所有连接的客户端及其用户信息
  const clients = new Map<WebSocket, { userId: string; username: string; nickname: string }>();

  wss.on('connection', (ws: WebSocket) => {
    console.log('新的WebSocket连接');

    ws.on('message', async (data: string) => {
      try {
        const message = JSON.parse(data.toString());

        // 处理用户身份验证
        if (message.type === 'auth') {
          clients.set(ws, {
            userId: message.userId,
            username: message.username,
            nickname: message.nickname
          });
          
          // 发送在线用户列表给新用户
          const onlineUsers = Array.from(clients.values()).map(user => ({
            userId: user.userId,
            username: user.username,
            nickname: user.nickname
          }));
          
          ws.send(JSON.stringify({
            type: 'online_users',
            users: onlineUsers
          }));

          // 广播新用户上线
          broadcast({
            type: 'user_joined',
            user: clients.get(ws)
          }, ws);

          console.log(`用户 ${message.nickname} 已连接`);
          return;
        }

        // 处理聊天消息
        if (message.type === 'chat') {
          const sender = clients.get(ws);
          if (!sender) {
            return;
          }

          const timestamp = new Date().toISOString();
          const chatId = message.chatId || '1'; // 默认聊天室ID为'1'（销售团队）

          // 检查发送者是否在聊天室中
          try {
            const isInChat = await storage.isUserInChat(chatId, sender.userId);
            if (!isInChat) {
              ws.send(JSON.stringify({
                type: 'error',
                message: '您不在此聊天室中'
              }));
              return;
            }
          } catch (error) {
            console.error('检查聊天室成员失败:', error);
            return;
          }

          // 保存消息到数据库（包含chatId）
          try {
            await storage.createChatMessage({
              chatId,
              senderId: sender.userId,
              senderName: sender.nickname,
              content: message.content,
            });
          } catch (error) {
            console.error('保存聊天消息失败:', error);
          }

          // 获取聊天室所有成员
          const participants = await storage.getChatParticipants(chatId);
          const participantUserIds = participants.map(p => p.userId);

          // 只广播给聊天室成员
          broadcastToParticipants(participantUserIds, {
            type: 'chat',
            chatId,
            messageId: message.messageId,
            sender: sender.nickname,
            senderId: sender.userId,
            content: message.content,
            timestamp
          });

          console.log(`消息从 ${sender.nickname} 到聊天室 ${chatId}: ${message.content}`);
        }
      } catch (error) {
        console.error('WebSocket消息处理错误:', error);
      }
    });

    ws.on('close', () => {
      const user = clients.get(ws);
      if (user) {
        console.log(`用户 ${user.nickname} 断开连接`);
        
        // 广播用户离线
        broadcast({
          type: 'user_left',
          user
        }, ws);

        clients.delete(ws);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket错误:', error);
    });
  });

  // 广播消息给所有客户端（除了发送者）
  function broadcast(message: any, sender?: WebSocket) {
    const data = JSON.stringify(message);
    clients.forEach((user, client) => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  // 广播消息给所有客户端（包括发送者）
  function broadcastToAll(message: any) {
    const data = JSON.stringify(message);
    clients.forEach((user, client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
  
  // 广播消息给指定的用户列表（按userId过滤）
  function broadcastToParticipants(userIds: string[], message: any) {
    const data = JSON.stringify(message);
    clients.forEach((user, client) => {
      if (userIds.includes(user.userId) && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  console.log('WebSocket服务器已启动在路径 /ws');

  return httpServer;
}
