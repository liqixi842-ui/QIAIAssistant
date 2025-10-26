/**
 * 清理测试数据脚本
 * 删除所有测试数据，只保留主管账号（qixi）
 * 
 * 使用方法：
 * npm run tsx server/clean-test-data.ts
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { users, customers } from '../shared/schema';
import { eq, not } from 'drizzle-orm';

// 配置WebSocket（Neon需要）
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function cleanTestData() {
  console.log('🧹 开始清理测试数据...\n');

  try {
    // 1. 删除所有客户数据
    console.log('📋 删除所有客户数据...');
    const deletedCustomers = await db.delete(customers);
    console.log(`✅ 已删除所有客户数据\n`);

    // 2. 删除所有测试用户（保留主管账号qixi）
    console.log('👥 删除测试用户（保留主管账号qixi）...');
    const deletedUsers = await db.delete(users)
      .where(not(eq(users.username, 'qixi')));
    console.log(`✅ 已删除测试用户（保留qixi账号）\n`);

    // 3. 验证主管账号是否存在
    console.log('🔍 验证主管账号...');
    const supervisor = await db.select().from(users).where(eq(users.username, 'qixi'));
    
    if (supervisor.length === 0) {
      console.error('❌ 错误：主管账号qixi不存在！');
      console.log('\n请先创建主管账号：');
      console.log('INSERT INTO users (username, password, name, role) VALUES (\'qixi\', \'hashed_password\', \'七夕\', \'主管\');');
      process.exit(1);
    }

    console.log('✅ 主管账号验证通过:');
    console.log(`   用户名: ${supervisor[0].username}`);
    console.log(`   姓名: ${supervisor[0].name}`);
    console.log(`   角色: ${supervisor[0].role}`);
    console.log(`   ID: ${supervisor[0].id}\n`);

    // 4. 显示清理结果
    console.log('📊 清理结果汇总:');
    console.log('   ✅ 客户数据: 已全部删除');
    console.log('   ✅ 测试用户: 已全部删除');
    console.log('   ✅ 主管账号: 已保留（qixi）');
    
    console.log('\n🎉 测试数据清理完成！');
    console.log('\n💡 提示：');
    console.log('   - 话术库和学习资料是前端mock数据，不在数据库中');
    console.log('   - 如需清理话术库分类，请在生产环境中手动管理');
    console.log('   - 系统已准备好交付使用\n');

  } catch (error) {
    console.error('❌ 清理失败:', error);
    process.exit(1);
  }
}

// 执行清理
cleanTestData();
