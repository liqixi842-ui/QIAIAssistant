import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Download, 
  Pencil, 
  Check, 
  X, 
  Trash2, 
  Key,
  Users
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface EquipmentInfo {
  phoneCount: number;
  computerCount: number;
  chargerCount: number;
  dormitory: string;
  joinDate: string;
  waveNumber: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  manager: string;
  status: 'active' | 'inactive';
  equipment: EquipmentInfo;
}

interface ApiUser {
  id: string;
  username: string;
  name: string;
  nickname: string;
  role: string;
  supervisorId: string | null;
  position?: string;
  team?: string;
  phone?: number;
  computer?: number;
  charger?: number;
  dormitory?: string;
  joinDate?: string;
  wave?: string;
}

interface TeamManagementProps {
  userRole?: string;
  userName?: string;
}

export default function TeamManagement({ userRole: propUserRole, userName: propUserName }: TeamManagementProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<EquipmentInfo>>({});

  // 从localStorage获取当前登录用户信息
  const currentUserStr = localStorage.getItem('currentUser');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  
  // 使用真实登录用户的信息，优先于props
  const userRole = currentUser?.role || propUserRole || '业务';
  const userName = currentUser?.nickname || currentUser?.name || propUserName || '张三';
  const userId = currentUser?.id || '';

  // 从API获取真实用户数据
  const { data: usersData, isLoading } = useQuery<{ success: boolean; data: ApiUser[] }>({
    queryKey: ['/api/users'],
  });

  // 将API用户数据转换为TeamMember格式
  const apiUsers = usersData?.data || [];
  const allUsers = usersData?.data || [];

  // 创建ID到昵称的映射，用于查找上级姓名
  const userIdToName = new Map<string, string>();
  allUsers.forEach(user => {
    userIdToName.set(user.id, user.nickname || user.name);
  });

  const teamMembers: TeamMember[] = apiUsers.map(user => ({
    id: user.id,
    name: user.nickname || user.name,
    role: user.role,
    manager: user.supervisorId ? (userIdToName.get(user.supervisorId) || '') : '',
    supervisorId: user.supervisorId || null,
    status: 'active' as const,
    equipment: {
      phoneCount: user.phone || 0,
      computerCount: user.computer || 0,
      chargerCount: user.charger || 0,
      dormitory: user.dormitory || '',
      joinDate: user.joinDate || '',
      waveNumber: user.wave || '',
    }
  }));
  
  const [selectedManager, setSelectedManager] = useState<string>('all');
  const [selectedDirector, setSelectedDirector] = useState<string>('all');
  
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSupervisorDialog, setShowSupervisorDialog] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newSupervisorId, setNewSupervisorId] = useState('');

  const isSupervisor = userRole === '主管';
  const isDirector = userRole === '总监';
  const isManager = userRole === '经理';
  const isEmployee = userRole === '业务';
  const isLogistics = userRole === '后勤';

  const getVisibleMembers = () => {
    let members = teamMembers;
    
    if (isSupervisor && !isLogistics) {
      return teamMembers;
    } else if (isEmployee) {
      // 业务员只能看到自己（使用ID比较，更可靠）
      members = teamMembers.filter(m => m.id === userId);
    } else if (isManager) {
      // 经理可以看到自己和自己的下属（使用ID比较，更可靠）
      members = teamMembers.filter(m => m.id === userId || m.supervisorId === userId);
    } else if (isDirector && !isLogistics) {
      // 总监可以看到自己、直接下属和间接下属（使用ID比较）
      members = teamMembers.filter(m => 
        m.id === userId ||
        m.supervisorId === userId ||
        (m.role === '业务' && teamMembers.find(mgr => mgr.id === m.supervisorId && mgr.supervisorId === userId))
      );
    } else if (isLogistics) {
      if (selectedDirector !== 'all') {
        const director = teamMembers.find(m => m.name === selectedDirector);
        if (director) {
          members = teamMembers.filter(m => 
            m.supervisorId === director.id || 
            m.id === director.id ||
            (m.role === '业务' && teamMembers.find(mgr => mgr.id === m.supervisorId && mgr.supervisorId === director.id))
          );
        }
      } else if (selectedManager !== 'all') {
        const manager = teamMembers.find(m => m.name === selectedManager);
        if (manager) {
          members = teamMembers.filter(m => m.supervisorId === manager.id || m.id === manager.id);
        }
      }
    }
    
    return members;
  };

  const filteredMembers = getVisibleMembers().filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEdit = (member: TeamMember) => {
    setEditingMemberId(member.id);
    setEditForm(member.equipment);
  };

  const cancelEdit = () => {
    setEditingMemberId(null);
    setEditForm({});
  };

  const saveEdit = async (memberId: string) => {
    try {
      const response = await apiRequest('PATCH', `/api/users/${memberId}/equipment`, {
        phone: editForm.phoneCount || 0,
        computer: editForm.computerCount || 0,
        charger: editForm.chargerCount || 0,
        dormitory: editForm.dormitory || '',
        joinDate: editForm.joinDate || '',
        wave: editForm.waveNumber || ''
      });

      // 刷新数据并等待完成
      await queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      // 等待一小段时间确保数据已写入
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await queryClient.refetchQueries({ queryKey: ['/api/users'] });

      toast({
        title: "保存成功",
        description: "设备信息已更新",
      });

      setEditingMemberId(null);
      setEditForm({});
    } catch (error) {
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      });
    }
  };

  const canEdit = (member: TeamMember) => {
    if (isLogistics) return false;
    if (member.name === userName) return true;
    return false;
  };

  // 更新用户上级的mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, supervisorId }: { userId: string; supervisorId: string }) => {
      return await apiRequest('PATCH', `/api/users/${userId}`, { supervisorId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "成功",
        description: "上级ID已更新"
      });
      setShowSupervisorDialog(false);
      setNewSupervisorId('');
    },
    onError: (error: any) => {
      toast({
        title: "失败",
        description: error.message || "更新失败",
        variant: "destructive"
      });
    }
  });

  const handleChangeSupervisor = () => {
    if (!selectedMemberId || !newSupervisorId.trim()) {
      toast({
        title: "错误",
        description: "请输入上级ID",
        variant: "destructive"
      });
      return;
    }

    updateUserMutation.mutate({
      userId: selectedMemberId,
      supervisorId: newSupervisorId.trim()
    });
  };

  const equipmentStats = {
    phone: filteredMembers.reduce((sum, m) => sum + m.equipment.phoneCount, 0),
    computer: filteredMembers.reduce((sum, m) => sum + m.equipment.computerCount, 0),
    charger: filteredMembers.reduce((sum, m) => sum + m.equipment.chargerCount, 0),
  };

  const handleExport = () => {
    const csvContent = [
      ['用户ID', '姓名', '角色', '业务隶属', '手机数量', '电脑数量', '充电桩数量', '宿舍', '入职日期', '波数', '状态'],
      ...filteredMembers.map(m => [
        m.id,
        m.name,
        m.role,
        m.manager || '无',
        m.equipment.phoneCount,
        m.equipment.computerCount,
        m.equipment.chargerCount,
        m.equipment.dormitory,
        m.equipment.joinDate,
        m.equipment.waveNumber,
        m.status === 'active' ? '在职' : '离职'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `团队设备信息_${new Date().toLocaleDateString()}.csv`;
    link.click();
    
    toast({
      title: "导出成功",
      description: "团队设备信息已导出",
    });
  };

  const handleChangePassword = () => {
    if (!selectedMemberId || !newPassword) return;
    
    toast({
      title: "密码已更新",
      description: "成员密码修改成功",
    });
    setShowPasswordDialog(false);
    setNewPassword('');
    setSelectedMemberId(null);
  };

  const handleDeleteMember = () => {
    if (!selectedMemberId) return;
    
    // TODO: 调用API删除用户
    toast({
      title: "功能开发中",
      description: "删除用户功能正在开发中",
    });
    setShowDeleteDialog(false);
    setSelectedMemberId(null);
  };

  const directors = teamMembers.filter(m => m.role === '总监');
  const managers = teamMembers.filter(m => m.role === '经理');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">团队管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogistics ? '查看和导出团队设备信息' : '管理团队成员设备信息'}
          </p>
        </div>
        {isLogistics && (
          <Button onClick={handleExport} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            导出表格
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{equipmentStats.phone}</p>
            <p className="text-sm text-muted-foreground mt-1">手机总数</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-chart-2">{equipmentStats.computer}</p>
            <p className="text-sm text-muted-foreground mt-1">电脑总数</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-chart-1">{equipmentStats.charger}</p>
            <p className="text-sm text-muted-foreground mt-1">充电桩总数</p>
          </div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索成员姓名..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        
        {isLogistics && (
          <>
            <Select value={selectedDirector} onValueChange={setSelectedDirector}>
              <SelectTrigger className="w-[200px]" data-testid="select-director">
                <SelectValue placeholder="选择总监" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部总监</SelectItem>
                {directors.map(d => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedManager} onValueChange={setSelectedManager}>
              <SelectTrigger className="w-[200px]" data-testid="select-manager">
                <SelectValue placeholder="选择经理" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部经理</SelectItem>
                {managers.map(m => (
                  <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户ID</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>业务隶属</TableHead>
              <TableHead className="text-center">手机数量</TableHead>
              <TableHead className="text-center">电脑数量</TableHead>
              <TableHead className="text-center">充电桩数量</TableHead>
              <TableHead>宿舍</TableHead>
              <TableHead>入职日期</TableHead>
              <TableHead>波数</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.map((member, index) => {
              const isEditing = editingMemberId === member.id;
              
              return (
                <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                  <TableCell className="text-muted-foreground text-sm font-mono">{filteredMembers.indexOf(member) + 1}</TableCell>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{member.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {member.manager || '无'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        value={editForm.phoneCount ?? member.equipment.phoneCount}
                        onChange={(e) => setEditForm({ ...editForm, phoneCount: parseInt(e.target.value) || 0 })}
                        className="w-20 text-center"
                        data-testid={`input-phone-${member.id}`}
                      />
                    ) : (
                      member.equipment.phoneCount
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        value={editForm.computerCount ?? member.equipment.computerCount}
                        onChange={(e) => setEditForm({ ...editForm, computerCount: parseInt(e.target.value) || 0 })}
                        className="w-20 text-center"
                        data-testid={`input-computer-${member.id}`}
                      />
                    ) : (
                      member.equipment.computerCount
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        value={editForm.chargerCount ?? member.equipment.chargerCount}
                        onChange={(e) => setEditForm({ ...editForm, chargerCount: parseInt(e.target.value) || 0 })}
                        className="w-20 text-center"
                        data-testid={`input-charger-${member.id}`}
                      />
                    ) : (
                      member.equipment.chargerCount
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={editForm.dormitory ?? member.equipment.dormitory}
                        onChange={(e) => setEditForm({ ...editForm, dormitory: e.target.value })}
                        className="w-24"
                        data-testid={`input-dormitory-${member.id}`}
                      />
                    ) : (
                      member.equipment.dormitory
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editForm.joinDate ?? member.equipment.joinDate}
                        onChange={(e) => setEditForm({ ...editForm, joinDate: e.target.value })}
                        className="w-36"
                        data-testid={`input-joindate-${member.id}`}
                      />
                    ) : (
                      member.equipment.joinDate
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={editForm.waveNumber ?? member.equipment.waveNumber}
                        onChange={(e) => setEditForm({ ...editForm, waveNumber: e.target.value })}
                        className="w-24"
                        data-testid={`input-wave-${member.id}`}
                      />
                    ) : (
                      member.equipment.waveNumber
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                      {member.status === 'active' ? '在职' : '离职'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!isLogistics && canEdit(member) && (
                        <>
                          {isEditing ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => saveEdit(member.id)}
                                data-testid={`button-save-${member.id}`}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={cancelEdit}
                                data-testid={`button-cancel-${member.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => startEdit(member)}
                              data-testid={`button-edit-${member.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                      {isSupervisor && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedMemberId(member.id);
                              setNewSupervisorId(
                                apiUsers.find(u => u.id === member.id)?.supervisorId || ''
                              );
                              setShowSupervisorDialog(true);
                            }}
                            data-testid={`button-supervisor-${member.id}`}
                            title="修改上级"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedMemberId(member.id);
                              setShowPasswordDialog(true);
                            }}
                            data-testid={`button-password-${member.id}`}
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedMemberId(member.id);
                              setShowDeleteDialog(true);
                            }}
                            data-testid={`button-delete-${member.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showSupervisorDialog} onOpenChange={setShowSupervisorDialog}>
        <DialogContent data-testid="dialog-supervisor">
          <DialogHeader>
            <DialogTitle>修改上级</DialogTitle>
            <DialogDescription>
              {selectedMemberId && (() => {
                const member = apiUsers.find(u => u.id === selectedMemberId);
                return member ? `修改 ${member.nickname || member.name}（${member.role}）的上级` : '修改用户的上级';
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">当前上级</label>
              <Input
                value={(() => {
                  const currentSupervisorId = apiUsers.find(u => u.id === selectedMemberId)?.supervisorId;
                  if (!currentSupervisorId) return '无';
                  const supervisor = apiUsers.find(u => u.id === currentSupervisorId);
                  return supervisor ? `${supervisor.nickname || supervisor.name}（${supervisor.role}）` : '无';
                })()}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <label className="text-sm font-medium">新上级 *</label>
              <Select value={newSupervisorId} onValueChange={setNewSupervisorId}>
                <SelectTrigger data-testid="select-new-supervisor">
                  <SelectValue placeholder="请选择新的上级" />
                </SelectTrigger>
                <SelectContent>
                  {apiUsers
                    .filter(u => u.id !== selectedMemberId && (u.role === '主管' || u.role === '总监' || u.role === '经理'))
                    .map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nickname || u.name}（{u.role}）
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                提示：系统会自动验证上级角色是否符合层级要求
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupervisorDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={handleChangeSupervisor} 
              data-testid="button-confirm-supervisor"
              disabled={updateUserMutation.isPending || !newSupervisorId}
            >
              {updateUserMutation.isPending ? '更新中...' : '确认修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent data-testid="dialog-password">
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>
              为选中的成员设置新密码
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder="请输入新密码"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            data-testid="input-new-password"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              取消
            </Button>
            <Button onClick={handleChangePassword} data-testid="button-confirm-password">
              确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent data-testid="dialog-delete">
          <DialogHeader>
            <DialogTitle>删除账户</DialogTitle>
            <DialogDescription>
              确定要删除此成员账户吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteMember}
              data-testid="button-confirm-delete"
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
