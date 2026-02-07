import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Mail,
  DollarSign,
  Briefcase,
  UserPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@shared/schema";

const roleColors: Record<string, string> = {
  pm: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  consultant: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  copy_editor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  managing_director: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

const roleLabels: Record<string, string> = {
  pm: "Proposal Manager",
  consultant: "Consultant",
  copy_editor: "Copy Editor",
  managing_director: "Managing Director",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Team() {
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const groupedUsers = users?.reduce((acc, user) => {
    const role = user.role || "consultant";
    if (!acc[role]) acc[role] = [];
    acc[role].push(user);
    return acc;
  }, {} as Record<string, User[]>) || {};

  const stats = {
    total: users?.length || 0,
    pms: users?.filter(u => u.role === "pm").length || 0,
    consultants: users?.filter(u => u.role === "consultant").length || 0,
    editors: users?.filter(u => u.role === "copy_editor").length || 0,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Team</h1>
          <p className="text-muted-foreground">Manage team members and assignments</p>
        </div>
        <Button data-testid="button-add-member">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.pms}</p>
            <p className="text-sm text-muted-foreground">Proposal Managers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.consultants}</p>
            <p className="text-sm text-muted-foreground">Consultants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.editors}</p>
            <p className="text-sm text-muted-foreground">Copy Editors</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : users && users.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedUsers).map(([role, roleUsers]) => (
            <div key={role} className="space-y-3">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                {roleLabels[role] || role}
                <Badge variant="secondary" className="text-xs">
                  {roleUsers.length}
                </Badge>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roleUsers.map((user) => (
                  <Card key={user.id} className="hover-elevate">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(user.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium" data-testid={`user-name-${user.id}`}>
                              {user.fullName}
                            </h3>
                            <Badge className={`text-xs ${roleColors[user.role] || ""}`}>
                              {roleLabels[user.role] || user.role}
                            </Badge>
                          </div>
                          {user.title && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <Briefcase className="h-3 w-3" />
                              {user.title}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                          {user.hourlyRate && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                              <DollarSign className="h-3 w-3" />
                              ${parseFloat(user.hourlyRate.toString())}/hr
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No team members yet</p>
            <p className="text-sm">Add team members to get started</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
