import { useState, useMemo, useCallback, useRef } from "react";
import {
  useForm,
  useFieldArray,
  type SubmitHandler,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Gem,
  X,
  ChevronRight,
  Check,
  AlertTriangle,
  ArrowLeft,
  ImagePlus,
  ZoomIn,
  Trash,
} from "lucide-react";
import {
  getPatterns,
  addPattern,
  updatePattern,
  deletePattern,
  getMicroDiamonds,
  getADDiamonds,
  getItemCategories,
  addItemCategory,
} from "@/lib/db";
import { nanoid } from "@/lib/utils";
import { PageToolbar } from "@/components/layouts/AppLayout";
import { SearchInput } from "@/components/common/SearchInput";
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
import type {
  Pattern,
  ItemCategory,
  MicroDiamond,
  ADDiamond,
} from "@/types/erp";

const stoneConfigSchema = z.object({
  id: z.string(),
  stoneType: z.enum(["micro", "ad"]),
  stoneId: z.string().min(1, "Select a stone"),
  stoneName: z.string(),
  stoneSize: z.string(),
  shape: z.string(),
  qtyPerPiece: z.coerce.number().min(1, "Qty must be >= 1"),
});

const patternSchema = z.object({
  patternNumber: z.string().min(1, "Pattern number required"),
  patternName: z.string().min(1, "Pattern name required"),
  categoryId: z.string().min(1, "Category required"),
  subcategory: z.string().default(""),
  patternSize: z.string().default(""),
  weightPerPiece: z.coerce.number().min(0.001, "Weight must be > 0"),
  weightUnit: z.string().default("gram"),
  treeSize: z.coerce.number().min(1, "Tree size required"),
  stoneConfig: z.array(stoneConfigSchema),
  notes: z.string().default(""),
  isActive: z.boolean().default(true),
});
type FormValues = z.infer<typeof patternSchema>;

type ViewMode = "list" | "detail" | "add" | "edit";

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs font-medium text-muted-foreground pt-2 text-right">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

function StoneSelector({
  value,
  stoneType,
  onChange,
  microStones,
  adStones,
}: {
  value: string;
  stoneType: "micro" | "ad";
  onChange: (id: string, name: string, size: string, shape: string) => void;
  microStones: MicroDiamond[];
  adStones: ADDiamond[];
}) {
  const stones = stoneType === "micro" ? microStones : adStones;
  return (
    <Select
      value={value}
      onValueChange={(id) => {
        const s = stones.find((x) => x.id === id);
        if (s) onChange(s.id, s.stoneName, s.size, s.shape);
      }}
    >
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Select stone" />
      </SelectTrigger>
      <SelectContent>
        {stones
          .filter((s) => s.isActive)
          .map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.stoneName} ({s.size})
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

function PatternFormPage({
  pattern,
  onSave,
  onCancel,
}: {
  pattern?: Pattern;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [categories, setCategories] =
    useState<ItemCategory[]>(getItemCategories);
  const [newCatName, setNewCatName] = useState("");
  const [images, setImages] = useState<string[]>(pattern?.images || []);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const microStones = useMemo(() => getMicroDiamonds(), []);
  const adStones = useMemo(() => getADDiamonds(), []);
  const allPatterns = useMemo(() => getPatterns(), []);

  const form = useForm<FormValues>({
    resolver: zodResolver(patternSchema) as Resolver<FormValues>,
    defaultValues: pattern
      ? {
          patternNumber: pattern.patternNumber,
          patternName: pattern.patternName,
          categoryId: pattern.categoryId,
          subcategory: pattern.subcategory ?? "",
          patternSize: pattern.patternSize ?? "",
          weightPerPiece: pattern.weightPerPiece,
          weightUnit: pattern.weightUnit ?? "gram",
          treeSize: pattern.treeSize,
          stoneConfig: pattern.stoneConfig,
          notes: pattern.notes ?? "",
          isActive: pattern.isActive,
        }
      : {
          stoneConfig: [],
          isActive: true,
          weightUnit: "gram",
          treeSize: 10,
          subcategory: "",
          patternSize: "",
          notes: "",
        },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "stoneConfig",
  });
  const totalStones = fields.reduce(
    (sum, f) => sum + (Number(f.qtyPerPiece) || 0),
    0,
  );

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const cat = addItemCategory(newCatName.trim());
    setCategories((p) => [...p, cat]);
    form.setValue("categoryId", cat.id);
    setNewCatName("");
  };

  // Photo upload — read file as base64 dataURL
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5 MB limit`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setImages((prev) => [...prev, dataUrl]);
      };
      reader.readAsDataURL(file);
    });
    // reset input so same file can be re-selected
    e.target.value = "";
  };

  const removePhoto = (idx: number) =>
    setImages((prev) => prev.filter((_, i) => i !== idx));

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    try {
      const dup = allPatterns.find(
        (p) =>
          p.patternNumber.trim().toLowerCase() ===
            values.patternNumber.trim().toLowerCase() && p.id !== pattern?.id,
      );
      if (dup) {
        toast.error(
          `Pattern number "${values.patternNumber}" is already taken.`,
        );
        form.setError("patternNumber", { message: "Number already in use" });
        return;
      }
      const catName =
        categories.find((c) => c.id === values.categoryId)?.name || "";
      const payload = { ...values, categoryName: catName, images };
      if (pattern) {
        updatePattern(pattern.id, payload);
        toast.success("Pattern updated");
      } else {
        addPattern(payload);
        toast.success("Pattern added");
      }
      onSave();
    } catch (e) {
      toast.error("Failed to save pattern");
      console.error(e);
    }
  };

  return (
    <div className="page-panel">
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Pattern photo"
            className="max-h-[90vh] max-w-full rounded-lg shadow-2xl object-contain"
          />
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightbox(null)}
          >
            <X size={24} />
          </button>
        </div>
      )}

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
          Patterns
        </span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] font-medium">
          {pattern ? `Edit: ${pattern.patternNumber}` : "New Pattern"}
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
          {pattern ? "Save Changes" : "Add Pattern"}
        </Button>
      </div>
      <div className="page-panel-body">
        <Form {...form}>
          <form className="max-w-2xl mx-auto flex flex-col gap-4">
            {/* Basic info */}
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Pattern Information
                </span>
              </div>
              <div className="px-4 py-1">
                <FieldRow label="Pattern Number *">
                  <FormField
                    control={form.control}
                    name="patternNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-8 text-sm"
                            placeholder="e.g. 9001"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Pattern Name *">
                  <FormField
                    control={form.control}
                    name="patternName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-8 text-sm"
                            placeholder="e.g. Designer Ring"
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
                        <div className="flex flex-col gap-1">
                          <Select
                            value={field.value ?? ""}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-1">
                            <Input
                              value={newCatName}
                              onChange={(e) => setNewCatName(e.target.value)}
                              placeholder="New category…"
                              className="h-7 text-xs"
                              onKeyDown={(e) =>
                                e.key === "Enter" &&
                                (e.preventDefault(), handleAddCategory())
                              }
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2"
                              onClick={handleAddCategory}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Subcategory">
                  <FormField
                    control={form.control}
                    name="subcategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-8 text-sm"
                            placeholder="Optional"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Pattern Size">
                  <FormField
                    control={form.control}
                    name="patternSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-8 text-sm"
                            placeholder="e.g. Medium"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Tree Size *">
                  <FormField
                    control={form.control}
                    name="treeSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={1}
                            className="h-8 text-sm w-28"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldRow>
                <FieldRow label="Weight / Piece (g) *">
                  <FormField
                    control={form.control}
                    name="weightPerPiece"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.001"
                            min={0.001}
                            className="h-8 text-sm w-28"
                            placeholder="0.500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FieldRow>
              </div>
            </div>

            {/* Photos */}
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex-1">
                  Pattern Photos
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {images.length} photo{images.length !== 1 ? "s" : ""}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus size={11} className="mr-1" />
                  Add Photo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </div>
              {images.length === 0 ? (
                <div
                  className="m-4 border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-2 text-muted-foreground cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus size={28} className="opacity-40" />
                  <span className="text-xs">
                    Click to add photos — JPG, PNG, WEBP (max 5 MB each)
                  </span>
                  <span className="text-[11px] opacity-60">
                    Optional — add if you want a photo reference for this
                    pattern
                  </span>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-4 gap-3">
                  {images.map((src, idx) => (
                    <div
                      key={idx}
                      className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted/20"
                    >
                      <img
                        src={src}
                        alt={`Pattern photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setLightbox(src)}
                          className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
                        >
                          <ZoomIn size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="w-7 h-7 rounded-full bg-destructive/80 hover:bg-destructive flex items-center justify-center text-white"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                      <span className="absolute bottom-1 right-1 text-[10px] bg-black/60 text-white px-1 rounded">
                        {idx + 1}
                      </span>
                    </div>
                  ))}
                  {/* Add more tile */}
                  <div
                    className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus size={18} className="text-muted-foreground/50" />
                    <span className="text-[10px] text-muted-foreground/50">
                      Add more
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Stone config */}
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex-1">
                  Stone Configuration
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Total: {totalStones}/piece
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                  onClick={() =>
                    append({
                      id: nanoid(),
                      stoneType: "micro",
                      stoneId: "",
                      stoneName: "",
                      stoneSize: "",
                      shape: "",
                      qtyPerPiece: 1,
                    })
                  }
                >
                  <Plus size={11} className="mr-1" />
                  Add Stone
                </Button>
              </div>
              {fields.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No stones configured. Click "Add Stone" to add stone
                  requirements.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Stone</th>
                        <th>Size</th>
                        <th>Qty/Piece</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((f, i) => (
                        <tr key={f.id}>
                          <td className="w-24">
                            <Select
                              value={f.stoneType}
                              onValueChange={(v) =>
                                update(i, {
                                  ...f,
                                  stoneType: v as "micro" | "ad",
                                  stoneId: "",
                                  stoneName: "",
                                  stoneSize: "",
                                  shape: "",
                                })
                              }
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="micro">Micro</SelectItem>
                                <SelectItem value="ad">AD</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="w-48">
                            <StoneSelector
                              value={f.stoneId}
                              stoneType={f.stoneType}
                              microStones={microStones}
                              adStones={adStones}
                              onChange={(id, name, size, shape) =>
                                update(i, {
                                  ...f,
                                  stoneId: id,
                                  stoneName: name,
                                  stoneSize: size,
                                  shape,
                                })
                              }
                            />
                          </td>
                          <td className="text-xs text-muted-foreground">
                            {f.stoneSize || "—"}
                          </td>
                          <td className="w-20">
                            <Input
                              type="number"
                              min={1}
                              value={f.qtyPerPiece}
                              className="h-7 text-xs w-16"
                              onChange={(e) =>
                                update(i, {
                                  ...f,
                                  qtyPerPiece: parseInt(e.target.value) || 1,
                                })
                              }
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => remove(i)}
                              className="text-destructive hover:text-destructive/80"
                            >
                              <X size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Notes & status */}
            <div className="card-l1">
              <div className="px-4 py-1">
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

function PatternDetailPage({
  pattern,
  onEdit,
  onBack,
}: {
  pattern: Pattern;
  onEdit: () => void;
  onBack: () => void;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  return (
    <div className="page-panel">
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Pattern photo"
            className="max-h-[90vh] max-w-full rounded-lg shadow-2xl object-contain"
          />
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightbox(null)}
          >
            <X size={24} />
          </button>
        </div>
      )}

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
          Patterns
        </span>
        <ChevronRight size={10} className="text-muted-foreground/40" />
        <span className="text-[11px] font-medium">{pattern.patternNumber}</span>
        <div className="flex-1" />
        <Badge
          variant={pattern.isActive ? "default" : "secondary"}
          className="text-[10px] h-5 px-2"
        >
          {pattern.isActive ? "Active" : "Inactive"}
        </Badge>
        <Button size="sm" className="h-7 text-xs ml-2" onClick={onEdit}>
          <Pencil size={12} className="mr-1" />
          Edit
        </Button>
      </div>
      <div className="page-panel-body">
        <div className="max-w-xl mx-auto flex flex-col gap-4">
          {/* Photos (shown first, if any) */}
          {pattern.images && pattern.images.length > 0 && (
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex-1">
                  Photos
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {pattern.images.length} photo
                  {pattern.images.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="p-4 grid grid-cols-4 gap-3">
                {pattern.images.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted/20 cursor-pointer"
                    onClick={() => setLightbox(src)}
                  >
                    <img
                      src={src}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn size={18} className="text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pattern details */}
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Pattern Info
              </span>
            </div>
            <div className="px-4 py-1 text-xs">
              {(
                [
                  ["Pattern No", pattern.patternNumber],
                  ["Name", pattern.patternName],
                  ["Category", pattern.categoryName],
                  ["Subcategory", pattern.subcategory || "—"],
                  ["Size", pattern.patternSize || "—"],
                  ["Weight/Piece", `${pattern.weightPerPiece}g`],
                  ["Tree Size", `${pattern.treeSize} pcs/tree`],
                  ["Total Stones/Piece", String(pattern.totalStonesPerPiece)],
                  ["Notes", pattern.notes || "—"],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div
                  key={k}
                  className="grid grid-cols-[160px_1fr] gap-3 py-1.5 border-b border-border/50 last:border-0"
                >
                  <span className="text-muted-foreground text-right">{k}</span>
                  <strong className="font-medium">{v}</strong>
                </div>
              ))}
            </div>
          </div>

          {pattern.stoneConfig.length > 0 && (
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Stone Configuration
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Stone</th>
                      <th>Size</th>
                      <th>Shape</th>
                      <th className="text-right">Qty/Piece</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pattern.stoneConfig.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1.5"
                          >
                            {s.stoneType === "micro" ? "Micro" : "AD"}
                          </Badge>
                        </td>
                        <td className="text-xs font-medium">{s.stoneName}</td>
                        <td className="text-xs text-muted-foreground">
                          {s.stoneSize}
                        </td>
                        <td className="text-xs text-muted-foreground">
                          {s.shape}
                        </td>
                        <td className="text-right text-xs font-semibold">
                          {s.qtyPerPiece}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/20">
                      <td
                        colSpan={4}
                        className="text-right text-xs font-semibold text-muted-foreground"
                      >
                        Total per piece:
                      </td>
                      <td className="text-right text-xs font-bold">
                        {pattern.totalStonesPerPiece}
                      </td>
                    </tr>
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

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<Pattern[]>(getPatterns);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [view, setView] = useState<ViewMode>("list");
  const [selectedPattern, setSelectedPattern] = useState<Pattern | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Pattern | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const refresh = useCallback(() => setPatterns(getPatterns()), []);

  const allCategories = useMemo(() => {
    const set = new Map<string, string>();
    patterns.forEach((p) => set.set(p.categoryId, p.categoryName));
    return Array.from(set.entries());
  }, [patterns]);

  const years = useMemo(() => {
    const set = new Set(
      patterns.map((p) => p.createdAt?.slice(0, 4)).filter(Boolean) as string[],
    );
    return Array.from(set).sort().reverse();
  }, [patterns]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().replace(/[-\s]/g, "");
    return patterns.filter((p) => {
      const matchQ =
        !q ||
        p.patternNumber.toLowerCase().replace(/[-\s]/g, "").includes(q) ||
        p.patternName.toLowerCase().includes(search.toLowerCase()) ||
        p.categoryName.toLowerCase().includes(search.toLowerCase());
      const matchCat =
        categoryFilter === "all" || p.categoryId === categoryFilter;
      const matchYear =
        yearFilter === "all" || p.createdAt?.startsWith(yearFilter);
      const matchActive = showInactive || p.isActive;
      return matchQ && matchCat && matchYear && matchActive;
    });
  }, [patterns, search, showInactive, categoryFilter, yearFilter]);

  // Sort patterns numerically by extracting numeric part of patternNumber
  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const numA = parseInt(a.patternNumber.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.patternNumber.replace(/\D/g, ""), 10) || 0;
      if (numA !== numB) return numA - numB;
      return a.patternNumber.localeCompare(b.patternNumber);
    });
  }, [filtered]);

  const handleSaved = () => {
    setView("list");
    refresh();
  };
  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePattern(deleteTarget.id);
    toast.success("Pattern deleted");
    setDeleteTarget(null);
    refresh();
  };

  if (view === "add")
    return (
      <PatternFormPage onSave={handleSaved} onCancel={() => setView("list")} />
    );
  if (view === "edit")
    return (
      <PatternFormPage
        pattern={selectedPattern}
        onSave={() => {
          refresh();
          setView("detail");
        }}
        onCancel={() => setView("detail")}
      />
    );
  if (view === "detail" && selectedPattern) {
    const fresh =
      patterns.find((p) => p.id === selectedPattern.id) ?? selectedPattern;
    return (
      <PatternDetailPage
        pattern={fresh}
        onEdit={() => setView("edit")}
        onBack={() => setView("list")}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageToolbar
        breadcrumbs={[{ label: "Patterns" }]}
        title="Pattern Master"
        subtitle={`${patterns.filter((p) => p.isActive).length} active · ${allCategories.length} categories`}
        actions={
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setSelectedPattern(undefined);
              setView("add");
            }}
          >
            <Plus size={12} className="mr-1" />
            New Pattern
          </Button>
        }
      />
      <div className="erp-toolbar border-b border-border bg-background flex-wrap gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search pattern # or name…"
          className="w-52 h-7 text-xs"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-7 w-40 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {allCategories.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
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
        {sortedFiltered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            {search || categoryFilter !== "all"
              ? "No patterns match your filters."
              : 'No patterns yet. Click "New Pattern" to get started.'}
          </div>
        ) : (
          <div className="p-4 flex flex-wrap gap-2">
            {sortedFiltered.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPattern(p);
                  setView("detail");
                }}
                title={`${p.patternNumber} — ${p.patternName} · ${p.categoryName}${p.patternSize ? " · " + p.patternSize : ""} · ${p.weightPerPiece}g`}
                className={[
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition-all",
                  "hover:border-primary hover:bg-primary/8 hover:text-primary hover:shadow-sm",
                  p.isActive
                    ? "border-border bg-background text-foreground"
                    : "border-border/50 bg-muted/30 text-muted-foreground",
                ].join(" ")}
              >
                {p.images && p.images.length > 0 && (
                  <span className="w-4 h-4 rounded overflow-hidden shrink-0 border border-border/60">
                    <img
                      src={p.images[0]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </span>
                )}
                {p.patternNumber}
                {!p.isActive && (
                  <span className="text-[9px] text-muted-foreground/60 font-normal">
                    (off)
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {deleteTarget && (
          <div className="sticky bottom-0 p-3 bg-card border-t border-border">
            <div className="confirm-bar">
              <AlertTriangle size={14} className="text-destructive shrink-0" />
              <span className="flex-1 text-xs">
                Delete{" "}
                <strong>
                  {deleteTarget.patternNumber} – {deleteTarget.patternName}
                </strong>
                ? This cannot be undone.
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
