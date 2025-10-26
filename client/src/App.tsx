import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import AppSidebar from "@/components/AppSidebar";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import Dashboard from "@/pages/Dashboard";
import CustomersPage from "@/pages/CustomersPage";
import ScriptsPage from "@/pages/ScriptsPage";
import TasksPage from "@/pages/TasksPage";
import KanbanPage from "@/pages/KanbanPage";
import ReportsPage from "@/pages/ReportsPage";
import ChatPage from "@/pages/ChatPage";
import FeedbackPage from "@/pages/FeedbackPage";
import AccountsPage from "@/pages/AccountsPage";
import AIChatPage from "@/pages/AIChatPage";
import TeamManagement from "@/pages/TeamManagement";

function AuthenticatedLayout() {
  const [, setLocation] = useLocation();
  const style = {
    "--sidebar-width": "16rem",
  };

  // 从localStorage读取当前用户信息
  const currentUserStr = localStorage.getItem('currentUser');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  // 如果没有登录，跳转到登录页
  if (!currentUser) {
    setLocation('/login');
    return null;
  }

  const currentUserRole = currentUser.role || "业务";
  const currentUserName = currentUser.nickname || currentUser.name || "用户";

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar userName={currentUserName} userRole={currentUserRole} />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Switch>
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/customers" component={CustomersPage} />
              <Route path="/scripts">
                {() => <ScriptsPage userRole={currentUserRole} />}
              </Route>
              <Route path="/tasks" component={TasksPage} />
              <Route path="/kanban" component={KanbanPage} />
              <Route path="/reports" component={ReportsPage} />
              <Route path="/chat" component={ChatPage} />
              <Route path="/team">
                {() => <TeamManagement userRole={currentUserRole} userName={currentUserName} />}
              </Route>
              <Route path="/feedback">
                {() => <FeedbackPage userRole={currentUserRole} />}
              </Route>
              <Route path="/accounts" component={AccountsPage} />
              <Route path="/ai-chat" component={AIChatPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const [location] = useLocation();
  const isAuthRoute = location === '/login' || location === '/register';

  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      {!isAuthRoute && <Route component={AuthenticatedLayout} />}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WebSocketProvider>
          <Router />
          <Toaster />
        </WebSocketProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
