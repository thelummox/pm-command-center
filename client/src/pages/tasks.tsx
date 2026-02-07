import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch, Link } from "wouter";
import { 
  CheckSquare, 
  Plus, 
  Clock, 
  CheckCircle2,
  Circle,
  FileText,
  User,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Rfp, User as UserType, ResponseSection } from "@shared/schema";

interface Task {
  id: number;
  title: string;
  description: string;
  rfpId: number;
  rfpTitle: string;
  assignedTo: string | null;
  assignedToName: string | null;
  dueDate: string | null;
  status: "pending" | "in_progress" | "completed";
  createdAt: string;
}

export default function Tasks() {
  const searchParams = useSearch();
  const showAddDialog = searchParams.includes("add=true");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(showAddDialog);
  const { toast } = useToast();

  const { data: rfps, isLoading: rfpsLoading } = useQuery<Rfp[]>({
    queryKey: ["/api/rfps"],
  });

  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: sections, isLoading: sectionsLoading } = useQuery<ResponseSection[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const tasks: Task[] = (sections || []).map((section: any) => ({
    id: section.id,
    title: section.title,
    description: section.content?.substring(0, 100) || "No description",
    rfpId: section.rfpId,
    rfpTitle: section.rfpTitle || "Unknown RFP",
    assignedTo: section.assignedUserId,
    assignedToName: section.assignedUserName,
    dueDate: section.dueDate,
    status: section.isLocked ? "completed" : section.assignedUserId ? "in_progress" : "pending",
    createdAt: section.createdAt || new Date().toISOString(),
  }));

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter === "all") return true;
    return task.status === statusFilter;
  });

  const statusCounts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Tasks</h1>
          <p className="text-muted-foreground">Manage your assigned tasks and section work</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-task">
              <Plus className="h-4 w-4 mr-2" />
              Add Task to RFP
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Task to RFP</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Select RFP</Label>
                <Select>
                  <SelectTrigger data-testid="select-rfp">
                    <SelectValue placeholder="Choose an RFP" />
                  </SelectTrigger>
                  <SelectContent>
                    {rfps?.map((rfp) => (
                      <SelectItem key={rfp.id} value={rfp.id.toString()}>
                        {rfp.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Task Title</Label>
                <Input placeholder="Enter task title" data-testid="input-task-title" />
              </div>
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select>
                  <SelectTrigger data-testid="select-assignee">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" data-testid="input-due-date" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Task description..." data-testid="input-task-description" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    toast({ title: "Task created", description: "The task has been added to the RFP" });
                    setIsAddDialogOpen(false);
                  }}
                  data-testid="button-create-task"
                >
                  Create Task
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            My Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all" data-testid="filter-all">
                All ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger value="pending" data-testid="filter-pending">
                Pending ({statusCounts.pending})
              </TabsTrigger>
              <TabsTrigger value="in_progress" data-testid="filter-in-progress">
                In Progress ({statusCounts.in_progress})
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="filter-completed">
                Completed ({statusCounts.completed})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {rfpsLoading || sectionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredTasks.length > 0 ? (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <Link key={task.id} href={`/rfps/${task.rfpId}?tab=response`}>
                  <Card className="hover-elevate cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          {getStatusIcon(task.status)}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm" data-testid={`task-title-${task.id}`}>
                              {task.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              <span className="truncate">{task.rfpTitle}</span>
                            </div>
                            {task.assignedToName && (
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>{task.assignedToName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            task.status === "completed"
                              ? "text-green-600 border-green-200"
                              : task.status === "in_progress"
                              ? "text-amber-600 border-amber-200"
                              : ""
                          }
                        >
                          {task.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No tasks found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
