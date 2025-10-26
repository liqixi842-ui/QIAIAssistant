/**
 * AI 适配器 - 通用接口，支持对接各种AI服务
 * 用户可以配置自己的AI API
 */

interface AIConfig {
  apiKey: string;
  baseURL: string;
  model?: string;
}

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class AIAdapter {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = {
      ...config,
      model: config.model || 'default'
    };
  }

  /**
   * 调用AI服务 - 支持各种国内外AI服务
   */
  async chat(messages: AIMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
  }): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 2000
        })
      });

      if (!response.ok) {
        throw new Error(`AI API请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0].message.content,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        } : undefined
      };
    } catch (error) {
      console.error('AI调用错误:', error);
      throw new Error(`AI服务调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 简化的单次问答接口
   */
  async ask(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: AIMessage[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });
    
    const response = await this.chat(messages);
    return response.content;
  }
}

/**
 * 创建AI实例 - 从环境变量读取配置
 */
export function createAI(): AIAdapter {
  const apiKey = process.env.AI_API_KEY;
  const baseURL = process.env.AI_BASE_URL;

  if (!apiKey || !baseURL) {
    throw new Error('AI配置缺失: 请设置 AI_API_KEY 和 AI_BASE_URL 环境变量');
  }

  return new AIAdapter({
    apiKey,
    baseURL,
    model: process.env.AI_MODEL || 'default'
  });
}
