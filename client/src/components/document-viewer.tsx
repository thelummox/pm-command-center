import { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCcw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Requirement } from "@shared/schema";

interface DocumentViewerProps {
  content: string;
  requirements: Requirement[];
  highlightedRequirementId: number | null;
  onClearHighlight: () => void;
}

export function DocumentViewer({ 
  content, 
  requirements, 
  highlightedRequirementId,
  onClearHighlight 
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightedRequirementId && contentRef.current) {
      const highlightedElement = contentRef.current.querySelector(`[data-requirement-id="${highlightedRequirementId}"]`);
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [highlightedRequirementId]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const handleResetZoom = () => setZoom(100);

  const renderHighlightedContent = () => {
    if (!content) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <FileText className="h-16 w-16 mb-4 opacity-30" />
          <p className="font-medium">No document content</p>
          <p className="text-sm">Upload or paste RFP content to view it here</p>
        </div>
      );
    }

    let highlightedContent = content;
    
    const sortedReqs = [...requirements]
      .filter(r => r.highlightStart !== null && r.highlightEnd !== null)
      .sort((a, b) => (b.highlightStart || 0) - (a.highlightStart || 0));

    sortedReqs.forEach(req => {
      const start = req.highlightStart || 0;
      const end = req.highlightEnd || 0;
      const isHighlighted = req.id === highlightedRequirementId;
      const highlightClass = isHighlighted 
        ? "bg-primary/30 ring-2 ring-primary" 
        : "bg-amber-200/50 dark:bg-amber-500/20";
      
      highlightedContent = 
        highlightedContent.substring(0, start) +
        `<mark class="${highlightClass} px-0.5 rounded cursor-pointer transition-colors" data-requirement-id="${req.id}">` +
        highlightedContent.substring(start, end) +
        '</mark>' +
        highlightedContent.substring(end);
    });

    return (
      <div
        ref={contentRef}
        className="prose prose-sm dark:prose-invert max-w-none"
        style={{ fontSize: `${zoom}%` }}
        dangerouslySetInnerHTML={{ __html: highlightedContent.replace(/\n/g, "<br/>") }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName === "MARK") {
            const reqId = target.getAttribute("data-requirement-id");
            if (reqId) {
              onClearHighlight();
            }
          }
        }}
      />
    );
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">RFP Document</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut} data-testid="button-zoom-out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">{zoom}%</span>
          <Button variant="outline" size="icon" onClick={handleZoomIn} data-testid="button-zoom-in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleResetZoom} data-testid="button-reset-zoom">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <Card className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <CardContent className="p-6">
            {renderHighlightedContent()}
          </CardContent>
        </ScrollArea>
      </Card>

      {requirements.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Click on highlighted sections to view corresponding requirements. {requirements.length} requirements identified.
        </p>
      )}
    </div>
  );
}
