import { useState } from "react";
import { useAdminJobs } from "@/hooks/useAdminData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminJobsPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const { data, isLoading } = useAdminJobs(page, type, status);

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-foreground">Jobs</h1>

      <div className="flex flex-wrap gap-3">
        <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="scrape">Scrape</SelectItem>
            <SelectItem value="map">Map</SelectItem>
            <SelectItem value="crawl">Crawl</SelectItem>
            <SelectItem value="extract">Extract</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
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
                  <TableHead>URL</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.jobs?.map((j: Record<string, unknown>) => (
                  <TableRow key={j.id as string}>
                    <TableCell className="font-mono text-xs truncate max-w-[250px]">
                      {(j.url || j.root_url || j.source_url) as string}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{(j.mode || data.jobType) as string}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={j.status === "completed" ? "default" : j.status === "failed" ? "destructive" : "secondary"}>
                        {j.status as string}
                      </Badge>
                    </TableCell>
                    <TableCell>{j.credits_used as number}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[100px]">
                      {(j.user_id as string)?.slice(0, 8)}…
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(j.created_at as string).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </TableCell>
                  </TableRow>
                ))}
                {data?.jobs?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No jobs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{data?.total ?? 0} total</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 20)))}
              </span>
              <Button size="sm" variant="outline" disabled={(data?.jobs?.length ?? 0) < data?.limit} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
