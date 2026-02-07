import { useMutation } from "@tanstack/react-query";
import { 
  Sparkles, 
  Lightbulb, 
  AlertTriangle,
  FileEdit,
  Check,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Insight } from "@shared/schema";

interface InsightsPanelProps {
  insights: Insight[];
  rfpId: number;
}

const insightTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  writing_improvement: { 
    icon: FileEdit, 
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    label: "Writing" 
  },
  inconsistency: { 
    icon: AlertTriangle, 
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    label: "Inconsistency" 
  },
  language_match: { 
    icon: Lightbulb, 
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    label: "Language Match" 
  },
};

export function InsightsPanel({ insights, rfpId }: InsightsPanelProps) {
  const { toast } = useToast();

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/rfps/${rfpId}/insights`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfps", rfpId.toString(), "insights"] });
      toast({ title: "New insights generated" });
    },
    onError: () => {
      toast({ title: "Failed to generate insights", variant: "destructive" });
    },
  });

  const resolveInsightMutation = useMutation({
    mutationFn: async (insightId: number) => {
      const res = await apiRequest("PATCH", `/api/insights/${insightId}`, { isResolved: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfps", rfpId.toString(), "insights"] });
    },
  });

  const activeInsights = insights.filter(i => !i.isResolved);
  const resolvedInsights = insights.filter(i => i.isResolved);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Insights
          </h2>
          <p className="text-sm text-muted-foreground">
            Suggestions to improve your proposal based on company standards
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => generateInsightsMutation.mutate()}
          disabled={generateInsightsMutation.isPending}
          data-testid="button-generate-insights"
        >
          {generateInsightsMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Insights
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{insights.length}</p>
            <p className="text-sm text-muted-foreground">Total Insights</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{activeInsights.length}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{resolvedInsights.length}</p>
            <p className="text-sm text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
      </div>

      {activeInsights.length === 0 && resolvedInsights.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No insights yet</p>
            <p className="text-sm">
              Save your response draft to generate AI-powered suggestions
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeInsights.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">Active Insights</h3>
              {activeInsights.map((insight) => {
                const config = insightTypeConfig[insight.type] || insightTypeConfig.writing_improvement;
                const Icon = config.icon;
                return (
                  <Card key={insight.id} className="hover-elevate">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${config.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`text-xs ${config.color}`}>
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-sm leading-relaxed mb-2" data-testid={`insight-text-${insight.id}`}>
                            {insight.text}
                          </p>
                          {insight.suggestion && (
                            <div className="bg-muted/50 rounded-md p-3 text-sm">
                              <p className="font-medium text-xs text-muted-foreground mb-1">Suggestion:</p>
                              <p>{insight.suggestion}</p>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resolveInsightMutation.mutate(insight.id)}
                          disabled={resolveInsightMutation.isPending}
                          className="shrink-0"
                          data-testid={`button-resolve-insight-${insight.id}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {resolvedInsights.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">Resolved</h3>
              {resolvedInsights.map((insight) => {
                const config = insightTypeConfig[insight.type] || insightTypeConfig.writing_improvement;
                return (
                  <Card key={insight.id} className="opacity-60">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 shrink-0">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {config.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs text-green-600">
                              Resolved
                            </Badge>
                          </div>
                          <p className="text-sm line-through text-muted-foreground">
                            {insight.text}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
