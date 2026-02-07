import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Users,
  Calendar,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Rfp, Review } from "@shared/schema";

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  analyzing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  review: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  submitted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  isLoading 
}: { 
  title: string; 
  value: number | string; 
  icon: React.ElementType;
  trend?: string;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              {isLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-bold">{value}</p>
              )}
            </div>
          </div>
          {trend && (
            <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <TrendingUp className="h-4 w-4" />
              <span>{trend}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RfpCard({ rfp }: { rfp: Rfp }) {
  const dueDate = rfp.dueDate ? new Date(rfp.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date();
  const isDueSoon = dueDate && !isOverdue && (dueDate.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;

  return (
    <Link href={`/rfps/${rfp.id}`}>
      <Card className="hover-elevate cursor-pointer transition-all">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs capitalize">
                  {rfp.source}
                </Badge>
                <Badge className={`text-xs ${statusColors[rfp.status] || ""}`}>
                  {rfp.status.replace("_", " ")}
                </Badge>
              </div>
              <h3 className="font-medium text-sm leading-tight mb-2 line-clamp-2" data-testid={`rfp-title-${rfp.id}`}>
                {rfp.title}
              </h3>
              {rfp.agency && (
                <p className="text-xs text-muted-foreground truncate">{rfp.agency}</p>
              )}
            </div>
            {dueDate && (
              <div className={`flex items-center gap-1 text-xs shrink-0 ${
                isOverdue ? "text-destructive" : isDueSoon ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
              }`}>
                <Calendar className="h-3 w-3" />
                <span>{dueDate.toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Dashboard() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: rfps, isLoading: rfpsLoading } = useQuery<Rfp[]>({
    queryKey: ["/api/rfps"],
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
  });

  const activeRfps = rfps?.filter(r => ["in_progress", "analyzing", "review"].includes(r.status)) || [];
  const pendingReviews = reviews?.filter(r => r.status === "pending") || [];
  
  const filteredRfps = rfps?.filter(rfp => {
    if (statusFilter === "all") return true;
    return rfp.status === statusFilter;
  }) || [];
  
  const statusCounts = {
    all: rfps?.length || 0,
    draft: rfps?.filter(r => r.status === "draft").length || 0,
    analyzing: rfps?.filter(r => r.status === "analyzing").length || 0,
    in_progress: rfps?.filter(r => r.status === "in_progress").length || 0,
    review: rfps?.filter(r => r.status === "review").length || 0,
    submitted: rfps?.filter(r => r.status === "submitted").length || 0,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your proposal overview.</p>
        </div>
        <Link href="/rfps/new">
          <Button data-testid="button-new-rfp">
            <FileText className="h-4 w-4 mr-2" />
            New RFP
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total RFPs"
          value={rfps?.length || 0}
          icon={FileText}
          isLoading={rfpsLoading}
        />
        <StatCard
          title="In Progress"
          value={activeRfps.length}
          icon={Clock}
          isLoading={rfpsLoading}
        />
        <StatCard
          title="Pending Reviews"
          value={pendingReviews.length}
          icon={AlertCircle}
          isLoading={reviewsLoading}
        />
        <StatCard
          title="Submitted"
          value={rfps?.filter(r => r.status === "submitted").length || 0}
          icon={CheckCircle2}
          trend="+12%"
          isLoading={rfpsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                RFPs
              </CardTitle>
              <Link href="/rfps">
                <Button variant="ghost" size="sm" data-testid="link-view-all-rfps">
                  View all
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
                <TabsList className="w-full flex-wrap h-auto gap-1">
                  <TabsTrigger value="all" data-testid="filter-all" className="text-xs">
                    All ({statusCounts.all})
                  </TabsTrigger>
                  <TabsTrigger value="draft" data-testid="filter-draft" className="text-xs">
                    Draft ({statusCounts.draft})
                  </TabsTrigger>
                  <TabsTrigger value="analyzing" data-testid="filter-analyzing" className="text-xs">
                    Analyzing ({statusCounts.analyzing})
                  </TabsTrigger>
                  <TabsTrigger value="in_progress" data-testid="filter-in-progress" className="text-xs">
                    In Progress ({statusCounts.in_progress})
                  </TabsTrigger>
                  <TabsTrigger value="review" data-testid="filter-review" className="text-xs">
                    Review ({statusCounts.review})
                  </TabsTrigger>
                  <TabsTrigger value="submitted" data-testid="filter-submitted" className="text-xs">
                    Submitted ({statusCounts.submitted})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              {rfpsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : filteredRfps.length > 0 ? (
                <div className="grid gap-3 max-h-[500px] overflow-y-auto">
                  {filteredRfps.map((rfp) => (
                    <RfpCard key={rfp.id} rfp={rfp} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>{statusFilter === "all" ? "No RFPs yet. Create your first one!" : `No RFPs with status "${statusFilter.replace("_", " ")}"`}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/rfps/new">
                <Button variant="outline" className="w-full justify-start" data-testid="button-upload-rfp">
                  <FileText className="h-4 w-4 mr-2" />
                  Upload New RFP
                </Button>
              </Link>
              <Link href="/search">
                <Button variant="outline" className="w-full justify-start" data-testid="button-search-crm">
                  <FileText className="h-4 w-4 mr-2" />
                  Search CRM
                </Button>
              </Link>
              <Link href="/templates">
                <Button variant="outline" className="w-full justify-start" data-testid="button-manage-templates">
                  <FileText className="h-4 w-4 mr-2" />
                  Manage Templates
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5" />
                  <div>
                    <p className="font-medium">Sarah updated Section 3</p>
                    <p className="text-muted-foreground text-xs">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                  <div>
                    <p className="font-medium">New RFP assigned to you</p>
                    <p className="text-muted-foreground text-xs">15 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-purple-500 mt-1.5" />
                  <div>
                    <p className="font-medium">Budget approved by Director</p>
                    <p className="text-muted-foreground text-xs">1 hour ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
