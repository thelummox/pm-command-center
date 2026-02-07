import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Search, 
  FileText, 
  Calendar,
  Building2,
  Tag,
  User,
  MapPin,
  Filter,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Rfp } from "@shared/schema";

interface SearchFilters {
  title: string;
  keywords: string;
  consultant: string;
  source: string;
  state: string;
}

export default function CrmSearch() {
  const [filters, setFilters] = useState<SearchFilters>({
    title: "",
    keywords: "",
    consultant: "",
    source: "all",
    state: "",
  });
  const [activeFilters, setActiveFilters] = useState<SearchFilters | null>(null);

  const { data: rfps, isLoading, refetch } = useQuery<Rfp[]>({
    queryKey: ["/api/rfps/search", activeFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFilters?.title) params.set("title", activeFilters.title);
      if (activeFilters?.keywords) params.set("keywords", activeFilters.keywords);
      if (activeFilters?.consultant) params.set("consultant", activeFilters.consultant);
      if (activeFilters?.source && activeFilters.source !== "all") params.set("source", activeFilters.source);
      if (activeFilters?.state) params.set("state", activeFilters.state);
      const res = await fetch(`/api/rfps/search?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: activeFilters !== null,
  });

  const handleSearch = () => {
    setActiveFilters(filters);
  };

  const handleClearFilters = () => {
    setFilters({
      title: "",
      keywords: "",
      consultant: "",
      source: "all",
      state: "",
    });
    setActiveFilters(null);
  };

  const hasActiveFilters = activeFilters && (
    activeFilters.title ||
    activeFilters.keywords ||
    activeFilters.consultant ||
    activeFilters.source !== "all" ||
    activeFilters.state
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="page-title">CRM Search</h1>
        <p className="text-muted-foreground">Search existing proposals in your company's CRM</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title..."
                  value={filters.title}
                  onChange={(e) => setFilters({ ...filters, title: e.target.value })}
                  className="pl-9"
                  data-testid="input-search-title"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Keywords</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="infrastructure, consulting..."
                  value={filters.keywords}
                  onChange={(e) => setFilters({ ...filters, keywords: e.target.value })}
                  className="pl-9"
                  data-testid="input-search-keywords"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Consultant</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by consultant..."
                  value={filters.consultant}
                  onChange={(e) => setFilters({ ...filters, consultant: e.target.value })}
                  className="pl-9"
                  data-testid="input-search-consultant"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Source</label>
              <Select 
                value={filters.source} 
                onValueChange={(value) => setFilters({ ...filters, source: value })}
              >
                <SelectTrigger data-testid="select-search-source">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="federal">Federal</SelectItem>
                  <SelectItem value="state">State</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="e.g., California"
                  value={filters.state}
                  onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                  className="pl-9"
                  data-testid="input-search-state"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSearch} data-testid="button-search">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            {hasActiveFilters && (
              <Button variant="outline" onClick={handleClearFilters} data-testid="button-clear-filters">
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {activeFilters && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Search Results</h2>
            {rfps && (
              <p className="text-sm text-muted-foreground">
                {rfps.length} proposal{rfps.length !== 1 ? "s" : ""} found
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : rfps && rfps.length > 0 ? (
            <div className="space-y-3">
              {rfps.map((rfp) => (
                <Card key={rfp.id} className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Link href={`/rfps/${rfp.id}`}>
                            <h3 className="font-medium hover:text-primary transition-colors cursor-pointer">
                              {rfp.title}
                            </h3>
                          </Link>
                          <Badge variant="outline" className="text-xs capitalize">
                            {rfp.source}
                          </Badge>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {rfp.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          {rfp.agency && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {rfp.agency}
                            </span>
                          )}
                          {rfp.state && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {rfp.state}
                            </span>
                          )}
                          {rfp.createdAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(rfp.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {rfp.keywords && rfp.keywords.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {rfp.keywords.slice(0, 5).map((keyword, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                            {rfp.keywords.length > 5 && (
                              <Badge variant="secondary" className="text-xs">
                                +{rfp.keywords.length - 5} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <Link href={`/rfps/${rfp.id}`}>
                        <Button variant="outline" size="sm" data-testid={`button-view-rfp-${rfp.id}`}>
                          View
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No proposals found</p>
                <p className="text-sm">Try adjusting your search filters</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!activeFilters && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Start your search</p>
            <p className="text-sm">Use the filters above to find existing proposals</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
