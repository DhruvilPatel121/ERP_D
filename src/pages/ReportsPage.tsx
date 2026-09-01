import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getOrders } from "@/lib/db";
import { ORDER_STATUS_LABELS } from "@/lib/orderStatus";
import { PageToolbar } from "@/components/layouts/AppLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Order } from "@/types/erp";

const CHART_COLORS = [
  "hsl(213,52%,24%)",
  "hsl(35,42%,54%)",
  "hsl(158,64%,39%)",
  "hsl(348,83%,59%)",
  "hsl(217,91%,60%)",
  "hsl(43,96%,56%)",
];

// ── Shared report card wrapper ─────────────────────────────────────────────────
function ReportCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-l1">
      {title && (
        <div className="px-4 py-2 border-b border-border bg-muted/30">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

// ── Customer-wise Order Report ─────────────────────────────────────────────────
function CustomerReport({ orders }: { orders: Order[] }) {
  const data = useMemo(() => {
    const map: Record<
      string,
      { customer: string; orders: number; pieces: number; stones: number }
    > = {};
    orders.forEach((o) => {
      if (!map[o.customerName])
        map[o.customerName] = {
          customer: o.customerName,
          orders: 0,
          pieces: 0,
          stones: 0,
        };
      map[o.customerName].orders++;
      map[o.customerName].pieces += o.items.reduce(
        (s, i) => s + i.calculation.finishedPieces,
        0,
      );
      map[o.customerName].stones += o.items.reduce(
        (s, i) => s + i.calculation.totalStones,
        0,
      );
    });
    return Object.values(map).sort((a, b) => b.orders - a.orders);
  }, [orders]);

  return (
    <div className="flex flex-col gap-3">
      <ReportCard title="Orders by Customer">
        <div className="p-3 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.slice(0, 10)}
              margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,25%,90%)" />
              <XAxis dataKey="customer" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} />
              <Bar
                dataKey="orders"
                name="Orders"
                fill="hsl(213,52%,24%)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportCard>
      <ReportCard>
        <div className="overflow-x-auto">
          <table className="erp-table">
            <thead>
              <tr>
                {[
                  "Customer",
                  "Total Orders",
                  "Total Pieces",
                  "Total Stones",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td className="font-medium">{row.customer}</td>
                  <td>{row.orders}</td>
                  <td>{row.pieces.toLocaleString()}</td>
                  <td>{row.stones.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportCard>
    </div>
  );
}

// ── Pattern-wise Report ────────────────────────────────────────────────────────
function PatternReport({ orders }: { orders: Order[] }) {
  const data = useMemo(() => {
    const map: Record<
      string,
      { pattern: string; orders: number; pieces: number; trees: number }
    > = {};
    orders.forEach((o) => {
      o.items.forEach((item) => {
        const key = item.snapshot?.patternNumber || item.patternId;
        if (!map[key])
          map[key] = {
            pattern: `${item.snapshot?.patternNumber} — ${item.snapshot?.patternName}`,
            orders: 0,
            pieces: 0,
            trees: 0,
          };
        map[key].orders++;
        map[key].pieces += item.calculation.finishedPieces;
        map[key].trees += item.calculation.waxTreesRequired;
      });
    });
    return Object.values(map).sort((a, b) => b.pieces - a.pieces);
  }, [orders]);

  return (
    <div className="flex flex-col gap-3">
      <ReportCard title="Top Patterns by Volume (pieces)">
        <div className="p-3 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.slice(0, 10)}
              margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,25%,90%)" />
              <XAxis dataKey="pattern" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} />
              <Bar
                dataKey="pieces"
                name="Pieces"
                fill="hsl(35,42%,54%)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportCard>
      <ReportCard>
        <div className="overflow-x-auto">
          <table className="erp-table">
            <thead>
              <tr>
                {[
                  "Pattern",
                  "Used in Orders",
                  "Total Pieces",
                  "Total Trees",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td className="font-medium">{row.pattern}</td>
                  <td>{row.orders}</td>
                  <td className="font-semibold text-primary">
                    {row.pieces.toLocaleString()}
                  </td>
                  <td>{row.trees}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportCard>
    </div>
  );
}

// ── Status Report ─────────────────────────────────────────────────────────────
function StatusReport({ orders }: { orders: Order[] }) {
  const data = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o) => {
      map[o.status] = (map[o.status] || 0) + 1;
    });
    return Object.entries(map).map(([status, count]) => ({
      name:
        ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ||
        status,
      value: count,
      status,
    }));
  }, [orders]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <ReportCard title="Orders by Status">
        <div className="p-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </ReportCard>
      <ReportCard>
        <div className="overflow-x-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {data
                .sort((a, b) => b.value - a.value)
                .map((row, i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap">
                      <StatusBadge
                        status={
                          row.status as Parameters<
                            typeof StatusBadge
                          >[0]["status"]
                        }
                      />
                    </td>
                    <td className="font-semibold">{row.value}</td>
                    <td className="text-muted-foreground">
                      {orders.length > 0
                        ? ((row.value / orders.length) * 100).toFixed(1)
                        : 0}
                      %
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </ReportCard>
    </div>
  );
}

// ── Karigar Workload Report ────────────────────────────────────────────────────
function KarigarReport({ orders }: { orders: Order[] }) {
  const data = useMemo(() => {
    const map: Record<
      string,
      { name: string; waxJobs: number; stoneJobs: number; total: number }
    > = {};
    orders.forEach((o) => {
      o.karigarAssignments.forEach((a) => {
        if (!map[a.karigarName])
          map[a.karigarName] = {
            name: a.karigarName,
            waxJobs: 0,
            stoneJobs: 0,
            total: 0,
          };
        if (a.type === "wax") map[a.karigarName].waxJobs++;
        else map[a.karigarName].stoneJobs++;
        map[a.karigarName].total++;
      });
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [orders]);

  return (
    <div className="flex flex-col gap-3">
      <ReportCard title="Karigar Workload">
        <div className="p-3 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,25%,90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="waxJobs"
                name="Wax"
                fill="hsl(213,52%,24%)"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="stoneJobs"
                name="Stone"
                fill="hsl(35,42%,54%)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportCard>
      <ReportCard>
        <div className="overflow-x-auto">
          <table className="erp-table">
            <thead>
              <tr>
                {["Karigar", "Wax Jobs", "Stone Jobs", "Total"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No karigar assignment data.
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr key={i}>
                    <td className="font-medium">{row.name}</td>
                    <td>{row.waxJobs}</td>
                    <td>{row.stoneJobs}</td>
                    <td className="font-semibold text-primary">{row.total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ReportCard>
    </div>
  );
}

// ── Main Reports Page ─────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [allOrders] = useState(() => getOrders());
  const [dateRange, setDateRange] = useState("all");

  const orders = useMemo(() => {
    if (dateRange === "all") return allOrders;
    const now = new Date();
    const cutoff = new Date();
    if (dateRange === "7d") cutoff.setDate(now.getDate() - 7);
    else if (dateRange === "30d") cutoff.setDate(now.getDate() - 30);
    else if (dateRange === "90d") cutoff.setDate(now.getDate() - 90);
    return allOrders.filter((o) => new Date(o.orderDate) >= cutoff);
  }, [allOrders, dateRange]);

  return (
    <div className="flex flex-col h-full">
      <PageToolbar
        breadcrumbs={[{ label: "Reports" }]}
        title="Reports"
        subtitle="Business analytics and production insights"
        actions={
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="erp-content">
        <Tabs defaultValue="customer" className="flex flex-col h-full">
          <div className="px-4 pt-3 border-b border-border bg-card">
            <TabsList className="h-8 bg-transparent p-0 gap-0">
              {[
                { value: "customer", label: "By Customer" },
                { value: "pattern", label: "By Pattern" },
                { value: "status", label: "By Status" },
                { value: "karigar", label: "Karigar Workload" },
              ].map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="text-xs h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="customer" className="mt-0">
              <CustomerReport orders={orders} />
            </TabsContent>
            <TabsContent value="pattern" className="mt-0">
              <PatternReport orders={orders} />
            </TabsContent>
            <TabsContent value="status" className="mt-0">
              <StatusReport orders={orders} />
            </TabsContent>
            <TabsContent value="karigar" className="mt-0">
              <KarigarReport orders={orders} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
