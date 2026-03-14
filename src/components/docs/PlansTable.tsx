import { usePlans } from "@/hooks/usePlans";
import { Skeleton } from "@/components/ui/skeleton";

export function PlansTable() {
  const { data: plans, isLoading } = usePlans();

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-lg" />;
  }

  const rows = (plans ?? []).map((p) => ({
    name: p.name,
    credits: p.monthly_credits.toLocaleString(),
    rate: `${p.rate_limit_rpm.toLocaleString()} req/min`,
    price: p.monthly_price === 0 ? "$0" : `$${p.monthly_price}/mo`,
  }));

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Plan</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Credits/mo</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Rate Limit</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-border last:border-0">
              <td className="px-4 py-2.5 font-medium">{r.name}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{r.credits}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{r.rate}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{r.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
