import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(), // 真实姓名
  nickname: text("nickname"), // 花名
  role: text("role").notNull().default("业务"), // 角色：主管、总监、经理、业务、后勤
  position: text("position"), // 职位
  team: text("team"), // 团队
  supervisorId: varchar("supervisor_id"), // 上级ID
  phone: integer("phone").default(0), // 手机数量
  computer: integer("computer").default(0), // 电脑数量
  charger: integer("charger").default(0), // 充电器数量
  dormitory: text("dormitory"), // 宿舍
  joinDate: text("join_date"), // 入职日期
  wave: text("wave"), // 波数
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"), // 姓名（可选）
  phone: text("phone").notNull(), // 电话后四位（必填，4位数字）
  wechat: text("wechat"), // 微信
  channel: text("channel"), // 渠道
  date: text("date"), // 日期
  assistant: text("assistant"), // 接粉助理
  group: text("group"), // 群
  age: text("age"), // 年龄
  location: text("location"), // 地址
  stockAge: text("stock_age"), // 股龄
  profitLoss: text("profit_loss"), // 盈亏
  stockSelection: text("stock_selection"), // 选股方式
  tradingHabit: text("trading_habit"), // 操作习惯
  income: text("income"), // 工作收入
  family: text("family"), // 家庭情况
  occupation: text("occupation"), // 职业
  hobbies: text("hobbies"), // 兴趣爱好
  groupPurpose: text("group_purpose"), // 进群目的
  other: text("other"), // 其他
  stage: text("stage").default("初次接触"), // 阶段
  lastContact: text("last_contact"), // 最后联系时间
  tags: jsonb("tags").$type<Array<{label: string; type: string}>>(), // 标签数组（结构化对象）
  createdBy: varchar("created_by"), // 创建者（业务员）ID
  aiAnalysis: text("ai_analysis"), // AI分析结果
  recommendedScript: text("recommended_script"), // AI生成的推荐话术
  
  // 国际化字段
  language: text("language"), // 语言（中文、英语、日语等）
  country: text("country"), // 国家（现在所在的国家）
  
  // 互动数据字段
  lastReplyAt: text("last_reply_at"), // 客户最后回复时间
  conversationCount: integer("conversation_count").default(0), // 对话次数（我们发送的消息数）
  replyCount: integer("reply_count").default(0), // 回复次数（客户回复的消息数）
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
}).extend({
  phone: z.string()
    .min(4, "手机后四位必须是4位数字")
    .max(4, "手机后四位必须是4位数字")
    .regex(/^\d{4}$/, "手机后四位必须是4位数字")
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(), // 关联的客户ID
  title: text("title").notNull(), // 任务标题
  description: text("description"), // 任务描述
  guidanceSteps: jsonb("guidance_steps").$type<string[]>(), // 完成任务的详细步骤
  script: text("script"), // 推荐使用的话术
  status: text("status").notNull().default("pending"), // 任务状态：active、pending、completed
  assignedAgentId: varchar("assigned_agent_id"), // 分配的业务员ID
  createdBy: varchar("created_by"), // 创建者ID (可以是AI或用户)
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`), // 创建时间
  dueAt: text("due_at"), // 截止时间
  completedAt: text("completed_at"), // 完成时间
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull(), // 聊天室ID（用于隔离不同对话）
  senderId: varchar("sender_id").notNull(), // 发送者用户ID
  senderName: text("sender_name").notNull(), // 发送者昵称
  content: text("content").notNull(), // 消息内容
  timestamp: text("timestamp").notNull().default(sql`CURRENT_TIMESTAMP`), // 时间戳
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// 学习资料表
export const learningMaterials = pgTable("learning_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(), // 文件标题
  categoryId: text("category_id").notNull(), // 分类ID
  fileType: text("file_type").notNull(), // 文件类型
  fileSize: integer("file_size").notNull(), // 文件大小（字节）
  fileUrl: text("file_url").notNull(), // 文件URL（存储路径）
  uploadDate: text("upload_date").notNull().default(sql`CURRENT_TIMESTAMP`), // 上传日期
  uploadedBy: varchar("uploaded_by"), // 上传者ID
});

export const insertLearningMaterialSchema = createInsertSchema(learningMaterials).omit({
  id: true,
  uploadDate: true,
});

export type InsertLearningMaterial = z.infer<typeof insertLearningMaterialSchema>;
export type LearningMaterial = typeof learningMaterials.$inferSelect;
