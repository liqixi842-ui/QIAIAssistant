import AppSidebar from '../AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function AppSidebarExample() {
  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar userName="张伟" userRole="业务" />
        <div className="flex-1 p-8">
          <h1 className="text-2xl font-bold">主内容区域</h1>
          <p className="text-muted-foreground mt-2">侧边栏示例</p>
        </div>
      </div>
    </SidebarProvider>
  );
}
