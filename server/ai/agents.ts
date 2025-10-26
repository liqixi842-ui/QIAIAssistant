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
    const prompt = `请分析以下客户信息：

客户资料：
${JSON.stringify(customerData, null, 2)}

请严格按照JSON格式返回分析结果。`;

    const response = await getAI().ask(prompt, PROMPTS.CUSTOMER_PROFILE);
    
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
 * 3. 话术生成 AI
 */
export async function generateSalesScript(customerProfile: any, stage: string) {
  try {
    const prompt = `请为以下客户生成销售话术：

客户画像：
${JSON.stringify(customerProfile, null, 2)}

当前阶段：${stage}

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
