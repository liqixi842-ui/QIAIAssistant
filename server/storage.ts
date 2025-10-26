import { type User, type InsertUser, type Customer, type InsertCustomer, type Task, type InsertTask, type ChatMessage, type InsertChatMessage, users, customers, tasks, chatMessages } from "@shared/schema";
import { db } from "./db";
import { eq, inArray, or, sql, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
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
}

export const storage = new PostgresStorage();
