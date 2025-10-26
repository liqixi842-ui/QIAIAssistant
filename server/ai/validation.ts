/**
 * AI API 请求验证 Schema
 * 使用 Zod 确保请求数据的正确性
 */

import { z } from 'zod';

/**
 * 客户画像分析请求
 */
export const analyzeCustomerSchema = z.object({
  customerId: z.string().min(1, "客户ID不能为空"),
  customer: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    tags: z.array(z.string()).optional(),
    channel: z.string().optional(),
    age: z.string().optional(),
    location: z.string().optional(),
    stockAge: z.string().optional(),
    profitLoss: z.string().optional(),
    stockSelection: z.string().optional(),
    tradingHabit: z.string().optional(),
    income: z.string().optional(),
    family: z.string().optional(),
    occupation: z.string().optional(),
    hobbies: z.string().optional(),
    groupPurpose: z.string().optional(),
    other: z.string().optional()
  }).passthrough(), // 允许其他字段
  useCache: z.boolean().optional().default(true)
});

export type AnalyzeCustomerRequest = z.infer<typeof analyzeCustomerSchema>;

/**
 * 对话情绪分析请求
 */
export const analyzeSentimentSchema = z.object({
  customerId: z.string().min(1, "客户ID不能为空"),
  conversations: z.array(z.object({
    ourMessage: z.string().optional(),
    customerReply: z.string().optional(),
    timestamp: z.string().optional()
  }).passthrough()).min(1, "对话记录不能为空"),
  useCache: z.boolean().optional().default(true)
});

export type AnalyzeSentimentRequest = z.infer<typeof analyzeSentimentSchema>;

/**
 * 话术生成请求
 */
export const generateScriptSchema = z.object({
  customerProfile: z.object({
    name: z.string().optional(),
    customerLevel: z.string().optional(),
    investmentPreference: z.string().optional()
  }).passthrough(),
  stage: z.string().min(1, "阶段不能为空")
});

export type GenerateScriptRequest = z.infer<typeof generateScriptSchema>;

/**
 * 风险评估请求
 */
export const assessRiskSchema = z.object({
  customerId: z.string().min(1, "客户ID不能为空"),
  customer: z.object({
    name: z.string().optional()
  }).passthrough(),
  behaviorData: z.object({
    lastContactDays: z.number().optional(),
    responseRate: z.number().optional(),
    activityLevel: z.string().optional()
  }).passthrough(),
  useCache: z.boolean().optional().default(true)
});

export type AssessRiskRequest = z.infer<typeof assessRiskSchema>;

/**
 * 主管AI审查请求
 */
export const supervisorReviewSchema = z.object({
  analysisResults: z.object({
    profile: z.any().optional(),
    sentiment: z.any().optional(),
    script: z.any().optional(),
    risk: z.any().optional()
  })
});

export type SupervisorReviewRequest = z.infer<typeof supervisorReviewSchema>;

/**
 * 综合分析请求
 */
export const comprehensiveAnalysisSchema = z.object({
  customerId: z.string().min(1, "客户ID不能为空"),
  customer: z.object({
    name: z.string().optional()
  }).passthrough(),
  conversations: z.array(z.any()).optional(),
  stage: z.string().optional(),
  behaviorData: z.any().optional()
});

export type ComprehensiveAnalysisRequest = z.infer<typeof comprehensiveAnalysisSchema>;

/**
 * 验证请求数据的辅助函数
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return { success: false, error: errorMessages };
    }
    return { success: false, error: '请求数据验证失败' };
  }
}
