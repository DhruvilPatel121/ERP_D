import { useState, useMemo, useCallback, useRef } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm, type SubmitHandler, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Phone,
  X,
  AlertTriangle,
  Check,
  ChevronRight,
  ArrowLeft,
  ImageDown,
  MessageCircle,
  Layers,
  Gem,
  Filter,
  Calendar,
  Settings2,
} from "lucide-react";
import {
  getKarigars,
  addKarigar,
  updateKarigar,
  deleteKarigar,
  getOrders,
  getPatternDiceRanges,
  addPatternDiceRange,
  updatePatternDiceRange,
  deletePatternDiceRange,
  findKarigarForPattern,
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
import type { Karigar, Order, PatternDiceRange } from "@/types/erp";
import html2canvas from "html2canvas";

const KARIGAR_TYPES = ["wax", "stone", "finishing", "polishing", "other"];

const schema = z.object({
  name: z.string().min(1, "Name required"),
  mobile: z.string().min(10, "Valid mobile required"),
  whatsapp: z.string().default(""),
  type: z.string().min(1, "Type required"),
  address: z.string().default(""),
  notes: z.string().default(""),
  isActive: z.boolean().default(true),
});
type FormValues = z.infer<typeof schema>;
type ViewMode =
  | "landing"
  | "wax-list"
  | "stone-list"
  | "detail"
  | "add-wax"
  | "add-stone"
  | "edit";

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs font-medium text-muted-foreground pt-2 text-right">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

// ── WhatsApp image card (off-screen) ──────────────────────────────────────────
const KarigarWhatsAppCard = React.forwardRef<
  HTMLDivElement,
  {
    karigar: Karigar;
    orders: Order[];
  }
>(({ karigar, orders }, ref) => {
  const assignedOrders = orders.filter((o) =>
    o.karigarAssignments?.some((a) => a.karigarId === karigar.id),
  );

  const isWaxKarigar = karigar.type === "wax";

  return (
    <div
      ref={ref}
      style={{
        width: 540,
        background: "#ffffff",
        fontFamily: "Arial,sans-serif",
        padding: 24,
        borderRadius: 12,
        color: "#1a1a1a",
        display: "block", // Ensure it's visible for html2canvas
      }}
    >
      <div
        style={{
          borderBottom: "2px solid #e5e7eb",
          paddingBottom: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700 }}>{karigar.name}</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          {karigar.karigarId} ·{" "}
          {karigar.type.charAt(0).toUpperCase() + karigar.type.slice(1)} Karigar
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Mobile: {karigar.mobile}
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#6b7280",
          marginBottom: 8,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        Assigned Orders ({assignedOrders.length})
      </div>
      {assignedOrders.length === 0 ? (
        <div style={{ fontSize: 12, color: "#9ca3af", padding: "12px 0" }}>
          No orders assigned yet.
        </div>
      ) : (
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}
        >
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              {isWaxKarigar ? (
                <>
                  <th style={{ padding: "6px 8px", textAlign: "left", color: "#374151", fontWeight: 600 }}>Party/Customer</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", color: "#374151", fontWeight: 600 }}>Order #</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", color: "#374151", fontWeight: 600 }}>Pattern #</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", color: "#374151", fontWeight: 600 }}>Total Pcs</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", color: "#374151", fontWeight: 600 }}>Total Tree</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", color: "#374151", fontWeight: 600 }}>Touch</th>
                </>
              ) : (
                <>
                  <th style={{ padding: "6px 8px", textAlign: "left", color: "#374151", fontWeight: 600 }}>Party/Customer</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", color: "#374151", fontWeight: 600 }}>Order #</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", color: "#374151", fontWeight: 600 }}>Pattern #</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", color: "#374151", fontWeight: 600 }}>Total Pcs</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", color: "#374151", fontWeight: 600 }}>Total Tree</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", color: "#374151", fontWeight: 600 }}>Stone Details</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", color: "#374151", fontWeight: 600 }}>Touch</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {assignedOrders.map((o, i) => {
              const totalPcs = o.items.reduce(
                (s, it) => s + it.calculation.finishedPieces,
                0,
              );
              const totalTrees = o.items.reduce(
                (s, it) => s + it.calculation.waxTreesRequired,
                0,
              );
              const patternNumbers = o.items
                .map((i) => i.snapshot?.patternNumber || "—")
                .join(", ");
              
              // For stone karigars, gather stone details with sizes
              let stoneDetails = "";
              if (!isWaxKarigar && o.stoneUsage && o.stoneUsage.length > 0) {
                const microStones = o.stoneUsage.filter(s => s.stoneType === 'micro');
                const adStones = o.stoneUsage.filter(s => s.stoneType === 'ad');
                
                // Group Micro stones by size and sum quantities
                const microBySize = microStones.reduce((acc: Record<string, number>, s) => {
                  const size = s.stoneName; // stoneName contains size for micro
                  acc[size] = (acc[size] || 0) + s.quantityUsed;
                  return acc;
                }, {} as Record<string, number>);
                
                // Group AD stones by size and sum quantities
                const adBySize = adStones.reduce((acc: Record<string, number>, s) => {
                  const size = s.stoneName; // stoneName contains size for AD
                  acc[size] = (acc[size] || 0) + s.quantityUsed;
                  return acc;
                }, {} as Record<string, number>);
                
                const totalStones = o.stoneUsage.reduce((sum, s) => sum + s.quantityUsed, 0);
                
                // Format stone details with size breakdown
                const microSizes = Object.entries(microBySize)
                  .map(([size, qty]) => `${size}: ${qty}`)
                  .join(", ");
                const adSizes = Object.entries(adBySize)
                  .map(([size, qty]) => `${size}: ${qty}`)
                  .join(", ");
                
                stoneDetails = `Total: ${totalStones}`;
                if (microSizes) stoneDetails += ` | Micro: ${microSizes}`;
                if (adSizes) stoneDetails += ` | AD: ${adSizes}`;
              }

              return (
                <tr
                  key={o.id}
                  style={{
                    background: i % 2 === 0 ? "#fff" : "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <td style={{ padding: "6px 8px", fontWeight: 600 }}>{o.customerName}</td>
                  <td style={{ padding: "6px 8px", fontWeight: 600, color: "#2563eb" }}>{o.orderNumber}</td>
                  <td style={{ padding: "6px 8px" }}>{patternNumbers}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{totalPcs}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{totalTrees}</td>
                  {!isWaxKarigar && (
                    <td style={{ padding: "6px 8px", fontSize: 10, color: "#6b7280" }}>{stoneDetails}</td>
                  )}
                  <td style={{ padding: "6px 8px", fontSize: 10, color: "#6b7280" }}>{o.touch || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
});

// ── Karigar Form Page ─────────────────────────────────────────────────────────
function KarigarFormPage({
  karigar,
  defaultType,
  onSave,
  onCancel,
}: {
  karigar?: Karigar;
  defaultType?: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: karigar
      ? {
          name: karigar.name,
          mobile: karigar.mobile,
          whatsapp: karigar.whatsapp ?? "",
          type: karigar.type,
          address: karigar.address ?? "",
          notes: karigar.notes ?? "",
          isActive: karigar.isActive,
        }
      : {
          isActive: true,
          whatsapp: "",
          address: "",
          notes: "",
          type: defaultType ?? "wax",
        },
  });

  const onSubmit: SubmitHandler<FormValues> = (v) => {
    try {
      if (karigar) {
        updateKarigar(karigar.id, v);
        toast.success("Karigar updated");
      } else {
        addKarigar(v);
        toast.success("Karigar added");
      }
      onSave();
    } catch (e) {
      toast.error("Failed to save");
      console.error(e);
    }
  };

  return (
    <div className="page-panel">
      <div className="page-panel-header">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={13} />
        </button>
        <Separator orientation="vertical" className="h-4" />
        <span
          className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground"
          onClick={onCancel}
        >
          Karigars
        </span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] font-medium">
          {karigar ? `Edit: ${karigar.name}` : "New Karigar"}
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
          {karigar ? "Save Changes" : "Add Karigar"}
        </Button>
      </div>
      <div className="page-panel-body">
        <Form {...form}>
          <form className="max-w-xl mx-auto flex flex-col gap-4">
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Karigar Details
                </span>
              </div>
              <div className="px-4 py-1">
                <FieldRow label="Full Name *">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-8 text-sm"
                            placeholder="Karigar full name"
                          />
                        </FormControl>
                        <FormMessage />
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
                            placeholder="9876543210"
                          />
                        </FormControl>
                        <FormMessage />
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
                <FieldRow label="Work Type *">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {KARIGAR_TYPES.map((t) => (
                              <SelectItem
                                key={t}
                                value={t}
                                className="capitalize"
                              >
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
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
                <FieldRow label="Address / Workshop">
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

// ── Dice Range Management Panel (wax karigars only) ──────────────────────────
function DiceRangePanel({
  karigars,
  onClose,
}: {
  karigars: Karigar[];
  onClose: () => void;
}) {
  const [ranges, setRanges] =
    useState<PatternDiceRange[]>(getPatternDiceRanges);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    karigarId: "",
    fromNumber: "",
    toNumber: "",
    notes: "",
  });

  const refresh = () => setRanges(getPatternDiceRanges());

  const handleSave = () => {
    if (!form.karigarId || !form.fromNumber || !form.toNumber) {
      toast.error("Fill all required fields");
      return;
    }
    const from = parseInt(form.fromNumber);
    const to = parseInt(form.toNumber);
    if (isNaN(from) || isNaN(to) || from > to) {
      toast.error("Invalid range (from must be ≤ to)");
      return;
    }
    const karigar = karigars.find((k) => k.id === form.karigarId);
    if (!karigar) return;

    const payload = {
      karigarId: form.karigarId,
      karigarName: karigar.name,
      fromNumber: from,
      toNumber: to,
      notes: form.notes,
    };

    try {
      if (editId) {
        updatePatternDiceRange(editId, payload);
        toast.success("Range updated");
      } else {
        addPatternDiceRange(payload);
        toast.success("Range added");
      }
      setForm({ karigarId: "", fromNumber: "", toNumber: "", notes: "" });
      setEditId(null);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save range");
    }
  };

  const handleEdit = (r: PatternDiceRange) => {
    setEditId(r.id);
    setForm({
      karigarId: r.karigarId,
      fromNumber: String(r.fromNumber),
      toNumber: String(r.toNumber),
      notes: r.notes,
    });
  };

  const handleDelete = (id: string) => {
    deletePatternDiceRange(id);
    toast.success("Range deleted");
    refresh();
  };

  // Test lookup
  const [testPattern, setTestPattern] = useState("");
  const testResult = useMemo(
    () => (testPattern ? findKarigarForPattern(testPattern) : null),
    [testPattern, ranges],
  );

  return (
    <div className="page-panel">
      <div className="page-panel-header">
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={13} />
        </button>
        <Separator orientation="vertical" className="h-4" />
        <span
          className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground"
          onClick={onClose}
        >
          Karigars
        </span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] font-medium">
          Pattern Dice Range Assignment
        </span>
      </div>
      <div className="page-panel-body">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          {/* Info banner */}
          <div className="card-l1 p-4 bg-primary/5 border-primary/20">
            <p className="text-xs text-muted-foreground">
              Define which wax karigar owns which pattern number range. When a
              new order includes a pattern (e.g. P-555), the system
              automatically finds the correct wax karigar based on these ranges
              — no manual assignment needed.
            </p>
          </div>

          {/* Add / Edit form */}
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {editId ? "Edit Range" : "Add New Range"}
              </span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="grid grid-cols-[1fr_1fr_1fr] gap-3">
                <div>
                  <Label className="text-xs">Karigar *</Label>
                  <Select
                    value={form.karigarId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, karigarId: v }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue placeholder="Select karigar" />
                    </SelectTrigger>
                    <SelectContent>
                      {karigars.map((k) => (
                        <SelectItem key={k.id} value={k.id}>
                          {k.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">From Pattern # *</Label>
                  <Input
                    value={form.fromNumber}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fromNumber: e.target.value }))
                    }
                    placeholder="e.g. 1"
                    type="number"
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">To Pattern # *</Label>
                  <Input
                    value={form.toNumber}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, toNumber: e.target.value }))
                    }
                    placeholder="e.g. 2500"
                    type="number"
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Input
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Optional notes…"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end">
                {editId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      setEditId(null);
                      setForm({
                        karigarId: "",
                        fromNumber: "",
                        toNumber: "",
                        notes: "",
                      });
                    }}
                  >
                    <X size={12} className="mr-1" />
                    Cancel Edit
                  </Button>
                )}
                <Button size="sm" className="h-7 text-xs" onClick={handleSave}>
                  <Check size={12} className="mr-1" />
                  {editId ? "Save" : "Add Range"}
                </Button>
              </div>
            </div>
          </div>

          {/* Ranges table */}
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Current Ranges ({ranges.length})
              </span>
            </div>
            {ranges.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No ranges defined. Add one above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Karigar</th>
                      <th>From #</th>
                      <th>To #</th>
                      <th>Count</th>
                      <th>Notes</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranges
                      .sort((a, b) => a.fromNumber - b.fromNumber)
                      .map((r) => (
                        <tr
                          key={r.id}
                          className={editId === r.id ? "bg-primary/5" : ""}
                        >
                          <td className="font-medium text-xs">
                            {r.karigarName}
                          </td>
                          <td className="text-xs font-mono">
                            {r.fromNumber.toLocaleString()}
                          </td>
                          <td className="text-xs font-mono">
                            {r.toNumber.toLocaleString()}
                          </td>
                          <td className="text-xs text-muted-foreground">
                            {(r.toNumber - r.fromNumber + 1).toLocaleString()}
                          </td>
                          <td className="text-xs text-muted-foreground">
                            {r.notes || "—"}
                          </td>
                          <td>
                            <div className="flex gap-0.5 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-6 h-6"
                                onClick={() => handleEdit(r)}
                              >
                                <Pencil size={11} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-6 h-6 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(r.id)}
                              >
                                <Trash2 size={11} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Test lookup */}
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Test Pattern Lookup
              </span>
            </div>
            <div className="p-4 flex items-center gap-3">
              <Input
                value={testPattern}
                onChange={(e) => setTestPattern(e.target.value)}
                placeholder="e.g. P-555 or 2600"
                className="h-8 text-xs w-44"
              />
              {testPattern &&
                (testResult ? (
                  <span className="text-xs text-green-600 font-medium">
                    → <strong>{testResult.karigarName}</strong> (Range{" "}
                    {testResult.fromNumber}–{testResult.toNumber})
                  </span>
                ) : (
                  <span className="text-xs text-destructive">
                    No karigar assigned for this pattern number
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Karigar Detail Page ───────────────────────────────────────────────────────
function KarigarDetailPage({
  karigar,
  onEdit,
  onBack,
  onDelete,
}: {
  karigar: Karigar;
  onEdit: () => void;
  onBack: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const allOrders = useMemo(() => getOrders(), []);

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [generatingImg, setGeneratingImg] = useState(false);

  const assignedOrders = useMemo(
    () =>
      allOrders.filter((o) =>
        o.karigarAssignments?.some((a) => a.karigarId === karigar.id),
      ),
    [allOrders, karigar.id],
  );

  const years = useMemo(() => {
    const set = new Set(assignedOrders.map((o) => o.orderDate.slice(0, 4)));
    return Array.from(set).sort().reverse();
  }, [assignedOrders]);

  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();
    return assignedOrders
      .filter((o) => {
        const matchQ =
          !q ||
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q);
        const matchY =
          yearFilter === "all" || o.orderDate.startsWith(yearFilter);
        const matchM =
          monthFilter === "all" ||
          o.orderDate.slice(0, 7).endsWith(`-${monthFilter}`);
        const matchS = statusFilter === "all" || o.status === statusFilter;
        return matchQ && matchY && matchM && matchS;
      })
      .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
  }, [assignedOrders, search, yearFilter, monthFilter, statusFilter]);

  const summary = useMemo(() => {
    const totalPieces = assignedOrders.reduce(
      (sum, o) =>
        sum + o.items.reduce((s, i) => s + i.calculation.finishedPieces, 0),
      0,
    );
    const pending = assignedOrders.filter((o) =>
      ["pending", "wax_in_progress", "assigned"].includes(o.status),
    ).length;
    return { totalOrders: assignedOrders.length, totalPieces, pending };
  }, [assignedOrders]);

  // Dice ranges owned by this karigar (wax only)
  const diceRanges = useMemo(
    () =>
      karigar.type === "wax"
        ? getPatternDiceRanges().filter((r) => r.karigarId === karigar.id)
        : [],
    [karigar],
  );

  const handleShareWhatsApp = async () => {
    setGeneratingImg(true);
    try {
      toast.loading("Generating WhatsApp image...");

      // Wait for the ref to be properly available
      await new Promise(resolve => setTimeout(resolve, 200));

      if (!cardRef.current) {
        throw new Error("Card element not found");
      }

      console.log("Starting html2canvas with element:", cardRef.current);
      
      // Add timeout to prevent infinite loading
      const canvas = await Promise.race([
        html2canvas(cardRef.current, {
          scale: 1.5, // Reduced scale for faster rendering
          useCORS: true,
          backgroundColor: "#ffffff",
          allowTaint: true,
          logging: true, // Enable logging for debugging
          removeContainer: true,
          foreignObjectRendering: false, // Disable for better compatibility
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Image generation timeout")), 10000)
        )
      ]) as HTMLCanvasElement;

      console.log("Canvas generated successfully, size:", canvas.width, "x", canvas.height);

      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85); // Slightly lower quality for speed
      console.log("Data URL generated, length:", dataUrl.length);

      // Try to copy using Electron API
      let copied = false;
      if (window.electronAPI?.copyImageToClipboard) {
        try {
          console.log("Attempting Electron clipboard copy...");
          const result = await window.electronAPI.copyImageToClipboard(dataUrl);
          if (result.success) {
            copied = true;
            console.log("Successfully copied using Electron clipboard");
          } else {
            console.warn("Electron clipboard returned false:", result.error);
            // Try browser fallback if Electron fails
            throw new Error(result.error || "Electron clipboard failed");
          }
        } catch (e) {
          console.warn("Electron clipboard failed, trying browser fallback:", e);
          // Fallback: try to copy to clipboard using browser API
          try {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/jpeg': blob })
            ]);
            copied = true;
            console.log("Successfully copied using browser clipboard API fallback");
          } catch (browserError) {
            console.warn("Browser clipboard fallback also failed:", browserError);
          }
        }
      } else {
        console.log("Electron API not available, using browser clipboard fallback");
        // Fallback: try to copy to clipboard using browser API
        try {
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/jpeg': blob })
          ]);
          copied = true;
          console.log("Successfully copied using browser clipboard API");
        } catch (e) {
          console.warn("Browser clipboard fallback failed:", e);
        }
      }

      const wa = karigar.whatsapp || karigar.mobile;
      const num = wa.replace(/\D/g, "");

      // Open WhatsApp Web with the correct number
      setTimeout(() => {
        const url = `https://web.whatsapp.com/send?phone=${num.startsWith("91") ? num : "91" + num}`;

        // Use Electron API to open in default browser (Chrome)
        if (window.electronAPI?.openExternal) {
          window.electronAPI.openExternal(url);
        } else {
          window.open(url, "_blank");
        }

        if (copied) {
          toast.success("WhatsApp Image Auto-Send Initiated! WhatsApp Web is opening in Chrome. The karigar orders image has been copied to your clipboard. 👉 Click inside the WhatsApp chat box and press CTRL + V (Paste) to send the image.");
        } else {
          toast.success("WhatsApp Web is opening in Chrome. Please attach the work order image manually.");
        }
      }, 300);
    } catch (error) {
      console.error("Clipboard error:", error);
      toast.error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingImg(false);
    }
  };

  return (
    <div className="page-panel">
      <div className="page-panel-header">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={13} />
        </button>
        <Separator orientation="vertical" className="h-4" />
        <span
          className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground"
          onClick={onBack}
        >
          Karigars
        </span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] font-medium">{karigar.name}</span>
        <div className="flex-1" />
        <Badge
          variant={karigar.isActive ? "default" : "secondary"}
          className="text-[10px] h-5 px-2"
        >
          {karigar.isActive ? "Active" : "Inactive"}
        </Badge>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs ml-2"
          onClick={handleShareWhatsApp}
          disabled={generatingImg}
        >
          <ImageDown size={12} className="mr-1" />
          <MessageCircle size={12} className="mr-1" />
          {generatingImg ? "Generating..." : "WhatsApp JPG"}
        </Button>
        <Button size="sm" className="h-7 text-xs ml-1" onClick={onEdit}>
          <Pencil size={12} className="mr-1" />
          Edit
        </Button>
        <Button size="sm" variant="destructive" className="h-7 text-xs ml-1" onClick={onDelete}>
          <Trash2 size={12} className="mr-1" />
          Delete
        </Button>
      </div>

      <div className="page-panel-body">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Total Orders",
                value: summary.totalOrders,
                icon: Filter,
              },
              {
                label: "Total Pieces",
                value: summary.totalPieces.toLocaleString(),
                icon: Gem,
              },
              {
                label: "Active/Pending",
                value: summary.pending,
                icon: Calendar,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="card-l1 p-4 flex flex-col gap-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Icon size={11} />
                  {label}
                </div>
                <span className="text-2xl font-bold">{value}</span>
              </div>
            ))}
          </div>

          {/* Karigar info */}
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Karigar Info — {karigar.karigarId}
              </span>
            </div>
            <div className="px-4 py-1 text-xs">
              {(
                [
                  ["Name", karigar.name],
                  ["Mobile", karigar.mobile],
                  ["WhatsApp", karigar.whatsapp || karigar.mobile],
                  ["Work Type", karigar.type],
                  ["Address", karigar.address || "—"],
                  ["Notes", karigar.notes || "—"],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div
                  key={k}
                  className="grid grid-cols-[140px_1fr] gap-3 py-1.5 border-b border-border/50 last:border-0"
                >
                  <span className="text-muted-foreground text-right">{k}</span>
                  <strong className="font-medium capitalize">{v}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Dice ranges (wax karigar only) */}
          {karigar.type === "wax" && (
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Pattern Dice Ranges ({diceRanges.length})
                </span>
              </div>
              {diceRanges.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No dice ranges assigned. Go to Dice Range Management to
                  configure.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>From #</th>
                        <th>To #</th>
                        <th>Count</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diceRanges
                        .sort((a, b) => a.fromNumber - b.fromNumber)
                        .map((r) => (
                          <tr key={r.id}>
                            <td className="text-xs font-mono font-semibold text-primary">
                              {r.fromNumber.toLocaleString()}
                            </td>
                            <td className="text-xs font-mono font-semibold text-primary">
                              {r.toNumber.toLocaleString()}
                            </td>
                            <td className="text-xs text-muted-foreground">
                              {(r.toNumber - r.fromNumber + 1).toLocaleString()}{" "}
                              patterns
                            </td>
                            <td className="text-xs text-muted-foreground">
                              {r.notes || "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Orders with filters */}
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex-1">
                Assigned Orders ({assignedOrders.length})
              </span>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Order # or party…"
                className="h-6 w-36 text-xs"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-6 w-36 text-xs">
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
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No orders match the current filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Party</th>
                      <th>Date</th>
                      <th>Patterns</th>
                      <th>Fin. Pcs</th>
                      <th>Stones</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o) => {
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
                          onClick={() => navigate(`/orders/${o.id}`)}
                        >
                          <td className="font-medium text-primary text-xs hover:underline">
                            {o.orderNumber}
                          </td>
                          <td className="text-xs">{o.customerName}</td>
                          <td className="text-xs text-muted-foreground">
                            {formatDate(o.orderDate)}
                          </td>
                          <td className="text-xs">
                            {o.items
                              .slice(0, 3)
                              .map((i) => i.snapshot?.patternNumber || "—")
                              .join(", ")}
                            {o.items.length > 3
                              ? ` +${o.items.length - 3}`
                              : ""}
                          </td>
                          <td className="text-xs font-semibold">{totalPcs}</td>
                          <td className="text-xs text-accent font-medium">
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

      {/* Off-screen WhatsApp card */}
      <div style={{ position: "fixed", left: -9999, top: -9999, zIndex: -1, visibility: "hidden" }}>
        <KarigarWhatsAppCard karigar={karigar} orders={allOrders} ref={cardRef} />
      </div>
    </div>
  );
}

// ── Karigar List (by type) ────────────────────────────────────────────────────
function KarigarListPage({
  karigarType,
  karigars,
  onSelect,
  onAdd,
  onBack,
  onDiceRange,
}: {
  karigarType: "wax" | "stone";
  karigars: Karigar[];
  onSelect: (k: Karigar) => void;
  onAdd: () => void;
  onBack: () => void;
  onDiceRange?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Karigar | null>(null);

  const years = useMemo(() => {
    const set = new Set(
      karigars.map((k) => k.createdAt?.slice(0, 4)).filter(Boolean) as string[],
    );
    return Array.from(set).sort().reverse();
  }, [karigars]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return karigars.filter((k) => {
      const matchQ =
        !q || k.name.toLowerCase().includes(q) || k.mobile.includes(q);
      const matchY =
        yearFilter === "all" || k.createdAt?.startsWith(yearFilter);
      return matchQ && matchY;
    });
  }, [karigars, search, yearFilter]);

  const label = karigarType === "wax" ? "Wax Karigar" : "Stone Karigar";

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
          Karigars
        </span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] font-medium">{label}</span>
        <div className="flex-1" />
        {karigarType === "wax" && onDiceRange && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={onDiceRange}
          >
            <Settings2 size={12} className="mr-1" />
            Dice Ranges
          </Button>
        )}
        <Button size="sm" className="h-7 text-xs ml-2" onClick={onAdd}>
          <Plus size={12} className="mr-1" />
          New {label}
        </Button>
      </div>
      <div className="erp-toolbar border-b border-border bg-background flex-wrap gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name or mobile…"
          className="w-48 h-7 text-xs"
        />
        <Select value={yearFilter} onValueChange={setYearFilter}>
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
                <th>Name</th>
                <th>Mobile</th>
                <th>Dice Ranges</th>
                <th>Status</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    {search
                      ? "No karigars match."
                      : `No ${label.toLowerCase()}s yet. Click "New ${label}" to get started.`}
                  </td>
                </tr>
              ) : (
                filtered.map((k) => {
                  const ranges =
                    karigarType === "wax"
                      ? getPatternDiceRanges().filter(
                          (r) => r.karigarId === k.id,
                        )
                      : [];
                  return (
                    <tr
                      key={k.id}
                      className="cursor-pointer hover:bg-muted/20"
                      onClick={() => onSelect(k)}
                    >
                      <td className="text-xs text-muted-foreground font-mono">
                        {k.karigarId}
                      </td>
                      <td className="font-semibold text-xs text-primary hover:underline">
                        {k.name}
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-xs">
                          <Phone size={10} className="text-muted-foreground" />
                          {k.mobile}
                        </div>
                      </td>
                      <td>
                        {karigarType === "wax" ? (
                          ranges.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {ranges.slice(0, 2).map((r) => (
                                <Badge
                                  key={r.id}
                                  variant="outline"
                                  className="text-[10px] h-4 px-1.5 font-mono"
                                >
                                  {r.fromNumber}–{r.toNumber}
                                </Badge>
                              ))}
                              {ranges.length > 2 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{ranges.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">
                              —
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground/50">
                            —
                          </span>
                        )}
                      </td>
                      <td>
                        <Badge
                          variant={k.isActive ? "default" : "secondary"}
                          className="text-[10px] h-4 px-1.5"
                        >
                          {k.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {formatDate(k.createdAt)}
                      </td>
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
                Delete <strong>{deleteTarget.name}</strong>? This cannot be
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
                onClick={() => {
                  deleteKarigar(deleteTarget.id);
                  toast.success("Karigar deleted");
                  setDeleteTarget(null);
                }}
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

// ── Landing (two cards) ───────────────────────────────────────────────────────
function KarigarsLanding({
  waxCount,
  stoneCount,
  onWax,
  onStone,
}: {
  waxCount: number;
  stoneCount: number;
  onWax: () => void;
  onStone: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <PageToolbar
        breadcrumbs={[{ label: "Karigars" }]}
        title="Karigar Master"
        subtitle="Select karigar type"
      />
      <div className="erp-content flex items-start justify-center pt-12">
        <div className="grid grid-cols-2 gap-6 w-full max-w-xl">
          <button
            onClick={onWax}
            className="card-l1 text-left p-0 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer focus:outline-none rounded-lg"
          >
            <div className="p-6 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Layers size={24} className="text-amber-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Wax Karigar</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Pattern dice holders, wax setting specialists
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border">
                <span className="font-bold text-foreground text-sm">
                  {waxCount}
                </span>{" "}
                karigar{waxCount !== 1 ? "s" : ""}
                <ChevronRight size={12} className="ml-auto" />
              </div>
            </div>
          </button>
          <button
            onClick={onStone}
            className="card-l1 text-left p-0 hover:border-accent/50 hover:shadow-md transition-all cursor-pointer focus:outline-none rounded-lg"
          >
            <div className="p-6 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Gem size={24} className="text-accent" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Stone Karigar</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Stone setting, polishing, finishing work
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border">
                <span className="font-bold text-foreground text-sm">
                  {stoneCount}
                </span>{" "}
                karigar{stoneCount !== 1 ? "s" : ""}
                <ChevronRight size={12} className="ml-auto" />
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Karigars Page ────────────────────────────────────────────────────────
export default function KarigarsPage() {
  const [karigars, setKarigars] = useState<Karigar[]>(getKarigars);
  const [view, setView] = useState<ViewMode>("landing");
  const [selectedKarigar, setSelectedKarigar] = useState<Karigar | undefined>();

  const refresh = useCallback(() => setKarigars(getKarigars()), []);

  const waxKarigars = useMemo(
    () => karigars.filter((k) => k.type === "wax"),
    [karigars],
  );
  const stoneKarigars = useMemo(
    () => karigars.filter((k) => k.type !== "wax"),
    [karigars],
  );

  const backToList = () =>
    setView(selectedKarigar?.type === "wax" ? "wax-list" : "stone-list");

  if (view === "add-wax")
    return (
      <KarigarFormPage
        defaultType="wax"
        onSave={() => {
          refresh();
          setView("wax-list");
        }}
        onCancel={() => setView("wax-list")}
      />
    );
  if (view === "add-stone")
    return (
      <KarigarFormPage
        defaultType="stone"
        onSave={() => {
          refresh();
          setView("stone-list");
        }}
        onCancel={() => setView("stone-list")}
      />
    );
  if (view === "edit" && selectedKarigar)
    return (
      <KarigarFormPage
        karigar={selectedKarigar}
        onSave={() => {
          refresh();
          setView("detail");
        }}
        onCancel={() => setView("detail")}
      />
    );
  if (view === "detail" && selectedKarigar) {
    const fresh =
      karigars.find((k) => k.id === selectedKarigar.id) ?? selectedKarigar;
    return (
      <KarigarDetailPage
        karigar={fresh}
        onEdit={() => setView("edit")}
        onBack={backToList}
        onDelete={() => {
          if (confirm(`Are you sure you want to delete ${fresh.name}? This cannot be undone.`)) {
            deleteKarigar(fresh.id);
            toast.success("Karigar deleted");
            refresh();
            backToList();
          }
        }}
      />
    );
  }
  if (view === "wax-list")
    return (
      <KarigarListPage
        karigarType="wax"
        karigars={waxKarigars}
        onSelect={(k) => {
          setSelectedKarigar(k);
          setView("detail");
        }}
        onAdd={() => setView("add-wax")}
        onBack={() => setView("landing")}
        onDiceRange={() => setView("dice-range" as ViewMode)}
      />
    );
  if (view === "stone-list")
    return (
      <KarigarListPage
        karigarType="stone"
        karigars={stoneKarigars}
        onSelect={(k) => {
          setSelectedKarigar(k);
          setView("detail");
        }}
        onAdd={() => setView("add-stone")}
        onBack={() => setView("landing")}
      />
    );
  if ((view as string) === "dice-range")
    return (
      <DiceRangePanel
        karigars={waxKarigars}
        onClose={() => setView("wax-list")}
      />
    );

  return (
    <KarigarsLanding
      waxCount={waxKarigars.length}
      stoneCount={stoneKarigars.length}
      onWax={() => setView("wax-list")}
      onStone={() => setView("stone-list")}
    />
  );
}
