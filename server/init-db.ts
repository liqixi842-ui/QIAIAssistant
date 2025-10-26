import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function initDatabase() {
  try {
    // 检查主管账号是否已存在
    const existing = await db.select().from(users).where(eq(users.username, "qixi")).limit(1);
    
    if (existing.length > 0) {
      console.log("✅ 主管账号已存在");
      return;
    }

    // 创建主管账号（qixi/hu626388, 花名:七喜）
    await db.insert(users).values({
      username: "qixi",
      password: "hu626388", // 注意：实际生产应该加密
      name: "七喜",
      nickname: "七喜",
      role: "主管",
      position: "主管",
      team: "管理层",
      supervisorId: null,
      phone: 0,
      computer: 0,
      charger: 0,
      dormitory: null,
      joinDate: null,
      wave: null,
    });

    console.log("✅ 主管账号创建成功: qixi/hu626388");
  } catch (error) {
    console.error("❌ 数据库初始化失败:", error);
    throw error;
  }
}

initDatabase();
