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
   * 获取上传URL（本地存储时返回fileId，不暴露路径）
   */
  async getPublicUploadURL(contentType: string): Promise<{
    fileId: string;
    uploadEndpoint: string;
  }> {
    await this.ensureUploadDir();

    const fileId = randomUUID();
    const uploadEndpoint = `/api/objects/local-upload/${fileId}`;

    console.log("📁 本地文件上传配置:", {
      fileId,
      uploadEndpoint,
    });

    // 只返回fileId和端点，不暴露文件系统路径
    return {
      fileId,
      uploadEndpoint,
    };
  }

  /**
   * 根据fileId保存上传的文件（服务器端生成安全路径）
   */
  async saveUploadedFileById(
    fileId: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<string> {
    await this.ensureUploadDir();

    // 验证fileId格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fileId)) {
      throw new Error("无效的文件ID格式");
    }

    const ext = this.getFileExtension(contentType);
    const fileName = `${fileId}${ext}`;
    
    // 使用path.resolve确保路径在uploadDir内，防止路径遍历攻击
    const safePath = path.resolve(this.uploadDir, fileName);
    
    // 二次验证：确保解析后的路径仍在uploadDir内
    if (!safePath.startsWith(path.resolve(this.uploadDir))) {
      throw new Error("非法的文件路径");
    }

    await fs.writeFile(safePath, fileBuffer);
    console.log("✅ 文件已安全保存:", safePath);
    
    return `${this.baseUrl}/${fileName}`;
  }

  /**
   * 保存上传的文件（已废弃，保留向后兼容）
   * @deprecated 使用 saveUploadedFileById 替代
   */
  async saveUploadedFile(
    filePath: string,
    fileBuffer: Buffer
  ): Promise<string> {
    throw new Error("此方法已废弃，请使用saveUploadedFileById");
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
