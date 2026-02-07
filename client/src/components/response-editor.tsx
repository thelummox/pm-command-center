import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  Plus,
  Lock,
  Unlock,
  User,
  Save,
  FileText,
  Loader2,
  GripVertical,
  Trash2,
  Upload,
  Download,
  Cloud,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RichTextEditor } from "./rich-text-editor";
import type { Response, ResponseSection, User as UserType, Template } from "@shared/schema";

interface ResponseEditorProps {
  rfpId: number;
  response?: Response & { sections: ResponseSection[] };
  users: UserType[];
}

export function ResponseEditor({ rfpId, response, users }: ResponseEditorProps) {
  const { toast } = useToast();
  const [sections, setSections] = useState<ResponseSection[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUserId = "pm-user-id"; // This would come from auth context
  const isPM = true; // This would come from auth context

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      toast({ title: "PDF uploaded", description: "Content extracted and loaded into editor" });
      const newSection: ResponseSection = {
        id: Date.now(),
        responseId: response?.id || 0,
        title: file.name.replace(/\.[^.]+$/, ""),
        content: `<p>[Content from ${file.name}]</p><p>In production, this would use a PDF parsing library to extract and format the document content.</p>`,
        orderIndex: sections.length,
        assignedUserId: null,
        isLocked: false,
        lockedByPmId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setSections([...sections, newSection]);
    } else if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
      toast({ title: "Word document uploaded", description: "Content extracted and loaded into editor" });
      const newSection: ResponseSection = {
        id: Date.now(),
        responseId: response?.id || 0,
        title: file.name.replace(/\.[^.]+$/, ""),
        content: `<p>[Content from ${file.name}]</p><p>In production, this would use a DOCX parsing library (mammoth.js) to extract and format the document content.</p>`,
        orderIndex: sections.length,
        assignedUserId: null,
        isLocked: false,
        lockedByPmId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setSections([...sections, newSection]);
    } else {
      toast({ title: "Unsupported file type", description: "Please upload a PDF or Word document", variant: "destructive" });
    }
    e.target.value = "";
  };

  const exportAsWord = () => {
    const content = sections.map(s => `<h2>${s.title}</h2>${s.content}`).join("<hr/>");
    const blob = new Blob([`
      <html>
        <head><meta charset="utf-8"><title>Proposal Response</title></head>
        <body>${content}</body>
      </html>
    `], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "proposal-response.doc";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Response exported as Word document" });
  };

  const exportAsPdf = () => {
    window.print();
    toast({ title: "Print dialog opened", description: "Select 'Save as PDF' to export" });
  };

  const exportToSharePoint = () => {
    toast({ 
      title: "SharePoint Export", 
      description: "SharePoint integration would connect here. Please configure your SharePoint settings in the admin panel." 
    });
  };

  useEffect(() => {
    if (response?.sections) {
      setSections(response.sections);
    }
  }, [response?.sections]);

  const { data: templates } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const saveMutation = useMutation({
    mutationFn: async (updatedSections: ResponseSection[]) => {
      const res = await apiRequest("PATCH", `/api/rfps/${rfpId}/response`, { 
        sections: updatedSections 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfps", rfpId.toString(), "response"] });
      toast({ title: "Response saved" });
    },
    onError: () => {
      toast({ title: "Failed to save response", variant: "destructive" });
    },
  });

  const addSectionMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest("POST", `/api/rfps/${rfpId}/response/sections`, { 
        title,
        orderIndex: sections.length 
      });
      return res.json();
    },
    onSuccess: (newSection) => {
      setSections([...sections, newSection]);
      queryClient.invalidateQueries({ queryKey: ["/api/rfps", rfpId.toString(), "response"] });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: number) => {
      await apiRequest("DELETE", `/api/response-sections/${sectionId}`);
    },
    onSuccess: (_, sectionId) => {
      setSections(sections.filter(s => s.id !== sectionId));
      queryClient.invalidateQueries({ queryKey: ["/api/rfps", rfpId.toString(), "response"] });
    },
  });

  const toggleLockMutation = useMutation({
    mutationFn: async ({ sectionId, isLocked }: { sectionId: number; isLocked: boolean }) => {
      const res = await apiRequest("PATCH", `/api/response-sections/${sectionId}`, { 
        isLocked,
        lockedByPmId: isLocked ? currentUserId : null
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfps", rfpId.toString(), "response"] });
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: async ({ sectionId, userId }: { sectionId: number; userId: string | null }) => {
      const res = await apiRequest("PATCH", `/api/response-sections/${sectionId}`, { 
        assignedUserId: userId 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfps", rfpId.toString(), "response"] });
    },
  });

  const handleSectionContentChange = useCallback((sectionId: number, content: string) => {
    setSections(prev => prev.map(s => 
      s.id === sectionId ? { ...s, content } : s
    ));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync(sections);
    } finally {
      setIsSaving(false);
    }
  };

  const loadTemplate = (template: Template) => {
    const newSection: ResponseSection = {
      id: Date.now(),
      responseId: response?.id || 0,
      title: template.name,
      content: template.content,
      orderIndex: sections.length,
      assignedUserId: null,
      isLocked: false,
      lockedByPmId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSections([...sections, newSection]);
    setTemplateDialogOpen(false);
  };

  const getAssignedUser = (userId: string | null) => {
    if (!userId) return null;
    return users.find(u => u.id === userId);
  };

  return (
    <div className="h-full flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFileUpload}
        className="hidden"
        data-testid="input-file-upload"
      />
      
      <div className="flex items-center justify-between gap-4 p-6 border-b shrink-0">
        <h2 className="font-semibold text-lg">Proposal Response</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-upload-doc"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Doc
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-export">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportAsWord} data-testid="menu-export-word">
                <FileText className="h-4 w-4 mr-2" />
                Export as Word
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsPdf} data-testid="menu-export-pdf">
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToSharePoint} data-testid="menu-export-sharepoint">
                <Cloud className="h-4 w-4 mr-2" />
                Export to SharePoint
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-load-template">
                <FileText className="h-4 w-4 mr-2" />
                Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select a Template</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2 p-2">
                  {templates?.map((template) => (
                    <Card 
                      key={template.id} 
                      className="cursor-pointer hover-elevate"
                      onClick={() => loadTemplate(template)}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium">{template.name}</h4>
                        {template.description && (
                          <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {(!templates || templates.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">No templates available</p>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            onClick={() => addSectionMutation.mutate("New Section")}
            data-testid="button-add-section"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
          <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-response">
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {sections.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No sections yet</p>
                <p className="text-sm">Add a section or load a template to get started</p>
              </CardContent>
            </Card>
          ) : (
            sections.map((section, index) => {
              const assignedUser = getAssignedUser(section.assignedUserId);
              const isLockedByOther = section.isLocked && section.lockedByPmId !== currentUserId;
              const canEdit = isPM || (!section.isLocked && section.assignedUserId === currentUserId);

              return (
                <Card key={section.id} className={section.isLocked ? "ring-2 ring-primary/30" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                        <Input
                          value={section.title}
                          onChange={(e) => setSections(prev => prev.map(s => 
                            s.id === section.id ? { ...s, title: e.target.value } : s
                          ))}
                          className="font-semibold border-none shadow-none focus-visible:ring-0 p-0 h-auto"
                          disabled={!canEdit}
                          data-testid={`input-section-title-${section.id}`}
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {section.isLocked && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                        <Select
                          value={section.assignedUserId || "unassigned"}
                          onValueChange={(value) => assignUserMutation.mutate({ 
                            sectionId: section.id, 
                            userId: value === "unassigned" ? null : value 
                          })}
                          disabled={!isPM}
                        >
                          <SelectTrigger className="w-[160px]" data-testid={`select-assignee-${section.id}`}>
                            <User className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Assign to..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isPM && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleLockMutation.mutate({ 
                              sectionId: section.id, 
                              isLocked: !section.isLocked 
                            })}
                            data-testid={`button-toggle-lock-${section.id}`}
                          >
                            {section.isLocked ? (
                              <Lock className="h-4 w-4 text-primary" />
                            ) : (
                              <Unlock className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSectionMutation.mutate(section.id)}
                          disabled={!isPM}
                          data-testid={`button-delete-section-${section.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {assignedUser && (
                      <p className="text-xs text-muted-foreground">
                        Assigned to {assignedUser.fullName} ({assignedUser.title || assignedUser.role})
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <RichTextEditor
                      content={section.content || ""}
                      onChange={(content) => handleSectionContentChange(section.id, content)}
                      disabled={!canEdit}
                      placeholder="Enter section content..."
                    />
                    {isLockedByOther && (
                      <p className="text-xs text-muted-foreground mt-2">
                        This section is locked and can only be edited by the Proposal Manager.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
