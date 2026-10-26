import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Gem,
} from "lucide-react";
import {
  getOrders,
  addOrder,
  deleteOrder,
  getCustomers,
  getPatterns,
  getAppSettings,
  updateOrder,
  getKarigars,
  findKarigarForPattern,
  getMicroDiamonds,
  getADDiamonds,
  updateMicroDiamond,
  updateADDiamond,
  saveMicroDiamonds,
  saveADDiamonds,
} from "@/lib/db";
import { calculateGramOrder, calculatePieceOrder } from "@/lib/calculations";
import { formatDate, nanoid } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/orderStatus";
import { PageToolbar } from "@/components/layouts/AppLayout";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Combobox, type ComboboxOption } from "@/components/common/Combobox";
import { DateRangePicker } from "@/components/common/DateRangePicker";
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

type ViewMode = "list" | "party" | "order" | "new";

// ── Zod schema ─────────────────────────────────────────────────────────────────
const orderItemSchema = z.object({
  id: z.string(),
  patternId: z.string().min(1, "Select a pattern"),
  quantityType: z.enum(["grams", "pieces"]),
  orderQuantity: z.coerce.number().min(0.001, "Qty > 0 required"),
  snapshot: z.any(),
  notes: z.string().default(""),
  calculationCache: z.any().optional(),
});

const orderSchema = z.object({
  customerId: z.string().min(1, "Customer required"),
  orderDate: z.string().min(1, "Order date required"),
  orderQuantityType: z.enum(["grams", "pieces", "mixed"]).default("pieces"),
  notes: z.string().default(""),
  touch: z.string().default(""),
  items: z.array(orderItemSchema).min(1, "Add at least one pattern item"),
  stoneKarigarId: z.string().optional(),
});
type OrderFormValues = z.infer<typeof orderSchema>;

// ── helpers ───────────────────────────────────────────────────────────────────
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

  const patternOptions: ComboboxOption[] = useMemo(() => 
    patterns
      .filter((p) => p.isActive)
      .map((p) => ({ value: p.id, label: `${p.patternNumber} — ${p.patternName}` })),
    [patterns]
  );

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
    <tr className="border-b border-border hover:bg-muted/30">
      {/* Pattern selector */}
      <td className="px-3 py-2 border-r border-border">
        <Combobox
          options={patternOptions}
          value={patternId ?? ""}
          onChange={handlePatternChange}
          placeholder="Select pattern"
          searchPlaceholder="Search patterns..."
          className="h-8"
        />
        {pattern && (
          <div className="text-[10px] text-muted-foreground mt-1 pl-0.5">
            {pattern.patternSize ? `${pattern.patternSize} · ` : ""}
            {pattern.weightPerPiece}g/pc · tree {pattern.treeSize}
          </div>
        )}
      </td>

      {/* Grams / Pieces toggle — prominent radio-style buttons */}
      <td className="px-3 py-2 border-r border-border">
        <div className="flex rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => handleTypeToggle("grams")}
            className={[
              "flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium transition-colors",
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
              "flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium transition-colors",
              !isGrams
                ? "bg-blue-500/15 text-blue-700"
                : "bg-background text-muted-foreground hover:bg-muted/40",
            ].join(" ")}
          >
            <Hash size={10} />P
          </button>
        </div>
        <div className="text-[10px] text-muted-foreground text-center mt-1">
          {isGrams ? "Grams" : "Pieces"}
        </div>
      </td>

      {/* Quantity input — fully controlled via RHF Controller */}
      <td className="px-3 py-2 border-r border-border">
        <div className="flex items-center">
          <Input
            type="number"
            step={isGrams ? "0.001" : "1"}
            min={isGrams ? 0.001 : 1}
            className="h-8 text-xs"
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
      <td className="px-3 py-2 border-r border-border text-xs font-semibold text-primary whitespace-nowrap">
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
      <td className="px-3 py-2 border-r border-border text-xs whitespace-nowrap">
        {calc ? `${calc.waxTreesRequired} tr` : "—"}
      </td>
      <td className="px-3 py-2 border-r border-border text-xs text-accent font-medium whitespace-nowrap">
        {calc ? calc.totalStones.toLocaleString() : "—"}
      </td>

      {/* Item notes */}
      <td className="px-3 py-2 border-r border-border">
        <Input
          className="h-8 text-xs"
          placeholder="Notes…"
          value={(getValues(`items.${index}.notes`) as string) || ""}
          onChange={(e) => setValue(`items.${index}.notes`, e.target.value)}
        />
      </td>

      <td className="px-3 py-2 text-center">
        <button
          type="button"
          onClick={onRemove}
          className="text-destructive hover:text-destructive/80 p-1 hover:bg-destructive/10 rounded transition-colors"
        >
          <X size={14} />
        </button>
      </td>
    </tr>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────
function orderTypeLabel(items: Order["items"]) {
  const hasG = items.some((i) => i.quantityType === "grams");
  const hasP = items.some((i) => i.quantityType === "pieces");
  if (hasG && hasP) return "Mixed (Grams + Pieces)";
  if (hasG) return "Grams";
  return "Pieces";
}

function orderTypeLabelFromType(type: Order["orderType"] | undefined): string {
  if (type === "grams") return "Only Grams";
  if (type === "pieces") return "Only Pieces";
  if (type === "mixed") return "Grams + Pieces";
  return "Pieces";
}

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
      activeCls:
        "border-blue-400 bg-blue-500/12 text-blue-700 font-semibold",
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

// ── Main Stone Orders Page ────────────────────────────────────────────────────
export default function StoneOrdersPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});
  const [allOrders, setAllOrders] = useState<Order[]>([]);

  // Load orders on mount and when view changes
  useEffect(() => {
    setAllOrders(getOrders());
  }, [viewMode]);

  const customers = useMemo(() => getCustomers(), []);
  const patterns = useMemo(() => getPatterns(), []);
  const karigars = useMemo(() => getKarigars().filter((k) => k.isActive), []);
  const appSettings = useMemo(() => getAppSettings(), []);

  // Filter orders for stone work (stone-related statuses) - include ALL statuses to show completed orders
  const stoneOrders = useMemo(() => {
    return allOrders.filter((order) => {
      const stoneStatuses = [
        "wax_completed",
        "stone_setting_pending",
        "stone_setting_in_progress",
        "stone_setting_completed",
        "production_completed",
        "ready",
        "delivered",
      ];
      return stoneStatuses.includes(order.status);
    });
  }, [allOrders]);

  const years = useMemo(() => {
    const set = new Set(stoneOrders.map((o) => o.orderDate.slice(0, 4)));
    return Array.from(set).sort().reverse();
  }, [stoneOrders]);

  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();
    return stoneOrders
      .filter((o) => {
        const matchQ =
          !q ||
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.items.some((i) =>
            i.snapshot.patternNumber.toLowerCase().includes(q),
          );
        const matchS = statusFilter === "all" || o.status === statusFilter;
        const matchY =
          yearFilter === "all" || o.orderDate.startsWith(yearFilter);
        const matchM =
          monthFilter === "all" ||
          o.orderDate.slice(0, 7).endsWith(`-${monthFilter}`);
        const matchDateRange =
          (!dateRange.from || o.orderDate >= dateRange.from) &&
          (!dateRange.to || o.orderDate <= dateRange.to);
        return matchQ && matchS && matchY && matchM && matchDateRange;
      })
      .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
  }, [stoneOrders, search, statusFilter, yearFilter, monthFilter, dateRange]);

  const partyGroups = useMemo(() => {
    const groups: Record<string, Order[]> = {};
    const q = search.toLowerCase();
    const filteredStoneOrders = stoneOrders.filter((o) => {
      const matchQ =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.items.some((i) =>
          i.snapshot.patternNumber.toLowerCase().includes(q),
        );
      const matchS = statusFilter === "all" || o.status === statusFilter;
      const matchY = yearFilter === "all" || o.orderDate.startsWith(yearFilter);
      const matchM =
        monthFilter === "all" ||
        o.orderDate.slice(0, 7).endsWith(`-${monthFilter}`);
      const matchDateRange =
        (!dateRange.from || o.orderDate >= dateRange.from) &&
        (!dateRange.to || o.orderDate <= dateRange.to);
      return matchQ && matchS && matchY && matchM && matchDateRange;
    });

    filteredStoneOrders.forEach((order) => {
      if (!groups[order.customerName]) {
        groups[order.customerName] = [];
      }
      groups[order.customerName].push(order);
    });
    return Object.entries(groups).map(([name, orders]) => ({
      name,
      orders: orders.sort((a, b) => b.orderDate.localeCompare(a.orderDate)),
      totalPieces: orders.reduce(
        (s, o) =>
          s + o.items.reduce((ss, i) => ss + i.calculation.finishedPieces, 0),
        0,
      ),
    }));
  }, [stoneOrders, search, statusFilter, yearFilter, monthFilter, dateRange]);

  const handleStatusChange = useCallback(
    (id: string, status: OrderStatus) => {
      updateOrder(id, { status });
      toast.success(`Status updated to ${ORDER_STATUS_LABELS[status]}`);
      setAllOrders(getOrders());
    },
    [],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (
        !confirm(
          "Are you sure you want to delete this order? This cannot be undone.",
        )
      )
        return;
      deleteOrder(id);
      toast.success("Order deleted");
      setAllOrders(getOrders());
      if (selectedOrder?.id === id) {
        setSelectedOrder(null);
        setViewMode("list");
      }
    },
    [selectedOrder],
  );

  // ── Render ───────────────────────────────────────────────────────────────
  if (viewMode === "list") {
    return (
      <div className="page-panel">
        <PageToolbar
          title="Stone Orders"
          subtitle="Manage stone setting orders"
          actions={
            <Button
              size="sm"
              onClick={() => setViewMode("new")}
              className="h-7 text-xs"
            >
              <Plus size={12} className="mr-1" />
              New Stone Order
            </Button>
          }
        />

        <div className="page-panel-content">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <SearchInput
              placeholder="Search orders..."
              value={search}
              onChange={setSearch}
              className="h-7 text-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1).padStart(2, "0")}>
                    {new Date(2024, i).toLocaleString("default", { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              className="flex items-center gap-1"
            />
          </div>

          {/* Party View */}
          <div className="grid gap-2">
            {partyGroups.map(({ name, orders, totalPieces }) => (
              <div
                key={name}
                className="card-l1 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setSelectedParty(name);
                  setViewMode("party");
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-muted-foreground" />
                    <span className="font-medium text-sm">{name}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      {orders.length} orders
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{totalPieces.toLocaleString()} pcs</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "party" && selectedParty) {
    const q = search.toLowerCase();
    const partyOrders = stoneOrders
      .filter((o) => o.customerName === selectedParty)
      .filter((o) => {
        const matchQ =
          !q ||
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.items.some((i) =>
            i.snapshot.patternNumber.toLowerCase().includes(q),
          );
        const matchS = statusFilter === "all" || o.status === statusFilter;
        const matchY = yearFilter === "all" || o.orderDate.startsWith(yearFilter);
        const matchM =
          monthFilter === "all" ||
          o.orderDate.slice(0, 7).endsWith(`-${monthFilter}`);
        const matchDateRange =
          (!dateRange.from || o.orderDate >= dateRange.from) &&
          (!dateRange.to || o.orderDate <= dateRange.to);
        return matchQ && matchS && matchY && matchM && matchDateRange;
      });
    return (
      <div className="page-panel">
        <PageToolbar
          title={selectedParty}
          subtitle={`${partyOrders.length} stone orders`}
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewMode("list")}
              className="h-7 text-xs"
            >
              <ArrowLeft size={12} className="mr-1" />
              Back
            </Button>
          }
        />

        <div className="page-panel-content">
          {/* Filters for party view */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <SearchInput
              placeholder="Search orders..."
              value={search}
              onChange={setSearch}
              className="h-7 text-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1).padStart(2, "0")}>
                    {new Date(2024, i).toLocaleString("default", { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              className="flex items-center gap-1"
            />
          </div>

          <div className="grid gap-2">
            {partyOrders
              .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
              .map((order) => (
                <div
                  key={order.id}
                  className="card-l1 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setSelectedOrder(order);
                    setViewMode("order");
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium text-sm">{order.orderNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(order.orderDate)}
                        </div>
                      </div>
                      <OrderQtyTypeBadge type={order.orderType} />
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={order.status} />
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "order" && selectedOrder) {
    return (
      <div className="page-panel">
        <PageToolbar
          title={selectedOrder.orderNumber}
          subtitle={`${selectedOrder.customerName} · ${formatDate(selectedOrder.orderDate)}`}
          actions={
            <div className="flex gap-2">
              <Select
                value={selectedOrder.status}
                onValueChange={(newStatus) => {
                  const updatedOrder = {
                    ...selectedOrder,
                    status: newStatus as OrderStatus,
                    statusHistory: [
                      ...selectedOrder.statusHistory,
                      {
                        status: newStatus as OrderStatus,
                        changedAt: new Date().toISOString(),
                        changedBy: "admin",
                        notes: `Status changed to ${newStatus}`,
                      },
                    ],
                    updatedAt: new Date().toISOString(),
                  };
                  updateOrder(updatedOrder.id, updatedOrder);
                  setSelectedOrder(updatedOrder);
                  setAllOrders(getOrders());
                  toast.success(`Status updated to ${newStatus}`);
                }}
              >
                <SelectTrigger className="h-7 text-xs w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="wax_in_progress">Wax In Progress</SelectItem>
                  <SelectItem value="wax_completed">Wax Completed</SelectItem>
                  <SelectItem value="stone_setting_pending">Stone Setting Pending</SelectItem>
                  <SelectItem value="stone_setting_in_progress">Stone Setting In Progress</SelectItem>
                  <SelectItem value="stone_setting_completed">Stone Setting Completed</SelectItem>
                  <SelectItem value="production_completed">Production Completed</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setViewMode("party")}
                className="h-7 text-xs"
              >
                <ArrowLeft size={12} className="mr-1" />
                Back
              </Button>
            </div>
          }
        />

        <div className="page-panel-content">
          <div className="space-y-4">
            {/* Order Info */}
            <div className="card-l1 p-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Customer: </span>
                  <span className="font-medium">{selectedOrder.customerName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                {selectedOrder.touch && (
                  <div>
                    <span className="text-muted-foreground">Touch: </span>
                    <span className="font-medium">{selectedOrder.touch}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Type: </span>
                  <OrderQtyTypeBadge type={selectedOrder.orderType} />
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="card-l1">
              <div className="px-4 py-2 border-b border-border bg-muted/30">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Order Items ({selectedOrder.items.length})
                </span>
              </div>
              <div className="divide-y divide-border">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-semibold text-xs">
                          {item.snapshot.patternNumber} — {item.snapshot.patternName}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                            {item.quantityType === "grams"
                              ? `${item.orderQuantity}g`
                              : `${item.orderQuantity} pcs`}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            → {item.calculation.finishedPieces} pieces
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 bg-muted/30 rounded p-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground">Wt/Piece: </span>
                        <strong>{item.snapshot.weightPerPiece}g</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pieces: </span>
                        <strong className="text-primary">
                          {item.calculation.finishedPieces}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Stones: </span>
                        <strong className="text-accent">
                          {item.calculation.totalStones.toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stone Usage */}
            {selectedOrder.stoneUsage && selectedOrder.stoneUsage.length > 0 && (
              <div className="card-l1">
                <div className="px-4 py-2 border-b border-border bg-muted/30">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Stone Usage
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {selectedOrder.stoneUsage.map((usage, index) => (
                    <div key={index} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                              {usage.stoneType}
                            </Badge>
                            <span className="font-medium text-xs">
                              {usage.stoneName}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Size: {usage.stoneSize}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-xs">
                            {usage.quantityUsed.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-muted-foreground">pieces</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="card-l1 p-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Pieces: </span>
                  <span className="font-bold">
                    {selectedOrder.items
                      .reduce((s, i) => s + i.calculation.finishedPieces, 0)
                      .toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Stones: </span>
                  <span className="font-bold">
                    {selectedOrder.items
                      .reduce((s, i) => s + i.calculation.totalStones, 0)
                      .toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/orders/${selectedOrder.id}`)}
                className="h-7 text-xs"
              >
                View Full Details
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(selectedOrder.id)}
                className="h-7 text-xs"
              >
                <Trash2 size={12} className="mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // New Order Form
  if (viewMode === "new") {
    return <StoneOrderFormView onCancel={() => { setViewMode("list"); setAllOrders(getOrders()); }} />;
  }

  return null;
}

// ── Stone Order Form Component ───────────────────────────────────────────────────
function StoneOrderFormView({ onCancel }: { onCancel: () => void }) {
  const navigate = useNavigate();
  const customers = useMemo(() => getCustomers().filter((c) => c.isActive), []);
  const patterns = useMemo(() => getPatterns(), []);
  const appSettings = useMemo(() => getAppSettings(), []);
  const karigars = useMemo(() => getKarigars().filter((k) => k.isActive), []);
  const stoneKarigars = useMemo(() => karigars.filter((k) => k.type === "stone"), [karigars]);
  const microDiamonds = useMemo(() => getMicroDiamonds(), []);
  const adDiamonds = useMemo(() => getADDiamonds(), []);

  const normalizeSize = (size: string) => {
    if (!size) return '';
    return size.toLowerCase()
      .replace(/×/g, 'x')
      .replace(/\*/g, 'x')
      .replace(/\s*x\s*/g, 'x')
      .replace(/\s+/g, '')
      .trim();
  };

  const normalizeShape = (shape: string) => {
    if (!shape) return '';
    return shape.toLowerCase().trim();
  };

  const customerOptions: ComboboxOption[] = useMemo(() => 
    customers.map((c) => ({ value: c.id, label: c.partyName })),
    [customers]
  );

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema) as Resolver<OrderFormValues>,
    defaultValues: {
      customerId: "",
      orderDate: new Date().toISOString().slice(0, 10),
      orderQuantityType: "pieces",
      notes: "",
      touch: "",
      items: [],
      stoneKarigarId: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const stoneKarigarOptions: ComboboxOption[] = useMemo(() => 
    stoneKarigars.map((k) => ({ value: k.id, label: k.name })),
    [stoneKarigars]
  );

  const onSubmit: SubmitHandler<OrderFormValues> = (data) => {
    const customer = customers.find((c) => c.id === data.customerId);
    if (!customer) {
      toast.error("Customer not found");
      return;
    }

    const items: OrderItem[] = data.items.map((item) => {
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
        notes: item.notes,
        status: "wax_completed",
      };
    });

    // Track stone usage for this order
    const stoneUsage: any[] = [];

    // Deduct stone inventory after order creation and track usage
    for (const item of items) {
      if (item.calculation && item.calculation.stoneRequirements) {
        for (const stoneReq of item.calculation.stoneRequirements) {
          if (stoneReq.stoneType === "micro") {
            const micro = microDiamonds.find((m) => 
              normalizeSize(m.size) === normalizeSize(stoneReq.stoneSize) &&
              m.isActive !== false
            );
            if (micro && (micro.quantity || 0) >= stoneReq.requiredQty) {
              const stones = getMicroDiamonds();
              const idx = stones.findIndex((s) => s.id === micro.id);
              if (idx >= 0) {
                stones[idx] = { 
                  ...stones[idx], 
                  quantity: (micro.quantity || 0) - stoneReq.requiredQty,
                  updatedAt: new Date().toISOString()
                };
                saveMicroDiamonds(stones);
              }
              
              stoneUsage.push({
                stoneType: 'micro',
                stoneId: micro.id,
                stoneName: `${micro.size}mm`,
                quantityUsed: stoneReq.requiredQty,
                itemId: item.id,
              });
            } else {
              console.warn(`Insufficient ${stoneReq.stoneSize}mm micro diamonds`);
            }
          } else if (stoneReq.stoneType === "ad") {
            let foundAd = adDiamonds.find((a) => 
              normalizeSize(a.size) === normalizeSize(stoneReq.stoneSize) &&
              normalizeShape(a.shape) === normalizeShape(stoneReq.shape) &&
              a.isActive !== false &&
              (a.quantity || 0) > 0
            );
            
            if (foundAd && (foundAd.quantity || 0) >= stoneReq.requiredQty) {
              const stones = getADDiamonds();
              const idx = stones.findIndex((s) => s.id === foundAd.id);
              if (idx >= 0) {
                stones[idx] = { 
                  ...stones[idx], 
                  quantity: (foundAd.quantity || 0) - stoneReq.requiredQty,
                  updatedAt: new Date().toISOString()
                };
                saveADDiamonds(stones);
              }
              
              stoneUsage.push({
                stoneType: 'ad',
                stoneId: foundAd.id,
                stoneName: `${foundAd.shape} ${foundAd.size}`,
                quantityUsed: stoneReq.requiredQty,
                itemId: item.id,
              });
            } else {
              console.warn(`Insufficient ${stoneReq.shape} ${stoneReq.stoneSize} AD diamonds`);
            }
          }
        }
      }
    }

    const order: Order = {
      id: nanoid(),
      orderNumber: `ORD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
      customerId: data.customerId,
      customerName: customer.partyName,
      customerMobile: customer.mobile,
      customerWhatsapp: customer.whatsapp,
      orderType: data.orderQuantityType,
      items,
      status: "wax_completed",
      statusHistory: [
        {
          status: "wax_completed",
          changedAt: new Date().toISOString(),
          changedBy: "admin",
          notes: "Stone order created",
        },
      ],
      karigarAssignments: data.stoneKarigarId
        ? [
            {
              type: "stone",
              karigarId: data.stoneKarigarId,
              karigarName: stoneKarigars.find((k) => k.id === data.stoneKarigarId)?.name || "",
              assignedAt: new Date().toISOString(),
              notes: "",
            },
          ]
        : [],
      notes: data.notes,
      touch: data.touch,
      orderDate: data.orderDate,
      stoneUsage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addOrder(order);
    toast.success("Stone order created successfully");
    onCancel();
  };



  return (
    <div className="page-panel">
      <PageToolbar
        title="New Stone Order"
        subtitle="Create a new stone setting order"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="h-7 text-xs"
          >
            <X size={12} className="mr-1" />
            Cancel
          </Button>
        }
      />

      <div className="page-panel-content">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Customer & Date */}
            <div className="card-l1 p-3">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Customer</FormLabel>
                      <FormControl>
                        <Combobox
                          options={customerOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select customer"
                          className="h-8 text-xs"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="orderDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Order Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-8 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Order Type & Touch */}
            <div className="card-l1 p-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">
                    Order Type
                  </label>
                  <FormField
                    control={form.control}
                    name="orderQuantityType"
                    render={({ field }) => (
                      <OrderQtyTypeRadio
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="touch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Touch (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 14" className="h-8 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Stone Karigar Assignment */}
            <div className="card-l1 p-3">
              <FormField
                control={form.control}
                name="stoneKarigarId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Assign Stone Karigar (optional)</FormLabel>
                    <FormControl>
                      <Combobox
                        options={stoneKarigarOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select karigar"
                        className="h-8 text-xs"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Order Items */}
            <div className="card-l1">
              <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Order Items
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    append({
                      id: nanoid(),
                      patternId: "",
                      quantityType: "pieces",
                      orderQuantity: 1,
                      snapshot: null,
                      notes: "",
                    })
                  }
                  className="h-6 text-[10px]"
                >
                  <Plus size={10} className="mr-1" />
                  Add Item
                </Button>
              </div>

              {form.formState.errors.items &&
                typeof form.formState.errors.items === "object" &&
                "message" in form.formState.errors.items && (
                  <p className="text-xs text-destructive px-4 pt-2">
                    {form.formState.errors.items.message as string}
                  </p>
                )}

              {fields.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  Click "Add Item" to add patterns to this order
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-foreground border-r border-border">Pattern</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-foreground border-r border-border w-32">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-foreground border-r border-border w-28">Quantity</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-foreground border-r border-border w-28">Fin. Pcs / Wt</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-foreground border-r border-border w-20">Trees</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-foreground border-r border-border w-28">Stones</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-foreground border-r border-border w-32">Notes</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-foreground w-10"></th>
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

            {/* Notes */}
            <div className="card-l1 p-3">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Order Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Add any notes about this order..." className="h-20 text-xs resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" className="h-8 text-xs">
                <Check size={12} className="mr-1" />
                Create Order
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}