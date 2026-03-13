import { useState } from "react";
import { useAdminContacts, useAdminContactActions, fetchAdminContactsExport } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Mail, MoreHorizontal, Eye, Archive, Trash2, MailOpen, RotateCcw, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "warning" | "success" | "destructive" | "outline" | "info" }> = {
  new: { label: "New", variant: "default" },
  read: { label: "Read", variant: "secondary" },
  archived: { label: "Archived", variant: "outline" },
};

function buildCsv(contacts: any[]): string {
  const headers = ["Date", "Name", "Email", "Company", "Volume", "Status", "Message"];
  const rows = contacts.map((c) => [
    new Date(c.created_at).toLocaleDateString(),
    `"${(c.name || "").replace(/"/g, '""')}"`,
    c.email,
    `"${(c.company || "").replace(/"/g, '""')}"`,
    c.volume || "",
    c.status,
    `"${(c.message || "").replace(/"/g, '""')}"`,
  ].join(","));
  return [headers.join(","), ...rows].join("\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export default function AdminContactsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useAdminContacts(page, statusFilter);
  const { updateStatus, deleteContact } = useAdminContactActions();

  const contacts = data?.contacts ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.ceil(total / limit);

  const handleStatusChange = (contactId: string, status: string) => {
    updateStatus.mutate({ contactId, status }, {
      onSuccess: () => toast.success(`Contact marked as ${status}`),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteContact.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Contact deleted");
        setDeleteId(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await fetchAdminContactsExport(statusFilter);
      const csv = buildCsv(data.contacts ?? []);
      downloadCsv(csv, `contacts-${statusFilter}-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success("CSV exported");
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Contact Submissions</h1>
          <span className="text-sm text-muted-foreground ml-2">({total} total)</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 mr-1.5" />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Enterprise & Sales Inquiries</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No contact submissions found.</p>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c: any) => (
                  <TableRow
                    key={c.id}
                    className={`cursor-pointer hover:bg-muted/50 ${c.status === "new" ? "bg-primary/[0.02]" : ""}`}
                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  >
                    <TableCell>
                      <Badge variant={statusConfig[c.status]?.variant ?? "secondary"}>
                        {statusConfig[c.status]?.label ?? c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={c.status === "new" ? "font-semibold text-foreground" : "font-medium"}>{c.name}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.company || "—"}</TableCell>
                    <TableCell>{c.volume || "—"}</TableCell>
                    <TableCell className="max-w-[200px]">
                      {expandedId === c.id
                        ? c.message || "—"
                        : (c.message?.slice(0, 60) + (c.message?.length > 60 ? "…" : "")) || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {c.status !== "read" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(c.id, "read")}>
                              <Eye className="h-4 w-4 mr-2" /> Mark as Read
                            </DropdownMenuItem>
                          )}
                          {c.status !== "new" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(c.id, "new")}>
                              <RotateCcw className="h-4 w-4 mr-2" /> Mark as New
                            </DropdownMenuItem>
                          )}
                          {c.status !== "archived" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(c.id, "archived")}>
                              <Archive className="h-4 w-4 mr-2" /> Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild>
                            <a href={`mailto:${c.email}?subject=Re: Your inquiry`}>
                              <MailOpen className="h-4 w-4 mr-2" /> Send Email
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(c.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {pageNumbers.map((p, i) =>
                  p === "ellipsis" ? (
                    <span key={`e-${i}`} className="flex items-center px-1 text-muted-foreground text-xs">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className="min-w-[32px]"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  )
                )}
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The contact submission will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
