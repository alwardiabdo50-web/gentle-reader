import { useState } from "react";
import { useAdminUsers } from "@/hooks/useAdminData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

const planBadgeVariant: Record<string, BadgeProps["variant"]> = {
  free: "secondary",
  hobby: "info",
  standard: "default",
  growth: "warning",
  scale: "success",
};

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const { data, isLoading } = useAdminUsers(page, search, planFilter);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-foreground">Users</h1>

      <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" size="sm">Search</Button>
        </form>
        <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="hobby">Hobby</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="growth">Growth</SelectItem>
            <SelectItem value="scale">Scale</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading…</div>
      ) : (
        <>
          <div className="rounded-md border border-border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Credits Used</TableHead>
                  <TableHead>Total Credits</TableHead>
                  <TableHead>API Keys</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.users?.map((u: Record<string, unknown>) => (
                  <TableRow
                    key={u.user_id as string}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => navigate(`/admin/users/${u.user_id}`)}
                  >
                    <TableCell className="font-medium text-foreground">
                      {(u.full_name as string) || <span className="text-muted-foreground italic">No name</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={planBadgeVariant[(u.plan as string)] ?? "secondary"}>
                        {(u.plan as string)?.charAt(0).toUpperCase() + (u.plan as string)?.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{(u.credits_used as number)?.toLocaleString()}</TableCell>
                    <TableCell>{((u.monthly_credits as number) + (u.extra_credits as number))?.toLocaleString()}</TableCell>
                    <TableCell>{u.apiKeyCount as number}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(u.created_at as string).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {data?.total ?? 0} total users
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 20)))}
              </span>
              <Button size="sm" variant="outline" disabled={(data?.users?.length ?? 0) < data?.limit} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
