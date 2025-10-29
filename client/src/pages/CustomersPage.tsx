import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import CustomerTag from '@/components/CustomerTag';
import { Search, Plus, User, MessageSquare, Sparkles, TrendingUp, Ban, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CustomerTag {
  label: string;
  type: 'status' | 'learning' | 'conversion';
}

interface ConversationMessage {
  id: string;
  content: string;
  sender: 'customer' | 'agent';
  timestamp: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  tags: CustomerTag[];
  stage: string;
  lastContact: string;
  createdBy?: string; // 创建者ID
  blocked?: number; // 封锁状态 0=正常 1=已封锁
  channel?: string;
  date?: string;
  assistant?: string;
  group?: string;
  age?: string;
  location?: string;
  language?: string;
  country?: string;
  stockAge?: string;
  profitLoss?: string;
  stockSelection?: string;
  tradingHabit?: string;
  income?: string;
  family?: string;
  occupation?: string;
  hobbies?: string;
  groupPurpose?: string;
  other?: string;
  conversations?: ConversationMessage[];
  conversationCount?: number;
  replyCount?: number;
  lastReplyAt?: string;
  aiAnalysis?: string;
  recommendedScript?: string;
}

const allCustomerTags: CustomerTag[] = [
  { label: '不读不回', type: 'status' },
  { label: '已读不回', type: 'status' },
  { label: '进群', type: 'status' },
  { label: '接电话', type: 'status' },
  { label: '股民', type: 'learning' },
  { label: '小白', type: 'learning' },
  { label: '跟票1', type: 'learning' },
  { label: '跟票2', type: 'learning' },
  { label: '跟票3', type: 'learning' },
  { label: '跟票4', type: 'learning' },
  { label: '小课1', type: 'learning' },
  { label: '小课2', type: 'learning' },
  { label: '小课3', type: 'learning' },
  { label: '走心', type: 'conversion' },
  { label: '热聊', type: 'conversion' },
  { label: '开户', type: 'conversion' },
  { label: '入金', type: 'conversion' },
];

const mockCustomers: Customer[] = [
  {
    id: '1',
    name: '张明',
    phone: '1388',
    tags: [
      { label: '热聊', type: 'conversion' },
      { label: '股民', type: 'learning' },
      { label: '进群', type: 'status' },
      { label: '接电话', type: 'status' }
    ],
    stage: '热聊',
    lastContact: '2小时前',
    channel: '朋友圈广告',
    date: '2024-01-15',
    assistant: '小李',
    group: '投资交流群A',
    age: '35',
    location: '上海',
    stockAge: '5年',
    profitLoss: '略有盈利',
    stockSelection: '基本面分析',
    tradingHabit: '短线为主',
    income: '月入2-3万',
    family: '已婚有孩',
    occupation: '企业管理',
    hobbies: '阅读、跑步、投资理财',
    groupPurpose: '学习专业投资知识',
    other: '对长期价值投资感兴趣',
    conversations: [
      { id: '1', content: '张总您好，最近市场波动较大，您有什么看法吗？', sender: 'agent', timestamp: '10:30' },
      { id: '2', content: '确实，我最近在关注科技股，感觉有点不稳定', sender: 'customer', timestamp: '10:35' },
      { id: '3', content: '科技股确实波动大，根据您的风险偏好，我建议您可以配置一些稳健型的蓝筹股来平衡风险...', sender: 'agent', timestamp: '10:40' },
    ],
    aiAnalysis: '客户张明是一位有5年经验的股民，风险偏好中等。建议采用温和专业的沟通方式，强调风险控制和稳健收益。客户对基本面分析感兴趣，可以分享相关的行业研究报告。'
  },
  {
    id: '2',
    name: '李华',
    phone: '1366',
    tags: [
      { label: '开户', type: 'conversion' },
      { label: '小白', type: 'learning' },
      { label: '已读不回', type: 'status' }
    ],
    stage: '开户',
    lastContact: '1天前',
    channel: '抖音推广',
    date: '2024-01-20',
    assistant: '小王',
    age: '28',
    location: '北京',
    stockAge: '新手',
    profitLoss: '未入市',
    stockSelection: '跟随推荐',
    tradingHabit: '观望中',
    income: '月入1-2万',
    family: '未婚',
    occupation: 'IT工程师',
    hobbies: '游戏、健身',
    groupPurpose: '了解投资入门',
    conversations: [
      { id: '1', content: '李总，开户资料已经准备好了，今天方便完成最后一步吗？', sender: 'agent', timestamp: '昨天 14:00' },
      { id: '2', content: '今天比较忙，明天可以吗？', sender: 'customer', timestamp: '昨天 14:30' },
    ],
    aiAnalysis: '客户李华是投资新手，需要耐心引导。建议使用简单易懂的语言，避免专业术语。客户目前处于观望阶段，需要建立信任关系。'
  },
  {
    id: '3',
    name: '王芳',
    phone: '1599',
    tags: [
      { label: '入金', type: 'conversion' },
      { label: '走心', type: 'conversion' },
      { label: '接电话', type: 'status' }
    ],
    stage: '入金',
    lastContact: '3小时前',
    channel: '老客户推荐',
    date: '2024-01-10',
    assistant: '小张',
    group: '高端客户群',
    age: '42',
    location: '深圳',
    stockAge: '8年',
    profitLoss: '整体盈利',
    stockSelection: '技术分析',
    tradingHabit: '中长线',
    income: '月入5万+',
    family: '已婚有孩',
    occupation: '金融行业',
    hobbies: '高尔夫、旅游',
    groupPurpose: '寻找高端投资机会',
    other: '有海外投资经验',
    conversations: [],
    aiAnalysis: '高价值客户，投资经验丰富，建议提供专业的市场分析和个性化服务。客户信任度高，可以推荐高端产品。'
  }
];

interface User {
  id: string;
  username: string;
  name: string;
  nickname?: string;
  role: string;
  supervisorId?: string;
}

export default function CustomersPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerTags, setCustomerTags] = useState<CustomerTag[]>([]);
  const [ourMessage, setOurMessage] = useState('');
  const [customerReply, setCustomerReply] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('all'); // 筛选用户ID
  const [isUploadChatOpen, setIsUploadChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  
  // 保存队列：确保请求按顺序执行
  const saveQueueRef = useRef<Promise<any>>(Promise.resolve());

  // 获取所有用户列表（用于筛选）
  const { data: usersData } = useQuery<{ success: boolean; data: User[] }>({
    queryKey: ['/api/users'],
  });

  const users = usersData?.data || [];

  // 获取当前用户信息（用于显示）
  const currentUserStr = localStorage.getItem('currentUser');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  // 获取客户列表（后端从session读取用户信息，基于角色权限）
  const { data: customersData, isLoading } = useQuery<{ success: boolean; data: Customer[] }>({
    queryKey: ['/api/customers'],
  });

  const customers = customersData?.data || [];

  const filteredCustomers = customers
    .filter(customer => {
      // 按业务员筛选
      if (selectedUserId !== 'all' && customer.createdBy !== selectedUserId) {
        return false;
      }
      // 按搜索词筛选
      return (customer.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm);
    });

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerTags(customer.tags || []);
  };

  const handleTagToggle = (tag: CustomerTag) => {
    const isSelected = customerTags.some(t => t.label === tag.label);
    if (isSelected) {
      setCustomerTags(customerTags.filter(t => t.label !== tag.label));
    } else {
      setCustomerTags([...customerTags, tag]);
    }
    console.log('Tag toggled:', tag.label, isSelected ? 'removed' : 'added');
  };

  const handleAddOurMessage = async () => {
    if (!ourMessage.trim() || !selectedCustomer) return;
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    
    const newConversation: ConversationMessage = {
      id: Date.now().toString(),
      content: ourMessage,
      sender: 'agent',
      timestamp
    };
    
    // 更新对话次数
    const newConversationCount = ((selectedCustomer as any).conversationCount || 0) + 1;
    
    const updatedCustomer: any = {
      ...selectedCustomer,
      conversations: [...(selectedCustomer.conversations || []), newConversation],
      conversationCount: newConversationCount  // 更新本地状态
    };
    
    setSelectedCustomer(updatedCustomer);
    setOurMessage('');
    
    // 保存到数据库：更新对话次数
    try {
      await updateCustomerMutation.mutateAsync({
        id: selectedCustomer.id,
        data: { conversationCount: newConversationCount }
      });
    } catch (error) {
      console.error('更新对话次数失败:', error);
    }
    
    console.log('添加我们的消息:', ourMessage, '时间:', timestamp);
  };

  const handleAddCustomerReply = async () => {
    if (!customerReply.trim() || !selectedCustomer) return;
    const now = new Date();
    const timestamp = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const fullTimestamp = now.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const newConversation: ConversationMessage = {
      id: Date.now().toString(),
      content: customerReply,
      sender: 'customer',
      timestamp
    };
    
    // 更新回复次数和最后回复时间
    const newReplyCount = ((selectedCustomer as any).replyCount || 0) + 1;
    
    const updatedCustomer: any = {
      ...selectedCustomer,
      conversations: [...(selectedCustomer.conversations || []), newConversation],
      replyCount: newReplyCount,  // 更新本地状态
      lastReplyAt: fullTimestamp  // 更新本地状态
    };
    
    setSelectedCustomer(updatedCustomer);
    setCustomerReply('');
    
    // 保存到数据库：更新回复次数和最后回复时间
    try {
      await updateCustomerMutation.mutateAsync({
        id: selectedCustomer.id,
        data: { 
          replyCount: newReplyCount,
          lastReplyAt: fullTimestamp
        }
      });
    } catch (error) {
      console.error('更新回复统计失败:', error);
    }
    
    console.log('添加客户回复:', customerReply, '时间:', timestamp);
  };

  const handleAIAnalyze = async () => {
    if (!selectedCustomer) return;
    
    setIsAnalyzing(true);
    try {
      // 只发送非空字段给AI
      const customerData: any = {
        phone: selectedCustomer.phone,
        tags: (selectedCustomer.tags || []).map(t => t.label)
      };
      
      // 添加非空字段
      if (selectedCustomer.name) customerData.name = selectedCustomer.name;
      if (selectedCustomer.channel) customerData.channel = selectedCustomer.channel;
      if (selectedCustomer.age) customerData.age = selectedCustomer.age;
      if (selectedCustomer.location) customerData.location = selectedCustomer.location;
      if (selectedCustomer.stockAge) customerData.stockAge = selectedCustomer.stockAge;
      if (selectedCustomer.profitLoss) customerData.profitLoss = selectedCustomer.profitLoss;
      if (selectedCustomer.stockSelection) customerData.stockSelection = selectedCustomer.stockSelection;
      if (selectedCustomer.tradingHabit) customerData.tradingHabit = selectedCustomer.tradingHabit;
      if (selectedCustomer.income) customerData.income = selectedCustomer.income;
      if (selectedCustomer.family) customerData.family = selectedCustomer.family;
      if (selectedCustomer.occupation) customerData.occupation = selectedCustomer.occupation;
      if (selectedCustomer.hobbies) customerData.hobbies = selectedCustomer.hobbies;
      if (selectedCustomer.groupPurpose) customerData.groupPurpose = selectedCustomer.groupPurpose;
      if (selectedCustomer.other) customerData.other = selectedCustomer.other;
      
      // 国际化字段
      if ((selectedCustomer as any).language) customerData.language = (selectedCustomer as any).language;
      if ((selectedCustomer as any).country) customerData.country = (selectedCustomer as any).country;
      
      // 互动数据字段 - 用于粘度分析
      if ((selectedCustomer as any).lastReplyAt) customerData.lastReplyAt = (selectedCustomer as any).lastReplyAt;
      if ((selectedCustomer as any).conversationCount !== undefined) customerData.conversationCount = (selectedCustomer as any).conversationCount;
      if ((selectedCustomer as any).replyCount !== undefined) customerData.replyCount = (selectedCustomer as any).replyCount;
      
      // ⚠️ 关键：发送对话记录给AI（之前漏掉了这个字段！）
      if ((selectedCustomer as any).conversations && Array.isArray((selectedCustomer as any).conversations)) {
        customerData.conversations = (selectedCustomer as any).conversations;
      }
      
      // 状态字段（重要：已成交客户需要特殊处理）
      if ((selectedCustomer as any).stage) customerData.stage = (selectedCustomer as any).stage;
      
      const requestData = {
        customerId: selectedCustomer.id,
        customer: customerData,
        useCache: false
      };
      
      console.log('AI分析请求数据:', requestData);
      
      const response = await fetch('/api/ai/analyze-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error('AI分析失败');
      }

      const result = await response.json();
      
      // 从AI返回的JSON中提取summary字段作为分析结果
      const analysisText = typeof result.data === 'object' && result.data.summary
        ? result.data.summary
        : typeof result.data === 'string'
        ? result.data
        : 'AI分析完成，请查看客户详情';
      
      // 提取AI生成的推荐话术
      const recommendedScript = typeof result.data === 'object' && result.data.recommendedScript
        ? result.data.recommendedScript
        : '';
      
      // 更新客户的AI分析结果和推荐话术并保存到数据库
      const updatedCustomer = {
        ...selectedCustomer,
        aiAnalysis: analysisText,
        recommendedScript: recommendedScript
      };
      
      // 保存到数据库
      await updateCustomerMutation.mutateAsync({
        id: selectedCustomer.id,
        data: { 
          aiAnalysis: analysisText,
          recommendedScript: recommendedScript
        }
      });
      
      setSelectedCustomer(updatedCustomer);
      
      toast({
        title: "分析完成",
        description: "AI已完成客户分析",
      });
    } catch (error) {
      console.error('AI分析失败:', error);
      toast({
        title: "分析失败",
        description: "AI分析遇到问题，请稍后重试",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 添加客户 mutation
  const addCustomerMutation = useMutation({
    mutationFn: async (phone: string) => {
      // createdBy从后端session自动获取，不再由前端提供（安全）
      return await apiRequest('POST', '/api/customers', { 
        phone
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "成功",
        description: "客户添加成功",
      });
      setNewCustomerPhone('');
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "错误",
        description: error.message || "添加客户失败",
        variant: "destructive",
      });
    }
  });

  // 更新客户 mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Customer> }) => {
      return await apiRequest('PATCH', `/api/customers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
    },
    onError: (error: Error) => {
      toast({
        title: "保存失败",
        description: error.message || "请稍后重试",
        variant: "destructive",
      });
    }
  });

  // 切换客户封锁状态
  const toggleBlockMutation = useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: number }) => {
      return await apiRequest('PATCH', `/api/customers/${id}`, { blocked });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: variables.blocked === 1 ? "客户已封锁" : "客户已解封",
        description: variables.blocked === 1 ? "该客户已被移至封锁池" : "该客户已恢复正常",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "操作失败",
        description: error.message || "请稍后重试",
        variant: "destructive",
      });
    }
  });

  // 上传聊天记录
  const uploadChatMutation = useMutation({
    mutationFn: async ({ id, chatText }: { id: string; chatText: string }) => {
      return await apiRequest('POST', `/api/customers/${id}/upload-chat`, { chatText });
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      
      // 更新本地选中的客户
      if (selectedCustomer && response?.data) {
        setSelectedCustomer(response.data);
      }
      
      toast({
        title: "上传成功",
        description: response?.message || "聊天记录已成功导入",
      });
      
      // 关闭对话框并清空输入
      setIsUploadChatOpen(false);
      setChatText('');
    },
    onError: (error: Error) => {
      toast({
        title: "上传失败",
        description: error.message || "请检查聊天记录格式",
        variant: "destructive",
      });
    }
  });

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.name.endsWith('.txt')) {
      toast({
        title: "文件格式错误",
        description: "请上传 .txt 格式的文件",
        variant: "destructive",
      });
      event.target.value = ''; // 重置文件输入
      return;
    }

    // 读取文件内容
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setChatText(content);
      
      // 计算文件大小（KB或MB）
      const sizeKB = (file.size / 1024).toFixed(2);
      const sizeDisplay = file.size > 1024 * 1024 
        ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
        : `${sizeKB} KB`;
      
      toast({
        title: "文件读取成功",
        description: `已读取 ${file.name} (${sizeDisplay})`,
      });
      
      // 重置文件输入，允许重复上传相同文件
      event.target.value = '';
    };
    reader.onerror = () => {
      toast({
        title: "文件读取失败",
        description: "请检查文件是否损坏",
        variant: "destructive",
      });
      event.target.value = ''; // 重置文件输入
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleUploadChat = () => {
    if (!selectedCustomer || !chatText.trim()) {
      toast({
        title: "提示",
        description: "请粘贴聊天记录内容或上传txt文件",
        variant: "destructive",
      });
      return;
    }
    
    uploadChatMutation.mutate({
      id: selectedCustomer.id,
      chatText: chatText
    });
  };

  const handleAddCustomer = () => {
    if (!newCustomerPhone.trim() || newCustomerPhone.length !== 4) {
      toast({
        title: "提示",
        description: "请输入4位手机尾号",
        variant: "destructive",
      });
      return;
    }
    
    addCustomerMutation.mutate(newCustomerPhone);
  };

  // 自动保存客户字段（使用队列确保顺序）
  const handleFieldBlur = (field: string, value: string) => {
    if (!selectedCustomer) return;
    
    // 检查值是否真的改变了
    const currentValue = selectedCustomer[field as keyof Customer];
    const newValue = value || null;
    
    if (currentValue === newValue || (!currentValue && !newValue)) {
      return; // 值没有改变，不保存
    }
    
    const customerId = selectedCustomer.id;
    const previousValue = currentValue;
    
    // 先更新本地state，提供即时反馈
    const updatedCustomer = {
      ...selectedCustomer,
      [field]: newValue,
    };
    setSelectedCustomer(updatedCustomer);
    
    // 将保存操作添加到队列，确保按顺序执行
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      try {
        await updateCustomerMutation.mutateAsync({
          id: customerId,
          data: { [field]: newValue }
        });
      } catch (error) {
        // 错误已通过mutation的onError处理
        // 只在当前客户ID匹配且字段值仍然是我们设置的newValue时才回滚
        setSelectedCustomer(prev => {
          if (prev && prev.id === customerId && prev[field as keyof Customer] === newValue) {
            return { ...prev, [field]: previousValue };
          }
          return prev;
        });
      }
    });
  };

  // 保存所有修改（标签等）
  const handleSaveCustomer = async () => {
    if (!selectedCustomer) return;
    
    try {
      await updateCustomerMutation.mutateAsync({
        id: selectedCustomer.id,
        data: {
          tags: customerTags.length > 0 ? customerTags : [],
        }
      });
      
      toast({
        title: "成功",
        description: "标签已保存",
      });
    } catch (error) {
      // 错误已通过mutation的onError处理，不需要额外toast
    }
  };

  // 处理下拉框变化（使用队列确保顺序）
  const handleSelectChange = (field: string, value: string) => {
    if (!selectedCustomer) return;
    
    // 检查值是否改变
    const currentValue = selectedCustomer[field as keyof Customer];
    const newValue = value || null;
    
    if (currentValue === newValue) {
      return; // 值没有改变，不保存
    }
    
    const customerId = selectedCustomer.id;
    const previousValue = currentValue;
    
    // 先更新本地state，提供即时反馈
    const updatedCustomer = {
      ...selectedCustomer,
      [field]: newValue,
    };
    setSelectedCustomer(updatedCustomer);
    
    // 将保存操作添加到队列，确保按顺序执行
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      try {
        await updateCustomerMutation.mutateAsync({
          id: customerId,
          data: { [field]: newValue }
        });
      } catch (error) {
        // 错误已通过mutation的onError处理
        // 只在当前客户ID匹配且字段值仍然是我们设置的newValue时才回滚
        setSelectedCustomer(prev => {
          if (prev && prev.id === customerId && prev[field as keyof Customer] === newValue) {
            return { ...prev, [field]: previousValue };
          }
          return prev;
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">客户管理</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-customer">
              <Plus className="h-4 w-4 mr-2" />
              添加客户
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加新客户</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="phone">手机后四位 *</Label>
                <Input
                  id="phone"
                  placeholder="请输入4位数字"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  data-testid="input-new-customer-phone"
                />
                <p className="text-xs text-muted-foreground">
                  只需输入手机后四位即可添加，其他信息后续可补充
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setNewCustomerPhone('');
                  }}
                  data-testid="button-cancel-add-customer"
                >
                  取消
                </Button>
                <Button
                  onClick={handleAddCustomer}
                  data-testid="button-confirm-add-customer"
                >
                  添加
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索客户姓名或电话..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-customer"
          />
        </div>
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="w-48" data-testid="select-user-filter">
            <SelectValue placeholder="筛选业务员" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部业务员</SelectItem>
            {users
              .filter(u => u.role === '业务' || u.role === '经理')
              .map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}（{user.role}）
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
          <Dialog key={customer.id}>
            <DialogTrigger asChild>
              <Card 
                className={`p-4 hover-elevate cursor-pointer transition-all ${customer.blocked === 1 ? 'opacity-60 border-destructive' : ''}`}
                onClick={() => handleCustomerSelect(customer)}
                data-testid={`customer-card-${customer.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${customer.blocked === 1 ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                      {customer.blocked === 1 ? (
                        <Ban className="h-5 w-5 text-destructive" />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{customer.name || `客户 ${customer.phone}`}</h3>
                        {customer.blocked === 1 && (
                          <Badge variant="destructive" className="text-xs">已封锁</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">尾号 {customer.phone}</p>
                      {customer.createdBy && (
                        <p className="text-xs text-muted-foreground">
                          业务员: {users.find(u => u.id === customer.createdBy)?.name || '未知'}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary">{customer.stage}</Badge>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {customer.tags && customer.tags.slice(0, 6).map((tag, idx) => (
                    <CustomerTag key={idx} label={tag.label} type={tag.type} />
                  ))}
                  {customer.tags && customer.tags.length > 6 && (
                    <Badge variant="outline">+{customer.tags.length - 6}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">最后联系: {customer.lastContact}</p>
              </Card>
            </DialogTrigger>
            {(() => {
              const isOwner = customer.createdBy === currentUser?.id;
              const ownerName = users.find(u => u.id === customer.createdBy)?.name || '未知';
              
              return (
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>客户详情 - {customer.name || `客户 ${customer.phone}`}</DialogTitle>
                  </DialogHeader>
                  
                  {!isOwner && customer.createdBy && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-4">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        此客户由 <strong>{ownerName}</strong> 创建，只有创建者可以修改标签和画像
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2 mb-4">
                    <Button 
                      className="flex-1" 
                      onClick={handleSaveCustomer}
                      disabled={updateCustomerMutation.isPending || !isOwner}
                      data-testid="button-save-customer"
                    >
                      {updateCustomerMutation.isPending ? '保存中...' : '保存标签'}
                    </Button>
                    {isOwner && (
                      <Button
                        variant={customer.blocked === 1 ? "default" : "destructive"}
                        onClick={() => {
                          toggleBlockMutation.mutate({
                            id: customer.id,
                            blocked: customer.blocked === 1 ? 0 : 1
                          });
                        }}
                        disabled={toggleBlockMutation.isPending}
                        data-testid="button-toggle-block"
                      >
                        {toggleBlockMutation.isPending ? '处理中...' : (customer.blocked === 1 ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            解封客户
                          </>
                        ) : (
                          <>
                            <Ban className="h-4 w-4 mr-2" />
                            封锁客户
                          </>
                        ))}
                      </Button>
                    )}
                  </div>
                  
                  <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="profile">客户画像</TabsTrigger>
                      <TabsTrigger value="conversation">对话记录</TabsTrigger>
                      <TabsTrigger value="ai">AI分析</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="profile" className="space-y-4 mt-4">
                      <div>
                        <h4 className="font-medium mb-3">客户标签（点击选择/取消）</h4>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {allCustomerTags.map((tag, idx) => (
                            <div 
                              key={idx}
                              onClick={() => isOwner && handleTagToggle(tag)}
                              className={isOwner ? "cursor-pointer" : "cursor-not-allowed opacity-50"}
                              data-testid={`tag-toggle-${tag.label}`}
                            >
                              <CustomerTag 
                                label={tag.label} 
                                type={tag.type}
                                selected={customerTags.some(t => t.label === tag.label)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>姓名</Label>
                      <Input 
                        defaultValue={customer.name || ''} 
                        onBlur={(e) => handleFieldBlur('name', e.target.value)}
                        disabled={!isOwner}
                        data-testid="input-customer-name" 
                      />
                    </div>
                    <div>
                      <Label>电话后四位</Label>
                      <Input 
                        defaultValue={customer.phone} 
                        onBlur={(e) => handleFieldBlur('phone', e.target.value)}
                        disabled={!isOwner}
                        data-testid="input-customer-phone" 
                      />
                    </div>
                    <div>
                      <Label>渠道</Label>
                      <Input 
                        defaultValue={customer.channel || ''} 
                        placeholder="请输入" 
                        onBlur={(e) => handleFieldBlur('channel', e.target.value)}
                        disabled={!isOwner}
                        data-testid="input-customer-channel" 
                      />
                    </div>
                    <div>
                      <Label>日期</Label>
                      <Input 
                        type="date" 
                        defaultValue={customer.date || ''} 
                        onBlur={(e) => handleFieldBlur('date', e.target.value)}
                        disabled={!isOwner}
                        data-testid="input-customer-date" 
                      />
                    </div>
                    <div>
                      <Label>接粉助理</Label>
                      <Input 
                        defaultValue={customer.assistant || ''} 
                        placeholder="请输入" 
                        onBlur={(e) => handleFieldBlur('assistant', e.target.value)}
                        disabled={!isOwner}
                        data-testid="input-customer-assistant" 
                      />
                    </div>
                    <div>
                      <Label>群</Label>
                      <Input 
                        defaultValue={customer.group || ''} 
                        placeholder="请输入" 
                        onBlur={(e) => handleFieldBlur('group', e.target.value)}
                        disabled={!isOwner}
                        data-testid="input-customer-group" 
                      />
                    </div>
                    <div>
                      <Label>年龄</Label>
                      <Input 
                        defaultValue={customer.age || ''} 
                        placeholder="请输入" 
                        onBlur={(e) => handleFieldBlur('age', e.target.value)}
                        disabled={!isOwner}
                        data-testid="input-customer-age" 
                      />
                    </div>
                    <div>
                      <Label>地址</Label>
                      <Input 
                        defaultValue={customer.location || ''} 
                        placeholder="请输入" 
                        onBlur={(e) => handleFieldBlur('location', e.target.value)}
                        disabled={!isOwner}
                        data-testid="input-customer-location" 
                      />
                    </div>
                    <div>
                      <Label>语言</Label>
                      <Select 
                        defaultValue={customer.language || ''}
                        onValueChange={(value) => handleSelectChange('language', value)}
                        disabled={!isOwner}
                      >
                        <SelectTrigger data-testid="select-customer-language">
                          <SelectValue placeholder="请选择" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="中文">中文</SelectItem>
                          <SelectItem value="英语">英语</SelectItem>
                          <SelectItem value="日语">日语</SelectItem>
                          <SelectItem value="韩语">韩语</SelectItem>
                          <SelectItem value="法语">法语</SelectItem>
                          <SelectItem value="德语">德语</SelectItem>
                          <SelectItem value="西班牙语">西班牙语</SelectItem>
                          <SelectItem value="其他">其他</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>国家/地区</Label>
                      <Select 
                        defaultValue={customer.country || ''}
                        onValueChange={(value) => handleSelectChange('country', value)}
                        disabled={!isOwner}
                      >
                        <SelectTrigger data-testid="select-customer-country">
                          <SelectValue placeholder="请选择" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="美国">美国</SelectItem>
                          <SelectItem value="西班牙">西班牙</SelectItem>
                          <SelectItem value="加拿大">加拿大</SelectItem>
                          <SelectItem value="华侨">华侨</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>股龄</Label>
                      <Input 
                        defaultValue={customer.stockAge || ''} 
                        placeholder="请输入" 
                        onBlur={(e) => handleFieldBlur('stockAge', e.target.value)}
                        disabled={!isOwner}
                        data-testid="input-customer-stock-age" 
                      />
                    </div>
                    <div>
                      <Label>盈亏</Label>
                      <Select 
                        defaultValue={customer.profitLoss || ''}
                        onValueChange={(value) => handleSelectChange('profitLoss', value)}
                        disabled={!isOwner}
                      >
                        <SelectTrigger data-testid="select-customer-profit-loss">
                          <SelectValue placeholder="请选择" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="整体盈利">整体盈利</SelectItem>
                          <SelectItem value="略有盈利">略有盈利</SelectItem>
                          <SelectItem value="持平">持平</SelectItem>
                          <SelectItem value="小幅亏损">小幅亏损</SelectItem>
                          <SelectItem value="较大亏损">较大亏损</SelectItem>
                          <SelectItem value="未入市">未入市</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>选股方式</Label>
                      <Select 
                        defaultValue={customer.stockSelection || ''}
                        onValueChange={(value) => handleSelectChange('stockSelection', value)}
                        disabled={!isOwner}
                      >
                        <SelectTrigger data-testid="select-customer-stock-selection">
                          <SelectValue placeholder="请选择" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="基本面分析">基本面分析</SelectItem>
                          <SelectItem value="技术分析">技术分析</SelectItem>
                          <SelectItem value="跟随推荐">跟随推荐</SelectItem>
                          <SelectItem value="消息面">消息面</SelectItem>
                          <SelectItem value="随机选择">随机选择</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>操作习惯</Label>
                      <Select 
                        defaultValue={customer.tradingHabit || ''}
                        onValueChange={(value) => handleSelectChange('tradingHabit', value)}
                        disabled={!isOwner}
                      >
                        <SelectTrigger data-testid="select-customer-trading-habit">
                          <SelectValue placeholder="请选择" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="短线为主">短线为主</SelectItem>
                          <SelectItem value="中长线">中长线</SelectItem>
                          <SelectItem value="长期持有">长期持有</SelectItem>
                          <SelectItem value="观望中">观望中</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>工作收入</Label>
                      <Input 
                        defaultValue={customer.income || ''} 
                        placeholder="请输入" 
                        onBlur={(e) => handleFieldBlur('income', e.target.value)}
                        disabled={!isOwner}
                        data-testid="input-customer-income" 
                      />
                    </div>
                    <div>
                      <Label>家庭情况</Label>
                      <Input 
                        defaultValue={customer.family || ''} 
                        placeholder="请输入" 
                        onBlur={(e) => handleFieldBlur('family', e.target.value)}
                        disabled={!isOwner}
                        data-testid="input-customer-family" 
                      />
                    </div>
                    <div>
                      <Label>职业</Label>
                      <Input 
                        defaultValue={customer.occupation || ''} 
                        placeholder="请输入" 
                        onBlur={(e) => handleFieldBlur('occupation', e.target.value)}
                        disabled={!isOwner}
                        data-testid="input-customer-occupation" 
                      />
                    </div>
                    <div>
                      <Label>兴趣爱好</Label>
                      <Input 
                        defaultValue={customer.hobbies || ''} 
                        placeholder="请输入" 
                        onBlur={(e) => handleFieldBlur('hobbies', e.target.value)}
                        disabled={!isOwner}
                        data-testid="input-customer-hobbies" 
                      />
                    </div>
                    <div>
                      <Label>进群目的</Label>
                      <Input 
                        defaultValue={customer.groupPurpose || ''} 
                        placeholder="请输入" 
                        onBlur={(e) => handleFieldBlur('groupPurpose', e.target.value)}
                        disabled={!isOwner}
                        data-testid="input-customer-group-purpose" 
                      />
                    </div>
                    <div>
                      <Label>其他</Label>
                      <Input 
                        defaultValue={customer.other || ''} 
                        placeholder="请输入" 
                        onBlur={(e) => handleFieldBlur('other', e.target.value)}
                        disabled={!isOwner}
                        data-testid="input-customer-other" 
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    ✓ 所有字段失焦后自动保存
                  </p>
                </TabsContent>

                <TabsContent value="conversation" className="space-y-4 mt-4">
                  <div className="flex justify-end mb-2">
                    <Dialog open={isUploadChatOpen} onOpenChange={setIsUploadChatOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={!isOwner}
                          data-testid="button-upload-chat"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          导入聊天记录
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>导入WhatsApp聊天记录</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="bg-muted/50 p-3 rounded-lg text-sm">
                            <p className="font-medium mb-2">支持的格式：</p>
                            <code className="text-xs block bg-background p-2 rounded">
                              [26/10/25 06:41:30] 姓名: 消息内容<br />
                              [26/10/25 06:42:15] 另一个人: 回复内容
                            </code>
                          </div>
                          
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label>粘贴聊天记录或上传文件</Label>
                              <div>
                                <input
                                  type="file"
                                  accept=".txt"
                                  onChange={handleFileUpload}
                                  className="hidden"
                                  id="chat-file-upload"
                                  data-testid="input-file-upload"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => document.getElementById('chat-file-upload')?.click()}
                                  data-testid="button-choose-file"
                                >
                                  📁 选择txt文件
                                </Button>
                              </div>
                            </div>
                            <Textarea
                              value={chatText}
                              onChange={(e) => setChatText(e.target.value)}
                              placeholder="粘贴完整的聊天记录，或点击上方按钮上传txt文件..."
                              className="h-64 font-mono text-xs"
                              data-testid="textarea-chat-upload"
                            />
                          </div>
                          
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsUploadChatOpen(false);
                                setChatText('');
                              }}
                              data-testid="button-cancel-upload"
                            >
                              取消
                            </Button>
                            <Button
                              onClick={handleUploadChat}
                              disabled={uploadChatMutation.isPending || !chatText.trim()}
                              data-testid="button-confirm-upload"
                            >
                              {uploadChatMutation.isPending ? '导入中...' : '导入'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="border rounded-lg p-4 h-96 overflow-y-auto space-y-3">
                    {selectedCustomer?.conversations && selectedCustomer.conversations.length > 0 ? (
                      selectedCustomer.conversations.map((msg, index) => (
                        <div
                          key={`${msg.timestamp}-${index}`}
                          className={`flex ${msg.role === 'agent' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              msg.role === 'agent'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <div className="text-xs font-semibold mb-1">{msg.sender}</div>
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1">{msg.timestamp}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mb-2" />
                        <p>暂无对话记录</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3 border-t pt-4">
                    {/* 我们发送 */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        我们发送
                      </Label>
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="输入我们发送的消息..."
                          value={ourMessage}
                          onChange={(e) => setOurMessage(e.target.value)}
                          className="flex-1"
                          rows={2}
                          disabled={!isOwner}
                          data-testid="textarea-our-message"
                        />
                        <Button 
                          onClick={handleAddOurMessage} 
                          data-testid="button-send-our-message"
                          className="self-end"
                          disabled={!isOwner}
                        >
                          发送
                        </Button>
                      </div>
                    </div>

                    {/* 客户回复 */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        客户回复
                        <span className="text-xs text-muted-foreground font-normal">（可能为中文/西班牙语/英语等）</span>
                      </Label>
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="输入客户回复的消息（支持多语言）..."
                          value={customerReply}
                          onChange={(e) => setCustomerReply(e.target.value)}
                          className="flex-1"
                          rows={2}
                          disabled={!isOwner}
                          data-testid="textarea-customer-reply"
                        />
                        <Button 
                          onClick={handleAddCustomerReply} 
                          data-testid="button-send-customer-reply"
                          variant="outline"
                          className="self-end"
                          disabled={!isOwner}
                        >
                          记录
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ai" className="space-y-4 mt-4">
                  {/* 互动统计卡片 */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">我们发送</p>
                          <p className="text-2xl font-bold">{(customer as any).conversationCount || 0}</p>
                        </div>
                        <MessageSquare className="h-8 w-8 text-primary/50" />
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">客户回复</p>
                          <p className="text-2xl font-bold">{(customer as any).replyCount || 0}</p>
                        </div>
                        <MessageSquare className="h-8 w-8 text-green-500/50" />
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">回复率</p>
                          <p className="text-2xl font-bold">
                            {((customer as any).conversationCount || 0) > 0 
                              ? Math.round(((customer as any).replyCount || 0) / ((customer as any).conversationCount || 1) * 100)
                              : 0}%
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-blue-500/50" />
                      </div>
                    </Card>
                  </div>
                  
                  {(customer as any).lastReplyAt && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">
                        <strong>最后回复时间：</strong>{(customer as any).lastReplyAt}
                      </p>
                    </div>
                  )}

                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h4 className="font-medium">AI 智能分析</h4>
                    </div>
                    <p className="text-sm mb-4">
                      {customer.aiAnalysis || 'AI 将根据客户画像和对话历史，为您提供个性化的沟通建议和销售策略。'}
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleAIAnalyze}
                      disabled={isAnalyzing}
                      data-testid="button-ai-analyze"
                    >
                      <Sparkles className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      {isAnalyzing ? '分析中...' : '重新分析'}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">推荐话术</h4>
                    {(customer as any).recommendedScript ? (
                      <Card className="p-3 bg-primary/5">
                        <p className="text-sm whitespace-pre-wrap">
                          {(customer as any).recommendedScript}
                        </p>
                      </Card>
                    ) : (
                      <Card className="p-3 bg-muted/50">
                        <p className="text-sm text-muted-foreground">
                          点击"重新分析"按钮，AI将根据客户画像生成个性化话术
                        </p>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
                </DialogContent>
              );
            })()}
          </Dialog>
        ))}
      </div>
    </div>
  );
}
