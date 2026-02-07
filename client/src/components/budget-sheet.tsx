import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  DollarSign, 
  Save, 
  Plus,
  Trash2,
  Calculator,
  Loader2,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BudgetItem, User } from "@shared/schema";

interface BudgetSheetProps {
  rfpId: number;
  budgetItems: BudgetItem[];
  users: User[];
}

interface BudgetRow {
  id: number;
  userId: string;
  customTitle: string;
  customRate: number | null;
  year1: number;
  year2: number;
  year3: number;
  year4: number;
  year5: number;
}

const DEFAULT_HOURLY_RATES: Record<string, number> = {
  principal: 250,
  consultant: 175,
  research_associate: 125,
  managing_director: 300,
  copy_editor: 100,
  default: 150,
};

const ROLE_COLORS: Record<string, string> = {
  principal: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
  consultant: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
  research_associate: "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700",
  managing_director: "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700",
  copy_editor: "bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700",
  default: "bg-slate-100 dark:bg-slate-900/30 border-slate-300 dark:border-slate-700",
};

export function BudgetSheet({ rfpId, budgetItems, users }: BudgetSheetProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [rows, setRows] = useState<BudgetRow[]>(() => {
    const grouped = new Map<string, BudgetRow>();
    
    budgetItems.forEach(item => {
      if (!grouped.has(item.userId)) {
        const user = users.find(u => u.id === item.userId);
        grouped.set(item.userId, {
          id: item.id,
          userId: item.userId,
          customTitle: user?.title || "",
          customRate: null,
          year1: 0,
          year2: 0,
          year3: 0,
          year4: 0,
          year5: 0,
        });
      }
      const row = grouped.get(item.userId)!;
      const yearKey = `year${item.year}` as keyof BudgetRow;
      if (yearKey in row) {
        (row[yearKey] as number) = parseFloat(item.hours.toString());
      }
    });

    return Array.from(grouped.values());
  });

  const saveMutation = useMutation({
    mutationFn: async (budgetRows: BudgetRow[]) => {
      const items = budgetRows.flatMap(row => 
        [1, 2, 3, 4, 5].map(year => ({
          userId: row.userId,
          year,
          hours: row[`year${year}` as keyof BudgetRow] as number || 0,
        }))
      );
      const res = await apiRequest("POST", `/api/rfps/${rfpId}/budget`, { items });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfps", rfpId.toString(), "budget"] });
      toast({ title: "Budget saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save budget", variant: "destructive" });
    },
  });

  const addRow = () => {
    if (users.length === 0) return;
    const unusedUsers = users.filter(u => !rows.some(r => r.userId === u.id));
    if (unusedUsers.length === 0) {
      toast({ title: "All team members are already in the budget" });
      return;
    }
    const user = unusedUsers[0];
    setRows([...rows, {
      id: Date.now(),
      userId: user.id,
      customTitle: user.title || "",
      customRate: null,
      year1: 0,
      year2: 0,
      year3: 0,
      year4: 0,
      year5: 0,
    }]);
  };

  const removeRow = (id: number) => {
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id: number, field: keyof BudgetRow, value: string | number | null) => {
    setRows(rows.map(r => {
      if (r.id !== id) return r;
      if (field === "userId") {
        const newUser = users.find(u => u.id === value);
        return { ...r, [field]: value, customTitle: newUser?.title || "" };
      }
      return { ...r, [field]: value };
    }));
  };

  const getDefaultRate = (userId: string): number => {
    const user = users.find(u => u.id === userId);
    if (!user) return DEFAULT_HOURLY_RATES.default;
    const title = user.title?.toLowerCase() || "";
    if (title.includes("principal")) return DEFAULT_HOURLY_RATES.principal;
    if (title.includes("managing") || title.includes("director")) return DEFAULT_HOURLY_RATES.managing_director;
    if (title.includes("consultant")) return DEFAULT_HOURLY_RATES.consultant;
    if (title.includes("research") || title.includes("associate")) return DEFAULT_HOURLY_RATES.research_associate;
    if (title.includes("copy") || title.includes("editor")) return DEFAULT_HOURLY_RATES.copy_editor;
    return user.hourlyRate ? parseFloat(user.hourlyRate.toString()) : DEFAULT_HOURLY_RATES.default;
  };

  const getEffectiveRate = (row: BudgetRow): number => {
    return row.customRate !== null ? row.customRate : getDefaultRate(row.userId);
  };

  const getRoleCategory = (row: BudgetRow): string => {
    const title = row.customTitle?.toLowerCase() || "";
    if (title.includes("principal")) return "principal";
    if (title.includes("managing") || title.includes("director")) return "managing_director";
    if (title.includes("consultant")) return "consultant";
    if (title.includes("research") || title.includes("associate")) return "research_associate";
    if (title.includes("copy") || title.includes("editor")) return "copy_editor";
    return "default";
  };

  const calculateRowTotal = (row: BudgetRow): number => {
    const rate = getEffectiveRate(row);
    const totalHours = row.year1 + row.year2 + row.year3 + row.year4 + row.year5;
    return totalHours * rate;
  };

  const calculateYearTotal = (year: 1 | 2 | 3 | 4 | 5): number => {
    return rows.reduce((sum, row) => {
      const hours = row[`year${year}` as keyof BudgetRow] as number;
      const rate = getEffectiveRate(row);
      return sum + (hours * rate);
    }, 0);
  };

  const grandTotal = useMemo(() => {
    return rows.reduce((sum, row) => sum + calculateRowTotal(row), 0);
  }, [rows, users]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportAsExcel = () => {
    let csvContent = "Team Member,Role,Rate/Hr,Year 1 Hours,Year 2 Hours,Year 3 Hours,Year 4 Hours,Year 5 Hours,Total Cost\n";
    rows.forEach(row => {
      const user = users.find(u => u.id === row.userId);
      const rate = getEffectiveRate(row);
      const total = calculateRowTotal(row);
      csvContent += `"${user?.fullName || ''}","${row.customTitle}","$${rate}",${row.year1},${row.year2},${row.year3},${row.year4},${row.year5},"${formatCurrency(total)}"\n`;
    });
    csvContent += `\n"TOTAL","","","${formatCurrency(calculateYearTotal(1))}","${formatCurrency(calculateYearTotal(2))}","${formatCurrency(calculateYearTotal(3))}","${formatCurrency(calculateYearTotal(4))}","${formatCurrency(calculateYearTotal(5))}","${formatCurrency(grandTotal)}"`;
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "budget-worksheet.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Budget exported as Excel-compatible CSV" });
  };

  const exportAsWord = () => {
    const tableRows = rows.map(row => {
      const user = users.find(u => u.id === row.userId);
      const rate = getEffectiveRate(row);
      return `<tr>
        <td>${user?.fullName || ''}</td>
        <td>${row.customTitle}</td>
        <td>$${rate}</td>
        <td>${row.year1}</td>
        <td>${row.year2}</td>
        <td>${row.year3}</td>
        <td>${row.year4}</td>
        <td>${row.year5}</td>
        <td>${formatCurrency(calculateRowTotal(row))}</td>
      </tr>`;
    }).join("");
    
    const html = `
      <html>
        <head><meta charset="utf-8"><title>Budget Worksheet</title></head>
        <body>
          <h1>Budget Worksheet</h1>
          <table border="1" cellpadding="8" cellspacing="0">
            <tr style="background-color:#f0f0f0;">
              <th>Team Member</th><th>Role</th><th>Rate/Hr</th>
              <th>Year 1</th><th>Year 2</th><th>Year 3</th><th>Year 4</th><th>Year 5</th>
              <th>Total</th>
            </tr>
            ${tableRows}
            <tr style="background-color:#e0e0e0;font-weight:bold;">
              <td colspan="3">TOTALS</td>
              <td>${formatCurrency(calculateYearTotal(1))}</td>
              <td>${formatCurrency(calculateYearTotal(2))}</td>
              <td>${formatCurrency(calculateYearTotal(3))}</td>
              <td>${formatCurrency(calculateYearTotal(4))}</td>
              <td>${formatCurrency(calculateYearTotal(5))}</td>
              <td>${formatCurrency(grandTotal)}</td>
            </tr>
          </table>
        </body>
      </html>
    `;
    
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "budget-worksheet.doc";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Budget exported as Word document" });
  };

  const roleCategories = Array.from(new Set(rows.map(r => getRoleCategory(r))));
  const filteredRows = activeTab === "all" ? rows : rows.filter(r => getRoleCategory(r) === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Budget Worksheet
          </h2>
          <p className="text-sm text-muted-foreground">
            Enter hours for each team member per year. Click on rates to edit.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-export-budget">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportAsExcel} data-testid="menu-export-excel">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as Excel (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsWord} data-testid="menu-export-word">
                <FileText className="h-4 w-4 mr-2" />
                Export as Word
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={addRow} data-testid="button-add-budget-row">
            <Plus className="h-4 w-4 mr-2" />
            Add Team Member
          </Button>
          <Button onClick={() => saveMutation.mutate(rows)} disabled={saveMutation.isPending} data-testid="button-save-budget">
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Budget
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger 
            value="all" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            data-testid="tab-all"
          >
            All ({rows.length})
          </TabsTrigger>
          {roleCategories.map(cat => {
            const count = rows.filter(r => getRoleCategory(r) === cat).length;
            return (
              <TabsTrigger 
                key={cat} 
                value={cat}
                className="capitalize"
                data-testid={`tab-${cat}`}
              >
                {cat.replace("_", " ")} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <Card className="overflow-hidden">
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-100 dark:bg-slate-800">
                <TableHead className="min-w-[180px] font-bold">Team Member</TableHead>
                <TableHead className="min-w-[140px] font-bold">Role/Title</TableHead>
                <TableHead className="text-right min-w-[100px] font-bold">Rate/Hr</TableHead>
                <TableHead className="text-right min-w-[90px] font-bold bg-blue-50 dark:bg-blue-900/20">Year 1</TableHead>
                <TableHead className="text-right min-w-[90px] font-bold bg-green-50 dark:bg-green-900/20">Year 2</TableHead>
                <TableHead className="text-right min-w-[90px] font-bold bg-purple-50 dark:bg-purple-900/20">Year 3</TableHead>
                <TableHead className="text-right min-w-[90px] font-bold bg-amber-50 dark:bg-amber-900/20">Year 4</TableHead>
                <TableHead className="text-right min-w-[90px] font-bold bg-pink-50 dark:bg-pink-900/20">Year 5</TableHead>
                <TableHead className="text-right min-w-[120px] font-bold bg-slate-200 dark:bg-slate-700">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No budget items yet</p>
                    <p className="text-sm">Add team members to start building your budget</p>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {filteredRows.map((row) => {
                    const user = users.find(u => u.id === row.userId);
                    const roleCategory = getRoleCategory(row);
                    const colorClass = ROLE_COLORS[roleCategory] || ROLE_COLORS.default;
                    return (
                      <TableRow key={row.id} className={colorClass}>
                        <TableCell>
                          <Select
                            value={row.userId}
                            onValueChange={(value) => updateRow(row.id, "userId", value)}
                          >
                            <SelectTrigger className="bg-background" data-testid={`select-team-member-${row.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.fullName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.customTitle}
                            onChange={(e) => updateRow(row.id, "customTitle", e.target.value)}
                            placeholder="Enter role..."
                            className="bg-background"
                            data-testid={`input-title-${row.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            value={row.customRate !== null ? row.customRate : getDefaultRate(row.userId)}
                            onChange={(e) => updateRow(row.id, "customRate", parseFloat(e.target.value) || null)}
                            className="w-24 text-right font-mono bg-background"
                            data-testid={`input-rate-${row.id}`}
                          />
                        </TableCell>
                        {[1, 2, 3, 4, 5].map((year) => {
                          const bgColors = ["bg-blue-50/50", "bg-green-50/50", "bg-purple-50/50", "bg-amber-50/50", "bg-pink-50/50"];
                          return (
                            <TableCell key={year} className={`text-right ${bgColors[year - 1]} dark:bg-transparent`}>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={row[`year${year}` as keyof BudgetRow] || 0}
                                onChange={(e) => updateRow(row.id, `year${year}` as keyof BudgetRow, parseFloat(e.target.value) || 0)}
                                className="w-20 text-right bg-background"
                                data-testid={`input-hours-${row.id}-year${year}`}
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-semibold font-mono bg-slate-100 dark:bg-slate-800">
                          {formatCurrency(calculateRowTotal(row))}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRow(row.id)}
                            data-testid={`button-remove-row-${row.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-slate-200 dark:bg-slate-700 font-bold">
                    <TableCell colSpan={3} className="text-right">Year Totals</TableCell>
                    {[1, 2, 3, 4, 5].map((year) => {
                      const bgColors = ["bg-blue-100", "bg-green-100", "bg-purple-100", "bg-amber-100", "bg-pink-100"];
                      return (
                        <TableCell key={year} className={`text-right font-mono ${bgColors[year - 1]} dark:bg-slate-600`}>
                          {formatCurrency(calculateYearTotal(year as 1 | 2 | 3 | 4 | 5))}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-mono font-bold bg-slate-300 dark:bg-slate-600">
                      {formatCurrency(grandTotal)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Default Hourly Rates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-600">Managing Director</span>
              <span className="font-mono">${DEFAULT_HOURLY_RATES.managing_director}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">Principal</span>
              <span className="font-mono">${DEFAULT_HOURLY_RATES.principal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-600">Consultant</span>
              <span className="font-mono">${DEFAULT_HOURLY_RATES.consultant}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-600">Research Associate</span>
              <span className="font-mono">${DEFAULT_HOURLY_RATES.research_associate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-pink-600">Copy Editor</span>
              <span className="font-mono">${DEFAULT_HOURLY_RATES.copy_editor}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {rows.reduce((sum, row) => sum + row.year1 + row.year2 + row.year3 + row.year4 + row.year5, 0).toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Across all years</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{rows.length}</p>
            <p className="text-sm text-muted-foreground">In budget</p>
          </CardContent>
        </Card>

        <Card className="bg-accent/30 border-accent/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Grand Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(grandTotal)}</p>
            <p className="text-sm text-muted-foreground">Total budget</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
