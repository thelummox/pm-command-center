import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Requirement } from "@shared/schema";

interface RequirementsPanelProps {
  requirements: Requirement[];
  isLoading: boolean;
  onRequirementClick: (req: Requirement) => void;
}

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

const statusIcons: Record<string, React.ElementType> = {
  pending: Circle,
  addressed: CheckCircle2,
  skipped: AlertCircle,
};

export function RequirementsPanel({ requirements, isLoading, onRequirementClick }: RequirementsPanelProps) {
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/requirements/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfps"] });
    },
  });

  const filteredRequirements = requirements.filter(req => {
    const matchesPriority = priorityFilter === "all" || req.priority === priorityFilter;
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    return matchesPriority && matchesStatus;
  });

  const stats = {
    total: requirements.length,
    addressed: requirements.filter(r => r.status === "addressed").length,
    pending: requirements.filter(r => r.status === "pending").length,
    high: requirements.filter(r => r.priority === "high").length,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.addressed}</p>
            <p className="text-sm text-muted-foreground">Addressed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.high}</p>
            <p className="text-sm text-muted-foreground">High Priority</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-priority-filter">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="addressed">Addressed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredRequirements.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No requirements found</p>
            <p className="text-sm">
              {requirements.length === 0 
                ? "Analyze the RFP to extract requirements" 
                : "Try adjusting your filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequirements.map((req) => {
            const StatusIcon = statusIcons[req.status || "pending"];
            return (
              <Card key={req.id} className="hover-elevate transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => updateStatusMutation.mutate({ 
                        id: req.id, 
                        status: req.status === "addressed" ? "pending" : "addressed" 
                      })}
                      className="mt-0.5 shrink-0"
                      data-testid={`button-toggle-status-${req.id}`}
                    >
                      <StatusIcon className={`h-5 w-5 ${
                        req.status === "addressed" 
                          ? "text-green-600" 
                          : req.status === "skipped"
                            ? "text-muted-foreground"
                            : "text-amber-600"
                      }`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {req.section && (
                          <Badge variant="outline" className="text-xs">
                            {req.section}
                          </Badge>
                        )}
                        <Badge className={`text-xs ${priorityColors[req.priority || "medium"]}`}>
                          {req.priority}
                        </Badge>
                      </div>
                      <p className="text-sm leading-relaxed" data-testid={`requirement-text-${req.id}`}>
                        {req.text}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRequirementClick(req)}
                      className="shrink-0"
                      data-testid={`button-view-in-doc-${req.id}`}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
