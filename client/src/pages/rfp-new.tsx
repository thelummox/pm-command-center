import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Upload, 
  Mail, 
  FileText, 
  Calendar,
  Building2,
  MapPin,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const rfpFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  source: z.enum(["federal", "state"]),
  agency: z.string().optional(),
  state: z.string().optional(),
  dueDate: z.string().optional(),
  documentContent: z.string().optional(),
  keywords: z.string().optional(),
});

type RfpFormData = z.infer<typeof rfpFormSchema>;

export default function RfpNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [uploadMethod, setUploadMethod] = useState<"upload" | "email" | "paste">("upload");
  const [isDragging, setIsDragging] = useState(false);

  const form = useForm<RfpFormData>({
    resolver: zodResolver(rfpFormSchema),
    defaultValues: {
      title: "",
      source: "federal",
      agency: "",
      state: "",
      dueDate: "",
      documentContent: "",
      keywords: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: RfpFormData) => {
      const payload = {
        ...data,
        keywords: data.keywords ? data.keywords.split(",").map(k => k.trim()) : [],
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      };
      const res = await apiRequest("POST", "/api/rfps", payload);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfps"] });
      toast({ title: "RFP created successfully" });
      navigate(`/rfps/${data.id}`);
    },
    onError: () => {
      toast({ title: "Failed to create RFP", variant: "destructive" });
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      form.setValue("documentContent", content);
      if (!form.getValues("title")) {
        form.setValue("title", file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/rfps")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">New RFP</h1>
          <p className="text-muted-foreground">Upload and configure a new proposal request</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Document Source</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="upload" className="flex items-center gap-2" data-testid="tab-upload">
                    <Upload className="h-4 w-4" />
                    Upload File
                  </TabsTrigger>
                  <TabsTrigger value="email" className="flex items-center gap-2" data-testid="tab-email">
                    <Mail className="h-4 w-4" />
                    From Email
                  </TabsTrigger>
                  <TabsTrigger value="paste" className="flex items-center gap-2" data-testid="tab-paste">
                    <FileText className="h-4 w-4" />
                    Paste Content
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-4">
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    data-testid="dropzone"
                  >
                    <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="font-medium mb-1">Drag & drop your RFP document here</p>
                    <p className="text-sm text-muted-foreground mb-4">Supports PDF, DOC, DOCX, TXT files</p>
                    <label>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                      />
                      <Button type="button" variant="outline" asChild>
                        <span>Browse Files</span>
                      </Button>
                    </label>
                  </div>
                </TabsContent>
                <TabsContent value="email" className="mt-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium mb-1">Email Integration</p>
                    <p className="text-sm">Forward RFPs to <span className="font-mono text-primary">rfp@pmcc.company.com</span></p>
                    <p className="text-sm mt-2">Or connect your Outlook account in Settings</p>
                  </div>
                </TabsContent>
                <TabsContent value="paste" className="mt-4">
                  <FormField
                    control={form.control}
                    name="documentContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RFP Content</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Paste the RFP document content here..."
                            className="min-h-[200px] font-mono text-sm"
                            data-testid="input-document-content"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">RFP Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter RFP title" data-testid="input-title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-source">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="federal">Federal</SelectItem>
                          <SelectItem value="state">State</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agency</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Issuing agency" className="pl-9" data-testid="input-agency" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State (if applicable)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="e.g., California" className="pl-9" data-testid="input-state" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="date" className="pl-9" data-testid="input-due-date" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keywords (comma separated)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., infrastructure, consulting, technology" 
                        data-testid="input-keywords"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/rfps")} data-testid="button-cancel">
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-create-rfp">
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create RFP
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
