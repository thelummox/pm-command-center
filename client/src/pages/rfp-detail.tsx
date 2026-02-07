import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { 
  ArrowLeft,
  FileText,
  ListChecks,
  PenLine,
  DollarSign,
  Sparkles,
  Send,
  Clock,
  CheckCircle2,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DocumentViewer } from "@/components/document-viewer";
import { RequirementsPanel } from "@/components/requirements-panel";
import { ResponseEditor } from "@/components/response-editor";
import { BudgetSheet } from "@/components/budget-sheet";
import { InsightsPanel } from "@/components/insights-panel";
import type { Rfp, Requirement, Response, ResponseSection, BudgetItem, Insight, User } from "@shared/schema";

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  analyzing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  review: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  submitted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export default function RfpDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("document");
  const [highlightedRequirement, setHighlightedRequirement] = useState<number | null>(null);

  const { data: rfp, isLoading: rfpLoading } = useQuery<Rfp>({
    queryKey: ["/api/rfps", id],
  });

  const { data: requirements, isLoading: reqLoading } = useQuery<Requirement[]>({
    queryKey: ["/api/rfps", id, "requirements"],
  });

  const { data: response } = useQuery<Response & { sections: ResponseSection[] }>({
    queryKey: ["/api/rfps", id, "response"],
  });

  const { data: budget } = useQuery<BudgetItem[]>({
    queryKey: ["/api/rfps", id, "budget"],
  });

  const { data: insights } = useQuery<Insight[]>({
    queryKey: ["/api/rfps", id, "insights"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/rfps/${id}/analyze`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfps", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/rfps", id, "requirements"] });
      toast({ title: "Analysis complete" });
    },
    onError: () => {
      toast({ title: "Analysis failed", variant: "destructive" });
    },
  });

  const submitForReviewMutation = useMutation({
    mutationFn: async (type: "copy_editing" | "budget") => {
      const res = await apiRequest("POST", `/api/rfps/${id}/reviews`, { type });
      return res.json();
    },
    onSuccess: (_, type) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfps", id] });
      toast({ title: `Sent for ${type === "copy_editing" ? "Copy Editing" : "Budget"} review` });
    },
    onError: () => {
      toast({ title: "Failed to submit for review", variant: "destructive" });
    },
  });

  const handleRequirementClick = (req: Requirement) => {
    setHighlightedRequirement(req.id);
    setActiveTab("document");
  };

  if (rfpLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!rfp) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">RFP not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4 border-b bg-card flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/rfps")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold truncate" data-testid="rfp-title">{rfp.title}</h1>
              <Badge variant="outline" className="text-xs capitalize shrink-0">
                {rfp.source}
              </Badge>
              <Badge className={`text-xs shrink-0 ${statusColors[rfp.status] || ""}`}>
                {rfp.status.replace("_", " ")}
              </Badge>
            </div>
            {rfp.agency && (
              <p className="text-sm text-muted-foreground truncate">{rfp.agency}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rfp.status === "draft" && (
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              data-testid="button-analyze"
            >
              {analyzeMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Analyze with AI
            </Button>
          )}
          {rfp.status === "in_progress" && (
            <>
              <Button
                variant="outline"
                onClick={() => submitForReviewMutation.mutate("copy_editing")}
                disabled={submitForReviewMutation.isPending}
                data-testid="button-send-copy-editing"
              >
                <Send className="h-4 w-4 mr-2" />
                Send to Copy Editing
              </Button>
              <Button
                variant="outline"
                onClick={() => submitForReviewMutation.mutate("budget")}
                disabled={submitForReviewMutation.isPending}
                data-testid="button-send-budget-review"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Send Budget for Review
              </Button>
            </>
          )}
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 border-b shrink-0">
          <TabsList className="h-12 bg-transparent p-0 gap-6">
            <TabsTrigger
              value="document"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-3"
              data-testid="tab-document"
            >
              <FileText className="h-4 w-4 mr-2" />
              Document
            </TabsTrigger>
            <TabsTrigger
              value="requirements"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-3"
              data-testid="tab-requirements"
            >
              <ListChecks className="h-4 w-4 mr-2" />
              Requirements
              {requirements && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {requirements.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="response"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-3"
              data-testid="tab-response"
            >
              <PenLine className="h-4 w-4 mr-2" />
              Response
            </TabsTrigger>
            <TabsTrigger
              value="budget"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-3"
              data-testid="tab-budget"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Budget
            </TabsTrigger>
            <TabsTrigger
              value="insights"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-3"
              data-testid="tab-insights"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Insights
              {insights && insights.filter(i => !i.isResolved).length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {insights.filter(i => !i.isResolved).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="document" className="h-full m-0 p-6">
            <DocumentViewer
              content={rfp.documentContent || ""}
              requirements={requirements || []}
              highlightedRequirementId={highlightedRequirement}
              onClearHighlight={() => setHighlightedRequirement(null)}
            />
          </TabsContent>

          <TabsContent value="requirements" className="h-full m-0 p-6 overflow-auto">
            <RequirementsPanel
              requirements={requirements || []}
              isLoading={reqLoading}
              onRequirementClick={handleRequirementClick}
            />
          </TabsContent>

          <TabsContent value="response" className="h-full m-0 overflow-hidden">
            <ResponseEditor
              rfpId={parseInt(id)}
              response={response}
              users={users || []}
            />
          </TabsContent>

          <TabsContent value="budget" className="h-full m-0 p-6 overflow-auto">
            <BudgetSheet
              rfpId={parseInt(id)}
              budgetItems={budget || []}
              users={users?.filter(u => ["consultant", "principal", "research_associate"].includes(u.title?.toLowerCase() || "")) || []}
            />
          </TabsContent>

          <TabsContent value="insights" className="h-full m-0 p-6 overflow-auto">
            <InsightsPanel
              insights={insights || []}
              rfpId={parseInt(id)}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
