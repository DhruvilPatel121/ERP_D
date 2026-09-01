import { useState, useMemo, useCallback } from "react";
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
} from "lucide-react";
import {
  getMicroDiamonds,
  addMicroDiamond,
  updateMicroDiamond,
  deleteMicroDiamond,
  getADDiamonds,
  addADDiamond,
  updateADDiamond,
  deleteADDiamond,
  getStoneCategories,
  addStoneCategory,
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
  stoneName: z.string().min(1, "Name required"),
  categoryId: z.string().min(1, "Category required"),
  size: z.string().min(1, "Size required"),
  shape: z.string().min(1, "Shape required"),
  gradeType: z.string().default(""),
  colour: z.string().default(""),
  stonesPerGram: z.preprocess(
    (v) => (v === "" ? null : Number(v)),
    z.number().nullable(),
  ),
  supplier: z.string().default(""),
  notes: z.string().default(""),
  isActive: z.boolean().default(true),
});

const adSchema = z.object({
  stoneName: z.string().min(1, "Name required"),
  categoryId: z.string().min(1, "Category required"),
  shape: z.string().min(1, "Shape required"),
  size: z.string().min(1, "Size required"),
  length: z.preprocess(
    (v) => (v === "" ? null : Number(v)),
    z.number().nullable(),
  ),
  width: z.preprocess(
    (v) => (v === "" ? null : Number(v)),
    z.number().nullable(),
  ),
  weight: z.preprocess(
    (v) => (v === "" ? null : Number(v)),
    z.number().nullable(),
  ),
  supplier: z.string().default(""),
  notes: z.string().default(""),
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
  | "ad-list"
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
  stone?: MicroDiamond;
  onSave: () => void;
  onCancel: () => void;
}) {
  const form = useForm<MicroFormValues>({
    resolver: zodResolver(microSchema) as Resolver<MicroFormValues>,
    defaultValues: stone
      ? {
          stoneName: stone.stoneName,
          categoryId: stone.categoryId,
          size: stone.size,
          shape: stone.shape,
          gradeType: stone.gradeType ?? "",
          colour: stone.colour ?? "",
          stonesPerGram: stone.stonesPerGram,
          supplier: stone.supplier ?? "",
          notes: stone.notes ?? "",
          isActive: stone.isActive,
        }
      : { isActive: true, gradeType: "", colour: "", supplier: "", notes: "" },
  });

  const onSubmit: SubmitHandler<MicroFormValues> = (v) => {
    try {
      if (stone) {
        updateMicroDiamond(stone.id, {
          ...v,
          weightUnit: "gram",
          individualWeight: null,
        });
        toast.success("Micro diamond updated");
      } else {
        addMicroDiamond({ ...v, weightUnit: "gram", individualWeight: null });
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
          {stone ? `Edit: ${stone.stoneName}` : "New Micro Diamond"}
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
                <FieldRow label="Stone Name *">
                  <FormField
                    control={form.control}
                    name="stoneName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-8 text-sm"
                            placeholder="e.g. Round Micro 1.3mm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Category *">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <CategorySelector
                          type="micro"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                        />
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
                            placeholder="e.g. 1.30 mm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Shape *">
                  <FormField
                    control={form.control}
                    name="shape"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Shape" />
                          </SelectTrigger>
                          <SelectContent>
                            {SHAPES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Grade">
                  <FormField
                    control={form.control}
                    name="gradeType"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Grade (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {GRADES.map((g) => (
                              <SelectItem key={g} value={g}>
                                {g}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Colour">
                  <FormField
                    control={form.control}
                    name="colour"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-8 text-sm"
                            placeholder="e.g. White"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Stones / Gram">
                  <FormField
                    control={form.control}
                    name="stonesPerGram"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            className="h-8 text-sm"
                            placeholder="Optional"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Supplier">
                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} className="h-8 text-sm" />
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
}: {
  stone: MicroDiamond;
  onEdit: () => void;
  onBack: () => void;
}) {
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
        <span className="text-[11px] font-medium">{stone.stoneName}</span>
        <div className="flex-1" />
        <Button size="sm" className="h-7 text-xs" onClick={onEdit}>
          <Pencil size={12} className="mr-1" />
          Edit
        </Button>
      </div>
      <div className="page-panel-body">
        <div className="max-w-xl mx-auto">
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
              <Diamond size={13} className="text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Micro Diamond — {stone.stoneId}
              </span>
              <Badge
                variant={stone.isActive ? "default" : "secondary"}
                className="ml-auto text-[10px] h-4 px-1.5"
              >
                {stone.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="px-4 py-1 text-xs">
              {(
                [
                  ["Stone Name", stone.stoneName],
                  ["Size", stone.size],
                  ["Shape", stone.shape],
                  ["Grade", stone.gradeType || "—"],
                  ["Colour", stone.colour || "—"],
                  ["Stones/gram", stone.stonesPerGram ?? "—"],
                  ["Supplier", stone.supplier || "—"],
                  ["Notes", stone.notes || "—"],
                  [
                    "Added",
                    stone.createdAt ? stone.createdAt.slice(0, 10) : "—",
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
}: {
  stone?: ADDiamond;
  onSave: () => void;
  onCancel: () => void;
}) {
  const form = useForm<ADFormValues>({
    resolver: zodResolver(adSchema) as Resolver<ADFormValues>,
    defaultValues: stone
      ? {
          stoneName: stone.stoneName,
          categoryId: stone.categoryId,
          shape: stone.shape,
          size: stone.size,
          length: stone.length ?? undefined,
          width: stone.width ?? undefined,
          weight: stone.weight ?? undefined,
          supplier: stone.supplier ?? "",
          isActive: stone.isActive,
        }
      : { isActive: true, supplier: "" },
  });

  const onSubmit: SubmitHandler<ADFormValues> = (v) => {
    try {
      if (stone) {
        updateADDiamond(stone.id, v);
        toast.success("AD diamond updated");
      } else {
        addADDiamond(v);
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
          {stone ? `Edit: ${stone.stoneName}` : "New AD Diamond"}
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
                <FieldRow label="Stone Name *">
                  <FormField
                    control={form.control}
                    name="stoneName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-8 text-sm"
                            placeholder="e.g. AD Round 2×2"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Category *">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <CategorySelector
                          type="ad"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Shape *">
                  <FormField
                    control={form.control}
                    name="shape"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Shape" />
                          </SelectTrigger>
                          <SelectContent>
                            {SHAPES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
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
                <FieldRow label="Length (mm)">
                  <FormField
                    control={form.control}
                    name="length"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.1"
                            className="h-8 text-sm"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Width (mm)">
                  <FormField
                    control={form.control}
                    name="width"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.1"
                            className="h-8 text-sm"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Weight (ct)">
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
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Supplier">
                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} className="h-8 text-sm" />
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
}: {
  stone: ADDiamond;
  onEdit: () => void;
  onBack: () => void;
}) {
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
        <span className="text-[11px] font-medium">{stone.stoneName}</span>
        <div className="flex-1" />
        <Button size="sm" className="h-7 text-xs" onClick={onEdit}>
          <Pencil size={12} className="mr-1" />
          Edit
        </Button>
      </div>
      <div className="page-panel-body">
        <div className="max-w-xl mx-auto">
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
              <Gem size={13} className="text-accent" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                AD Diamond — {stone.stoneId}
              </span>
              <Badge
                variant={stone.isActive ? "default" : "secondary"}
                className="ml-auto text-[10px] h-4 px-1.5"
              >
                {stone.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="px-4 py-1 text-xs">
              {(
                [
                  ["Stone Name", stone.stoneName],
                  ["Shape", stone.shape],
                  ["Size", stone.size],
                  ["Length", stone.length ? `${stone.length} mm` : "—"],
                  ["Width", stone.width ? `${stone.width} mm` : "—"],
                  ["Weight", stone.weight ? `${stone.weight} ct` : "—"],
                  ["Supplier", stone.supplier || "—"],
                  ["Notes", stone.notes || "—"],
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
}: {
  onAdd: () => void;
  onSelect: (s: MicroDiamond) => void;
  onBack: () => void;
}) {
  const [stones, setStones] = useState<MicroDiamond[]>(() =>
    getMicroDiamonds(),
  );
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MicroDiamond | null>(null);
  const refresh = useCallback(() => setStones(getMicroDiamonds()), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return stones.filter(
      (s) =>
        !q ||
        s.stoneName.toLowerCase().includes(q) ||
        s.size.toLowerCase().includes(q) ||
        s.shape.toLowerCase().includes(q),
    );
  }, [stones, search]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMicroDiamond(deleteTarget.id);
    toast.success("Stone deleted");
    setDeleteTarget(null);
    refresh();
  };

  return (
    <div className="flex flex-col h-full">
      <PageToolbar
        breadcrumbs={[
          { label: "Stones", onClick: onBack },
          { label: "Micro Diamond" },
        ]}
        title="Micro Diamond"
        subtitle={`${stones.length} stones`}
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
          placeholder="Search name, size, shape…"
          className="w-60 h-7 text-xs"
        />
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
                <th>Size</th>
                <th>Shape</th>
                <th>Grade</th>
                <th>Colour</th>
                <th>Stones/g</th>
                <th>Supplier</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No micro diamonds found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer"
                    onClick={() => onSelect(s)}
                  >
                    <td className="text-xs text-muted-foreground font-mono">
                      {s.stoneId}
                    </td>
                    <td className="font-medium text-xs text-primary hover:underline">
                      {s.stoneName}
                    </td>
                    <td>
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1.5"
                      >
                        {s.size}
                      </Badge>
                    </td>
                    <td className="text-xs">{s.shape}</td>
                    <td className="text-xs text-muted-foreground">
                      {s.gradeType || "—"}
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {s.colour || "—"}
                    </td>
                    <td className="text-xs">{s.stonesPerGram ?? "—"}</td>
                    <td className="text-xs text-muted-foreground">
                      {s.supplier || "—"}
                    </td>
                    <td>
                      <Badge
                        variant={s.isActive ? "default" : "secondary"}
                        className="text-[10px] h-4 px-1.5"
                      >
                        {s.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-0.5 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={() => onSelect(s)}
                        >
                          <Pencil size={11} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(s)}
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
                Delete <strong>{deleteTarget.stoneName}</strong>? This cannot be
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

function ADListPage({
  onAdd,
  onSelect,
  onBack,
}: {
  onAdd: () => void;
  onSelect: (s: ADDiamond) => void;
  onBack: () => void;
}) {
  const [stones, setStones] = useState<ADDiamond[]>(() => getADDiamonds());
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ADDiamond | null>(null);
  const refresh = useCallback(() => setStones(getADDiamonds()), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return stones.filter(
      (s) =>
        !q ||
        s.stoneName.toLowerCase().includes(q) ||
        s.size.toLowerCase().includes(q) ||
        s.shape.toLowerCase().includes(q),
    );
  }, [stones, search]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteADDiamond(deleteTarget.id);
    toast.success("Stone deleted");
    setDeleteTarget(null);
    refresh();
  };

  return (
    <div className="flex flex-col h-full">
      <PageToolbar
        breadcrumbs={[
          { label: "Stones", onClick: onBack },
          { label: "AD Diamond" },
        ]}
        title="AD Diamond"
        subtitle={`${stones.length} stones`}
        actions={
          <Button size="sm" className="h-7 text-xs" onClick={onAdd}>
            <Plus size={12} className="mr-1" />
            Add AD Diamond
          </Button>
        }
      />
      <div className="erp-toolbar border-b border-border bg-background">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, size, shape…"
          className="w-60 h-7 text-xs"
        />
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
                <th>Shape</th>
                <th>Size</th>
                <th>L×W (mm)</th>
                <th>Weight (ct)</th>
                <th>Supplier</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No AD diamonds found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer"
                    onClick={() => onSelect(s)}
                  >
                    <td className="text-xs text-muted-foreground font-mono">
                      {s.stoneId}
                    </td>
                    <td className="font-medium text-xs text-primary hover:underline">
                      {s.stoneName}
                    </td>
                    <td className="text-xs">{s.shape}</td>
                    <td>
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1.5"
                      >
                        {s.size}
                      </Badge>
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {s.length && s.width ? `${s.length}×${s.width}` : "—"}
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {s.weight ?? "—"}
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {s.supplier || "—"}
                    </td>
                    <td>
                      <Badge
                        variant={s.isActive ? "default" : "secondary"}
                        className="text-[10px] h-4 px-1.5"
                      >
                        {s.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-0.5 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={() => onSelect(s)}
                        >
                          <Pencil size={11} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(s)}
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
                Delete <strong>{deleteTarget.stoneName}</strong>? This cannot be
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

// ── Landing: two big cards ─────────────────────────────────────────────────────

function StonesLanding({
  onMicro,
  onAD,
}: {
  onMicro: () => void;
  onAD: () => void;
}) {
  const microCount = useMemo(() => getMicroDiamonds().length, []);
  const adCount = useMemo(() => getADDiamonds().length, []);
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
  const [selectedMicro, setSelectedMicro] = useState<
    MicroDiamond | undefined
  >();
  const [selectedAD, setSelectedAD] = useState<ADDiamond | undefined>();

  const handleSavedMicro = () => setView("micro-list");
  const handleSavedAD = () => setView("ad-list");

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
      />
    );
  if (view === "ad-add")
    return (
      <ADDiamondFormPage
        onSave={handleSavedAD}
        onCancel={() => setView("ad-list")}
      />
    );
  if (view === "ad-edit")
    return (
      <ADDiamondFormPage
        stone={selectedAD}
        onSave={handleSavedAD}
        onCancel={() => setView("ad-detail")}
      />
    );
  if (view === "ad-detail" && selectedAD)
    return (
      <ADDetailPage
        stone={selectedAD}
        onEdit={() => setView("ad-edit")}
        onBack={() => setView("ad-list")}
      />
    );
  if (view === "micro-list")
    return (
      <MicroListPage
        onAdd={() => setView("micro-add")}
        onSelect={(s) => {
          setSelectedMicro(s);
          setView("micro-detail");
        }}
        onBack={() => setView("landing")}
      />
    );
  if (view === "ad-list")
    return (
      <ADListPage
        onAdd={() => setView("ad-add")}
        onSelect={(s) => {
          setSelectedAD(s);
          setView("ad-detail");
        }}
        onBack={() => setView("landing")}
      />
    );

  return (
    <StonesLanding
      onMicro={() => setView("micro-list")}
      onAD={() => setView("ad-list")}
    />
  );
}
