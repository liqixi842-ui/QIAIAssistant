/**
 * AI 分析结果缓存系统
 * 避免重复分析，节省成本和时间
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

class AnalysisCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL = 24 * 60 * 60 * 1000; // 24小时

  /**
   * 生成缓存key
   */
  private generateKey(customerId: string, type: string): string {
    return `${customerId}:${type}`;
  }

  /**
   * 获取缓存
   */
  get(customerId: string, type: string): any | null {
    const key = this.generateKey(customerId, type);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    console.log(`缓存命中: ${key}`);
    return entry.data;
  }

  /**
   * 设置缓存
   */
  set(customerId: string, type: string, data: any, ttl?: number): void {
    const key = this.generateKey(customerId, type);
    const timestamp = Date.now();
    const expiresAt = timestamp + (ttl || this.defaultTTL);

    this.cache.set(key, {
      data,
      timestamp,
      expiresAt
    });

    console.log(`缓存设置: ${key}, 过期时间: ${new Date(expiresAt).toLocaleString()}`);
  }

  /**
   * 清除指定客户的所有缓存
   */
  clearCustomer(customerId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${customerId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`清除客户缓存: ${customerId}, 共${keysToDelete.length}条`);
  }

  /**
   * 清除过期缓存（定时任务调用）
   */
  cleanExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`清除过期缓存: ${keysToDelete.length}条`);
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const now = Date.now();
    let activeCount = 0;
    let expiredCount = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expiredCount++;
      } else {
        activeCount++;
      }
    }

    return {
      total: this.cache.size,
      active: activeCount,
      expired: expiredCount
    };
  }
}

// 单例模式
export const analysisCache = new AnalysisCache();

// 每小时清理一次过期缓存
setInterval(() => {
  analysisCache.cleanExpired();
}, 60 * 60 * 1000);
