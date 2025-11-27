import { type User, type InsertUser, type Customer, type InsertCustomer, type Task, type InsertTask, type ChatMessage, type InsertChatMessage, type Chat, type InsertChat, type ChatParticipant, type InsertChatParticipant, type LearningMaterial, type InsertLearningMaterial, type ScriptCategory, type InsertScriptCategory, type AuditLog, type InsertAuditLog, type Feedback, type InsertFeedback, type Script, type InsertScript, type AiFeedback, type InsertAiFeedback, users, customers, tasks, chatMessages, chats, chatParticipants, learningMaterials, scriptCategories, auditLogs, feedbacks, scripts, aiFeedbacks } from "@shared/schema";
import { db } from "./db";
import { eq, inArray, or, sql, desc, and, like, ilike } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Customer methods
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  getAllCustomers(): Promise<Customer[]>;
  getCustomersByUser(userId: string, userRole: string): Promise<Customer[]>;
  
  // Task methods
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  getAllTasks(): Promise<Task[]>;
  getTasksByUser(userId: string): Promise<Task[]>;
  
  // Reports methods
  getReportsData(
    userId: string,
    userRole: string,
    filters: {
      channel?: string;
      createdBy?: string;
      team?: string;
      dateStart?: string;
      dateEnd?: string;
    }
  ): Promise<Customer[]>;
  
  // Chat message methods
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getAllChatMessages(limit?: number): Promise<ChatMessage[]>;
  getChatMessagesByChatId(chatId: string, limit?: number): Promise<ChatMessage[]>;
  searchChatMessages(keyword: string, limit?: number): Promise<ChatMessage[]>;
  
  // Chat room methods
  getChat(id: string): Promise<Chat | undefined>;
  createChat(chat: InsertChat): Promise<Chat>;
  getUserChats(userId: string): Promise<Array<Chat & { participants: ChatParticipant[]; lastMessage?: ChatMessage; unreadCount: number }>>;
  getOrCreateDirectChat(userId1: string, userId2: string): Promise<Chat>;
  
  // Chat participant methods
  addChatParticipant(participant: InsertChatParticipant): Promise<ChatParticipant>;
  removeChatParticipant(chatId: string, userId: string): Promise<boolean>;
  getChatParticipants(chatId: string): Promise<ChatParticipant[]>;
  isUserInChat(chatId: string, userId: string): Promise<boolean>;
  
  // User search methods
  searchUsers(keyword: string, limit?: number): Promise<User[]>;
  
  // Learning material methods
  getLearningMaterial(id: string): Promise<LearningMaterial | undefined>;
  createLearningMaterial(material: InsertLearningMaterial): Promise<LearningMaterial>;
  deleteLearningMaterial(id: string): Promise<boolean>;
  getAllLearningMaterials(): Promise<LearningMaterial[]>;
  
  // Script category methods
  getScriptCategory(id: string): Promise<ScriptCategory | undefined>;
  createScriptCategory(category: InsertScriptCategory): Promise<ScriptCategory>;
  updateScriptCategory(id: string, updates: Partial<InsertScriptCategory>): Promise<ScriptCategory | undefined>;
  deleteScriptCategory(id: string): Promise<boolean>;
  getAllScriptCategories(): Promise<ScriptCategory[]>;
  
  // Script methods
  getScript(id: string): Promise<Script | undefined>;
  createScript(script: InsertScript): Promise<Script>;
  updateScript(id: string, updates: Partial<InsertScript>): Promise<Script | undefined>;
  deleteScript(id: string): Promise<boolean>;
  getAllScripts(): Promise<Script[]>;
  getScriptsByUser(userId: string): Promise<Script[]>;
  searchScripts(keyword: string, userId?: string): Promise<Script[]>;
  
  // Audit log methods
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  
  // Feedback methods
  getFeedback(id: string): Promise<Feedback | undefined>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  updateFeedback(id: string, updates: Partial<InsertFeedback>): Promise<Feedback | undefined>;
  getAllFeedbacks(): Promise<Feedback[]>;
  getAuditLogs(filters?: { operatorId?: string; targetUserId?: string; action?: string; limit?: number }): Promise<AuditLog[]>;
  
  // Dashboard methods
  getDashboardStats(userId: string, userRole: string): Promise<{
    todaySends: number;
    todaySendsChange: number;
    responseRate: number;
    responseRateChange: number;
    conversionRate: number;
    conversionRateChange: number;
    activeCustomers: number;
    activeCustomersChange: number;
  }>;
  getTodayTasks(userId: string): Promise<Array<Task & { customer?: Customer }>>;
  
  // AI Feedback methods
  createAiFeedback(feedback: InsertAiFeedback): Promise<AiFeedback>;
  getAiFeedbacks(filters?: { type?: string; targetId?: string; createdBy?: string; limit?: number }): Promise<AiFeedback[]>;
  getAiFeedbackStats(type?: string): Promise<{ avgRating: number; totalCount: number; ratingDistribution: Record<number, number> }>;
}

export class PostgresStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const updateData: any = {};
    if (updates.supervisorId !== undefined) updateData.supervisorId = updates.supervisorId;
    if (updates.nickname !== undefined) updateData.nickname = updates.nickname;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.position !== undefined) updateData.position = updates.position;
    if (updates.team !== undefined) updateData.team = updates.team;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.computer !== undefined) updateData.computer = updates.computer;
    if (updates.charger !== undefined) updateData.charger = updates.charger;
    if (updates.dormitory !== undefined) updateData.dormitory = updates.dormitory;
    if (updates.joinDate !== undefined) updateData.joinDate = updates.joinDate;
    if (updates.wave !== undefined) updateData.wave = updates.wave;
    if (updates.password !== undefined) updateData.password = updates.password;

    if (Object.keys(updateData).length === 0) {
      return await this.getUser(id);
    }

    const result = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getAllUsers(): Promise<User[]> {
    // 按ID排序，确保顺序稳定
    return await db.select().from(users).orderBy(users.id);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    return result[0];
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const now = new Date().toISOString();
    const result = await db.insert(customers).values({
      ...insertCustomer,
      stage: insertCustomer.stage ?? "初次接触",
      lastContact: insertCustomer.lastContact ?? now,
      tags: insertCustomer.tags as any,
    } as any).returning();
    return result[0];
  }

  async updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.wechat !== undefined) updateData.wechat = updates.wechat;
    if (updates.channel !== undefined) updateData.channel = updates.channel;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.assistant !== undefined) updateData.assistant = updates.assistant;
    if (updates.group !== undefined) updateData.group = updates.group;
    if (updates.age !== undefined) updateData.age = updates.age;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.stockAge !== undefined) updateData.stockAge = updates.stockAge;
    if (updates.profitLoss !== undefined) updateData.profitLoss = updates.profitLoss;
    if (updates.stockSelection !== undefined) updateData.stockSelection = updates.stockSelection;
    if (updates.tradingHabit !== undefined) updateData.tradingHabit = updates.tradingHabit;
    if (updates.income !== undefined) updateData.income = updates.income;
    if (updates.family !== undefined) updateData.family = updates.family;
    if (updates.occupation !== undefined) updateData.occupation = updates.occupation;
    if (updates.hobbies !== undefined) updateData.hobbies = updates.hobbies;
    if (updates.groupPurpose !== undefined) updateData.groupPurpose = updates.groupPurpose;
    if (updates.other !== undefined) updateData.other = updates.other;
    if (updates.stage !== undefined) updateData.stage = updates.stage;
    if (updates.lastContact !== undefined) updateData.lastContact = updates.lastContact;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.createdBy !== undefined) updateData.createdBy = updates.createdBy;
    if (updates.aiAnalysis !== undefined) updateData.aiAnalysis = updates.aiAnalysis;
    if (updates.recommendedScript !== undefined) updateData.recommendedScript = updates.recommendedScript;
    if (updates.language !== undefined) updateData.language = updates.language;
    if (updates.country !== undefined) updateData.country = updates.country;
    if (updates.lastReplyAt !== undefined) updateData.lastReplyAt = updates.lastReplyAt;
    if (updates.conversationCount !== undefined) updateData.conversationCount = updates.conversationCount;
    if (updates.replyCount !== undefined) updateData.replyCount = updates.replyCount;
    if (updates.conversations !== undefined) updateData.conversations = updates.conversations;
    
    const result = await db.update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning();
    return result[0];
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id)).returning();
    return result.length > 0;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async getCustomersByUser(userId: string, userRole: string): Promise<Customer[]> {
    // 主管可以看所有客户
    if (userRole === "主管") {
      return await this.getAllCustomers();
    }

    // 业务只能看自己创建的客户
    if (userRole === "业务") {
      return await db.select().from(customers).where(eq(customers.createdBy, userId));
    }

    // 经理可以看自己 + 下属业务的客户
    if (userRole === "经理") {
      // 找到所有上级是当前用户的业务人员
      const subordinates = await db.select().from(users).where(eq(users.supervisorId, userId));
      const subordinateIds = subordinates.map(u => u.id);
      
      // 返回自己和下属创建的客户
      if (subordinateIds.length === 0) {
        return await db.select().from(customers).where(eq(customers.createdBy, userId));
      }
      return await db.select().from(customers).where(
        or(
          eq(customers.createdBy, userId),
          inArray(customers.createdBy, subordinateIds)
        )
      );
    }

    // 总监可以看自己 + 经理 + 经理的下属业务的客户
    if (userRole === "总监") {
      // 找到所有上级是当前用户的经理
      const managers = await db.select().from(users).where(eq(users.supervisorId, userId));
      const managerIds = managers.map(m => m.id);
      
      // 找到这些经理下属的所有业务
      let allSubordinateIds: string[] = [];
      if (managerIds.length > 0) {
        const staff = await db.select().from(users).where(inArray(users.supervisorId, managerIds));
        allSubordinateIds = staff.map(s => s.id);
      }
      
      // 返回自己 + 经理 + 业务创建的客户
      const allCreatorIds = [userId, ...managerIds, ...allSubordinateIds].filter(id => id);
      if (allCreatorIds.length === 0) {
        return [];
      }
      return await db.select().from(customers).where(inArray(customers.createdBy, allCreatorIds));
    }

      // 后勤角色不应该看到任何客户
    return [];
  }

  // 获取用户有权限查看的所有用户ID列表（包括自己和所有下属）
  private async getAuthorizedUserIds(userId: string, userRole: string): Promise<string[]> {
    // 主管可以看所有用户
    if (userRole === "主管") {
      const allUsers = await this.getAllUsers();
      return allUsers.map(u => u.id);
    }

    // 业务只能看自己
    if (userRole === "业务") {
      return [userId];
    }

    // 经理可以看自己 + 直接下属
    if (userRole === "经理") {
      const subordinates = await db.select().from(users).where(eq(users.supervisorId, userId));
      return [userId, ...subordinates.map(u => u.id)];
    }

    // 总监可以看自己 + 经理 + 经理的下属
    if (userRole === "总监") {
      const managers = await db.select().from(users).where(eq(users.supervisorId, userId));
      const managerIds = managers.map(m => m.id);
      
      let allSubordinateIds: string[] = [];
      if (managerIds.length > 0) {
        const staff = await db.select().from(users).where(inArray(users.supervisorId, managerIds));
        allSubordinateIds = staff.map(s => s.id);
      }
      
      return [userId, ...managerIds, ...allSubordinateIds].filter(id => id);
    }

    // 后勤角色
    return [];
  }

  // Task methods
  async getTask(id: string): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return result[0];
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(insertTask as any).returning();
    return result[0];
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const result = await db.update(tasks)
      .set(updates as any)
      .where(eq(tasks.id, id))
      .returning();
    return result[0];
  }

  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async getTasksByUser(userId: string): Promise<Task[]> {
    // 返回分配给该用户或由该用户创建的任务
    return await db.select().from(tasks).where(
      or(
        eq(tasks.assignedAgentId, userId),
        eq(tasks.createdBy, userId)
      )
    );
  }

  async getReportsData(
    userId: string,
    userRole: string,
    filters: {
      channel?: string;
      createdBy?: string;
      team?: string;
      dateStart?: string;
      dateEnd?: string;
    }
  ): Promise<Customer[]> {
    // 首先应用层级权限，获取用户有权限查看的所有客户
    let baseCustomers = await this.getCustomersByUser(userId, userRole);
    
    // 然后应用额外的筛选条件
    let filteredCustomers = baseCustomers;

    // 筛选条件：进线渠道
    if (filters.channel && filters.channel !== '全部') {
      filteredCustomers = filteredCustomers.filter(c => c.channel === filters.channel);
    }

    // 筛选条件：业务（创建者）
    if (filters.createdBy && filters.createdBy !== '全部') {
      filteredCustomers = filteredCustomers.filter(c => c.createdBy === filters.createdBy);
    }

    // 筛选条件：团队（需要通过createdBy关联users表查询）
    if (filters.team && filters.team !== '全部') {
      // 先找到该团队的所有用户
      const teamUsers = await db.select().from(users).where(eq(users.team, filters.team));
      const teamUserIds = teamUsers.map(u => u.id);
      if (teamUserIds.length > 0) {
        filteredCustomers = filteredCustomers.filter(c => c.createdBy && teamUserIds.includes(c.createdBy));
      } else {
        // 如果团队没有用户，返回空数组
        return [];
      }
    }

    // 筛选条件：日期范围
    if (filters.dateStart) {
      filteredCustomers = filteredCustomers.filter(c => c.date && c.date >= filters.dateStart!);
    }
    if (filters.dateEnd) {
      filteredCustomers = filteredCustomers.filter(c => c.date && c.date <= filters.dateEnd!);
    }

    return filteredCustomers;
  }
  
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values(insertMessage).returning();
    return result[0];
  }
  
  async getAllChatMessages(limit: number = 100): Promise<ChatMessage[]> {
    return await db.select()
      .from(chatMessages)
      .orderBy(desc(chatMessages.timestamp))
      .limit(limit);
  }
  
  async getChatMessagesByChatId(chatId: string, limit: number = 100): Promise<ChatMessage[]> {
    return await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.chatId, chatId))
      .orderBy(desc(chatMessages.timestamp))
      .limit(limit);
  }
  
  async searchChatMessages(keyword: string, limit: number = 50): Promise<ChatMessage[]> {
    return await db.select()
      .from(chatMessages)
      .where(ilike(chatMessages.content, `%${keyword}%`))
      .orderBy(desc(chatMessages.timestamp))
      .limit(limit);
  }
  
  // Chat room methods
  async getChat(id: string): Promise<Chat | undefined> {
    const result = await db.select().from(chats).where(eq(chats.id, id)).limit(1);
    return result[0];
  }
  
  async createChat(insertChat: InsertChat): Promise<Chat> {
    const result = await db.insert(chats).values(insertChat).returning();
    return result[0];
  }
  
  async getUserChats(userId: string): Promise<Array<Chat & { participants: ChatParticipant[]; lastMessage?: ChatMessage; unreadCount: number }>> {
    // 获取用户参与的所有聊天室
    const userParticipations = await db.select()
      .from(chatParticipants)
      .where(eq(chatParticipants.userId, userId));
    
    const chatIds = userParticipations.map(p => p.chatId);
    if (chatIds.length === 0) return [];
    
    // 获取聊天室信息
    const chatList = await db.select()
      .from(chats)
      .where(inArray(chats.id, chatIds));
    
    // 为每个聊天室获取成员和最后一条消息
    const result = await Promise.all(chatList.map(async (chat) => {
      const participants = await db.select()
        .from(chatParticipants)
        .where(eq(chatParticipants.chatId, chat.id));
      
      const messages = await db.select()
        .from(chatMessages)
        .where(eq(chatMessages.chatId, chat.id))
        .orderBy(desc(chatMessages.timestamp))
        .limit(1);
      
      const lastMessage = messages[0];
      
      // 计算未读消息数
      const userParticipation = userParticipations.find(p => p.chatId === chat.id);
      const lastReadAt = userParticipation?.lastReadAt;
      
      let unreadCount = 0;
      if (lastReadAt) {
        const unreadMessages = await db.select()
          .from(chatMessages)
          .where(and(
            eq(chatMessages.chatId, chat.id),
            sql`${chatMessages.timestamp} > ${lastReadAt}`
          ));
        unreadCount = unreadMessages.length;
      } else {
        // 如果从未读过，所有消息都是未读
        const allMessages = await db.select()
          .from(chatMessages)
          .where(eq(chatMessages.chatId, chat.id));
        unreadCount = allMessages.length;
      }
      
      // 对于私聊，动态显示对方的名字
      let displayName = chat.name;
      if (chat.type === 'direct') {
        // 找到对方用户
        const otherParticipant = participants.find(p => p.userId !== userId);
        if (otherParticipant) {
          const otherUser = await this.getUser(otherParticipant.userId);
          if (otherUser) {
            displayName = otherUser.nickname || otherUser.name;
          }
        }
      }
      
      return {
        ...chat,
        name: displayName, // 使用动态名称
        participants,
        lastMessage,
        unreadCount
      };
    }));
    
    return result;
  }
  
  async getOrCreateDirectChat(userId1: string, userId2: string): Promise<Chat> {
    // 查找这两个用户之间的私聊
    const user1Chats = await db.select()
      .from(chatParticipants)
      .where(eq(chatParticipants.userId, userId1));
    
    const user2Chats = await db.select()
      .from(chatParticipants)
      .where(eq(chatParticipants.userId, userId2));
    
    // 找出两人共同参与的聊天室
    const commonChatIds = user1Chats
      .filter(p1 => user2Chats.some(p2 => p2.chatId === p1.chatId))
      .map(p => p.chatId);
    
    if (commonChatIds.length > 0) {
      // 检查是否是私聊（direct）
      for (const chatId of commonChatIds) {
        const chat = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
        if (chat[0] && chat[0].type === 'direct') {
          return chat[0];
        }
      }
    }
    
    // 不存在私聊，创建新的
    // 获取对方用户信息以设置聊天室名称
    const otherUser = await this.getUser(userId2);
    const chatName = otherUser ? (otherUser.nickname || otherUser.name) : '未命名';
    
    const newChat = await this.createChat({
      type: 'direct',
      name: chatName,
      createdBy: userId1
    });
    
    // 添加两个成员
    await this.addChatParticipant({
      chatId: newChat.id,
      userId: userId1,
      role: 'owner'
    });
    
    await this.addChatParticipant({
      chatId: newChat.id,
      userId: userId2,
      role: 'member'
    });
    
    return newChat;
  }
  
  // Chat participant methods
  async addChatParticipant(participant: InsertChatParticipant): Promise<ChatParticipant> {
    const result = await db.insert(chatParticipants).values(participant).returning();
    return result[0];
  }
  
  async removeChatParticipant(chatId: string, userId: string): Promise<boolean> {
    const result = await db.delete(chatParticipants)
      .where(and(
        eq(chatParticipants.chatId, chatId),
        eq(chatParticipants.userId, userId)
      ))
      .returning();
    return result.length > 0;
  }
  
  async getChatParticipants(chatId: string): Promise<ChatParticipant[]> {
    return await db.select()
      .from(chatParticipants)
      .where(eq(chatParticipants.chatId, chatId));
  }
  
  async isUserInChat(chatId: string, userId: string): Promise<boolean> {
    const result = await db.select()
      .from(chatParticipants)
      .where(and(
        eq(chatParticipants.chatId, chatId),
        eq(chatParticipants.userId, userId)
      ))
      .limit(1);
    return result.length > 0;
  }
  
  async markChatAsRead(chatId: string, userId: string): Promise<void> {
    await db.update(chatParticipants)
      .set({ lastReadAt: sql`CURRENT_TIMESTAMP` })
      .where(and(
        eq(chatParticipants.chatId, chatId),
        eq(chatParticipants.userId, userId)
      ));
  }
  
  // User search methods
  async searchUsers(keyword: string, limit: number = 50): Promise<User[]> {
    // 如果关键词为空或只是空格，返回所有用户
    if (!keyword || keyword.trim() === '') {
      return await db.select()
        .from(users)
        .orderBy(users.nickname)
        .limit(limit);
    }
    
    // 搜索 name、nickname、username、position、team
    return await db.select()
      .from(users)
      .where(or(
        ilike(users.name, `%${keyword}%`),
        ilike(users.nickname, `%${keyword}%`),
        ilike(users.username, `%${keyword}%`),
        ilike(users.position, `%${keyword}%`),
        ilike(users.team, `%${keyword}%`)
      ))
      .limit(limit);
  }
  
  // Learning material methods
  async getLearningMaterial(id: string): Promise<LearningMaterial | undefined> {
    const result = await db.select().from(learningMaterials).where(eq(learningMaterials.id, id)).limit(1);
    return result[0];
  }
  
  async createLearningMaterial(material: InsertLearningMaterial): Promise<LearningMaterial> {
    const result = await db.insert(learningMaterials).values(material).returning();
    return result[0];
  }
  
  async deleteLearningMaterial(id: string): Promise<boolean> {
    const result = await db.delete(learningMaterials).where(eq(learningMaterials.id, id)).returning();
    return result.length > 0;
  }
  
  async getAllLearningMaterials(): Promise<LearningMaterial[]> {
    return await db.select().from(learningMaterials).orderBy(desc(learningMaterials.uploadDate));
  }
  
  // Script category methods
  async getScriptCategory(id: string): Promise<ScriptCategory | undefined> {
    const result = await db.select().from(scriptCategories).where(eq(scriptCategories.id, id)).limit(1);
    return result[0];
  }
  
  async createScriptCategory(category: InsertScriptCategory): Promise<ScriptCategory> {
    const result = await db.insert(scriptCategories).values(category).returning();
    return result[0];
  }
  
  async updateScriptCategory(id: string, updates: Partial<InsertScriptCategory>): Promise<ScriptCategory | undefined> {
    const result = await db.update(scriptCategories).set(updates).where(eq(scriptCategories.id, id)).returning();
    return result[0];
  }
  
  async deleteScriptCategory(id: string): Promise<boolean> {
    const result = await db.delete(scriptCategories).where(eq(scriptCategories.id, id)).returning();
    return result.length > 0;
  }
  
  async getAllScriptCategories(): Promise<ScriptCategory[]> {
    return await db.select().from(scriptCategories).orderBy(scriptCategories.createdAt);
  }
  
  // Audit log methods
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const result = await db.insert(auditLogs).values(log).returning();
    return result[0];
  }
  
  async getAuditLogs(filters?: { operatorId?: string; targetUserId?: string; action?: string; limit?: number }): Promise<AuditLog[]> {
    const limit = filters?.limit || 100;
    let query = db.select().from(auditLogs);
    
    const conditions = [];
    if (filters?.operatorId) {
      conditions.push(eq(auditLogs.operatorId, filters.operatorId));
    }
    if (filters?.targetUserId) {
      conditions.push(eq(auditLogs.targetUserId, filters.targetUserId));
    }
    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(auditLogs.timestamp)).limit(limit);
  }
  
  // Feedback methods
  async getFeedback(id: string): Promise<Feedback | undefined> {
    const result = await db.select().from(feedbacks).where(eq(feedbacks.id, id)).limit(1);
    return result[0];
  }

  async createFeedback(feedback: InsertFeedback): Promise<Feedback> {
    const result = await db.insert(feedbacks).values(feedback).returning();
    return result[0];
  }

  async updateFeedback(id: string, updates: Partial<InsertFeedback>): Promise<Feedback | undefined> {
    const result = await db.update(feedbacks).set(updates).where(eq(feedbacks.id, id)).returning();
    return result[0];
  }

  async getAllFeedbacks(): Promise<Feedback[]> {
    return await db.select().from(feedbacks).orderBy(desc(feedbacks.submittedAt));
  }
  
  // Dashboard methods
  async getDashboardStats(userId: string, userRole: string): Promise<{
    todaySends: number;
    todaySendsChange: number;
    responseRate: number;
    responseRateChange: number;
    conversionRate: number;
    conversionRateChange: number;
    activeCustomers: number;
    activeCustomersChange: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString();
    
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();
    
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const fourteenDaysAgoStr = fourteenDaysAgo.toISOString();
    
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
    
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString();
    
    // 获取当前用户可见的客户列表（使用层级权限过滤）
    const allCustomers = await this.getCustomersByUser(userId, userRole);
    
    // 获取当前用户有权限查看的用户ID列表（用于任务统计）
    const authorizedUserIds = await this.getAuthorizedUserIds(userId, userRole);
    
    // 今日发送：今天创建的任务数量（只统计授权用户的任务）
    const todayTasks = authorizedUserIds.length > 0
      ? await db.select().from(tasks).where(and(
          inArray(tasks.assignedAgentId, authorizedUserIds.filter(id => id !== null) as string[]),
          sql`${tasks.createdAt} >= ${todayStr}`
        ))
      : [];
    const todaySends = todayTasks.length;
    
    // 昨日发送（用于计算变化百分比）
    const yesterdayTasks = authorizedUserIds.length > 0
      ? await db.select().from(tasks).where(and(
          inArray(tasks.assignedAgentId, authorizedUserIds.filter(id => id !== null) as string[]),
          sql`${tasks.createdAt} >= ${yesterdayStr}`,
          sql`${tasks.createdAt} < ${todayStr}`
        ))
      : [];
    const yesterdaySends = yesterdayTasks.length;
    const todaySendsChange = yesterdaySends > 0 ? ((todaySends - yesterdaySends) / yesterdaySends) * 100 : 0;
    
    // 回应率：有回复记录的客户占比（当前）
    const customersWithReplies = allCustomers.filter(c => (c.replyCount || 0) > 0).length;
    const responseRate = allCustomers.length > 0 ? (customersWithReplies / allCustomers.length) * 100 : 0;
    
    // 回应率变化：对比过去30天活跃客户的回复率
    const recentActiveCustomers = allCustomers.filter(c => {
      if (!c.lastReplyAt) return false;
      const lastReply = new Date(c.lastReplyAt);
      return lastReply >= thirtyDaysAgo;
    });
    const oldActiveCustomers = allCustomers.filter(c => {
      if (!c.lastReplyAt) return false;
      const lastReply = new Date(c.lastReplyAt);
      return lastReply >= sixtyDaysAgo && lastReply < thirtyDaysAgo;
    });
    const recentResponseRate = recentActiveCustomers.length > 0 
      ? (recentActiveCustomers.filter(c => (c.replyCount || 0) > 0).length / recentActiveCustomers.length) * 100 
      : 0;
    const oldResponseRate = oldActiveCustomers.length > 0 
      ? (oldActiveCustomers.filter(c => (c.replyCount || 0) > 0).length / oldActiveCustomers.length) * 100 
      : 0;
    const responseRateChange = oldResponseRate > 0 
      ? ((recentResponseRate - oldResponseRate) / oldResponseRate) * 100 
      : 0;
    
    // 转化率：阶段为非"初次接触"的客户占比（当前）
    const convertedCustomers = allCustomers.filter(c => c.stage && c.stage !== '初次接触').length;
    const conversionRate = allCustomers.length > 0 ? (convertedCustomers / allCustomers.length) * 100 : 0;
    
    // 转化率变化：对比最近30天有联系的客户 vs 30-60天前有联系的客户的转化情况
    const recentContactCustomers = allCustomers.filter(c => {
      if (!c.lastContact) return false;
      const lastContact = new Date(c.lastContact);
      return lastContact >= thirtyDaysAgo;
    });
    const oldContactCustomers = allCustomers.filter(c => {
      if (!c.lastContact) return false;
      const lastContact = new Date(c.lastContact);
      return lastContact >= sixtyDaysAgo && lastContact < thirtyDaysAgo;
    });
    const recentConversionRate = recentContactCustomers.length > 0
      ? (recentContactCustomers.filter(c => c.stage && c.stage !== '初次接触').length / recentContactCustomers.length) * 100
      : 0;
    const oldConversionRate = oldContactCustomers.length > 0
      ? (oldContactCustomers.filter(c => c.stage && c.stage !== '初次接触').length / oldContactCustomers.length) * 100
      : 0;
    const conversionRateChange = oldConversionRate > 0
      ? ((recentConversionRate - oldConversionRate) / oldConversionRate) * 100
      : 0;
    
    // 活跃客户：最近7天有互动的客户数量
    const activeCustomersRecent = allCustomers.filter(c => {
      if (!c.lastReplyAt) return false;
      const lastReply = new Date(c.lastReplyAt);
      return lastReply >= sevenDaysAgo;
    }).length;
    
    // 前7-14天活跃客户（用于计算变化）
    const activeCustomersPrevious = allCustomers.filter(c => {
      if (!c.lastReplyAt) return false;
      const lastReply = new Date(c.lastReplyAt);
      return lastReply >= fourteenDaysAgo && lastReply < sevenDaysAgo;
    }).length;
    
    const activeCustomersChange = activeCustomersPrevious > 0 
      ? ((activeCustomersRecent - activeCustomersPrevious) / activeCustomersPrevious) * 100 
      : 0;
    
    return {
      todaySends,
      todaySendsChange: Number(todaySendsChange.toFixed(1)),
      responseRate: Number(responseRate.toFixed(1)),
      responseRateChange: Number(responseRateChange.toFixed(1)),
      conversionRate: Number(conversionRate.toFixed(1)),
      conversionRateChange: Number(conversionRateChange.toFixed(1)),
      activeCustomers: activeCustomersRecent,
      activeCustomersChange: Number(activeCustomersChange.toFixed(1)),
    };
  }
  
  async getTodayTasks(userId: string): Promise<Array<Task & { customer?: Customer }>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = tomorrow.toISOString();
    
    // 获取今天创建或截止日期为今天的任务（只返回分配给当前用户的任务）
    const todayTasks = await db.select()
      .from(tasks)
      .where(and(
        eq(tasks.assignedAgentId, userId),
        or(
          sql`${tasks.createdAt} >= ${todayStart}`,
          sql`${tasks.dueAt} >= ${todayStart} AND ${tasks.dueAt} < ${tomorrowStart}`
        )
      ))
      .limit(10)
      .orderBy(tasks.status, desc(tasks.createdAt));
    
    // 为每个任务获取关联的客户信息
    const tasksWithCustomers = await Promise.all(
      todayTasks.map(async (task) => {
        const customer = await this.getCustomer(task.customerId);
        return { ...task, customer };
      })
    );
    
    return tasksWithCustomers;
  }
  
  // ============================================
  // Script methods
  // ============================================
  
  async getScript(id: string): Promise<Script | undefined> {
    const result = await db.select().from(scripts).where(eq(scripts.id, id)).limit(1);
    return result[0];
  }
  
  async createScript(script: InsertScript): Promise<Script> {
    const result = await db.insert(scripts).values(script).returning();
    return result[0];
  }
  
  async updateScript(id: string, updates: Partial<InsertScript>): Promise<Script | undefined> {
    const result = await db.update(scripts)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(scripts.id, id))
      .returning();
    return result[0];
  }
  
  async deleteScript(id: string): Promise<boolean> {
    const result = await db.delete(scripts).where(eq(scripts.id, id)).returning();
    return result.length > 0;
  }
  
  async getAllScripts(): Promise<Script[]> {
    return await db.select().from(scripts).orderBy(desc(scripts.createdAt));
  }
  
  async getScriptsByUser(userId: string): Promise<Script[]> {
    return await db.select()
      .from(scripts)
      .where(eq(scripts.createdBy, userId))
      .orderBy(desc(scripts.createdAt));
  }
  
  async searchScripts(keyword: string, userId?: string): Promise<Script[]> {
    const conditions = [
      or(
        ilike(scripts.title, `%${keyword}%`),
        ilike(scripts.content, `%${keyword}%`)
      )
    ];
    
    if (userId) {
      conditions.push(eq(scripts.createdBy, userId));
    }
    
    return await db.select()
      .from(scripts)
      .where(and(...conditions.filter(Boolean)))
      .orderBy(desc(scripts.createdAt))
      .limit(50);
  }
  
  // ============================================
  // AI Feedback methods
  // ============================================
  
  async createAiFeedback(feedback: InsertAiFeedback): Promise<AiFeedback> {
    const result = await db.insert(aiFeedbacks).values(feedback).returning();
    return result[0];
  }
  
  async getAiFeedbacks(filters?: { type?: string; targetId?: string; createdBy?: string; limit?: number }): Promise<AiFeedback[]> {
    const conditions = [];
    
    if (filters?.type) {
      conditions.push(eq(aiFeedbacks.type, filters.type));
    }
    if (filters?.targetId) {
      conditions.push(eq(aiFeedbacks.targetId, filters.targetId));
    }
    if (filters?.createdBy) {
      conditions.push(eq(aiFeedbacks.createdBy, filters.createdBy));
    }
    
    let query = db.select()
      .from(aiFeedbacks)
      .orderBy(desc(aiFeedbacks.createdAt));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    
    return await query;
  }
  
  async getAiFeedbackStats(type?: string): Promise<{ avgRating: number; totalCount: number; ratingDistribution: Record<number, number> }> {
    const conditions = type ? [eq(aiFeedbacks.type, type)] : [];
    
    let query = db.select()
      .from(aiFeedbacks);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const feedbacks = await query;
    
    const totalCount = feedbacks.length;
    const avgRating = totalCount > 0 
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalCount 
      : 0;
    
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedbacks.forEach(f => {
      ratingDistribution[f.rating] = (ratingDistribution[f.rating] || 0) + 1;
    });
    
    return { avgRating, totalCount, ratingDistribution };
  }
}

export const storage = new PostgresStorage();
