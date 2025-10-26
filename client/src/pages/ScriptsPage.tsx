import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  Search, Plus, Sparkles, Copy, Heart, Upload, FileText, Eye, 
  Download, Edit, Trash2, Folder, FolderOpen, ChevronRight, ChevronDown, X
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

interface Script {
  id: string;
  title: string;
  content: string;
  category: string;
  likes: number;
  isAIGenerated: boolean;
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
  file: File;
}

const mockScripts: Script[] = [
  {
    id: '1',
    title: '初次接触话术',
    content: '您好，我是XX证券的投资顾问。看到您对投资理财很感兴趣，想了解一下您目前的投资经验如何？',
    category: '开场白',
    likes: 23,
    isAIGenerated: false
  },
  {
    id: '2',
    title: 'AI推荐 - 科技股话术',
    content: '张总您好，最近科技板块表现不错，特别是AI相关的龙头股。根据您之前对成长股的兴趣，我为您准备了几只潜力标的...',
    category: '产品推荐',
    likes: 45,
    isAIGenerated: true
  },
  {
    id: '3',
    title: '开户引导',
    content: '李总，开户流程非常简单，只需要3步：1.准备身份证和银行卡 2.视频认证 3.设置密码。全程只需5分钟...',
    category: '开户',
    likes: 31,
    isAIGenerated: false
  }
];

export default function ScriptsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [newScript, setNewScript] = useState({ title: '', content: '', category: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 学习资料状态
  const [learningMaterials, setLearningMaterials] = useState<LearningMaterial[]>([]);
  const [categories, setCategories] = useState<Category[]>([
    { id: 'cat-1', name: '产品知识', parentId: null, isExpanded: true },
    { id: 'cat-2', name: '销售技巧', parentId: null, isExpanded: true },
    { id: 'cat-3', name: '合规培训', parentId: null, isExpanded: true },
    { id: 'cat-4', name: '市场分析', parentId: null, isExpanded: true }
  ]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<LearningMaterial | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  
  // 上传表单
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploadCategoryId, setUploadCategoryId] = useState('');
  
  // 编辑表单
  const [editTitle, setEditTitle] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  
  // 分类管理
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<string | null>(null);
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');
  const [textFileContent, setTextFileContent] = useState<string>('');
  const [isLoadingText, setIsLoadingText] = useState(false);

  // 当选择文本文件时读取内容
  useEffect(() => {
    if (selectedMaterial && selectedMaterial.fileType.startsWith('text/')) {
      setIsLoadingText(true);
      selectedMaterial.file.text()
        .then(content => {
          setTextFileContent(content);
          setIsLoadingText(false);
        })
        .catch(error => {
          console.error('读取文件失败:', error);
          setTextFileContent('读取文件内容失败');
          setIsLoadingText(false);
        });
    }
  }, [selectedMaterial]);

  const filteredScripts = mockScripts.filter(script =>
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
    setCategories(prev => 
      prev.map(cat => 
        cat.id === categoryId ? { ...cat, isExpanded: !cat.isExpanded } : cat
      )
    );
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
    setTimeout(() => {
      setNewScript({
        title: 'AI生成 - 稳健型客户话术',
        content: '根据您的风险偏好，我为您筛选了一些稳健型的投资组合，年化收益预期在8-12%之间，同时风险可控...',
        category: '个性化推荐'
      });
      setIsGenerating(false);
    }, 2000);
  };

  // 上传文件
  const handleUploadSubmit = () => {
    if (!uploadFiles || uploadFiles.length === 0) {
      toast({
        title: "请选择文件",
        variant: "destructive",
      });
      return;
    }

    if (!uploadCategoryId) {
      toast({
        title: "请选择分类",
        variant: "destructive",
      });
      return;
    }

    const newMaterials = Array.from(uploadFiles).map((file, index) => ({
      id: `${Date.now()}-${index}`,
      title: file.name,
      categoryId: uploadCategoryId,
      uploadDate: new Date().toLocaleDateString('zh-CN'),
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      file: file
    }));
    
    setLearningMaterials(prev => [...prev, ...newMaterials]);
    
    toast({
      title: "上传成功",
      description: `成功上传 ${uploadFiles.length} 个文件`,
    });

    setUploadFiles(null);
    setUploadCategoryId('');
    setIsUploadOpen(false);
  };

  // 预览文件
  const handlePreview = (material: LearningMaterial) => {
    setSelectedMaterial(material);
    setIsPreviewOpen(true);
  };

  // 下载文件
  const handleDownload = (material: LearningMaterial) => {
    const url = URL.createObjectURL(material.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = material.title;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "下载成功",
      description: `正在下载 ${material.title}`,
    });
  };

  // 编辑资料
  const handleEditMaterial = (material: LearningMaterial) => {
    setSelectedMaterial(material);
    setEditTitle(material.title);
    setEditCategoryId(material.categoryId);
    setIsEditOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedMaterial) return;

    if (!editTitle.trim()) {
      toast({
        title: "标题不能为空",
        variant: "destructive",
      });
      return;
    }

    if (!editCategoryId) {
      toast({
        title: "请选择分类",
        variant: "destructive",
      });
      return;
    }

    setLearningMaterials(prev =>
      prev.map(m =>
        m.id === selectedMaterial.id
          ? { ...m, title: editTitle, categoryId: editCategoryId }
          : m
      )
    );

    toast({
      title: "保存成功",
      description: "资料信息已更新",
    });

    setIsEditOpen(false);
    setSelectedMaterial(null);
  };

  // 删除资料
  const handleDeleteMaterial = (materialId: string) => {
    setLearningMaterials(prev => prev.filter(m => m.id !== materialId));
    toast({
      title: "已删除",
      description: "学习资料已删除",
    });
  };

  // 添加分类
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "分类名称不能为空",
        variant: "destructive",
      });
      return;
    }

    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name: newCategoryName,
      parentId: newCategoryParentId,
      isExpanded: true
    };

    setCategories(prev => [...prev, newCategory]);
    setNewCategoryName('');
    setNewCategoryParentId(null);
    
    toast({
      title: "添加成功",
      description: `已添加分类"${newCategoryName}"`,
    });
    
    setIsAddCategoryOpen(false);
  };

  // 删除分类
  const handleDeleteCategory = (categoryId: string) => {
    const materialsInCategory = getMaterialsInCategory(categoryId);
    if (materialsInCategory.length > 0) {
      toast({
        title: "无法删除",
        description: `该分类及其子分类下还有 ${materialsInCategory.length} 个资料`,
        variant: "destructive",
      });
      return;
    }

    const children = getChildCategories(categoryId);
    if (children.length > 0) {
      toast({
        title: "无法删除",
        description: "请先删除该分类下的所有子分类",
        variant: "destructive",
      });
      return;
    }

    setCategories(prev => prev.filter(c => c.id !== categoryId));
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(null);
    }
    
    toast({
      title: "已删除",
      description: "分类已删除",
    });
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
                  <Button className="w-full" data-testid="button-save-script">保存话术</Button>
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
                    {script.isAIGenerated && (
                      <Sparkles className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <Badge variant="secondary">{script.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {script.content}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Heart className="h-4 w-4" />
                    <span>{script.likes}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(script.content)}
                    data-testid={`button-copy-${script.id}`}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    复制
                  </Button>
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

              {displayedMaterials.length === 0 ? (
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
                        <p>上传时间：{material.uploadDate}</p>
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
                          onClick={() => handleEditMaterial(material)}
                          data-testid={`button-edit-${material.id}`}
                        >
                          <Edit className="h-4 w-4" />
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
              <Label htmlFor="upload-files">选择文件</Label>
              <Input
                id="upload-files"
                type="file"
                multiple
                onChange={(e) => setUploadFiles(e.target.files)}
                data-testid="input-upload-files"
              />
              {uploadFiles && uploadFiles.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  已选择 {uploadFiles.length} 个文件
                </p>
              )}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUploadSubmit} data-testid="button-submit-upload">
              上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑学习资料</DialogTitle>
            <DialogDescription>修改文件名称和分类</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">标题</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                data-testid="input-edit-title"
              />
            </div>
            <div>
              <Label htmlFor="edit-category">分类</Label>
              <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                <SelectTrigger id="edit-category" data-testid="select-edit-category">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditSubmit} data-testid="button-submit-edit">
              保存
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
                <p className="text-muted-foreground">{selectedMaterial?.uploadDate}</p>
              </div>
            </div>
            <div className="border rounded-lg bg-muted/50 min-h-[400px] flex flex-col items-center justify-center overflow-hidden">
              {selectedMaterial?.fileType.startsWith('image/') && (
                <img 
                  src={URL.createObjectURL(selectedMaterial.file)} 
                  alt={selectedMaterial.title}
                  className="max-w-full max-h-[500px] object-contain"
                />
              )}
              {selectedMaterial?.fileType === 'application/pdf' && (
                <iframe
                  src={URL.createObjectURL(selectedMaterial.file)}
                  className="w-full h-[500px]"
                  title="PDF预览"
                />
              )}
              {selectedMaterial?.fileType.startsWith('text/') && (
                <div className="w-full h-[400px] overflow-auto p-4 bg-white">
                  {isLoadingText ? (
                    <p className="text-sm text-muted-foreground">加载中...</p>
                  ) : (
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {textFileContent}
                    </pre>
                  )}
                </div>
              )}
              {!selectedMaterial?.fileType.startsWith('image/') && 
               selectedMaterial?.fileType !== 'application/pdf' && 
               !selectedMaterial?.fileType.startsWith('text/') && (
                <div className="p-8 text-center">
                  <FileText className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
                  {selectedMaterial?.fileType.includes('word') || 
                   selectedMaterial?.fileType.includes('document') ||
                   selectedMaterial?.fileType.includes('excel') ||
                   selectedMaterial?.fileType.includes('spreadsheet') ||
                   selectedMaterial?.fileType.includes('powerpoint') ||
                   selectedMaterial?.fileType.includes('presentation') ? (
                    <>
                      <p className="text-lg font-medium text-muted-foreground mb-2">
                        Office文档（Word/Excel/PPT）
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        浏览器无法直接预览Office文档<br/>请点击下方按钮下载到本地查看
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground mb-4">
                      此文件类型暂不支持预览
                    </p>
                  )}
                  <Button onClick={() => selectedMaterial && handleDownload(selectedMaterial)}>
                    <Download className="h-4 w-4 mr-2" />
                    下载文件查看
                  </Button>
                </div>
              )}
            </div>
            {(selectedMaterial?.fileType.startsWith('image/') || selectedMaterial?.fileType === 'application/pdf') && (
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
