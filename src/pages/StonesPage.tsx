import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, type SubmitHandler, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronRight,
  Check,
  AlertTriangle,
  Diamond,
  Gem,
  ArrowLeft,
  FileText,
} from "lucide-react";
import {
  getMicroDiamonds,
  saveMicroDiamonds,
  addMicroDiamond,
  updateMicroDiamond,
  deleteMicroDiamond,
  getADDiamonds,
  saveADDiamonds,
  addADDiamond,
  updateADDiamond,
  deleteADDiamond,
  getADShapes,
  saveADShapes,
  getOrders,
  addADShape,
  deleteADShape,
} from "@/lib/db";
import { PageToolbar } from "@/components/layouts/AppLayout";
import { SearchInput } from "@/components/common/SearchInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { MicroDiamond, ADDiamond, StoneCategory } from "@/types/erp";

const microSchema = z.object({
  size: z.string().min(1, "Size required"),
  quantity: z.preprocess(
    (v) => (v === "" ? 0 : Number(v)),
    z.number().min(0, "Quantity must be positive"),
  ),
  weight: z.preprocess(
    (v) => (v === "" ? 0 : Number(v)),
    z.number().min(0, "Weight must be positive"),
  ),
  pricePer1000: z.preprocess(
    (v) => (v === "" ? 0 : Number(v)),
    z.number().min(0, "Price must be positive"),
  ),
  isActive: z.boolean().default(true),
});

const adSchema = z.object({
  shapeId: z.string().min(1, "Shape required"),
  size: z.string().min(1, "Size required"),
  quantity: z.preprocess(
    (v) => (v === "" ? 0 : Number(v)),
    z.number().min(0, "Quantity must be positive"),
  ),
  weight: z.preprocess(
    (v) => (v === "" ? 0 : Number(v)),
    z.number().min(0, "Weight must be positive"),
  ),
  pricePerPiece: z.preprocess(
    (v) => (v === "" ? 0 : Number(v)),
    z.number().min(0, "Price must be positive"),
  ),
  isActive: z.boolean().default(true),
});

type MicroForm = z.infer<typeof microSchema>;
type ADForm = z.infer<typeof adSchema>;
type MicroFormValues = z.infer<typeof microSchema>;
type ADFormValues = z.infer<typeof adSchema>;

const SHAPES = [
  "Round",
  "Oval",
  "Marquise",
  "Pear",
  "Cushion",
  "Princess",
  "Emerald",
  "Heart",
  "Other",
];
const GRADES = ["VS", "SI", "VVS", "F", "IF", "Other"];

type ViewMode =
  | "landing"
  | "micro-list"
  | "micro-detail"
  | "micro-add"
  | "micro-edit"
  | "ad-shapes"
  | "ad-sizes"
  | "ad-detail"
  | "ad-add"
  | "ad-edit";

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[150px_1fr] items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs font-medium text-muted-foreground pt-2 text-right">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

function CategorySelector({
  type,
  value,
  onChange,
}: {
  type: "micro" | "ad";
  value: string;
  onChange: (v: string) => void;
}) {
  const [cats, setCats] = useState<StoneCategory[]>(() =>
    getStoneCategories().filter((c) => c.type === type),
  );
  const [newCat, setNewCat] = useState("");
  const handleAdd = () => {
    if (!newCat.trim()) return;
    const c = addStoneCategory(newCat.trim(), type);
    setCats((p) => [...p, c]);
    onChange(c.id);
    setNewCat("");
  };
  return (
    <div className="flex flex-col gap-1">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          {cats.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-1">
        <Input
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          placeholder="New category…"
          className="h-7 text-xs"
          onKeyDown={(e) =>
            e.key === "Enter" && (e.preventDefault(), handleAdd())
          }
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs px-2"
          onClick={handleAdd}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function MicroDiamondFormPage({
  stone,
  onSave,
  onCancel,
}: {
  stone?: any;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [restockAmount, setRestockAmount] = useState(0);

  const form = useForm<MicroFormValues>({
    resolver: zodResolver(microSchema) as Resolver<MicroFormValues>,
    defaultValues: stone
      ? {
          size: stone.size,
          quantity: stone.quantity || 0,
          weight: stone.weight || 0,
          pricePer1000: stone.price_per_1000 || 0,
          isActive: stone.isActive !== false,
        }
      : { isActive: true, quantity: 0, weight: 0, pricePer1000: 0 },
  });

  const onSubmit: SubmitHandler<MicroFormValues> = async (v) => {
    try {
      // Ensure all numeric values are properly converted
      const quantity = Number(v.quantity) || 0;
      const weight = Number(v.weight) || 0;
      const pricePer1000 = Number(v.pricePer1000) || 0;
      const restock = Number(restockAmount) || 0;

      if (stone) {
        // If restocking, add to both quantity and totalQuantity
        const finalQuantity = restock > 0 ? quantity + restock : quantity;
        updateMicroDiamond(stone.id, {
          size: v.size,
          quantity: finalQuantity,
          totalQuantity: restock > 0 ? (stone.totalQuantity || quantity) + restock : undefined,
          weight,
          price_per_1000: pricePer1000,
          isActive: v.isActive,
        });
        toast.success(restock > 0 ? `Micro diamond restocked (+${restock})` : "Micro diamond updated");
      } else {
        addMicroDiamond({
          size: v.size,
          quantity,
          weight,
          price_per_1000: pricePer1000,
          isActive: v.isActive,
        });
        toast.success("Micro diamond added");
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
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={13} />
        </button>
        <Separator orientation="vertical" className="h-4" />
        <span
          className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground"
          onClick={onCancel}
        >
          Stones
        </span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] text-muted-foreground">Micro Diamond</span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] font-medium">
          {stone ? `Edit: ${stone.size}` : "New Micro Diamond"}
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
          {stone ? "Save" : "Add Stone"}
        </Button>
      </div>
      <div className="page-panel-body">
        <Form {...form}>
          <form className="max-w-xl mx-auto">
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Micro Diamond Details
                </span>
              </div>
              <div className="px-4 py-1">
                <FieldRow label="Size *">
                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-8 text-sm"
                            placeholder="e.g. 1.30 mm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Quantity *">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="1"
                            className="h-8 text-sm"
                            placeholder="Number of stones"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldRow>
                {stone && (
                  <FieldRow label="Restock (Add Stock)">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={restockAmount || ""}
                        onChange={(e) => setRestockAmount(Number(e.target.value))}
                        className="h-8 text-sm w-32"
                        placeholder="0"
                      />
                      <span className="text-xs text-muted-foreground">
                        {restockAmount > 0 && (
                          <span className="text-accent font-medium">
                            New total: {(stone.quantity || 0) + Number(restockAmount)} / {(stone.totalQuantity || stone.quantity || 0) + Number(restockAmount)}
                          </span>
                        )}
                      </span>
                    </div>
                  </FieldRow>
                )}
                <FieldRow label="Weight (grams) *">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.001"
                            className="h-8 text-sm"
                            placeholder="Total weight in grams"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Price per 1000">
                  <FormField
                    control={form.control}
                    name="pricePer1000"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            className="h-8 text-sm"
                            placeholder="Price per 1000 stones"
                          />
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

function MicroDetailPage({
  stone,
  onEdit,
  onBack,
  onDelete,
}: {
  stone: any;
  onEdit: () => void;
  onBack: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const orders = getOrders();
  
  // Calculate actual usage from orders
  const totalUsed = useMemo(() => {
    let used = 0;
    orders.forEach(order => {
      if (order.stoneUsage) {
        order.stoneUsage.forEach((usage: any) => {
          if (usage.stoneType === 'micro' && usage.stoneId === stone.id) {
            used += usage.quantityUsed;
          }
        });
      }
    });
    return used;
  }, [orders, stone.id]);
  
  // Get order-wise usage details
  const orderUsageDetails = useMemo(() => {
    const details: any[] = [];
    orders.forEach(order => {
      if (order.stoneUsage) {
        order.stoneUsage.forEach((usage: any) => {
          if (usage.stoneType === 'micro' && usage.stoneId === stone.id) {
            details.push({
              orderNumber: order.orderNumber,
              orderDate: order.orderDate,
              customerName: order.customerName,
              quantityUsed: usage.quantityUsed,
              orderId: order.id,
            });
          }
        });
      }
    });
    return details.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [orders, stone.id]);

  return (
    <div className="page-panel">
      <div className="page-panel-header">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={13} />
        </button>
        <Separator orientation="vertical" className="h-4" />
        <span
          className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground"
          onClick={onBack}
        >
          Stones
        </span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] text-muted-foreground">Micro Diamond</span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] font-medium">{stone.size}</span>
        <div className="flex-1" />
        <Badge
          variant={stone.isActive ? "default" : "secondary"}
          className="text-[10px] h-4 px-1.5"
        >
          {stone.isActive ? "Active" : "Inactive"}
        </Badge>
        <Button size="sm" className="h-7 text-xs ml-2" onClick={onEdit}>
          <Pencil size={12} className="mr-1" />
          Edit
        </Button>
        <Button size="sm" variant="destructive" className="h-7 text-xs ml-2" onClick={onDelete}>
          <Trash2 size={12} className="mr-1" />
          Delete
        </Button>
      </div>
      <div className="page-panel-body">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {/* Inventory Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card-l1 p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Remaining / Total</span>
              <span className="text-xl font-bold text-primary">{stone.quantity || 0} / {stone.totalQuantity || 0}</span>
              <span className="text-[10px] text-muted-foreground">stones</span>
            </div>
            <div className="card-l1 p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Used in Orders</span>
              <span className="text-xl font-bold text-destructive cursor-pointer hover:underline" onClick={() => {}}>
                {totalUsed}
              </span>
              <span className="text-[10px] text-muted-foreground">stones</span>
            </div>
            <div className="card-l1 p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Total Weight</span>
              <span className="text-xl font-bold">{stone.weight || 0}g</span>
              <span className="text-[10px] text-muted-foreground">grams</span>
            </div>
          </div>

          {/* Order Usage Details */}
          {orderUsageDetails.length > 0 && (
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
                <FileText size={13} className="text-accent" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Order Usage Details
                </span>
              </div>
              <div className="px-4 py-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground">Order #</th>
                      <th className="text-left py-2 text-muted-foreground">Customer</th>
                      <th className="text-left py-2 text-muted-foreground">Date</th>
                      <th className="text-right py-2 text-muted-foreground">Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderUsageDetails.map((detail, idx) => (
                      <tr 
                        key={idx} 
                        className="border-b border-border/50 hover:bg-muted/30 cursor-pointer"
                        onClick={() => navigate(`/orders/${detail.orderId}`)}
                      >
                        <td className="py-2 font-medium text-primary hover:underline">{detail.orderNumber}</td>
                        <td className="py-2">{detail.customerName}</td>
                        <td className="py-2 text-muted-foreground">{new Date(detail.orderDate).toLocaleDateString()}</td>
                        <td className="py-2 text-right font-semibold text-destructive">{detail.quantityUsed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Diamond Details */}
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
              <Diamond size={13} className="text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Micro Diamond Details
              </span>
            </div>
            <div className="px-4 py-1 text-xs">
              {(
                [
                  ["Size", stone.size],
                  ["Quantity", stone.quantity || 0],
                  ["Weight (grams)", stone.weight || 0],
                  ["Price per 1000", stone.price_per_1000 || 0],
                  ["Status", stone.isActive ? "Active" : "Inactive"],
                  [
                    "Added",
                    stone.created_at ? stone.created_at.slice(0, 10) : "—",
                  ],
                ] as [string, string | number][]
              ).map(([k, v]) => (
                <div
                  key={k}
                  className="grid grid-cols-[150px_1fr] gap-3 py-1.5 border-b border-border/50 last:border-0"
                >
                  <span className="text-muted-foreground text-right">{k}</span>
                  <strong className="font-medium">{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ADDiamondFormPage({
  stone,
  onSave,
  onCancel,
  selectedShape,
}: {
  stone?: any;
  onSave: () => void;
  onCancel: () => void;
  selectedShape?: any;
}) {
  const shapes = getADShapes();
  const [restockAmount, setRestockAmount] = useState(0);

  const form = useForm<ADFormValues>({
    resolver: zodResolver(adSchema) as Resolver<ADFormValues>,
    defaultValues: stone
      ? {
          shapeId: stone.shape_id?.toString() || selectedShape?.id?.toString() || "",
          size: stone.size,
          quantity: stone.quantity || 0,
          weight: stone.weight || 0,
          pricePerPiece: stone.price_per_piece || 0,
          isActive: stone.isActive !== false,
        }
      : { 
          shapeId: selectedShape?.id?.toString() || "",
          isActive: true, 
          quantity: 0, 
          weight: 0, 
          pricePerPiece: 0 
        },
  });

  const onSubmit: SubmitHandler<ADFormValues> = async (v) => {
    try {
      // Ensure all numeric values are properly converted
      const quantity = Number(v.quantity) || 0;
      const weight = Number(v.weight) || 0;
      const pricePerPiece = Number(v.pricePerPiece) || 0;
      const restock = Number(restockAmount) || 0;

      if (stone) {
        // If restocking, add to both quantity and totalQuantity
        const finalQuantity = restock > 0 ? quantity + restock : quantity;
        updateADDiamond(stone.id, {
          shape_id: parseInt(v.shapeId),
          size: v.size,
          quantity: finalQuantity,
          totalQuantity: restock > 0 ? (stone.totalQuantity || quantity) + restock : undefined,
          weight,
          price_per_piece: pricePerPiece,
          isActive: v.isActive,
        });
        toast.success(restock > 0 ? `AD diamond restocked (+${restock})` : "AD diamond updated");
      } else {
        addADDiamond({
          shape_id: parseInt(v.shapeId),
          size: v.size,
          quantity,
          weight,
          price_per_piece: pricePerPiece,
          isActive: v.isActive,
        });
        toast.success("AD diamond added");
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
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={13} />
        </button>
        <Separator orientation="vertical" className="h-4" />
        <span
          className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground"
          onClick={onCancel}
        >
          Stones
        </span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] text-muted-foreground">AD Diamond</span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] font-medium">
          {stone ? `Edit: ${stone.size}` : "New AD Diamond"}
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
          {stone ? "Save" : "Add Stone"}
        </Button>
      </div>
      <div className="page-panel-body">
        <Form {...form}>
          <form className="max-w-xl mx-auto">
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  AD Diamond Details
                </span>
              </div>
              <div className="px-4 py-1">
                <FieldRow label="Shape *">
                  <FormField
                    control={form.control}
                    name="shapeId"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select shape" />
                          </SelectTrigger>
                          <SelectContent>
                            {shapes.map((s) => (
                              <SelectItem key={s.id} value={s.id.toString()}>
                                {s.shape}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Size *">
                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-8 text-sm"
                            placeholder="e.g. 3×2 mm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Quantity *">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="1"
                            className="h-8 text-sm"
                            placeholder="Number of stones"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldRow>
                {stone && (
                  <FieldRow label="Restock (Add Stock)">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={restockAmount || ""}
                        onChange={(e) => setRestockAmount(Number(e.target.value))}
                        className="h-8 text-sm w-32"
                        placeholder="0"
                      />
                      <span className="text-xs text-muted-foreground">
                        {restockAmount > 0 && (
                          <span className="text-accent font-medium">
                            New total: {(stone.quantity || 0) + Number(restockAmount)} / {(stone.totalQuantity || stone.quantity || 0) + Number(restockAmount)}
                          </span>
                        )}
                      </span>
                    </div>
                  </FieldRow>
                )}
                <FieldRow label="Weight (grams) *">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.001"
                            className="h-8 text-sm"
                            placeholder="Total weight in grams"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Price per Piece">
                  <FormField
                    control={form.control}
                    name="pricePerPiece"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            className="h-8 text-sm"
                            placeholder="Price per piece"
                          />
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

function ADDetailPage({
  stone,
  onEdit,
  onBack,
  onDelete,
}: {
  stone: any;
  onEdit: () => void;
  onBack: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const orders = getOrders();
  
  // Calculate actual usage from orders
  const totalUsed = useMemo(() => {
    let used = 0;
    orders.forEach(order => {
      if (order.stoneUsage) {
        order.stoneUsage.forEach((usage: any) => {
          if (usage.stoneType === 'ad' && usage.stoneId === stone.id) {
            used += usage.quantityUsed;
          }
        });
      }
    });
    return used;
  }, [orders, stone.id]);
  
  // Get order-wise usage details
  const orderUsageDetails = useMemo(() => {
    const details: any[] = [];
    orders.forEach(order => {
      if (order.stoneUsage) {
        order.stoneUsage.forEach((usage: any) => {
          if (usage.stoneType === 'ad' && usage.stoneId === stone.id) {
            details.push({
              orderNumber: order.orderNumber,
              orderDate: order.orderDate,
              customerName: order.customerName,
              quantityUsed: usage.quantityUsed,
              orderId: order.id,
            });
          }
        });
      }
    });
    return details.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [orders, stone.id]);

  return (
    <div className="page-panel">
      <div className="page-panel-header">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={13} />
        </button>
        <Separator orientation="vertical" className="h-4" />
        <span
          className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground"
          onClick={onBack}
        >
          Stones
        </span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] text-muted-foreground">AD Diamond</span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] font-medium">{stone.shape} - {stone.size}</span>
        <div className="flex-1" />
        <Badge
          variant={stone.isActive ? "default" : "secondary"}
          className="text-[10px] h-4 px-1.5"
        >
          {stone.isActive ? "Active" : "Inactive"}
        </Badge>
        <Button size="sm" className="h-7 text-xs ml-2" onClick={onEdit}>
          <Pencil size={12} className="mr-1" />
          Edit
        </Button>
        <Button size="sm" variant="destructive" className="h-7 text-xs ml-2" onClick={onDelete}>
          <Trash2 size={12} className="mr-1" />
          Delete
        </Button>
      </div>
      <div className="page-panel-body">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {/* Inventory Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card-l1 p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Remaining / Total</span>
              <span className="text-xl font-bold text-accent">{stone.quantity || 0} / {stone.totalQuantity || 0}</span>
              <span className="text-[10px] text-muted-foreground">stones</span>
            </div>
            <div className="card-l1 p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Used in Orders</span>
              <span className="text-xl font-bold text-destructive cursor-pointer hover:underline" onClick={() => {}}>
                {totalUsed}
              </span>
              <span className="text-[10px] text-muted-foreground">stones</span>
            </div>
            <div className="card-l1 p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Total Weight</span>
              <span className="text-xl font-bold">{stone.weight || 0}g</span>
              <span className="text-[10px] text-muted-foreground">grams</span>
            </div>
          </div>

          {/* Order Usage Details */}
          {orderUsageDetails.length > 0 && (
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
                <FileText size={13} className="text-accent" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Order Usage Details
                </span>
              </div>
              <div className="px-4 py-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground">Order #</th>
                      <th className="text-left py-2 text-muted-foreground">Customer</th>
                      <th className="text-left py-2 text-muted-foreground">Date</th>
                      <th className="text-right py-2 text-muted-foreground">Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderUsageDetails.map((detail, idx) => (
                      <tr 
                        key={idx} 
                        className="border-b border-border/50 hover:bg-muted/30 cursor-pointer"
                        onClick={() => navigate(`/orders/${detail.orderId}`)}
                      >
                        <td className="py-2 font-medium text-primary hover:underline">{detail.orderNumber}</td>
                        <td className="py-2">{detail.customerName}</td>
                        <td className="py-2 text-muted-foreground">{new Date(detail.orderDate).toLocaleDateString()}</td>
                        <td className="py-2 text-right font-semibold text-destructive">{detail.quantityUsed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Diamond Details */}
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
              <Gem size={13} className="text-accent" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                AD Diamond Details
              </span>
            </div>
            <div className="px-4 py-1 text-xs">
              {(
                [
                  ["Shape", stone.shape],
                  ["Size", stone.size],
                  ["Quantity", stone.quantity || 0],
                  ["Weight (grams)", stone.weight || 0],
                  ["Price per Piece", stone.price_per_piece || 0],
                  ["Status", stone.isActive ? "Active" : "Inactive"],
                  [
                    "Added",
                    stone.created_at ? stone.created_at.slice(0, 10) : "—",
                  ],
                ] as [string, string | number][]
              ).map(([k, v]) => (
                <div
                  key={k}
                  className="grid grid-cols-[150px_1fr] gap-3 py-1.5 border-b border-border/50 last:border-0"
                >
                  <span className="text-muted-foreground text-right">{k}</span>
                  <strong className="font-medium">{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Micro List Page ────────────────────────────────────────────────────────────

function MicroListPage({
  onAdd,
  onSelect,
  onBack,
  forceReload,
}: {
  onAdd: () => void;
  onSelect: (s: any) => void;
  onBack: () => void;
  forceReload?: number;
}) {
  const sizes = getMicroDiamonds();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sizes.filter((s) => !q || s.size.toLowerCase().includes(q));
  }, [sizes, search]);

  return (
    <div className="flex flex-col h-full">
      <PageToolbar
        breadcrumbs={[
          { label: "Stones", onClick: onBack },
          { label: "Micro Diamond" },
        ]}
        title="Micro Diamond Sizes"
        subtitle={`${sizes.length} sizes`}
        actions={
          <Button size="sm" className="h-7 text-xs" onClick={onAdd}>
            <Plus size={12} className="mr-1" />
            Add Micro Diamond
          </Button>
        }
      />
      <div className="erp-toolbar border-b border-border bg-background">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search size…"
          className="w-60 h-7 text-xs"
        />
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} size{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="erp-content">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
          {filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-sm text-muted-foreground">
              {search ? "No sizes match." : "No micro diamonds yet."}
            </div>
          ) : (
            filtered.map((s) => (
              <div
                key={s.id}
                className="card-l1 p-4 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => onSelect(s)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Diamond size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-primary hover:underline truncate">
                      {s.size}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Stock:</span>
                        <span className="font-semibold ml-1">{s.quantity || 0} / {s.totalQuantity || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Weight:</span>
                        <span className="font-semibold ml-1">{s.weight || 0}g</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Price/1k:</span>
                        <span className="font-semibold ml-1">₹{s.price_per_1000 || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ADShapesPage({
  onAdd,
  onSelect,
  onBack,
  forceReload,
}: {
  onAdd: () => void;
  onSelect: (s: any) => void;
  onBack: () => void;
  forceReload?: number;
}) {
  const shapes = getADShapes();
  const [search, setSearch] = useState("");
  const [showAddShape, setShowAddShape] = useState(false);
  const [newShapeName, setNewShapeName] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return shapes.filter((s) => !q || s.shape.toLowerCase().includes(q));
  }, [shapes, search]);

  const handleAddShape = () => {
    if (!newShapeName.trim()) {
      toast.error("Shape name is required");
      return;
    }
    addADShape(newShapeName.trim());
    toast.success("Shape added successfully");
    setNewShapeName("");
    setShowAddShape(false);
  };

  const handleDeleteShape = (shapeId: number) => {
    if (!confirm("Are you sure you want to delete this shape? All AD diamonds with this shape will also be deleted.")) return;
    deleteADShape(shapeId);
    toast.success("Shape deleted successfully");
  };

  return (
    <div className="flex flex-col h-full">
      <PageToolbar
        breadcrumbs={[
          { label: "Stones", onClick: onBack },
          { label: "AD Diamond" },
        ]}
        title="AD Diamond Shapes"
        subtitle={`${shapes.length} shapes`}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddShape(true)}>
              <Plus size={12} className="mr-1" />
              Add Shape
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={onAdd}>
              <Plus size={12} className="mr-1" />
              Add AD Diamond
            </Button>
          </div>
        }
      />
      <div className="erp-content">
        {/* Add Shape Dialog */}
        {showAddShape && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="card-l1 p-6 w-full max-w-md">
              <h3 className="text-sm font-semibold mb-4">Add New AD Diamond Shape</h3>
              <Input
                value={newShapeName}
                onChange={(e) => setNewShapeName(e.target.value)}
                placeholder="Enter shape name (e.g., Radiant, Asscher)"
                className="h-8 text-sm mb-4"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    setShowAddShape(false);
                    setNewShapeName("");
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={handleAddShape}>
                  Add Shape
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
          {shapes.length === 0 ? (
            <div className="col-span-full py-16 text-center text-sm text-muted-foreground">
              No AD diamond shapes yet. Click "Add Shape" to create one.
            </div>
          ) : (
            shapes.map((s) => (
              <div
                key={s.id}
                className="card-l1 p-4 cursor-pointer hover:border-accent/50 transition-colors group"
              >
                <div className="flex items-center gap-3" onClick={() => onSelect(s)}>
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Gem size={18} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-accent hover:underline truncate">
                      {s.shape}
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground" />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteShape(s.id);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-destructive hover:text-destructive/80"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ADSizesPage({
  shape,
  onAdd,
  onSelect,
  onBack,
  forceReload,
}: {
  shape: any;
  onAdd: () => void;
  onSelect: (size: any) => void;
  onBack: () => void;
  forceReload?: number;
}) {
  const allADDiamonds = getADDiamonds();
  const sizes = allADDiamonds.filter((d) => d.shape_id === shape.id);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sizes.filter((s) => !q || s.size.toLowerCase().includes(q));
  }, [sizes, search]);

  const handleAdd = () => {
    onAdd();
  };

  return (
    <div className="flex flex-col h-full">
      <PageToolbar
        breadcrumbs={[
          { label: "Stones", onClick: onBack },
          { label: "AD Diamond", onClick: onBack },
          { label: shape.shape },
        ]}
        title={`${shape.shape} Sizes`}
        subtitle={`${sizes.length} sizes`}
        actions={
          <Button size="sm" className="h-7 text-xs" onClick={handleAdd}>
            <Plus size={12} className="mr-1" />
            Add AD Diamond
          </Button>
        }
      />
      <div className="erp-toolbar border-b border-border bg-background">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search size…"
          className="w-60 h-7 text-xs"
        />
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} size{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="erp-content">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
          {filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-sm text-muted-foreground">
              {search ? "No sizes match." : `No ${shape.shape} diamonds yet.`}
            </div>
          ) : (
            filtered.map((s) => (
              <div
                key={s.id}
                className="card-l1 p-4 cursor-pointer hover:border-accent/50 transition-colors"
                onClick={() => onSelect(s)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Gem size={18} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-accent hover:underline truncate">
                      {s.size}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Stock:</span>
                        <span className="font-semibold ml-1">{s.quantity || 0} / {s.totalQuantity || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Weight:</span>
                        <span className="font-semibold ml-1">{s.weight || 0}g</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Price/pc:</span>
                        <span className="font-semibold ml-1">₹{s.price_per_piece || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Landing: two big cards ─────────────────────────────────────────────────────

function StonesLanding({
  onMicro,
  onAD,
}: {
  onMicro: () => void;
  onAD: () => void;
}) {
  const microCount = getMicroDiamonds().length;
  const adCount = getADShapes().length;

  return (
    <div className="flex flex-col h-full">
      <PageToolbar
        breadcrumbs={[{ label: "Stones" }]}
        title="Stone Master"
        subtitle="Select type to manage"
      />
      <div className="erp-content flex items-start justify-center pt-12">
        <div className="grid grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Micro Diamond card */}
          <button
            onClick={onMicro}
            className="card-l1 text-left p-0 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer focus:outline-none rounded-lg"
          >
            <div className="p-6 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Diamond size={24} className="text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Micro Diamond
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Small accent stones, round cuts, micro-pavé settings
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border">
                <span className="font-bold text-foreground text-sm">
                  {microCount}
                </span>{" "}
                stones in master
                <ChevronRight size={12} className="ml-auto" />
              </div>
            </div>
          </button>

          {/* AD Diamond card */}
          <button
            onClick={onAD}
            className="card-l1 text-left p-0 hover:border-accent/50 hover:shadow-md transition-all cursor-pointer focus:outline-none rounded-lg"
          >
            <div className="p-6 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Gem size={24} className="text-accent" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  AD Diamond
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  American diamond, larger stones, oval / pear cuts
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border">
                <span className="font-bold text-foreground text-sm">
                  {adCount}
                </span>{" "}
                stones in master
                <ChevronRight size={12} className="ml-auto" />
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StonesPage() {
  const [view, setView] = useState<ViewMode>("landing");
  const [selectedMicro, setSelectedMicro] = useState<any>(undefined);
  const [selectedAD, setSelectedAD] = useState<any>(undefined);
  const [selectedShape, setSelectedShape] = useState<any>(undefined);
  const [reloadCounter, setReloadCounter] = useState(0);

  const handleSavedMicro = () => {
    setReloadCounter(c => c + 1);
    setView("micro-list");
  };
  const handleSavedAD = () => {
    setReloadCounter(c => c + 1);
    setView("ad-sizes");
  };

  const handleDeleteMicro = async () => {
    if (!selectedMicro) return;
    if (!confirm('Are you sure you want to delete this micro diamond?')) return;
    try {
      deleteMicroDiamond(selectedMicro.id);
      toast.success('Micro diamond deleted');
      setSelectedMicro(undefined);
      setReloadCounter(c => c + 1);
      setView('micro-list');
    } catch (error) {
      console.error('Failed to delete micro diamond:', error);
      toast.error('Failed to delete micro diamond');
    }
  };

  const handleDeleteAD = async () => {
    if (!selectedAD) return;
    if (!confirm('Are you sure you want to delete this AD diamond?')) return;
    try {
      deleteADDiamond(selectedAD.id);
      toast.success('AD diamond deleted');
      setSelectedAD(undefined);
      setReloadCounter(c => c + 1);
      setView('ad-sizes');
    } catch (error) {
      console.error('Failed to delete AD diamond:', error);
      toast.error('Failed to delete AD diamond');
    }
  };

  if (view === "micro-add")
    return (
      <MicroDiamondFormPage
        onSave={handleSavedMicro}
        onCancel={() => setView("micro-list")}
      />
    );
  if (view === "micro-edit")
    return (
      <MicroDiamondFormPage
        stone={selectedMicro}
        onSave={handleSavedMicro}
        onCancel={() => setView("micro-detail")}
      />
    );
  if (view === "micro-detail" && selectedMicro)
    return (
      <MicroDetailPage
        stone={selectedMicro}
        onEdit={() => setView("micro-edit")}
        onBack={() => setView("micro-list")}
        onDelete={handleDeleteMicro}
      />
    );
  if (view === "ad-add")
    return (
      <ADDiamondFormPage
        selectedShape={selectedShape}
        onSave={handleSavedAD}
        onCancel={() => selectedShape ? setView("ad-sizes") : setView("ad-shapes")}
      />
    );
  if (view === "ad-edit")
    return (
      <ADDiamondFormPage
        stone={selectedAD}
        selectedShape={selectedShape}
        onSave={handleSavedAD}
        onCancel={() => setView("ad-detail")}
      />
    );
  if (view === "ad-detail" && selectedAD)
    return (
      <ADDetailPage
        stone={selectedAD}
        onEdit={() => setView("ad-edit")}
        onBack={() => setView("ad-sizes")}
        onDelete={handleDeleteAD}
      />
    );
  if (view === "micro-list")
    return (
      <MicroListPage
        forceReload={reloadCounter}
        onAdd={() => setView("micro-add")}
        onSelect={(s) => {
          setSelectedMicro(s);
          setView("micro-detail");
        }}
        onBack={() => setView("landing")}
      />
    );
  if (view === "ad-shapes")
    return (
      <ADShapesPage
        forceReload={reloadCounter}
        onAdd={() => {
          setSelectedShape(undefined);
          setView("ad-add");
        }}
        onSelect={(s) => {
          setSelectedShape(s);
          setView("ad-sizes");
        }}
        onBack={() => setView("landing")}
      />
    );
  if (view === "ad-sizes" && selectedShape)
    return (
      <ADSizesPage
        shape={selectedShape}
        forceReload={reloadCounter}
        onAdd={() => setView("ad-add")}
        onSelect={(s) => {
          setSelectedAD(s);
          setView("ad-detail");
        }}
        onBack={() => setView("ad-shapes")}
      />
    );

  return (
    <StonesLanding
      onMicro={() => setView("micro-list")}
      onAD={() => setView("ad-shapes")}
    />
  );
}
