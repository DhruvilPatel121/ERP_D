import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Package,
  ShoppingCart,
  Hammer,
  Gem,
  Factory,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { getDashboardStats, getOrders } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layouts/AppLayout";
import { KPICard, SectionCard } from "@/components/common/DataWidgets";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { Order } from "@/types/erp";

function buildMonthlyChart(orders: Order[]) {
  const months: Record<
    string,
    { month: string; orders: number; delivered: number }
  > = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleString("en-IN", { month: "short" });
    months[key] = { month: label, orders: 0, delivered: 0 };
  }
  orders.forEach((o) => {
    const key = o.orderDate.slice(0, 7);
    if (months[key]) {
      months[key].orders++;
      if (o.status === "delivered") months[key].delivered++;
    }
  });
  return Object.values(months);
}

function buildStatusChart(orders: Order[]) {
  const counts: Record<string, number> = {};
  orders.forEach((o) => {
    const label =
      o.status === "delivered"
        ? "Delivered"
        : o.status === "cancelled"
          ? "Cancelled"
          : ["wax_in_progress", "wax_completed"].includes(o.status)
            ? "Wax Work"
            : [
                  "stone_setting_pending",
                  "stone_setting_in_progress",
                  "stone_setting_completed",
                ].includes(o.status)
              ? "Stone Work"
              : ["pending", "confirmed", "assigned"].includes(o.status)
                ? "Pending"
                : "Other";
    counts[label] = (counts[label] || 0) + 1;
  });
  return Object.entries(counts).map(([status, count]) => ({ status, count }));
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const stats = useMemo(() => getDashboardStats(), []);
  const orders = useMemo(() => getOrders(), []);
  const monthlyData = useMemo(() => buildMonthlyChart(orders), [orders]);
  const statusData = useMemo(() => buildStatusChart(orders), [orders]);
  const recentOrders = useMemo(
    () =>
      orders
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8),
    [orders],
  );

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your manufacturing operations"
      />

      <div className="p-6 flex flex-col gap-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Active Customers"
            value={stats.totalCustomers}
            subtitle="Registered parties"
            icon={Users}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <KPICard
            title="Patterns / Items"
            value={stats.totalPatterns}
            subtitle="Active designs"
            icon={Package}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
          />
          <KPICard
            title="Active Orders"
            value={stats.activeOrders}
            subtitle={`${stats.pendingOrders} pending`}
            icon={ShoppingCart}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
          <KPICard
            title="In Production"
            value={stats.ordersInProduction}
            subtitle="Wax + stone work"
            icon={Factory}
            iconBg="bg-green-50"
            iconColor="text-green-600"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Stone Varieties"
            value={stats.totalStones}
            subtitle="Micro + AD"
            icon={Gem}
            iconBg="bg-pink-50"
            iconColor="text-pink-600"
          />
          <KPICard
            title="Wax Pending"
            value={stats.waxPending}
            subtitle="Assigned + in progress"
            icon={Hammer}
            iconBg="bg-orange-50"
            iconColor="text-orange-600"
          />
          <KPICard
            title="Stone Setting"
            value={stats.stoneSettingPending}
            subtitle="Awaiting stone work"
            icon={TrendingUp}
            iconBg="bg-teal-50"
            iconColor="text-teal-600"
          />
          <KPICard
            title="Completed"
            value={stats.completedOrders}
            subtitle="Production done"
            icon={CheckCircle2}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SectionCard title="Monthly Orders (6 months)">
            <div className="p-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyData}
                  margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
                >
                  <defs>
                    <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(213,52%,24%)"
                        stopOpacity={0.15}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(213,52%,24%)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="delivGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(35,42%,54%)"
                        stopOpacity={0.15}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(35,42%,54%)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(215,25%,90%)"
                  />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 6,
                      border: "1px solid hsl(215,25%,84%)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="hsl(213,52%,24%)"
                    fill="url(#ordersGrad)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="delivered"
                    name="Delivered"
                    stroke="hsl(35,42%,54%)"
                    fill="url(#delivGrad)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Orders by Stage">
            <div className="p-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusData}
                  margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(215,25%,90%)"
                  />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 6,
                      border: "1px solid hsl(215,25%,84%)",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="Orders"
                    fill="hsl(213,52%,24%)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* Recent orders + activity */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <SectionCard
              title="Recent Orders"
              actions={
                <button
                  onClick={() => navigate("/orders")}
                  className="text-xs text-primary hover:underline"
                >
                  View all
                </button>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        Order #
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        Customer
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        Date
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-6 text-center text-sm text-muted-foreground"
                        >
                          No orders yet
                        </td>
                      </tr>
                    ) : (
                      recentOrders.map((o) => (
                        <tr
                          key={o.id}
                          onClick={() => navigate(`/orders/${o.id}`)}
                          className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-2.5 whitespace-nowrap font-medium text-primary">
                            {o.orderNumber}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {o.customerName}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground text-xs">
                            {formatDateTime(o.orderDate)}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <StatusBadge status={o.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Recent Activity">
            <div className="divide-y divide-border">
              {stats.recentActivity.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                  No activity yet
                </p>
              ) : (
                stats.recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2.5 px-4 py-2.5"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock size={10} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground leading-snug line-clamp-2">
                        {log.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>

        {/* Quick alerts */}
        {(stats.stoneSettingPending > 0 || stats.waxPending > 0) && (
          <div className="flex flex-col gap-2">
            {stats.waxPending > 0 && (
              <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
                <AlertCircle size={14} className="text-amber-600 shrink-0" />
                <span className="text-sm text-amber-800">
                  {stats.waxPending} order{stats.waxPending > 1 ? "s" : ""}{" "}
                  waiting for wax work completion
                </span>
                <button
                  onClick={() => navigate("/production")}
                  className="ml-auto text-xs text-amber-700 underline shrink-0"
                >
                  View
                </button>
              </div>
            )}
            {stats.stoneSettingPending > 0 && (
              <div className="flex items-center gap-2.5 bg-pink-50 border border-pink-200 rounded-lg px-4 py-2.5">
                <AlertCircle size={14} className="text-pink-600 shrink-0" />
                <span className="text-sm text-pink-800">
                  {stats.stoneSettingPending} order
                  {stats.stoneSettingPending > 1 ? "s" : ""} pending stone
                  setting assignment
                </span>
                <button
                  onClick={() => navigate("/production")}
                  className="ml-auto text-xs text-pink-700 underline shrink-0"
                >
                  View
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
