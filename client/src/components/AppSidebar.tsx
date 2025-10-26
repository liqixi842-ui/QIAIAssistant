import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  ListTodo,
  BarChart3,
  Trello,
  MessageCircle,
  MessageSquarePlus,
  Settings,
  Sparkles,
  LogOut,
  UserCog
} from 'lucide-react';
import { useLocation } from 'wouter';
import Logo from '@/components/Logo';

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  roles?: string[];
}

const menuItems: MenuItem[] = [
  { title: '工作台', url: '/dashboard', icon: LayoutDashboard, roles: ['业务', '经理', '总监', '主管'] },
  { title: '客户管理', url: '/customers', icon: Users, roles: ['业务', '经理', '总监', '主管'] },
  { title: '话术库', url: '/scripts', icon: MessageSquare, roles: ['业务', '经理', '总监', '主管'] },
  { title: '客户任务', url: '/tasks', icon: ListTodo, roles: ['业务', '经理', '总监', '主管'] },
  { title: '阶段看板', url: '/kanban', icon: Trello, roles: ['业务', '经理', '总监', '主管'] },
  { title: '数据报表', url: '/reports', icon: BarChart3, roles: ['业务', '经理', '总监', '主管'] },
  { title: '团队群聊', url: '/chat', icon: MessageCircle, roles: ['业务', '经理', '总监', '主管', '后勤'] },
  { title: '团队管理', url: '/team', icon: UserCog, roles: ['业务', '经理', '总监', '主管', '后勤'] },
  { title: '投诉建议', url: '/feedback', icon: MessageSquarePlus, roles: ['业务', '经理', '总监', '主管', '后勤'] },
  { title: '动起智慧', url: '/ai-chat', icon: Sparkles, roles: ['业务', '经理', '总监', '主管'] },
];

interface AppSidebarProps {
  userRole?: string;
  userName?: string;
}

export default function AppSidebar({ userRole = '业务', userName = '未登录' }: AppSidebarProps) {
  const [location, setLocation] = useLocation();

  const filteredItems = menuItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  const handleLogout = () => {
    console.log('Logout clicked');
    setLocation('/login');
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <Logo size="sm" textWeight="semibold" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.url}`}
                  >
                    <a href={item.url} onClick={(e) => {
                      e.preventDefault();
                      setLocation(item.url);
                    }}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="px-3 py-2 text-sm">
              <p className="font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userRole}</p>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} data-testid="button-logout">
              <LogOut />
              <span>退出登录</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
