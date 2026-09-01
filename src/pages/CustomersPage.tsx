import { useState, useMemo, useCallback } from "react";
import { useForm, type SubmitHandler, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Building2,
  X,
  ChevronRight,
  Check,
  AlertTriangle,
  ArrowLeft,
  Package,
  Calendar,
  Filter,
} from "lucide-react";
import {
  getCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  getOrders,
} from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { PageToolbar } from "@/components/layouts/AppLayout";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import type { Customer, Order } from "@/types/erp";

const schema = z.object({
  partyName: z.string().min(1, "Party name required"),
  contactPerson: z.string().default(""),
  mobile: z.string().min(10, "Valid mobile required"),
  alternateNumber: z.string().default(""),
  whatsapp: z.string().default(""),
  address: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  email: z.string().default(""),
  gst: z.string().default(""),
  notes: z.string().default(""),
  isActive: z.boolean().default(true),
});
type FormValues = z.infer<typeof schema>;
type ViewMode = "list" | "detail" | "order-detail" | "add" | "edit";

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs font-medium text-muted-foreground pt-1.5 text-right">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

// ── Customer Form Page ────────────────────────────────────────────────────────
function CustomerFormPage({
  customer,
  onSave,
  onCancel,
}: {
  customer?: Customer;
  onSave: () => void;
  onCancel: () => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: customer
      ? {
          partyName: customer.partyName,
          contactPerson: customer.contactPerson,
          mobile: customer.mobile,
          alternateNumber: customer.alternateNumber,
          whatsapp: customer.whatsapp,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          email: customer.email,
          gst: customer.gst,
          notes: customer.notes,
          isActive: customer.isActive,
        }
      : {
          isActive: true,
          contactPerson: "",
          alternateNumber: "",
          whatsapp: "",
          address: "",
          city: "",
          state: "",
          email: "",
          gst: "",
          notes: "",
        },
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    try {
      if (customer) {
        updateCustomer(customer.id, values);
        toast.success("Customer updated");
      } else {
        addCustomer(values);
        toast.success("Customer added");
      }
      onSave();
    } catch (e) {
      toast.error("Failed to save customer");
      console.error(e);
    }
  };

  return (
    <div className="page-panel">
      <div className="page-panel-header">
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={13} />
        </button>
        <Separator orientation="vertical" className="h-4" />
        <span
          className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground"
          onClick={onCancel}
        >
          Customers
        </span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] font-medium">
          {customer ? `Edit: ${customer.partyName}` : "New Customer"}
        </span>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={onCancel}
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
          {customer ? "Save Changes" : "Add Customer"}
        </Button>
      </div>
      <div className="page-panel-body">
        <Form {...form}>
          <form className="max-w-xl mx-auto flex flex-col gap-4">
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Party Details
                </span>
              </div>
              <div className="px-4 py-1">
                <FieldRow label="Party Name *">
                  <FormField
                    control={form.control}
                    name="partyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-8 text-sm"
                            placeholder="e.g. ABC Jewellers"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Contact Person">
                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} className="h-8 text-sm" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Mobile *">
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-8 text-sm"
                            placeholder="10-digit mobile"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Alternate Number">
                  <FormField
                    control={form.control}
                    name="alternateNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} className="h-8 text-sm" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="WhatsApp">
                  <FormField
                    control={form.control}
                    name="whatsapp"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-8 text-sm"
                            placeholder="Same as mobile"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Email">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-8 text-sm"
                            type="email"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="GST No.">
                  <FormField
                    control={form.control}
                    name="gst"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-8 text-sm"
                            placeholder="27ABCDE1234F1Z5"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </FieldRow>
              </div>
            </div>
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Address & Notes
                </span>
              </div>
              <div className="px-4 py-1">
                <FieldRow label="Address">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea {...field} className="text-sm" rows={2} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="City">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} className="h-8 text-sm" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="State">
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} className="h-8 text-sm" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Notes">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea {...field} className="text-sm" rows={2} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Active">
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2 py-1">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <Label className="text-xs">
                            {field.value ? "Active" : "Inactive"}
                          </Label>
                        </div>
                      </FormItem>
                    )}
                  />
                </FieldRow>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

// ── Order Detail mini-view (inside customer) ──────────────────────────────────
function OrderDetailPanel({
  order,
  onBack,
}: {
  order: Order;
  onBack: () => void;
}) {
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

  const handleShare = () => {
    const lines = [
      `Order: ${order.orderNumber}`,
      `Party: ${order.customerName}`,
      `Date: ${formatDate(order.orderDate)}`,
      `Status: ${order.status}`,
      "",
      ...order.items.map(
        (i) =>
          `• ${i.snapshot.patternNumber} — ${i.orderQuantity}${i.quantityType === "grams" ? "g" : " pcs"} → ${i.calculation.finishedPieces} pcs`,
      ),
      "",
      `Total Pieces: ${totalPieces}  |  Wax Trees: ${totalTrees}  |  Stones: ${totalStones.toLocaleString()}`,
    ];
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank");
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
          Customers
        </span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span
          className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground"
          onClick={onBack}
        >
          {order.customerName}
        </span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] font-medium">{order.orderNumber}</span>
        <div className="flex-1" />
        <StatusBadge status={order.status} />
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs ml-2"
          onClick={handleShare}
        >
          Share WhatsApp
        </Button>
      </div>
      <div className="page-panel-body">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Pieces", value: totalPieces },
              { label: "Wax Trees", value: totalTrees },
              { label: "Total Stones", value: totalStones.toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="card-l1 p-4 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-xl font-bold">{value}</span>
              </div>
            ))}
          </div>
          {/* Order Info */}
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Order Info
              </span>
            </div>
            <div className="px-4 py-1 text-xs">
              {(
                [
                  ["Order #", order.orderNumber],
                  ["Date", formatDate(order.orderDate)],
                  ["Party", order.customerName],
                  ["Status", order.status],
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
            </div>
          </div>
          {/* Items table */}
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Order Items ({order.items.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Pattern</th>
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
                      <td className="text-xs">
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
                </tbody>
              </table>
            </div>
          </div>
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
                    {order.statusHistory.map((h, i) => (
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
    </div>
  );
}

// ── Customer Detail Page ──────────────────────────────────────────────────────
function CustomerDetailPage({
  customer,
  onEdit,
  onBack,
  onViewOrder,
}: {
  customer: Customer;
  onEdit: () => void;
  onBack: () => void;
  onViewOrder: (order: Order) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  const allOrders = useMemo(
    () => getOrders().filter((o) => o.customerId === customer.id),
    [customer.id],
  );

  const years = useMemo(() => {
    const set = new Set(allOrders.map((o) => o.orderDate.slice(0, 4)));
    return Array.from(set).sort().reverse();
  }, [allOrders]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allOrders
      .filter((o) => {
        const matchQ =
          !q ||
          o.orderNumber.toLowerCase().includes(q) ||
          o.items.some((i) =>
            i.snapshot.patternNumber.toLowerCase().includes(q),
          );
        const matchStatus = statusFilter === "all" || o.status === statusFilter;
        const matchYear =
          yearFilter === "all" || o.orderDate.startsWith(yearFilter);
        const matchMonth =
          monthFilter === "all" ||
          o.orderDate.slice(0, 7) ===
            `${yearFilter === "all" ? "" : yearFilter}` +
              (yearFilter !== "all" && monthFilter !== "all"
                ? `-${monthFilter}`
                : "");
        const dateStr = o.orderDate.slice(0, 7);
        const matchM =
          monthFilter === "all" || dateStr.endsWith(`-${monthFilter}`);
        return matchQ && matchStatus && matchYear && matchM;
      })
      .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
  }, [allOrders, search, statusFilter, yearFilter, monthFilter]);

  const totalOrders = allOrders.length;
  const activeOrders = allOrders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status),
  ).length;

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
          Customers
        </span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] font-medium">{customer.partyName}</span>
        <div className="flex-1" />
        <Badge
          variant={customer.isActive ? "default" : "secondary"}
          className="text-[10px] h-5 px-2"
        >
          {customer.isActive ? "Active" : "Inactive"}
        </Badge>
        <Button size="sm" className="h-7 text-xs ml-2" onClick={onEdit}>
          <Pencil size={12} className="mr-1" />
          Edit
        </Button>
      </div>
      <div className="page-panel-body">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Orders", value: totalOrders, icon: Package },
              { label: "Active Orders", value: activeOrders, icon: Filter },
              {
                label: "Since",
                value: customer.createdAt?.slice(0, 10) || "—",
                icon: Calendar,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="card-l1 p-4 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Icon size={11} />
                  {label}
                </div>
                <span className="text-xl font-bold">{value}</span>
              </div>
            ))}
          </div>

          {/* Customer Info */}
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Customer Info — {customer.customerId}
              </span>
            </div>
            <div className="px-4 py-1 text-xs">
              {(
                [
                  ["Party Name", customer.partyName],
                  ["Contact Person", customer.contactPerson || "—"],
                  ["Mobile", customer.mobile],
                  ["WhatsApp", customer.whatsapp || "—"],
                  ["Email", customer.email || "—"],
                  ["GST", customer.gst || "—"],
                  [
                    "Address",
                    [customer.address, customer.city, customer.state]
                      .filter(Boolean)
                      .join(", ") || "—",
                  ],
                  ["Notes", customer.notes || "—"],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div
                  key={k}
                  className="grid grid-cols-[160px_1fr] gap-3 py-1.5 border-b border-border/50 last:border-0"
                >
                  <span className="text-muted-foreground text-right flex items-center justify-end gap-1">
                    {k === "Mobile" && <Phone size={10} />}
                    {k === "Email" && <Mail size={10} />}
                    {k === "Address" && <MapPin size={10} />}
                    {k}
                  </span>
                  <strong className="font-medium">{v}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Orders section */}
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex-1">
                Orders ({allOrders.length})
              </span>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Order # or pattern…"
                className="h-6 w-36 text-xs"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-6 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {[
                    "pending",
                    "confirmed",
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
                  ].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
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
                <SelectTrigger className="h-6 w-24 text-xs">
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
                  <SelectTrigger className="h-6 w-28 text-xs">
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
            </div>
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No orders match the current filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Fin. Pcs</th>
                      <th>Stones</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((o) => {
                      const totalPcs = o.items.reduce(
                        (s, i) => s + i.calculation.finishedPieces,
                        0,
                      );
                      const totalStones = o.items.reduce(
                        (s, i) => s + i.calculation.totalStones,
                        0,
                      );
                      return (
                        <tr
                          key={o.id}
                          className="cursor-pointer hover:bg-muted/20"
                          onClick={() => onViewOrder(o)}
                        >
                          <td className="font-semibold text-xs text-primary hover:underline">
                            {o.orderNumber}
                          </td>
                          <td className="text-xs text-muted-foreground">
                            {formatDate(o.orderDate)}
                          </td>
                          <td className="text-xs">
                            {o.items
                              .slice(0, 2)
                              .map((i) => i.snapshot.patternNumber)
                              .join(", ")}
                            {o.items.length > 2
                              ? ` +${o.items.length - 2}`
                              : ""}
                          </td>
                          <td className="text-xs font-semibold">{totalPcs}</td>
                          <td className="text-xs text-accent">
                            {totalStones.toLocaleString()}
                          </td>
                          <td>
                            <StatusBadge status={o.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Customers Page ───────────────────────────────────────────────────────
export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(getCustomers);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [view, setView] = useState<ViewMode>("list");
  const [selected, setSelected] = useState<Customer | undefined>();
  const [selectedOrder, setSelectedOrder] = useState<Order | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const refresh = useCallback(() => setCustomers(getCustomers()), []);

  const years = useMemo(() => {
    const set = new Set(
      customers
        .map((c) => c.createdAt?.slice(0, 4))
        .filter(Boolean) as string[],
    );
    return Array.from(set).sort().reverse();
  }, [customers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter((c) => {
      const matchQ =
        !q ||
        c.partyName.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        c.customerId.toLowerCase().includes(q);
      const matchActive = showInactive || c.isActive;
      const matchYear =
        yearFilter === "all" || c.createdAt?.startsWith(yearFilter);
      return matchQ && matchActive && matchYear;
    });
  }, [customers, search, showInactive, yearFilter]);

  const handleSaved = () => {
    setView(selected ? "detail" : "list");
    refresh();
  };
  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteCustomer(deleteTarget.id);
    toast.success("Customer deleted");
    setDeleteTarget(null);
    refresh();
  };

  if (view === "add")
    return (
      <CustomerFormPage
        onSave={() => {
          setView("list");
          refresh();
        }}
        onCancel={() => setView("list")}
      />
    );
  if (view === "edit" && selected)
    return (
      <CustomerFormPage
        customer={selected}
        onSave={handleSaved}
        onCancel={() => setView("detail")}
      />
    );
  if (view === "order-detail" && selectedOrder) {
    return (
      <OrderDetailPanel
        order={selectedOrder}
        onBack={() => setView("detail")}
      />
    );
  }
  if (view === "detail" && selected) {
    const fresh = customers.find((c) => c.id === selected.id) ?? selected;
    return (
      <CustomerDetailPage
        customer={fresh}
        onEdit={() => setView("edit")}
        onBack={() => setView("list")}
        onViewOrder={(o) => {
          setSelectedOrder(o);
          setView("order-detail");
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageToolbar
        breadcrumbs={[{ label: "Customers" }]}
        title="Customer Master"
        subtitle={`${customers.filter((c) => c.isActive).length} active`}
        actions={
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setSelected(undefined);
              setView("add");
            }}
          >
            <Plus size={12} className="mr-1" />
            New Customer
          </Button>
        }
      />
      <div className="erp-toolbar border-b border-border bg-background flex-wrap gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, mobile, ID…"
          className="w-56 h-7 text-xs"
        />
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="h-7 w-28 text-xs">
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
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer ml-1">
          <Switch
            checked={showInactive}
            onCheckedChange={setShowInactive}
            className="scale-75"
          />{" "}
          Show inactive
        </label>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="erp-content">
        <div className="overflow-x-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Party Name</th>
                <th>Contact</th>
                <th>Mobile</th>
                <th>City</th>
                <th>Status</th>
                <th>Added</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    {search
                      ? "No customers match."
                      : 'No customers yet. Click "New Customer" to add one.'}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelected(c);
                      setView("detail");
                    }}
                  >
                    <td className="text-xs text-muted-foreground font-mono">
                      {c.customerId}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 size={11} className="text-primary" />
                        </div>
                        <span className="font-semibold text-xs text-primary hover:underline">
                          {c.partyName}
                        </span>
                      </div>
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {c.contactPerson || "—"}
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-xs">
                        <Phone size={10} className="text-muted-foreground" />
                        {c.mobile}
                      </div>
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {c.city || "—"}
                    </td>
                    <td>
                      <Badge
                        variant={c.isActive ? "default" : "secondary"}
                        className="text-[10px] h-4 px-1.5"
                      >
                        {c.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-0.5 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={() => {
                            setSelected(c);
                            setView("edit");
                          }}
                        >
                          <Pencil size={11} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <Trash2 size={11} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {deleteTarget && (
          <div className="sticky bottom-0 p-3 bg-card border-t border-border">
            <div className="confirm-bar">
              <AlertTriangle size={14} className="text-destructive shrink-0" />
              <span className="flex-1 text-xs">
                Delete <strong>{deleteTarget.partyName}</strong>? This cannot be
                undone.
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
