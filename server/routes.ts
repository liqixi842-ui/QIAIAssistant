import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertCustomerSchema, insertTaskSchema } from "@shared/schema";
import { requireAuth, getCurrentUser } from "./middleware/auth";
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

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ============================================
  // 临时部署下载端点（部署完成后删除）
  // ============================================
  
  app.get("/deploy/routes-fixed", async (req, res) => {
    const token = req.query.token;
    if (token !== "deploy2025") {
      return res.status(403).send("Forbidden");
    }
    
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(import.meta.dirname, 'routes.ts');
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="routes.ts"');
    res.sendFile(filePath);
  });

  app.get("/deploy/chat-page", async (req, res) => {
    const token = req.query.token;
    if (token !== "deploy2025") {
      return res.status(403).send("Forbidden");
    }
    
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(import.meta.dirname, '..', 'client', 'src', 'pages', 'ChatPage.tsx');
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="ChatPage.tsx"');
    res.sendFile(filePath);
  });

  app.get("/debug/users", async (req, res) => {
    const token = req.query.token;
    if (token !== "debug2025") {
      return res.status(403).send("Forbidden");
    }
    
    try {
      const allUsers = await storage.getAllUsers();
      const userInfo = allUsers.map(u => ({
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

  // ============================================
  // 认证 API 路由
  // ============================================

  /**
   * 用户注册
   * POST /api/auth/register
   */
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, name, nickname, role, supervisorId } = req.body;

      // 验证必填字段
      if (!username || !password || !name || !role) {
        return res.status(400).json({ error: "缺少必填字段" });
      }

      // 禁止注册主管角色
      if (role === "主管") {
        return res.status(403).json({ error: "主管账号不可注册" });
      }

      // 检查用户名是否已存在
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: "用户名已存在" });
      }

      // 强制总监的上级ID为7（主管）
      let finalSupervisorId = supervisorId;
      if (role === "总监") {
        finalSupervisorId = "7";
      } else {
        // 其他角色必须提供上级ID
        if (!supervisorId) {
          return res.status(400).json({ error: "请填写上级ID" });
        }
        finalSupervisorId = supervisorId;
      }

      // 创建用户
      const user = await storage.createUser({
        username,
        password, // 注意：实际生产环境应使用bcrypt等加密
        name,
        nickname,
        role,
        supervisorId: finalSupervisorId,
      });

      res.json({ 
        success: true,
        message: "注册成功",
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      console.error('注册失败:', error);
      res.status(500).json({ error: "注册失败" });
    }
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
      req.session.save((err) => {
        if (err) {
          console.error('❌ Session保存失败:', err);
          return res.status(500).json({ error: "登录失败，请重试" });
        }

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
      res.status(500).json({ error: "登录失败" });
    }
  });

  /**
   * 获取所有业务人员列表（用于筛选）
   * GET /api/users
   */
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // 返回用户列表（不包含密码）
      const userList = users.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        nickname: user.nickname,
        role: user.role,
        supervisorId: user.supervisorId
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

      const customer = await storage.updateCustomer(id, validation.data);
      
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
      const { channel, createdBy, team, dateStart, dateEnd } = req.query;

      // 获取筛选后的客户数据
      const customers = await storage.getReportsData({
        channel: channel as string,
        createdBy: createdBy as string,
        team: team as string,
        dateStart: dateStart as string,
        dateEnd: dateEnd as string
      });

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

      // 获取筛选后的客户数据
      const customers = await storage.getReportsData({
        dateStart: dateStart as string,
        dateEnd: dateEnd as string
      });

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

  // 获取聊天历史消息
  app.get("/api/chat/messages", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "未登录" });
    }

    try {
      const chatId = req.query.chatId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      let messages;
      if (chatId) {
        // 按聊天室ID查询
        messages = await storage.getChatMessagesByChatId(chatId, limit);
      } else {
        // 查询所有消息（向后兼容）
        messages = await storage.getAllChatMessages(limit);
      }
      
      // 反转顺序，最新的在最后
      res.json({ success: true, data: messages.reverse() });
    } catch (error: any) {
      console.error('获取聊天消息失败:', error);
      res.status(500).json({ error: "获取聊天消息失败", details: error.message });
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

          // 广播消息给所有客户端（包括发送者，并包含chatId用于前端过滤）
          broadcastToAll({
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

  console.log('WebSocket服务器已启动在路径 /ws');

  return httpServer;
}
