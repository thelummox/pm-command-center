import { Link, useLocation } from "wouter";
import { 
  FileText, 
  Upload, 
  Search, 
  LayoutTemplate,
  Plus,
  CheckSquare,
  ListTodo,
  Bot,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopNavProps {
  onOpenAiChat: () => void;
}

export function TopNav({ onOpenAiChat }: TopNavProps) {
  const [location] = useLocation();

  return (
    <nav className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" data-testid="menu-rfp">
            <FileText className="h-4 w-4 mr-1" />
            RFP
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <Link href="/rfps/new">
            <DropdownMenuItem data-testid="menu-upload-rfp" className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Upload RFP
            </DropdownMenuItem>
          </Link>
          <Link href="/search">
            <DropdownMenuItem data-testid="menu-search-rfp" className="cursor-pointer">
              <Search className="h-4 w-4 mr-2" />
              Search RFP
            </DropdownMenuItem>
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" data-testid="menu-templates">
            <LayoutTemplate className="h-4 w-4 mr-1" />
            Templates
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <Link href="/templates">
            <DropdownMenuItem data-testid="menu-manage-templates" className="cursor-pointer">
              <LayoutTemplate className="h-4 w-4 mr-2" />
              Manage Templates
            </DropdownMenuItem>
          </Link>
          <Link href="/templates?create=true">
            <DropdownMenuItem data-testid="menu-create-template" className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </DropdownMenuItem>
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" data-testid="menu-tasks">
            <CheckSquare className="h-4 w-4 mr-1" />
            Tasks
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <Link href="/tasks">
            <DropdownMenuItem data-testid="menu-my-tasks" className="cursor-pointer">
              <ListTodo className="h-4 w-4 mr-2" />
              My Tasks
            </DropdownMenuItem>
          </Link>
          <Link href="/tasks?add=true">
            <DropdownMenuItem data-testid="menu-add-tasks" className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" />
              Add Tasks to RFP
            </DropdownMenuItem>
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onOpenAiChat}
        data-testid="menu-ai-assistant"
      >
        <Bot className="h-4 w-4 mr-1" />
        AI Assistant
      </Button>
    </nav>
  );
}
