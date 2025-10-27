/**
 * 本地文件存储服务（用于生产环境）
 * 当Replit Object Storage不可用时使用
 */
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { Response } from "express";

export class LocalFileStorageService {
  private uploadDir: string;
  private baseUrl: string;

  constructor() {
    // 生产环境的上传目录（在项目根目录下的uploads文件夹）
    this.uploadDir = path.join(process.cwd(), "uploads", "learning-materials");
    // 基础URL（通过Nginx提供静态文件访问）
    this.baseUrl = "/uploads/learning-materials";
  }

  /**
   * 初始化上传目录
   */
  async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      console.log("✅ 本地上传目录已创建:", this.uploadDir);
    } catch (error) {
      console.error("❌ 创建上传目录失败:", error);
      throw error;
    }
  }

  /**
   * 获取上传URL（本地存储时返回一个临时标识）
   */
  async getPublicUploadURL(contentType: string): Promise<{
    url: string;
    fileId: string;
    publicUrl: string;
  }> {
    await this.ensureUploadDir();

    const fileId = randomUUID();
    const ext = this.getFileExtension(contentType);
    const fileName = `${fileId}${ext}`;
    const filePath = path.join(this.uploadDir, fileName);
    const publicUrl = `${this.baseUrl}/${fileName}`;

    console.log("📁 本地文件上传配置:", {
      fileId,
      fileName,
      filePath,
      publicUrl,
    });

    // 返回本地标识（前端会识别local:前缀并使用不同的上传逻辑）
    return {
      url: `local:${filePath}`, // 标记为本地上传
      fileId,
      publicUrl, // 最终访问URL
    };
  }

  /**
   * 保存上传的文件
   */
  async saveUploadedFile(
    filePath: string,
    fileBuffer: Buffer
  ): Promise<string> {
    await fs.writeFile(filePath, fileBuffer);
    const fileName = path.basename(filePath);
    return `${this.baseUrl}/${fileName}`;
  }

  /**
   * 根据Content-Type获取文件扩展名
   */
  private getFileExtension(contentType: string): string {
    const mimeTypes: Record<string, string> = {
      "application/pdf": ".pdf",
      "application/msword": ".doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        ".docx",
      "application/vnd.ms-excel": ".xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        ".xlsx",
      "application/vnd.ms-powerpoint": ".ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        ".pptx",
      "image/png": ".png",
      "image/jpeg": ".jpg",
      "image/gif": ".gif",
      "text/plain": ".txt",
    };
    return mimeTypes[contentType] || "";
  }

  /**
   * 删除文件
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const fileName = path.basename(fileUrl);
      const filePath = path.join(this.uploadDir, fileName);
      await fs.unlink(filePath);
      console.log("✅ 已删除文件:", filePath);
    } catch (error) {
      console.error("❌ 删除文件失败:", error);
    }
  }

  /**
   * 获取文件的完整URL
   */
  getFileUrl(fileName: string): string {
    return `${this.baseUrl}/${fileName}`;
  }
}

// 导出单例
export const localFileStorage = new LocalFileStorageService();
