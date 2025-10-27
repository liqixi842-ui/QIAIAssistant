// Simplified file uploader without Uppy UI (avoiding CSS import issues)
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ObjectUploaderProps {
  onUploadSuccess: (fileUrl: string, file: File) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  buttonText?: string;
}

export default function ObjectUploader({
  onUploadSuccess,
  acceptedFileTypes = ['*'],
  maxFileSize = 52428800, // 50MB
  buttonText = "选择文件"
}: ObjectUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxFileSize) {
      toast({
        title: "文件过大",
        description: `文件大小不能超过 ${(maxFileSize / 1024 / 1024).toFixed(0)}MB`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Get upload URL from backend
      const uploadUrlResponse = await fetch('/api/objects/upload', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentType: selectedFile.type || 'application/octet-stream'
        })
      });

      if (!uploadUrlResponse.ok) {
        throw new Error('获取上传URL失败');
      }

      const { uploadURL, storageType } = await uploadUrlResponse.json();

      let fileUrl: string;

      if (storageType === 'local') {
        // 本地存储：上传到后端API（安全设计：使用fileId）
        console.log('[ObjectUploader] 使用本地存储上传');
        const uploadResponse = await fetch(uploadURL.uploadEndpoint, {
          method: 'POST',
          credentials: 'include',
          body: selectedFile,
          headers: {
            'Content-Type': selectedFile.type || 'application/octet-stream',
          },
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}));
          throw new Error(errorData.error || '文件上传失败');
        }

        const result = await uploadResponse.json();
        fileUrl = result.publicUrl;
      } else {
        // 对象存储：直接上传到云存储
        console.log('[ObjectUploader] 使用对象存储上传');
        const uploadResponse = await fetch(uploadURL, {
          method: 'PUT',
          body: selectedFile,
          headers: {
            'Content-Type': selectedFile.type || 'application/octet-stream',
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('文件上传失败');
        }

        // Extract file URL (remove query parameters)
        fileUrl = uploadURL.split('?')[0];
      }

      setUploadProgress(100);

      // Notify parent component (parent will handle success toast and cleanup)
      console.log('[ObjectUploader] Upload successful, calling onUploadSuccess with fileUrl:', fileUrl);
      onUploadSuccess(fileUrl, selectedFile);

      // Reset local state
      setTimeout(() => {
        setSelectedFile(null);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 500); // Delay reset to allow parent mutation to complete
    } catch (error: any) {
      console.error('上传失败:', error);
      toast({
        title: "上传失败",
        description: error.message || "请重试",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFileTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload-input"
          data-testid="input-file-upload"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          data-testid="button-select-file"
        >
          <Upload className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </div>

      {selectedFile && (
        <div className="border rounded-lg p-3 bg-muted/50">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!uploading && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handleCancel}
                data-testid="button-cancel-upload"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>上传中... {uploadProgress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {!uploading && uploadProgress === 0 && (
            <Button
              type="button"
              onClick={handleUpload}
              className="w-full"
              data-testid="button-start-upload"
            >
              <Upload className="h-4 w-4 mr-2" />
              开始上传
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
