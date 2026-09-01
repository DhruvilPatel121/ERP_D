import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  useForm,
  useFieldArray,
  useWatch,
  type SubmitHandler,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Filter,
  AlertTriangle,
  X,
  Check,
  ChevronRight,
  ArrowLeft,
  Building2,
  Package,
  Calendar,
  Share2,
  Scale,
  Hash,
} from "lucide-react";
import {
  getOrders,
  addOrder,
  deleteOrder,
  getCustomers,
  getPatterns,
  getAppSettings,
  updateOrder,
} from "@/lib/db";
import { calculateGramOrder, calculatePieceOrder } from "@/lib/calculations";
import { formatDate, nanoid } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/orderStatus";
import { PageToolbar } from "@/components/layouts/AppLayout";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type {
  Order,
  OrderItem,
  OrderStatus,
  Pattern,
  OrderItemCalculation,
} from "@/types/erp";

import html2canvas from "html2canvas";

type ViewMode = "list" | "party" | "order" | "new";

// ── Zod schema ─────────────────────────────────────────────────────────────────
const orderItemSchema = z.object({
  id: z.string(),
  patternId: z.string().min(1, "Select a pattern"),
  quantityType: z.enum(["grams", "pieces"]),
  orderQuantity: z.coerce.number().min(0.001, "Qty > 0 required"),
  snapshot: z.any(),
  notes: z.string().default(""),
  // stored calculation — kept in sync by OrderItemRow via setValue
  calculationCache: z.any().optional(),
});

const orderSchema = z.object({
  customerId: z.string().min(1, "Customer required"),
  orderDate: z.string().min(1, "Order date required"),
  // Explicit order-level quantity type chosen by user at creation time
  orderQuantityType: z.enum(["grams", "pieces", "mixed"]).default("pieces"),
  notes: z.string().default(""),
  items: z.array(orderItemSchema).min(1, "Add at least one pattern item"),
});
type OrderFormValues = z.infer<typeof orderSchema>;

// ── helpers ───────────────────────────────────────────────────────────────────
function orderTypeLabel(items: Order["items"]) {
  const hasG = items.some((i) => i.quantityType === "grams");
  const hasP = items.some((i) => i.quantityType === "pieces");
  if (hasG && hasP) return "Mixed (Grams + Pieces)";
  if (hasG) return "Grams";
  return "Pieces";
}

// Derive the order's quantity type label from the stored orderType field
function orderTypeLabelFromType(type: Order["orderType"] | undefined): string {
  if (type === "grams") return "Only Grams";
  if (type === "pieces") return "Only Pieces";
  if (type === "mixed") return "Grams + Pieces";
  return "Pieces";
}

// Colour-coded badge shown in lists and detail
function OrderQtyTypeBadge({ type }: { type?: Order["orderType"] }) {
  const label = orderTypeLabelFromType(type);
  const cls =
    type === "grams"
      ? "bg-amber-500/12 text-amber-700 border-amber-400/50"
      : type === "mixed"
        ? "bg-violet-500/12 text-violet-700 border-violet-400/50"
        : "bg-blue-500/12 text-blue-700 border-blue-400/50";
  const Icon = type === "grams" ? Scale : type === "mixed" ? Package : Hash;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cls} whitespace-nowrap`}
    >
      <Icon size={9} />
      {label}
    </span>
  );
}

// 3-way radio used in the New Order form
function OrderQtyTypeRadio({
  value,
  onChange,
}: {
  value: "grams" | "pieces" | "mixed";
  onChange: (v: "grams" | "pieces" | "mixed") => void;
}) {
  const options: {
    key: "grams" | "pieces" | "mixed";
    label: string;
    icon: React.ReactNode;
    cls: string;
    activeCls: string;
  }[] = [
    {
      key: "grams",
      label: "Only Grams",
      icon: <Scale size={12} />,
      cls: "border-border text-muted-foreground hover:bg-muted/40",
      activeCls:
        "border-amber-400 bg-amber-500/12 text-amber-700 font-semibold",
    },
    {
      key: "pieces",
      label: "Only Pieces",
      icon: <Hash size={12} />,
      cls: "border-border text-muted-foreground hover:bg-muted/40",
      activeCls: "border-blue-400 bg-blue-500/12 text-blue-700 font-semibold",
    },
    {
      key: "mixed",
      label: "Grams + Pieces",
      icon: <Package size={12} />,
      cls: "border-border text-muted-foreground hover:bg-muted/40",
      activeCls:
        "border-violet-400 bg-violet-500/12 text-violet-700 font-semibold",
    },
  ];

  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={[
            "flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs transition-colors",
            value === opt.key ? opt.activeCls : opt.cls,
          ].join(" ")}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Shareable WhatsApp card (off-screen) ─────────────────────────────────────
function OrderShareCard({ order }: { order: Order }) {
  const totalPieces = order.items.reduce(
    (s, i) => s + i.calculation.finishedPieces,
    0,
  );
  const totalStones = order.items.reduce(
    (s, i) => s + i.calculation.totalStones,
    0,
  );
  const totalTrees = order.items.reduce(
    (s, i) => s + i.calculation.waxTreesRequired,
    0,
  );
  return (
    <div
      style={{
        width: 560,
        background: "#fff",
        fontFamily: "Arial,sans-serif",
        padding: 24,
        borderRadius: 12,
        color: "#1a1a1a",
      }}
    >
      <div
        style={{
          borderBottom: "2px solid #e5e7eb",
          paddingBottom: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700 }}>{order.orderNumber}</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Party: {order.customerName}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Date: {order.orderDate.slice(0, 10)} · Status:{" "}
          {order.status.replace(/_/g, " ")}
        </div>
      </div>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
      >
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            {["Pattern", "Qty", "Fin.Pcs", "Trees", "Stones"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "6px 8px",
                  textAlign: "left",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => (
            <tr
              key={item.id}
              style={{
                background: i % 2 === 0 ? "#fff" : "#f9fafb",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <td style={{ padding: "6px 8px", fontWeight: 600 }}>
                {item.snapshot.patternNumber}
              </td>
              <td style={{ padding: "6px 8px" }}>
                {item.orderQuantity}
                {item.quantityType === "grams" ? "g" : " pcs"}
              </td>
              <td
                style={{
                  padding: "6px 8px",
                  color: "#2563eb",
                  fontWeight: 600,
                }}
              >
                {item.calculation.finishedPieces}
              </td>
              <td style={{ padding: "6px 8px" }}>
                {item.calculation.waxTreesRequired}
              </td>
              <td style={{ padding: "6px 8px", color: "#7c3aed" }}>
                {item.calculation.totalStones.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: "#f3f4f6", fontWeight: 700 }}>
            <td colSpan={2} style={{ padding: "6px 8px" }}>
              Total
            </td>
            <td style={{ padding: "6px 8px", color: "#2563eb" }}>
              {totalPieces}
            </td>
            <td style={{ padding: "6px 8px" }}>{totalTrees}</td>
            <td style={{ padding: "6px 8px", color: "#7c3aed" }}>
              {totalStones.toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
      {order.notes && (
        <div style={{ marginTop: 12, fontSize: 11, color: "#6b7280" }}>
          Notes: {order.notes}
        </div>
      )}
      <div
        style={{
          marginTop: 16,
          fontSize: 10,
          color: "#9ca3af",
          borderTop: "1px solid #e5e7eb",
          paddingTop: 8,
        }}
      >
        Generated · {new Date().toLocaleDateString("en-IN")}
      </div>
    </div>
  );
}

// ── Order Detail Full Page ────────────────────────────────────────────────────
function OrderDetailPage({
  order: initialOrder,
  onBack,
  onStatusChange,
}: {
  order: Order;
  onBack: () => void;
  onStatusChange: (id: string, status: OrderStatus) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState(initialOrder);
  const totalPieces = order.items.reduce(
    (s, i) => s + i.calculation.finishedPieces,
    0,
  );
  const totalStones = order.items.reduce(
    (s, i) => s + i.calculation.totalStones,
    0,
  );
  const totalTrees = order.items.reduce(
    (s, i) => s + i.calculation.waxTreesRequired,
    0,
  );

  const handleShareJPG = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const blob = await new Promise<Blob>((res) =>
        canvas.toBlob((b) => res(b!), "image/jpeg", 0.92),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${order.orderNumber}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      const wa = order.customerWhatsapp || order.customerMobile;
      const num = wa.replace(/\D/g, "");
      setTimeout(
        () =>
          window.open(
            `https://wa.me/${num.startsWith("91") ? num : "91" + num}`,
            "_blank",
          ),
        400,
      );
      toast.success("JPG downloaded — attach it in WhatsApp");
    } catch (e) {
      toast.error("Failed to generate image");
      console.error(e);
    }
  };

  const statuses: OrderStatus[] = [
    "draft",
    "confirmed",
    "pending",
    "assigned",
    "wax_in_progress",
    "wax_completed",
    "stone_setting_pending",
    "stone_setting_in_progress",
    "stone_setting_completed",
    "production_completed",
    "ready",
    "delivered",
    "cancelled",
  ];

  const handleStatusChange = (status: OrderStatus) => {
    const updated = updateOrder(order.id, {
      status,
      statusHistory: [
        ...order.statusHistory,
        {
          status,
          changedAt: new Date().toISOString(),
          changedBy: "admin",
          notes: "",
        },
      ],
    });
    if (updated) {
      setOrder(updated);
      onStatusChange(order.id, status);
      toast.success(`Status → ${status.replace(/_/g, " ")}`);
    }
  };

  return (
    <div className="page-panel">
      <div className="page-panel-header">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={13} />
        </button>
        <Separator orientation="vertical" className="h-4" />
        <span
          className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground"
          onClick={onBack}
        >
          Orders
        </span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] font-medium">{order.orderNumber}</span>
        <div className="flex-1" />
        <StatusBadge status={order.status} />
        <Select
          value={order.status}
          onValueChange={(v) => handleStatusChange(v as OrderStatus)}
        >
          <SelectTrigger className="h-7 w-44 text-xs ml-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs ml-2"
          onClick={handleShareJPG}
        >
          <Share2 size={12} className="mr-1" />
          Share JPG
        </Button>
      </div>

      <div className="page-panel-body">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {/* Stat cards — 4 cards, Qty Type added */}
          <div className="grid grid-cols-4 gap-3">
            <div className="card-l1 p-4 flex flex-col gap-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Package size={11} />
                Total Pieces
              </div>
              <span className="text-xl font-bold">{totalPieces}</span>
            </div>
            <div className="card-l1 p-4 flex flex-col gap-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Filter size={11} />
                Wax Trees
              </div>
              <span className="text-xl font-bold">{totalTrees}</span>
            </div>
            <div className="card-l1 p-4 flex flex-col gap-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Calendar size={11} />
                Total Stones
              </div>
              <span className="text-xl font-bold">
                {totalStones.toLocaleString()}
              </span>
            </div>
            <div className="card-l1 p-4 flex flex-col gap-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <Scale size={11} />
                Qty Type
              </div>
              <OrderQtyTypeBadge type={order.orderType} />
            </div>
          </div>

          {/* Order info */}
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Order Info
              </span>
            </div>
            <div className="px-4 py-1 text-xs">
              {/* plain text rows */}
              {(
                [
                  ["Order #", order.orderNumber],
                  ["Party", order.customerName],
                  ["Mobile", order.customerMobile],
                  ["Date", formatDate(order.orderDate)],
                  ["Status", order.status.replace(/_/g, " ")],
                  ["Notes", order.notes || "—"],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div
                  key={k}
                  className="grid grid-cols-[140px_1fr] gap-3 py-1.5 border-b border-border/50 last:border-0"
                >
                  <span className="text-muted-foreground text-right">{k}</span>
                  <strong className="font-medium">{v}</strong>
                </div>
              ))}
              {/* Qty Type row — uses badge */}
              <div className="grid grid-cols-[140px_1fr] gap-3 py-1.5">
                <span className="text-muted-foreground text-right">
                  Qty Type
                </span>
                <div>
                  <OrderQtyTypeBadge type={order.orderType} />
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Items ({order.items.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Pattern</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Fin. Pcs</th>
                    <th>Trees</th>
                    <th>Stones</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-medium text-xs">
                          {item.snapshot.patternNumber}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {item.snapshot.patternName}
                        </div>
                      </td>
                      <td>
                        <Badge
                          variant="outline"
                          className={[
                            "text-[10px] h-4 px-1.5 gap-0.5",
                            item.quantityType === "grams"
                              ? "border-amber-500/60 text-amber-700"
                              : "border-blue-500/60 text-blue-700",
                          ].join(" ")}
                        >
                          {item.quantityType === "grams" ? (
                            <Scale size={9} />
                          ) : (
                            <Hash size={9} />
                          )}
                          {item.quantityType === "grams" ? "Grams" : "Pieces"}
                        </Badge>
                      </td>
                      <td className="text-xs font-semibold">
                        {item.orderQuantity}
                        {item.quantityType === "grams" ? "g" : " pcs"}
                      </td>
                      <td className="text-xs font-semibold text-primary">
                        {item.calculation.finishedPieces}
                      </td>
                      <td className="text-xs">
                        {item.calculation.waxTreesRequired}
                      </td>
                      <td className="text-xs text-accent font-medium">
                        {item.calculation.totalStones.toLocaleString()}
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {item.notes || "—"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/20 font-semibold">
                    <td colSpan={2} className="text-right text-xs pr-2">
                      Total
                    </td>
                    <td className="text-xs text-primary">{totalPieces}</td>
                    <td className="text-xs">{totalTrees}</td>
                    <td className="text-xs text-accent">
                      {totalStones.toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Karigar assignments */}
          {order.karigarAssignments.length > 0 && (
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Karigar Assignments
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Karigar</th>
                      <th>Assigned At</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.karigarAssignments.map((a, i) => (
                      <tr key={i}>
                        <td>
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1.5 capitalize"
                          >
                            {a.type}
                          </Badge>
                        </td>
                        <td className="text-xs font-medium">{a.karigarName}</td>
                        <td className="text-xs text-muted-foreground">
                          {formatDate(a.assignedAt)}
                        </td>
                        <td className="text-xs text-muted-foreground">
                          {a.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Status history */}
          {order.statusHistory.length > 0 && (
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Status History
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Changed At</th>
                      <th>By</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...order.statusHistory].reverse().map((h, i) => (
                      <tr key={i}>
                        <td>
                          <StatusBadge status={h.status} />
                        </td>
                        <td className="text-xs text-muted-foreground">
                          {formatDate(h.changedAt)}
                        </td>
                        <td className="text-xs">{h.changedBy}</td>
                        <td className="text-xs text-muted-foreground">
                          {h.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Off-screen share card */}
      <div style={{ position: "fixed", left: -9999, top: -9999, zIndex: -1 }}>
        <div ref={cardRef}>
          <OrderShareCard order={order} />
        </div>
      </div>
    </div>
  );
}

// ── Party Orders Page ─────────────────────────────────────────────────────────
function PartyOrdersPage({
  partyName,
  orders,
  onOrder,
  onBack,
  onStatusChange,
}: {
  partyName: string;
  orders: Order[];
  onOrder: (o: Order) => void;
  onBack: () => void;
  onStatusChange: (id: string, status: OrderStatus) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  const years = useMemo(() => {
    const set = new Set(orders.map((o) => o.orderDate.slice(0, 4)));
    return Array.from(set).sort().reverse();
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders
      .filter((o) => {
        const matchQ =
          !q ||
          o.orderNumber.toLowerCase().includes(q) ||
          o.items.some((i) =>
            i.snapshot.patternNumber.toLowerCase().includes(q),
          );
        const matchS = statusFilter === "all" || o.status === statusFilter;
        const matchY =
          yearFilter === "all" || o.orderDate.startsWith(yearFilter);
        const matchM =
          monthFilter === "all" ||
          o.orderDate.slice(0, 7).endsWith(`-${monthFilter}`);
        return matchQ && matchS && matchY && matchM;
      })
      .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
  }, [orders, search, statusFilter, yearFilter, monthFilter]);

  const totalPieces = orders.reduce(
    (s, o) =>
      s + o.items.reduce((ss, i) => ss + i.calculation.finishedPieces, 0),
    0,
  );

  return (
    <div className="page-panel">
      <div className="page-panel-header">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={13} />
        </button>
        <Separator orientation="vertical" className="h-4" />
        <span
          className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground"
          onClick={onBack}
        >
          Orders
        </span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] font-medium">{partyName}</span>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {orders.length} order{orders.length !== 1 ? "s" : ""} · {totalPieces}{" "}
          pcs total
        </span>
      </div>
      <div className="erp-toolbar border-b border-border bg-background flex-wrap gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Order # or pattern…"
          className="w-44 h-7 text-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={yearFilter}
          onValueChange={(v) => {
            setYearFilter(v);
            setMonthFilter("all");
          }}
        >
          <SelectTrigger className="h-7 w-24 text-xs">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {yearFilter !== "all" && (
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {[
                "01",
                "02",
                "03",
                "04",
                "05",
                "06",
                "07",
                "08",
                "09",
                "10",
                "11",
                "12",
              ].map((m, i) => (
                <SelectItem key={m} value={m}>
                  {
                    [
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Oct",
                      "Nov",
                      "Dec",
                    ][i]
                  }
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} shown
        </span>
      </div>
      <div className="erp-content">
        <div className="overflow-x-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Qty Type</th>
                <th>Patterns</th>
                <th>Fin. Pcs</th>
                <th>Trees</th>
                <th>Stones</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-xs text-muted-foreground"
                  >
                    No orders match the filter.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const pcs = o.items.reduce(
                    (s, i) => s + i.calculation.finishedPieces,
                    0,
                  );
                  const trees = o.items.reduce(
                    (s, i) => s + i.calculation.waxTreesRequired,
                    0,
                  );
                  const ston = o.items.reduce(
                    (s, i) => s + i.calculation.totalStones,
                    0,
                  );
                  return (
                    <tr
                      key={o.id}
                      className="cursor-pointer hover:bg-muted/20"
                      onClick={() => onOrder(o)}
                    >
                      <td className="font-semibold text-xs text-primary hover:underline">
                        {o.orderNumber}
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {formatDate(o.orderDate)}
                      </td>
                      <td>
                        <OrderQtyTypeBadge type={o.orderType} />
                      </td>
                      <td className="text-xs">
                        {o.items
                          .slice(0, 3)
                          .map((i) => i.snapshot.patternNumber)
                          .join(", ")}
                        {o.items.length > 3 ? ` +${o.items.length - 3}` : ""}
                      </td>
                      <td className="text-xs font-semibold">{pcs}</td>
                      <td className="text-xs">{trees}</td>
                      <td className="text-xs text-accent font-medium">
                        {ston.toLocaleString()}
                      </td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Order Item Row — fully controlled, calc stored in form state ───────────────
function OrderItemRow({
  index,
  patterns,
  roundingMode,
  onRemove,
  form,
}: {
  index: number;
  patterns: Pattern[];
  roundingMode: "ceiling" | "floor" | "round";
  onRemove: () => void;
  form: ReturnType<typeof useForm<OrderFormValues>>;
}) {
  const { control, setValue, getValues } = form;

  // Watch the three reactive fields for this row
  const patternId = useWatch({
    control,
    name: `items.${index}.patternId`,
  }) as string;
  const quantityType = useWatch({
    control,
    name: `items.${index}.quantityType`,
  }) as "grams" | "pieces";
  const orderQty = useWatch({
    control,
    name: `items.${index}.orderQuantity`,
  }) as number;

  const pattern = useMemo(
    () => patterns.find((p) => p.id === patternId),
    [patterns, patternId],
  );

  // Recompute whenever patternId / type / qty changes; store into form state
  const calc = useMemo<OrderItemCalculation | null>(() => {
    if (!pattern || !(orderQty > 0)) return null;
    const result =
      quantityType === "grams"
        ? calculateGramOrder({
            orderGrams: orderQty,
            patternWeightGrams: pattern.weightPerPiece,
            treeSize: pattern.treeSize,
            stoneConfig: pattern.stoneConfig,
            roundingMode,
          })
        : calculatePieceOrder({
            orderPieces: orderQty,
            patternWeightGrams: pattern.weightPerPiece,
            treeSize: pattern.treeSize,
            stoneConfig: pattern.stoneConfig,
            roundingMode,
          });
    return result;
  }, [pattern, quantityType, orderQty, roundingMode]);

  // Keep calculationCache in sync so onSubmit can read it directly
  useEffect(() => {
    setValue(`items.${index}.calculationCache`, calc ?? undefined, {
      shouldDirty: false,
    });
  }, [calc, index, setValue]);

  const handlePatternChange = (v: string) => {
    setValue(`items.${index}.patternId`, v);
    const p = patterns.find((x) => x.id === v);
    if (p) {
      setValue(`items.${index}.snapshot`, {
        patternNumber: p.patternNumber,
        patternName: p.patternName,
        patternSize: p.patternSize,
        weightPerPiece: p.weightPerPiece,
        treeSize: p.treeSize,
        stoneConfig: p.stoneConfig,
        totalStonesPerPiece: p.totalStonesPerPiece,
      });
    }
  };

  const handleTypeToggle = (type: "grams" | "pieces") => {
    if (type === getValues(`items.${index}.quantityType`)) return;
    setValue(`items.${index}.quantityType`, type);
    setValue(`items.${index}.orderQuantity`, 0); // reset qty on type change
  };

  const isGrams = quantityType === "grams";

  return (
    <tr className="align-top">
      {/* Pattern selector */}
      <td className="w-52">
        <Select value={patternId ?? ""} onValueChange={handlePatternChange}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Select pattern" />
          </SelectTrigger>
          <SelectContent>
            {patterns
              .filter((p) => p.isActive)
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.patternNumber} — {p.patternName}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {pattern && (
          <div className="text-[10px] text-muted-foreground mt-0.5 pl-0.5">
            {pattern.patternSize ? `${pattern.patternSize} · ` : ""}
            {pattern.weightPerPiece}g/pc · tree {pattern.treeSize}
          </div>
        )}
      </td>

      {/* Grams / Pieces toggle — prominent radio-style buttons */}
      <td className="w-32">
        <div className="flex rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => handleTypeToggle("grams")}
            className={[
              "flex-1 flex items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
              isGrams
                ? "bg-amber-500/15 text-amber-700 border-r border-amber-400/40"
                : "bg-background text-muted-foreground hover:bg-muted/40 border-r border-border",
            ].join(" ")}
          >
            <Scale size={10} />G
          </button>
          <button
            type="button"
            onClick={() => handleTypeToggle("pieces")}
            className={[
              "flex-1 flex items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
              !isGrams
                ? "bg-blue-500/15 text-blue-700"
                : "bg-background text-muted-foreground hover:bg-muted/40",
            ].join(" ")}
          >
            <Hash size={10} />P
          </button>
        </div>
        <div className="text-[10px] text-muted-foreground text-center mt-0.5">
          {isGrams ? "Grams" : "Pieces"}
        </div>
      </td>

      {/* Quantity input — fully controlled via RHF Controller */}
      <td className="w-28">
        <div className="flex items-center">
          <Input
            type="number"
            step={isGrams ? "0.001" : "1"}
            min={isGrams ? 0.001 : 1}
            className="h-7 text-xs"
            value={orderQty > 0 ? orderQty : ""}
            placeholder={isGrams ? "0.000" : "0"}
            onChange={(e) => {
              const v = isGrams
                ? parseFloat(e.target.value)
                : parseInt(e.target.value, 10);
              setValue(`items.${index}.orderQuantity`, isNaN(v) ? 0 : v, {
                shouldValidate: true,
              });
            }}
          />
          <span className="text-[10px] text-muted-foreground ml-1 shrink-0">
            {isGrams ? "g" : "pc"}
          </span>
        </div>
      </td>

      {/* Live calc preview */}
      <td className="text-xs font-semibold text-primary whitespace-nowrap">
        {calc ? (
          <div className="flex flex-col gap-0.5">
            <span>{calc.finishedPieces} pcs</span>
            {isGrams && calc.theoreticalPieces !== null && (
              <span className="text-[10px] text-muted-foreground font-normal">
                ({calc.theoreticalPieces.toFixed(2)} raw)
              </span>
            )}
            {!isGrams && calc.expectedWeightGrams !== null && (
              <span className="text-[10px] text-muted-foreground font-normal">
                ~{calc.expectedWeightGrams.toFixed(3)}g
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="text-xs whitespace-nowrap">
        {calc ? `${calc.waxTreesRequired} tr` : "—"}
      </td>
      <td className="text-xs text-accent font-medium whitespace-nowrap">
        {calc ? calc.totalStones.toLocaleString() : "—"}
      </td>

      {/* Item notes */}
      <td className="w-32">
        <Input
          className="h-7 text-xs"
          placeholder="Notes…"
          value={(getValues(`items.${index}.notes`) as string) || ""}
          onChange={(e) => setValue(`items.${index}.notes`, e.target.value)}
        />
      </td>

      <td>
        <button
          type="button"
          onClick={onRemove}
          className="text-destructive hover:text-destructive/80 p-1"
        >
          <X size={12} />
        </button>
      </td>
    </tr>
  );
}

// ── New Order Full-Page Form ───────────────────────────────────────────────────
function NewOrderPage({ onClose }: { onClose: () => void }) {
  const customers = useMemo(() => getCustomers().filter((c) => c.isActive), []);
  const patterns = useMemo(() => getPatterns(), []);
  const appSettings = useMemo(() => getAppSettings(), []);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema) as Resolver<OrderFormValues>,
    defaultValues: {
      customerId: "",
      orderDate: new Date().toISOString().slice(0, 10),
      orderQuantityType: "pieces",
      notes: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const onSubmit: SubmitHandler<OrderFormValues> = (values) => {
    try {
      const customer = customers.find((c) => c.id === values.customerId)!;

      const items: OrderItem[] = values.items.map((item) => {
        const pattern = patterns.find((p) => p.id === item.patternId)!;

        // Use the cached calculation stored by OrderItemRow; fall back to fresh calc
        const calc: OrderItemCalculation =
          (item.calculationCache as OrderItemCalculation | undefined) ??
          (item.quantityType === "grams"
            ? calculateGramOrder({
                orderGrams: item.orderQuantity,
                patternWeightGrams: pattern.weightPerPiece,
                treeSize: pattern.treeSize,
                stoneConfig: pattern.stoneConfig,
                roundingMode: appSettings.roundingMode,
              })
            : calculatePieceOrder({
                orderPieces: item.orderQuantity,
                patternWeightGrams: pattern.weightPerPiece,
                treeSize: pattern.treeSize,
                stoneConfig: pattern.stoneConfig,
                roundingMode: appSettings.roundingMode,
              }));

        const snapshot = item.snapshot || {
          patternNumber: pattern.patternNumber,
          patternName: pattern.patternName,
          patternSize: pattern.patternSize,
          weightPerPiece: pattern.weightPerPiece,
          treeSize: pattern.treeSize,
          stoneConfig: pattern.stoneConfig,
          totalStonesPerPiece: pattern.totalStonesPerPiece,
        };

        return {
          id: nanoid(),
          patternId: item.patternId,
          snapshot,
          quantityType: item.quantityType,
          orderQuantity: item.orderQuantity,
          calculation: calc,
          status: "pending" as OrderStatus,
          notes: item.notes || "",
        };
      });

      const allGrams = items.every((i) => i.quantityType === "grams");
      const allPieces = items.every((i) => i.quantityType === "pieces");

      addOrder({
        customerId: customer.id,
        customerName: customer.partyName,
        customerMobile: customer.mobile,
        customerWhatsapp: customer.whatsapp || customer.mobile,
        // Use the explicit user-chosen order type; fall back to auto-derived
        orderType:
          (values.orderQuantityType as "grams" | "pieces" | "mixed") ??
          (allGrams ? "grams" : allPieces ? "pieces" : "mixed"),
        items,
        status: "pending",
        statusHistory: [
          {
            status: "pending",
            changedAt: new Date().toISOString(),
            changedBy: "admin",
            notes: "Order created",
          },
        ],
        karigarAssignments: [],
        attachments: [],
        notes: values.notes || "",
        orderDate: new Date(values.orderDate).toISOString(),
      });

      toast.success("Order created successfully");
      onClose();
    } catch (e) {
      toast.error("Failed to create order");
      console.error(e);
    }
  };

  return (
    <div className="page-panel">
      <div className="page-panel-header">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={13} />
        </button>
        <Separator orientation="vertical" className="h-4" />
        <span
          className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground"
          onClick={onClose}
        >
          Orders
        </span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] font-medium">New Order</span>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={onClose}
        >
          <X size={12} className="mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={form.handleSubmit(onSubmit)}
        >
          <Check size={12} className="mr-1" />
          Create Order
        </Button>
      </div>

      <div className="page-panel-body">
        <Form {...form}>
          <form className="max-w-5xl mx-auto flex flex-col gap-4">
            {/* Order header */}
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Order Details
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 px-4 py-3">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Customer *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.partyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="orderDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Order Date *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" className="h-8 text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Order Quantity Type — explicit 3-way radio beside Notes */}
              <div className="px-4 pb-2 border-b border-border/50">
                <FormField
                  control={form.control}
                  name="orderQuantityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Order Quantity Type *
                      </FormLabel>
                      <div className="mt-1">
                        <OrderQtyTypeRadio
                          value={field.value as "grams" | "pieces" | "mixed"}
                          onChange={field.onChange}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Does this customer give order in Grams, Pieces, or both?
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="px-4 py-3">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Order Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Special instructions, delivery info…"
                          rows={2}
                          className="text-sm"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Items */}
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex-1">
                  Order Items
                </span>
                <span className="text-xs text-muted-foreground">
                  {fields.length} item{fields.length !== 1 ? "s" : ""}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                  onClick={() =>
                    append({
                      id: nanoid(),
                      patternId: "",
                      quantityType: "pieces",
                      orderQuantity: 0,
                      snapshot: null as unknown as OrderItem["snapshot"],
                      notes: "",
                    })
                  }
                >
                  <Plus size={11} className="mr-1" />
                  Add Item
                </Button>
              </div>

              {/* Legend */}
              <div className="px-4 pt-2 pb-1 flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-500/15 text-amber-700 font-bold">
                    G
                  </span>
                  = Grams order (qty in grams → pieces calculated)
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-500/15 text-blue-700 font-bold">
                    P
                  </span>
                  = Pieces order (qty in pieces → weight shown)
                </span>
              </div>

              {form.formState.errors.items &&
                typeof form.formState.errors.items === "object" &&
                "message" in form.formState.errors.items && (
                  <p className="text-xs text-destructive px-4 pt-1">
                    {form.formState.errors.items.message as string}
                  </p>
                )}

              {fields.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Click "Add Item" to add patterns to this order
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Pattern</th>
                        <th>
                          <span className="flex items-center gap-1">
                            Type
                            <span className="text-[9px] font-normal text-muted-foreground normal-case">
                              (Grams / Pcs)
                            </span>
                          </span>
                        </th>
                        <th>Quantity</th>
                        <th>Fin. Pcs / Wt</th>
                        <th>Trees</th>
                        <th>Stones</th>
                        <th>Notes</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((f, i) => (
                        <OrderItemRow
                          key={f.id}
                          index={i}
                          patterns={patterns}
                          roundingMode={appSettings.roundingMode}
                          onRemove={() => remove(i)}
                          form={form}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

// ── Main Orders Page ───────────────────────────────────────────────────────────
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(getOrders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [selectedParty, setSelectedParty] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);

  const refresh = useCallback(() => setOrders(getOrders()), []);

  const years = useMemo(() => {
    const set = new Set(orders.map((o) => o.orderDate.slice(0, 4)));
    return Array.from(set).sort().reverse();
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders
      .filter((o) => {
        const matchQ =
          !q ||
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q);
        const matchS = statusFilter === "all" || o.status === statusFilter;
        const matchY =
          yearFilter === "all" || o.orderDate.startsWith(yearFilter);
        const matchM =
          monthFilter === "all" ||
          o.orderDate.slice(0, 7).endsWith(`-${monthFilter}`);
        const matchFrom = !dateFrom || o.orderDate >= dateFrom;
        const matchTo = !dateTo || o.orderDate <= dateTo + "T23:59:59";
        return matchQ && matchS && matchY && matchM && matchFrom && matchTo;
      })
      .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
  }, [orders, search, statusFilter, yearFilter, monthFilter, dateFrom, dateTo]);

  // Group by party name, sorted alphabetically
  const grouped = useMemo(() => {
    const map = new Map<string, Order[]>();
    filtered.forEach((o) => {
      if (!map.has(o.customerName)) map.set(o.customerName, []);
      map.get(o.customerName)!.push(o);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteOrder(deleteTarget.id);
    toast.success("Order deleted");
    setDeleteTarget(null);
    refresh();
  };

  const handleStatusChange = (id: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  const partyOrders = useMemo(
    () =>
      orders
        .filter((o) => o.customerName === selectedParty)
        .sort((a, b) => b.orderDate.localeCompare(a.orderDate)),
    [orders, selectedParty],
  );

  if (view === "new")
    return (
      <NewOrderPage
        onClose={() => {
          setView("list");
          refresh();
        }}
      />
    );
  if (view === "party")
    return (
      <PartyOrdersPage
        partyName={selectedParty}
        orders={partyOrders}
        onOrder={(o) => {
          setSelectedOrder(o);
          setView("order");
        }}
        onBack={() => setView("list")}
        onStatusChange={handleStatusChange}
      />
    );
  if (view === "order" && selectedOrder) {
    const freshOrder =
      orders.find((o) => o.id === selectedOrder.id) ?? selectedOrder;
    return (
      <OrderDetailPage
        order={freshOrder}
        onBack={() => setView(selectedParty ? "party" : "list")}
        onStatusChange={handleStatusChange}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageToolbar
        breadcrumbs={[{ label: "Orders" }]}
        title="Orders"
        subtitle={`${orders.length} total · ${grouped.length} part${grouped.length !== 1 ? "ies" : "y"}`}
        actions={
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => setView("new")}
          >
            <Plus size={12} className="mr-1" />
            New Order
          </Button>
        }
      />

      {/* Filters */}
      <div className="erp-toolbar border-b border-border bg-background">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search order # or party…"
          className="w-48 h-7 text-xs"
        />
        <Filter size={11} className="text-muted-foreground shrink-0" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={yearFilter}
          onValueChange={(v) => {
            setYearFilter(v);
            setMonthFilter("all");
          }}
        >
          <SelectTrigger className="h-7 w-24 text-xs">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {yearFilter !== "all" && (
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {[
                "01",
                "02",
                "03",
                "04",
                "05",
                "06",
                "07",
                "08",
                "09",
                "10",
                "11",
                "12",
              ].map((m, i) => (
                <SelectItem key={m} value={m}>
                  {
                    [
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Oct",
                      "Nov",
                      "Dec",
                    ][i]
                  }
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <label className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          From{" "}
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-7 text-xs w-32 px-2"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          To{" "}
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-7 text-xs w-32 px-2"
          />
        </label>
        <span className="ml-auto text-xs text-muted-foreground shrink-0">
          {filtered.length} order{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="erp-content">
        <div className="overflow-x-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Party Name</th>
                <th>Orders</th>
                <th>Qty Type</th>
                <th>Latest Status</th>
                <th>Last Order</th>
                <th>Total Pieces</th>
              </tr>
            </thead>
            <tbody>
              {grouped.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    {search || statusFilter !== "all"
                      ? "No orders match your filter."
                      : 'No orders yet. Click "New Order" to create one.'}
                  </td>
                </tr>
              ) : (
                grouped.map(([partyName, partyOrders]) => {
                  const latest = partyOrders[0];
                  const totalPcs = partyOrders.reduce(
                    (s, o) =>
                      s +
                      o.items.reduce(
                        (ss, i) => ss + i.calculation.finishedPieces,
                        0,
                      ),
                    0,
                  );
                  // derive dominant qty type across all orders for this party
                  const partyOrderType: Order["orderType"] = partyOrders.every(
                    (o) => o.orderType === "grams",
                  )
                    ? "grams"
                    : partyOrders.every((o) => o.orderType === "pieces")
                      ? "pieces"
                      : "mixed";
                  return (
                    <tr
                      key={partyName}
                      className="cursor-pointer hover:bg-muted/20"
                      onClick={() => {
                        setSelectedParty(partyName);
                        setView("party");
                      }}
                    >
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 size={13} className="text-primary" />
                          </div>
                          <span className="font-semibold text-xs text-primary hover:underline">
                            {partyName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1.5"
                        >
                          {partyOrders.length} order
                          {partyOrders.length !== 1 ? "s" : ""}
                        </Badge>
                      </td>
                      <td>
                        <OrderQtyTypeBadge type={partyOrderType} />
                      </td>
                      <td>
                        <StatusBadge status={latest?.status} />
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {latest ? formatDate(latest.orderDate) : "—"}
                      </td>
                      <td className="text-xs font-semibold">{totalPcs}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {deleteTarget && (
          <div className="sticky bottom-0 p-3 bg-card border-t border-border">
            <div className="confirm-bar">
              <AlertTriangle size={14} className="text-destructive shrink-0" />
              <span className="flex-1 text-xs">
                Delete order <strong>{deleteTarget.orderNumber}</strong>? This
                cannot be undone.
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-6 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
