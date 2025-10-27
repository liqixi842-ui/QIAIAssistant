import { type User, type InsertUser, type Customer, type InsertCustomer, type Task, type InsertTask, type ChatMessage, type InsertChatMessage, type Chat, type InsertChat, type ChatParticipant, type InsertChatParticipant, type LearningMaterial, type InsertLearningMaterial, type AuditLog, type InsertAuditLog, users, customers, tasks, chatMessages, chats, chatParticipants, learningMaterials, auditLogs } from "@shared/schema";
import { db } from "./db";
import { eq, inArray, or, sql, desc, and, like, ilike } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
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
  getReportsData(filters: {
    channel?: string;
    createdBy?: string;
    team?: string;
    dateStart?: string;
    dateEnd?: string;
  }): Promise<Customer[]>;
  
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
  
  // Audit log methods
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { operatorId?: string; targetUserId?: string; action?: string; limit?: number }): Promise<AuditLog[]>;
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
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

  async getReportsData(filters: {
    channel?: string;
    createdBy?: string;
    team?: string;
    dateStart?: string;
    dateEnd?: string;
  }): Promise<Customer[]> {
    let query = db.select().from(customers);
    const conditions = [];

    // 筛选条件：进线渠道
    if (filters.channel && filters.channel !== '全部') {
      conditions.push(eq(customers.channel, filters.channel));
    }

    // 筛选条件：业务（创建者）
    if (filters.createdBy && filters.createdBy !== '全部') {
      conditions.push(eq(customers.createdBy, filters.createdBy));
    }

    // 筛选条件：团队（需要通过createdBy关联users表查询）
    if (filters.team && filters.team !== '全部') {
      // 先找到该团队的所有用户
      const teamUsers = await db.select().from(users).where(eq(users.team, filters.team));
      const teamUserIds = teamUsers.map(u => u.id);
      if (teamUserIds.length > 0) {
        conditions.push(inArray(customers.createdBy, teamUserIds));
      } else {
        // 如果团队没有用户，返回空数组
        return [];
      }
    }

    // 筛选条件：日期范围
    if (filters.dateStart) {
      conditions.push(sql`${customers.date} >= ${filters.dateStart}`);
    }
    if (filters.dateEnd) {
      conditions.push(sql`${customers.date} <= ${filters.dateEnd}`);
    }

    // 应用所有筛选条件
    if (conditions.length > 0) {
      return await query.where(sql`${conditions.reduce((acc, condition, i) => 
        i === 0 ? condition : sql`${acc} AND ${condition}`
      )}`);
    }

    return await query;
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
      
      return {
        ...chat,
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
  async searchUsers(keyword: string, limit: number = 20): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(or(
        ilike(users.name, `%${keyword}%`),
        ilike(users.nickname, `%${keyword}%`),
        ilike(users.username, `%${keyword}%`)
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
}

export const storage = new PostgresStorage();
