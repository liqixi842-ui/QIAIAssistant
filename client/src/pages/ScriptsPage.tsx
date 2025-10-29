import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  Search, Plus, Sparkles, Copy, Heart, Upload, FileText, Eye, 
  Download, Edit, Trash2, Folder, FolderOpen, ChevronRight, ChevronDown, X, Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import ObjectUploader from '@/components/ObjectUploader';

interface Script {
  id: string;
  title: string;
  content: string;
  categoryId: string | null;
  stage: string | null;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isAIGenerated: number;
}

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  isExpanded: boolean;
}

interface LearningMaterial {
  id: string;
  title: string;
  categoryId: string;
  uploadDate: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedBy: string;
}


// Office文档预览组件 - 使用签名URL
function OfficePreview({ materialId }: { materialId: string }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPreviewUrl() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/learning-materials/${materialId}/preview-url`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('获取预览URL失败');
        }
        
        const data = await response.json();
        setPreviewUrl(data.previewUrl);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPreviewUrl();
  }, [materialId]);

  if (isLoading) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">正在加载预览...</p>
      </div>
    );
  }

  if (error || !previewUrl) {
    return (
      <div className="w-full h-[600px] flex flex-col items-center justify-center">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">无法加载预览：{error || '未知错误'}</p>
      </div>
    );
  }

  return (
    <iframe
      src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`}
      className="w-full h-[600px] border-0"
      title="Office文档预览"
    />
  );
}

export default function ScriptsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [newScript, setNewScript] = useState({ title: '', content: '', category: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 学习资料状态
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<LearningMaterial | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  
  // 上传表单
  const [uploadCategoryId, setUploadCategoryId] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  
  // 分类管理
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<string | null>(null);
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');

  // 获取话术列表
  const { data: scriptsData, isLoading: isLoadingScripts } = useQuery<{ success: boolean; data: Script[] }>({
    queryKey: ['/api/scripts'],
  });

  // 获取学习资料列表
  const { data: materialsData, isLoading: isLoadingMaterials } = useQuery<{ success: boolean; data: LearningMaterial[] }>({
    queryKey: ['/api/learning-materials'],
  });

  // 获取分类列表
  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['/api/script-categories'],
  });

  const scripts = scriptsData?.data || [];
  const learningMaterials = materialsData?.data || [];
  const categories = (categoriesData?.data || []).map(cat => ({
    ...cat,
    isExpanded: expandedCategories.has(cat.id)
  }));

  // 创建话术
  const createScriptMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; categoryId: string | null; stage: string | null; tags: string[]; isAIGenerated: number }) => {
      return await apiRequest('POST', '/api/scripts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scripts'] });
      toast({
        title: "创建成功",
        description: "话术已保存",
      });
      setNewScript({ title: '', content: '', category: '' });
    },
    onError: (error: any) => {
      toast({
        title: "创建失败",
        description: error.message || "请重试",
        variant: "destructive",
      });
    }
  });

  // 更新话术
  const updateScriptMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Script> }) => {
      return await apiRequest('PATCH', `/api/scripts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scripts'] });
      toast({
        title: "更新成功",
        description: "话术已更新",
      });
    },
    onError: (error: any) => {
      toast({
        title: "更新失败",
        description: error.message || "请重试",
        variant: "destructive",
      });
    }
  });

  // 删除话术
  const deleteScriptMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/scripts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scripts'] });
      toast({
        title: "已删除",
        description: "话术已删除",
      });
    },
    onError: (error: any) => {
      toast({
        title: "删除失败",
        description: error.message || "请重试",
        variant: "destructive",
      });
    }
  });

  // AI生成话术
  const generateScriptMutation = useMutation({
    mutationFn: async (customerContext: any) => {
      return await apiRequest('POST', '/api/scripts/generate', { customerContext });
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/scripts'] });
      toast({
        title: "AI生成成功",
        description: "话术已自动保存",
      });
      setNewScript({
        title: response.data.title,
        content: response.data.content,
        category: response.data.stage || ''
      });
      setIsGenerating(false);
    },
    onError: (error: any) => {
      toast({
        title: "AI生成失败",
        description: error.message || "请重试",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  });

  // 创建学习资料记录
  const createMaterialMutation = useMutation({
    mutationFn: async (data: { title: string; categoryId: string; fileUrl: string; fileType: string; fileSize: number }) => {
      console.log('[ScriptsPage] Calling POST /api/learning-materials with data:', data);
      return await apiRequest('POST', '/api/learning-materials', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/learning-materials'] });
      toast({
        title: "上传成功",
        description: "学习资料已保存",
      });
      setIsUploadOpen(false);
      setUploadCategoryId('');
      setUploadTitle('');
    },
    onError: (error: any) => {
      toast({
        title: "上传失败",
        description: error.message || "请重试",
        variant: "destructive",
      });
    }
  });

  // 删除学习资料
  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/learning-materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/learning-materials'] });
      toast({
        title: "已删除",
        description: "学习资料已删除",
      });
    },
    onError: (error: any) => {
      toast({
        title: "删除失败",
        description: error.message || "请重试",
        variant: "destructive",
      });
    }
  });

  // 创建分类
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; parentId: string | null }) => {
      return await apiRequest('POST', '/api/script-categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/script-categories'] });
      toast({
        title: "创建成功",
        description: "分类已创建",
      });
      setIsAddCategoryOpen(false);
      setNewCategoryName('');
      setNewCategoryParentId(null);
    },
    onError: (error: any) => {
      toast({
        title: "创建失败",
        description: error.message || "请重试",
        variant: "destructive",
      });
    }
  });

  // 删除分类
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/script-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/script-categories'] });
      toast({
        title: "已删除",
        description: "分类已删除",
      });
    },
    onError: (error: any) => {
      toast({
        title: "删除失败",
        description: error.message || "请重试",
        variant: "destructive",
      });
    }
  });

  const filteredScripts = scripts.filter(script =>
    script.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    script.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 获取某个分类的子分类
  const getChildCategories = (parentId: string | null) => {
    return categories.filter(cat => cat.parentId === parentId);
  };

  // 获取某个分类的所有后代分类ID（包括自身）
  const getAllDescendantIds = (categoryId: string): string[] => {
    const result = [categoryId];
    const children = getChildCategories(categoryId);
    children.forEach(child => {
      result.push(...getAllDescendantIds(child.id));
    });
    return result;
  };

  // 获取某个分类下的资料（包括子分类）
  const getMaterialsInCategory = (categoryId: string | null) => {
    if (categoryId === null) {
      return learningMaterials;
    }
    const descendantIds = getAllDescendantIds(categoryId);
    return learningMaterials.filter(m => descendantIds.includes(m.categoryId));
  };

  // 显示的资料列表（根据选中的分类和搜索）
  const displayedMaterials = selectedCategoryId
    ? getMaterialsInCategory(selectedCategoryId).filter(m =>
        m.title.toLowerCase().includes(materialSearchTerm.toLowerCase())
      )
    : learningMaterials.filter(m =>
        m.title.toLowerCase().includes(materialSearchTerm.toLowerCase())
      );

  // 获取分类完整路径名称
  const getCategoryPath = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return '';
    if (category.parentId === null) return category.name;
    return `${getCategoryPath(category.parentId)} / ${category.name}`;
  };

  // 切换分类展开/折叠
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // 添加分类
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "错误",
        description: "分类名称不能为空",
        variant: "destructive",
      });
      return;
    }
    
    createCategoryMutation.mutate({
      name: newCategoryName.trim(),
      parentId: newCategoryParentId
    });
  };

  // 选择分类
  const selectCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "已复制",
      description: "话术内容已复制到剪贴板",
    });
  };

  const handleAIGenerate = () => {
    setIsGenerating(true);
    // 使用示例客户上下文进行AI生成
    const customerContext = {
      name: '示例客户',
      stage: newScript.category || '初次接触',
      tags: []
    };
    generateScriptMutation.mutate(customerContext);
  };

  // 文件上传成功回调
  const handleUploadSuccess = (fileUrl: string, file: File) => {
    console.log('[ScriptsPage] handleUploadSuccess called', { fileUrl, fileName: file.name, uploadCategoryId });
    
    if (!uploadCategoryId) {
      console.error('[ScriptsPage] No category selected!');
      toast({
        title: "请选择分类",
        variant: "destructive",
      });
      return;
    }

    const title = uploadTitle.trim() || file.name;
    console.log('[ScriptsPage] Creating material with:', { title, categoryId: uploadCategoryId, fileUrl });

    createMaterialMutation.mutate({
      title,
      categoryId: uploadCategoryId,
      fileUrl,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size
    });
  };

  // 预览文件
  const handlePreview = async (material: LearningMaterial) => {
    setSelectedMaterial(material);
    setIsPreviewOpen(true);
  };

  // 下载文件
  const handleDownload = (material: LearningMaterial) => {
    const a = document.createElement('a');
    a.href = material.fileUrl;
    a.download = material.title;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      title: "下载成功",
      description: `正在下载 ${material.title}`,
    });
  };

  // 删除资料
  const handleDeleteMaterial = (materialId: string) => {
    deleteMaterialMutation.mutate(materialId);
  };

  // 删除分类
  const handleDeleteCategory = (categoryId: string) => {
    deleteCategoryMutation.mutate(categoryId);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 递归渲染分类树
  const renderCategoryTree = (parentId: string | null, level: number = 0) => {
    const childCategories = getChildCategories(parentId);
    
    return childCategories.map(category => {
      const hasChildren = getChildCategories(category.id).length > 0;
      const materialsCount = getMaterialsInCategory(category.id).length;
      const isSelected = selectedCategoryId === category.id;
      
      return (
        <div key={category.id}>
          <div
            className={`flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer hover-elevate ${
              isSelected ? 'bg-accent' : ''
            }`}
            style={{ paddingLeft: `${level * 20 + 12}px` }}
            onClick={() => selectCategory(category.id)}
            data-testid={`category-${category.id}`}
          >
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(category.id);
                }}
                className="hover:bg-muted/50 rounded p-0.5"
                data-testid={`button-toggle-${category.id}`}
              >
                {category.isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-5" />}
            {category.isExpanded ? (
              <FolderOpen className="h-4 w-4 text-primary" />
            ) : (
              <Folder className="h-4 w-4 text-primary" />
            )}
            <span className="flex-1 text-sm">{category.name}</span>
            <Badge variant="secondary" className="text-xs">
              {materialsCount}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCategory(category.id);
              }}
              data-testid={`button-delete-category-${category.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          {hasChildren && category.isExpanded && renderCategoryTree(category.id, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">话术库与学习资料</h1>
      </div>

      <Tabs defaultValue="scripts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scripts" data-testid="tab-scripts">话术库</TabsTrigger>
          <TabsTrigger value="learning" data-testid="tab-learning">学习资料</TabsTrigger>
        </TabsList>

        {/* 话术库 Tab */}
        <TabsContent value="scripts" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索话术..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-script"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleAIGenerate}
              disabled={isGenerating}
              data-testid="button-ai-generate"
            >
              <Sparkles className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              AI生成话术
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button data-testid="button-add-script">
                  <Plus className="h-4 w-4 mr-2" />
                  添加话术
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加新话术</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="话术标题"
                    value={newScript.title}
                    onChange={(e) => setNewScript({ ...newScript, title: e.target.value })}
                    data-testid="input-script-title"
                  />
                  <Input
                    placeholder="分类"
                    value={newScript.category}
                    onChange={(e) => setNewScript({ ...newScript, category: e.target.value })}
                    data-testid="input-script-category"
                  />
                  <Textarea
                    placeholder="话术内容..."
                    value={newScript.content}
                    onChange={(e) => setNewScript({ ...newScript, content: e.target.value })}
                    rows={6}
                    data-testid="textarea-script-content"
                  />
                  <Button 
                    className="w-full" 
                    data-testid="button-save-script"
                    onClick={() => {
                      if (!newScript.title || !newScript.content) {
                        toast({
                          title: "请填写完整",
                          description: "标题和内容不能为空",
                          variant: "destructive",
                        });
                        return;
                      }
                      createScriptMutation.mutate({
                        title: newScript.title,
                        content: newScript.content,
                        categoryId: null,
                        stage: newScript.category || null,
                        tags: [],
                        isAIGenerated: 0
                      });
                    }}
                  >
                    保存话术
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredScripts.map((script) => (
              <Card key={script.id} className="p-4 hover-elevate" data-testid={`script-card-${script.id}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{script.title}</h3>
                    {script.isAIGenerated === 1 && (
                      <Sparkles className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <Badge variant="secondary">{script.stage || '通用'}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {script.content}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(script.content)}
                      data-testid={`button-copy-${script.id}`}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      复制
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteScriptMutation.mutate(script.id)}
                      data-testid={`button-delete-${script.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      删除
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 学习资料 Tab */}
        <TabsContent value="learning" className="space-y-4">
          <div className="grid grid-cols-12 gap-4">
            {/* 左侧分类树 */}
            <div className="col-span-3">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">分类目录</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsAddCategoryOpen(true)}
                    data-testid="button-add-category"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div
                  className={`py-2 px-3 rounded-md cursor-pointer hover-elevate mb-2 ${
                    selectedCategoryId === null ? 'bg-accent' : ''
                  }`}
                  onClick={() => selectCategory(null)}
                  data-testid="category-all"
                >
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-primary" />
                    <span className="flex-1 text-sm">全部资料</span>
                    <Badge variant="secondary" className="text-xs">
                      {learningMaterials.length}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  {renderCategoryTree(null)}
                </div>
              </Card>
            </div>

            {/* 右侧资料列表 */}
            <div className="col-span-9 space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索学习资料..."
                    value={materialSearchTerm}
                    onChange={(e) => setMaterialSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-material"
                  />
                </div>
                <Button onClick={() => setIsUploadOpen(true)} data-testid="button-upload-material">
                  <Upload className="h-4 w-4 mr-2" />
                  上传资料
                </Button>
              </div>

              {selectedCategoryId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Folder className="h-4 w-4" />
                  <span>{getCategoryPath(selectedCategoryId)}</span>
                </div>
              )}

              {isLoadingMaterials ? (
                <Card className="p-12 text-center">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
                  <p className="text-muted-foreground">加载中...</p>
                </Card>
              ) : displayedMaterials.length === 0 ? (
                <Card className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">
                    {materialSearchTerm ? '没有找到匹配的资料' : '暂无学习资料'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {materialSearchTerm ? '尝试其他搜索关键词' : '点击"上传资料"添加培训文档、视频等学习材料'}
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {displayedMaterials.map((material) => (
                    <Card key={material.id} className="p-4 hover-elevate" data-testid={`material-card-${material.id}`}>
                      <div className="flex items-start justify-between mb-2">
                        <FileText className="h-8 w-8 text-primary" />
                        <Badge variant="secondary" className="text-xs">
                          {categories.find(c => c.id === material.categoryId)?.name || '未分类'}
                        </Badge>
                      </div>
                      <h3 className="font-semibold mb-1 line-clamp-2">{material.title}</h3>
                      <div className="text-xs text-muted-foreground mb-3 space-y-1">
                        <p>上传时间：{new Date(material.uploadDate).toLocaleDateString('zh-CN')}</p>
                        <p>文件大小：{formatFileSize(material.fileSize)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() => handlePreview(material)}
                          data-testid={`button-preview-${material.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          预览
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDownload(material)}
                          data-testid={`button-download-${material.id}`}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          下载
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMaterial(material.id)}
                          data-testid={`button-delete-${material.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* 上传对话框 */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上传学习资料</DialogTitle>
            <DialogDescription>选择文件并指定分类</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="upload-title">标题（可选，默认为文件名）</Label>
              <Input
                id="upload-title"
                placeholder="输入自定义标题"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                data-testid="input-upload-title"
              />
            </div>
            <div>
              <Label htmlFor="upload-category">选择分类</Label>
              <Select value={uploadCategoryId} onValueChange={setUploadCategoryId}>
                <SelectTrigger id="upload-category" data-testid="select-upload-category">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {getCategoryPath(cat.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>选择文件</Label>
              <ObjectUploader 
                onUploadSuccess={handleUploadSuccess}
                acceptedFileTypes={[
                  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
                  '.txt', '.md', '.jpg', '.jpeg', '.png', '.gif'
                ]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsUploadOpen(false);
              setUploadCategoryId('');
              setUploadTitle('');
            }}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加分类对话框 */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加分类</DialogTitle>
            <DialogDescription>创建新的文件夹分类</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-category-name">分类名称</Label>
              <Input
                id="new-category-name"
                placeholder="输入分类名称"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                data-testid="input-new-category-name"
              />
            </div>
            <div>
              <Label htmlFor="parent-category">父分类（可选）</Label>
              <Select 
                value={newCategoryParentId || 'none'} 
                onValueChange={(val) => setNewCategoryParentId(val === 'none' ? null : val)}
              >
                <SelectTrigger id="parent-category" data-testid="select-parent-category">
                  <SelectValue placeholder="选择父分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无（顶级分类）</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {getCategoryPath(cat.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddCategory} data-testid="button-submit-add-category">
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 预览对话框 */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedMaterial?.title}</DialogTitle>
            <DialogDescription>文件预览</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label>文件类型</Label>
                <p className="text-muted-foreground">{selectedMaterial?.fileType}</p>
              </div>
              <div>
                <Label>文件大小</Label>
                <p className="text-muted-foreground">
                  {selectedMaterial && formatFileSize(selectedMaterial.fileSize)}
                </p>
              </div>
              <div>
                <Label>分类</Label>
                <p className="text-muted-foreground">
                  {selectedMaterial && getCategoryPath(selectedMaterial.categoryId)}
                </p>
              </div>
              <div>
                <Label>上传时间</Label>
                <p className="text-muted-foreground">
                  {selectedMaterial && new Date(selectedMaterial.uploadDate).toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>
            <div className="border rounded-lg bg-muted/50 min-h-[400px] flex flex-col items-center justify-center overflow-hidden">
              {selectedMaterial?.fileType.startsWith('image/') && (
                <img 
                  src={selectedMaterial.fileUrl} 
                  alt={selectedMaterial.title}
                  className="max-w-full max-h-[500px] object-contain"
                />
              )}
              {selectedMaterial?.fileType === 'application/pdf' && (
                <iframe
                  src={selectedMaterial.fileUrl}
                  className="w-full h-[500px]"
                  title="PDF预览"
                />
              )}
              {selectedMaterial?.fileType.startsWith('text/') && (
                <div className="w-full h-[400px] overflow-auto p-4 bg-white">
                  <iframe
                    src={selectedMaterial.fileUrl}
                    className="w-full h-full border-0"
                    title="文本预览"
                  />
                </div>
              )}
              {selectedMaterial?.fileType.includes('word') || 
               selectedMaterial?.fileType.includes('document') ||
               selectedMaterial?.fileType.includes('excel') ||
               selectedMaterial?.fileType.includes('spreadsheet') ||
               selectedMaterial?.fileType.includes('powerpoint') ||
               selectedMaterial?.fileType.includes('presentation') ? (
                <OfficePreview materialId={selectedMaterial.id} />
              ) : !selectedMaterial?.fileType.startsWith('image/') && 
                 selectedMaterial?.fileType !== 'application/pdf' && 
                 !selectedMaterial?.fileType.startsWith('text/') && (
                <div className="p-8 text-center">
                  <FileText className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
                  <p className="text-muted-foreground mb-4">
                    此文件类型暂不支持预览
                  </p>
                  <Button onClick={() => selectedMaterial && handleDownload(selectedMaterial)}>
                    <Download className="h-4 w-4 mr-2" />
                    下载文件查看
                  </Button>
                </div>
              )}
            </div>
            {(selectedMaterial?.fileType.startsWith('image/') || 
              selectedMaterial?.fileType === 'application/pdf' ||
              selectedMaterial?.fileType.includes('word') ||
              selectedMaterial?.fileType.includes('document') ||
              selectedMaterial?.fileType.includes('excel') ||
              selectedMaterial?.fileType.includes('spreadsheet') ||
              selectedMaterial?.fileType.includes('powerpoint') ||
              selectedMaterial?.fileType.includes('presentation')) && (
              <div className="flex justify-center">
                <Button onClick={() => selectedMaterial && handleDownload(selectedMaterial)}>
                  <Download className="h-4 w-4 mr-2" />
                  下载文件
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
