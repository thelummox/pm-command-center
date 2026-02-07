import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopNav } from "@/components/top-nav";
import { AiChat } from "@/components/ai-chat";

import Dashboard from "@/pages/dashboard";
import RfpList from "@/pages/rfp-list";
import RfpNew from "@/pages/rfp-new";
import RfpDetail from "@/pages/rfp-detail";
import CrmSearch from "@/pages/crm-search";
import Templates from "@/pages/templates";
import Reviews from "@/pages/reviews";
import Team from "@/pages/team";
import Tasks from "@/pages/tasks";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/rfps" component={RfpList} />
      <Route path="/rfps/new" component={RfpNew} />
      <Route path="/rfps/:id" component={RfpDetail} />
      <Route path="/search" component={CrmSearch} />
      <Route path="/templates" component={Templates} />
      <Route path="/reviews" component={Reviews} />
      <Route path="/team" component={Team} />
      <Route path="/tasks" component={Tasks} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [aiChatOpen, setAiChatOpen] = useState(false);
  
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="pmcc-theme">
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <SidebarInset className="flex-1 flex flex-col overflow-hidden">
                <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <TopNav onOpenAiChat={() => setAiChatOpen(true)} />
                  </div>
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </SidebarInset>
            </div>
          </SidebarProvider>
          <AiChat isOpen={aiChatOpen} onClose={() => setAiChatOpen(false)} />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
