/**
 * AI Agents - 5个专业的AI分析代理
 * 每个Agent负责不同的分析任务
 */

import { createAI, AIAdapter } from './adapter';
import { PROMPTS } from './prompts';

// 延迟创建AI实例，避免在没有配置时启动失败
let ai: AIAdapter | null = null;

function getAI(): AIAdapter {
  if (!ai) {
    ai = createAI();
  }
  return ai;
}

/**
 * 1. 客户画像分析 AI
 */
export async function analyzeCustomerProfile(customerData: any) {
  try {
    // 分析对话记录数量和质量
    const conversationCount = customerData.conversations?.length || 0;
    const hasConversations = conversationCount > 0;
    
    // 提取最近的对话样本（最多20条）用于AI分析
    const recentConversations = hasConversations 
      ? customerData.conversations.slice(-20).map((c: any) => ({
          sender: c.sender,
          role: c.role,
          message: c.message.substring(0, 200), // 限制单条消息长度
          timestamp: c.timestamp
        }))
      : [];
    
    const prompt = `请分析以下客户信息：

【客户基本资料】
${JSON.stringify({
  ...customerData,
  conversations: undefined // 移除完整对话记录，避免prompt过长
}, null, 2)}

【对话记录统计】
- 总对话数：${conversationCount}条
- 是否有对话历史：${hasConversations ? '是' : '否'}
${hasConversations ? `- 最近对话样本（最多20条）：\n${JSON.stringify(recentConversations, null, 2)}` : ''}

【重要提示】
1. 如果客户有大量对话记录（>50条），说明互动频繁，粘度高，应该给予积极评价
2. 如果客户状态为"已成交"，说明转化成功，应该重点关注后续维护和复购机会
3. 请根据实际的对话内容和数量来评估粘度，而不是使用通用模板
4. 对话记录越多，说明客户越活跃，成交概率越高

请严格按照JSON格式返回分析结果。`;

    // 使用更高的temperature增加输出多样性
    const messages = [
      { role: 'system' as const, content: PROMPTS.CUSTOMER_PROFILE },
      { role: 'user' as const, content: prompt }
    ];
    const aiResponse = await getAI().chat(messages, { 
      temperature: 0.8,  // 平衡创造性和稳定性
      maxTokens: 3000    // 增加token限制以获取更详细的回复
    });
    const response = aiResponse.content;
    
    console.log('🤖 AI原始响应:', response.substring(0, 500)); // 打印前500字符
    
    // 尝试解析JSON响应
    try {
      const parsed = JSON.parse(response);
      console.log('✅ AI解析后的字段:', Object.keys(parsed));
      console.log('📝 recommendedScript存在?', !!parsed.recommendedScript);
      return parsed;
    } catch {
      // 如果AI没有返回纯JSON，尝试提取JSON部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ AI解析后的字段(提取):', Object.keys(parsed));
        console.log('📝 recommendedScript存在?', !!parsed.recommendedScript);
        return parsed;
      }
      throw new Error('AI返回格式错误');
    }
  } catch (error) {
    console.error('客户画像分析失败:', error);
    throw error;
  }
}

/**
 * 2. 对话情绪分析 AI
 */
export async function analyzeConversationSentiment(conversations: any[]) {
  try {
    const prompt = `请分析以下对话记录：

对话内容：
${JSON.stringify(conversations, null, 2)}

请严格按照JSON格式返回分析结果。`;

    const response = await getAI().ask(prompt, PROMPTS.CONVERSATION_SENTIMENT);
    
    try {
      return JSON.parse(response);
    } catch {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('AI返回格式错误');
    }
  } catch (error) {
    console.error('对话情绪分析失败:', error);
    throw error;
  }
}

/**
 * 3. 话术生成 AI（结合知识库）
 */
export async function generateSalesScript(customerProfile: any, stage: string) {
  try {
    // 获取知识库信息
    let knowledgeContext = '';
    try {
      const { storage } = await import('../storage');
      const materials = await storage.getAllLearningMaterials();
      const categories = await storage.getAllScriptCategories();
      
      if (materials.length > 0) {
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        const byCategory: Record<string, string[]> = {};
        
        materials.forEach(m => {
          const category = categoryMap.get(m.categoryId) || '未分类';
          if (!byCategory[category]) {
            byCategory[category] = [];
          }
          byCategory[category].push(m.title);
        });
        
        knowledgeContext = '\n\n📚 可用的学习资料库：\n';
        for (const [category, titles] of Object.entries(byCategory)) {
          knowledgeContext += `\n【${category}】\n`;
          titles.forEach(title => {
            knowledgeContext += `  - ${title}\n`;
          });
        }
        knowledgeContext += '\n💡 请在生成话术时，适当引用这些资料中的专业知识，使话术更加专业和具有说服力。';
      }
    } catch (error) {
      console.error('获取知识库失败:', error);
      // 即使获取知识库失败也继续生成话术
    }

    const prompt = `请为以下客户生成销售话术：

客户画像：
${JSON.stringify(customerProfile, null, 2)}

当前阶段：${stage}
${knowledgeContext}

请严格按照JSON格式返回话术。`;

    const response = await getAI().ask(prompt, PROMPTS.SCRIPT_GENERATION);
    
    try {
      return JSON.parse(response);
    } catch {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('AI返回格式错误');
    }
  } catch (error) {
    console.error('话术生成失败:', error);
    throw error;
  }
}

/**
 * 4. 风险评估 AI
 */
export async function assessCustomerRisk(customerData: any, behaviorData: any) {
  try {
    const prompt = `请评估客户流失风险：

客户信息：
${JSON.stringify(customerData, null, 2)}

行为数据：
${JSON.stringify(behaviorData, null, 2)}

请严格按照JSON格式返回风险评估结果。`;

    const response = await getAI().ask(prompt, PROMPTS.RISK_ASSESSMENT);
    
    try {
      return JSON.parse(response);
    } catch {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('AI返回格式错误');
    }
  } catch (error) {
    console.error('风险评估失败:', error);
    throw error;
  }
}

/**
 * 5. 主管AI（质检和协调）
 */
export async function supervisorReview(analysisResults: {
  profile?: any;
  sentiment?: any;
  script?: any;
  risk?: any;
}) {
  try {
    const prompt = `请审查以下AI分析结果：

客户画像分析：
${JSON.stringify(analysisResults.profile || {}, null, 2)}

对话情绪分析：
${JSON.stringify(analysisResults.sentiment || {}, null, 2)}

话术生成：
${JSON.stringify(analysisResults.script || {}, null, 2)}

风险评估：
${JSON.stringify(analysisResults.risk || {}, null, 2)}

请严格按照JSON格式返回审查结果和最终建议。`;

    const response = await getAI().ask(prompt, PROMPTS.SUPERVISOR);
    
    try {
      return JSON.parse(response);
    } catch {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('AI返回格式错误');
    }
  } catch (error) {
    console.error('主管AI审查失败:', error);
    throw error;
  }
}

/**
 * 6. 任务生成 AI
 */
export async function generateTask(customerData: any, stage: string) {
  try {
    const prompt = `请为以下客户生成跟进任务：

客户信息：
${JSON.stringify(customerData, null, 2)}

当前阶段：${stage}

请严格按照JSON格式返回任务信息。`;

    const response = await getAI().ask(prompt, PROMPTS.TASK_GENERATION);
    
    try {
      return JSON.parse(response);
    } catch {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('AI返回格式错误');
    }
  } catch (error) {
    console.error('任务生成失败:', error);
    throw error;
  }
}

/**
 * 生成随机客户场景任务
 * 不需要真实客户，AI生成虚拟场景用于练习
 */
export async function generateRandomTask() {
  try {
    const prompt = `请生成一个真实的证券客户场景，用于业务员练习。

要求：
1. 虚构一个具体的客户（姓名、年龄、职业、投资经验等）
2. 为这个客户生成一个跟进任务
3. 包含详细的完成步骤和推荐话术
4. 场景要贴合证券行业实际情况

请严格按照JSON格式返回，包含以下字段：
- customerName: 客户姓名
- customerProfile: 客户简介（一句话描述）
- stage: 当前阶段（初次接触/热聊/开户/入金/普通等）
- title: 任务标题
- description: 任务描述
- guidanceSteps: 完成步骤数组
- script: 推荐话术`;

    const response = await getAI().ask(prompt, PROMPTS.TASK_GENERATION);
    
    try {
      return JSON.parse(response);
    } catch {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('AI返回格式错误');
    }
  } catch (error) {
    console.error('随机任务生成失败:', error);
    throw error;
  }
}

/**
 * 完整分析流程 - 并行调用多个AI Agent
 * 使用 Promise.allSettled 确保部分失败不影响整体
 */
export async function comprehensiveAnalysis(input: {
  customer: any;
  conversations?: any[];
  stage?: string;
  behaviorData?: any;
}) {
  try {
    console.log('开始综合分析...');

    // 并行调用多个AI Agent，使用 allSettled 容错
    const results = await Promise.allSettled([
      analyzeCustomerProfile(input.customer),
      input.conversations && input.conversations.length > 0
        ? analyzeConversationSentiment(input.conversations)
        : Promise.resolve(null),
      input.behaviorData
        ? assessCustomerRisk(input.customer, input.behaviorData)
        : Promise.resolve(null)
    ]);

    // 提取成功的结果
    const profileResult = results[0].status === 'fulfilled' ? results[0].value : null;
    const sentimentResult = results[1].status === 'fulfilled' ? results[1].value : null;
    const riskResult = results[2].status === 'fulfilled' ? results[2].value : null;

    // 记录失败的分析
    if (results[0].status === 'rejected') {
      console.error('客户画像分析失败:', results[0].reason);
    }
    if (results[1].status === 'rejected') {
      console.error('对话情绪分析失败:', results[1].reason);
    }
    if (results[2].status === 'rejected') {
      console.error('风险评估失败:', results[2].reason);
    }

    console.log('Agent分析完成，进入主管审查...');

    // 主管AI质检（只有在至少有一个成功结果时才执行）
    let finalResult = null;
    if (profileResult || sentimentResult || riskResult) {
      try {
        finalResult = await supervisorReview({
          profile: profileResult,
          sentiment: sentimentResult,
          risk: riskResult
        });
      } catch (error) {
        console.error('主管AI审查失败:', error);
        // 主管审查失败不影响其他结果
      }
    }

    console.log('综合分析完成');

    return {
      profile: profileResult,
      sentiment: sentimentResult,
      risk: riskResult,
      supervisor: finalResult,
      timestamp: new Date().toISOString(),
      errors: {
        profile: results[0].status === 'rejected' ? (results[0].reason as Error).message : null,
        sentiment: results[1].status === 'rejected' ? (results[1].reason as Error).message : null,
        risk: results[2].status === 'rejected' ? (results[2].reason as Error).message : null
      }
    };
  } catch (error) {
    console.error('综合分析失败:', error);
    throw error;
  }
}
