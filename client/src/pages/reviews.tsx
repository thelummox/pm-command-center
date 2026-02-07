import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  FileCheck, 
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  DollarSign,
  FileText,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Review, Rfp } from "@shared/schema";
import { useState } from "react";

const reviewTypeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  copy_editing: { 
    icon: FileText, 
    label: "Copy Editing",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
  },
  budget: { 
    icon: DollarSign, 
    label: "Budget",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
  },
  final: { 
    icon: FileCheck, 
    label: "Final Review",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
  },
};

const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
  pending: { icon: Clock, color: "text-amber-600" },
  approved: { icon: CheckCircle2, color: "text-green-600" },
  rejected: { icon: XCircle, color: "text-red-600" },
};

interface ReviewWithRfp extends Review {
  rfp?: Rfp;
}

export default function Reviews() {
  const { toast } = useToast();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewWithRfp | null>(null);
  const [reviewComments, setReviewComments] = useState("");

  const { data: reviews, isLoading } = useQuery<ReviewWithRfp[]>({
    queryKey: ["/api/reviews"],
  });

  const updateReviewMutation = useMutation({
    mutationFn: async ({ id, status, comments }: { id: number; status: string; comments?: string }) => {
      const res = await apiRequest("PATCH", `/api/reviews/${id}`, { status, comments });
      return res.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      setReviewDialogOpen(false);
      setSelectedReview(null);
      setReviewComments("");
      toast({ title: `Review ${status}` });
    },
    onError: () => {
      toast({ title: "Failed to update review", variant: "destructive" });
    },
  });

  const pendingReviews = reviews?.filter(r => r.status === "pending") || [];
  const completedReviews = reviews?.filter(r => r.status !== "pending") || [];

  const handleOpenReviewDialog = (review: ReviewWithRfp) => {
    setSelectedReview(review);
    setReviewComments(review.comments || "");
    setReviewDialogOpen(true);
  };

  const handleReviewAction = (status: "approved" | "rejected") => {
    if (!selectedReview) return;
    updateReviewMutation.mutate({
      id: selectedReview.id,
      status,
      comments: reviewComments,
    });
  };

  const ReviewCard = ({ review }: { review: ReviewWithRfp }) => {
    const typeConfig = reviewTypeConfig[review.type] || reviewTypeConfig.copy_editing;
    const StatusIcon = statusConfig[review.status]?.icon || Clock;
    const TypeIcon = typeConfig.icon;

    return (
      <Card className="hover-elevate">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${typeConfig.color}`}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-medium line-clamp-1" data-testid={`review-rfp-title-${review.id}`}>
                  {review.rfp?.title || `RFP #${review.rfpId}`}
                </h3>
                <Badge className={`text-xs ${typeConfig.color}`}>
                  {typeConfig.label}
                </Badge>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${statusConfig[review.status]?.color || ""}`}
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {review.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Submitted {new Date(review.submittedAt).toLocaleDateString()}
              </p>
              {review.comments && review.status !== "pending" && (
                <p className="text-sm mt-2 p-2 bg-muted/50 rounded-md">
                  {review.comments}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href={`/rfps/${review.rfpId}`}>
                <Button variant="outline" size="sm" data-testid={`button-view-rfp-${review.id}`}>
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </Link>
              {review.status === "pending" && (
                <Button 
                  size="sm" 
                  onClick={() => handleOpenReviewDialog(review)}
                  data-testid={`button-review-${review.id}`}
                >
                  Review
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="page-title">Pending Reviews</h1>
        <p className="text-muted-foreground">Manage Copy Editing and Budget reviews</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{reviews?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Total Reviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingReviews.length}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {reviews?.filter(r => r.status === "approved").length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({pendingReviews.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed ({completedReviews.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {isLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : pendingReviews.length > 0 ? (
            pendingReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No pending reviews</p>
                <p className="text-sm">All caught up!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3">
          {completedReviews.length > 0 ? (
            completedReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No completed reviews</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Proposal</p>
              <p className="text-muted-foreground">{selectedReview?.rfp?.title || `RFP #${selectedReview?.rfpId}`}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Review Type</p>
              <Badge className={reviewTypeConfig[selectedReview?.type || "copy_editing"]?.color}>
                {reviewTypeConfig[selectedReview?.type || "copy_editing"]?.label}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Comments</p>
              <Textarea
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="Add any comments or feedback..."
                className="min-h-[100px]"
                data-testid="textarea-review-comments"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleReviewAction("rejected")}
              disabled={updateReviewMutation.isPending}
              data-testid="button-reject-review"
            >
              {updateReviewMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject
            </Button>
            <Button
              onClick={() => handleReviewAction("approved")}
              disabled={updateReviewMutation.isPending}
              data-testid="button-approve-review"
            >
              {updateReviewMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
