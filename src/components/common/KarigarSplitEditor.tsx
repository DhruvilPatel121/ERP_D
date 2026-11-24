import { useMemo } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, Divide, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Combobox, type ComboboxOption } from "@/components/common/Combobox";
import { nanoid } from "@/lib/utils";
import {
  WORK_TYPE_META,
  evenSplit,
  gramsForPieces,
  makeAssignment,
  remainingPiecesForItem,
  treesForPieces,
  type KarigarWorkType,
  type SplitTarget,
} from "@/lib/karigarSplit";
import type { Karigar, KarigarAssignment } from "@/types/erp";

export interface KarigarSplitEditorProps {
  type: KarigarWorkType;
  /** Order items the pieces can be distributed against */
  targets: SplitTarget[];
  /** Active karigars of this work type */
  karigars: Karigar[];
  value: KarigarAssignment[];
  onChange: (next: KarigarAssignment[]) => void;
  /** Pattern dice range suggestion for an order item */
  suggestedKarigarId?: (itemId: string) => string;
  disabled?: boolean;
  disabledHint?: string;
}

/**
 * Distributes one order across one or many karigars.
 * Every row hands a freely chosen number of pieces of a single pattern to a
 * karigar, so the split never has to be equal.
 */
export function KarigarSplitEditor({
  type,
  targets,
  karigars,
  value,
  onChange,
  suggestedKarigarId,
  disabled = false,
  disabledHint,
}: KarigarSplitEditorProps) {
  const meta = WORK_TYPE_META[type];

  const karigarOptions: ComboboxOption[] = useMemo(
    () => karigars.map((k) => ({ value: k.id, label: k.name })),
    [karigars],
  );

  const targetOptions: ComboboxOption[] = useMemo(
    () => targets.map((t) => ({ value: t.id, label: t.label })),
    [targets],
  );

  const totalRequired = targets.reduce((sum, t) => sum + t.pieces, 0);
  const totalAllotted = value.reduce(
    (sum, a) => sum + (Number(a.allottedPieces) || 0),
    0,
  );
  const unallocated = Math.max(0, totalRequired - totalAllotted);
  const overAllocated = totalAllotted > totalRequired;
  const missingKarigar = value.some((a) => !a.karigarId);

  const targetById = useMemo(
    () => new Map(targets.map((t) => [t.id, t])),
    [targets],
  );

  const patchRow = (id: string, patch: Partial<KarigarAssignment>) => {
    onChange(
      value.map((row) => {
        if (row.id !== id) return row;
        const merged = { ...row, ...patch };
        if (patch.itemId !== undefined || patch.allottedPieces !== undefined) {
          merged.allottedGrams = gramsForPieces(
            targetById.get(merged.itemId),
            merged.allottedPieces,
          );
        }
        return merged;
      }),
    );
  };

  const handleKarigarChange = (row: KarigarAssignment, karigarId: string) => {
    const karigar = karigars.find((k) => k.id === karigarId);
    patchRow(row.id, {
      karigarId,
      karigarName: karigar?.name ?? "",
    });
  };

  const handleItemChange = (row: KarigarAssignment, itemId: string) => {
    const remaining = remainingPiecesForItem(
      targets,
      value,
      type,
      itemId,
      row.id,
    );
    const pieces = Math.min(Number(row.allottedPieces) || 0, remaining);
    if (pieces !== row.allottedPieces) {
      toast.info(`Quantity trimmed to ${pieces} pcs — that pattern has no more free pieces.`);
    }
    patchRow(row.id, { itemId, allottedPieces: pieces });
  };

  const handlePiecesChange = (row: KarigarAssignment, raw: string) => {
    const parsed = raw === "" ? 0 : Math.max(0, Math.floor(Number(raw)));
    const remaining = remainingPiecesForItem(
      targets,
      value,
      type,
      row.itemId,
      row.id,
    );
    if (parsed > remaining) {
      toast.warning(
        `Only ${remaining} pcs left for this pattern. Quantity capped.`,
      );
    }
    patchRow(row.id, {
      allottedPieces: Math.min(Number.isFinite(parsed) ? parsed : 0, remaining),
    });
  };

  const handleAddRow = () => {
    const target =
      targets.find(
        (t) =>
          remainingPiecesForItem(targets, value, type, t.id) > 0,
      ) ?? targets[0];
    if (!target) return;

    const suggestion = suggestedKarigarId?.(target.id);
    const karigar = karigars.find((k) => k.id === suggestion);
    const row = makeAssignment(type, target, karigar, 0);
    onChange([...value, { ...row, id: nanoid() }]);
  };

  const handleRemoveRow = (id: string) => {
    onChange(value.filter((row) => row.id !== id));
  };

  const handleSplitEvenly = () => {
    const karigarIds = Array.from(
      new Set(value.map((row) => row.karigarId).filter(Boolean)),
    );
    if (karigarIds.length === 0) {
      toast.error("Add at least one karigar before splitting.");
      return;
    }
    const next: KarigarAssignment[] = [];
    targets.forEach((target) => {
      if (target.pieces <= 0) return;
      const slices = evenSplit(target.pieces, karigarIds.length);
      karigarIds.forEach((karigarId, index) => {
        const pieces = slices[index];
        if (pieces <= 0) return;
        const karigar = karigars.find((k) => k.id === karigarId);
        const existing = value.find(
          (row) => row.karigarId === karigarId && row.itemId === target.id,
        );
        next.push({
          ...makeAssignment(type, target, karigar, pieces, existing?.notes ?? ""),
          id: existing?.id ?? nanoid(),
        });
      });
    });
    onChange(next);
    toast.success(
      `Distributed every pattern across ${karigarIds.length} karigar${karigarIds.length > 1 ? "s" : ""}.`,
    );
  };

  if (disabled) {
    return (
      <div className="card-l1 p-3">
        <p className="text-xs font-semibold">{meta.label} Distribution</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {disabledHint ?? "Complete the previous step to assign karigars."}
        </p>
      </div>
    );
  }

  if (targets.length === 0) {
    return (
      <div className="card-l1 p-3">
        <p className="text-xs font-semibold">{meta.label} Distribution</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Add at least one order item first — pieces are distributed per pattern.
        </p>
      </div>
    );
  }

  return (
    <div className="card-l1">
      <div className="px-4 py-2 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {meta.label} Distribution
          </span>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
            {value.length} allotment{value.length === 1 ? "" : "s"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 text-[10px]"
            onClick={handleSplitEvenly}
            title="Divide every pattern equally between the listed karigars"
          >
            <Divide size={10} className="mr-1" />
            Split Evenly
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 text-[10px]"
            onClick={handleAddRow}
          >
            <Plus size={10} className="mr-1" />
            Add Karigar
          </Button>
        </div>
      </div>

      <div className="px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border text-[11px]">
        <span className="text-muted-foreground">
          Required:{" "}
          <strong className="text-foreground">
            {totalRequired.toLocaleString()} pcs
          </strong>
        </span>
        <span className="text-muted-foreground">
          Distributed:{" "}
          <strong className="text-foreground">
            {totalAllotted.toLocaleString()} pcs
          </strong>
        </span>
        {overAllocated ? (
          <span className="flex items-center gap-1 text-destructive font-semibold">
            <AlertTriangle size={11} />
            Over-booked by {(totalAllotted - totalRequired).toLocaleString()} pcs
          </span>
        ) : unallocated > 0 ? (
          <span className="flex items-center gap-1 text-amber-600 font-semibold">
            <AlertTriangle size={11} />
            {unallocated.toLocaleString()} pcs still without a karigar
          </span>
        ) : (
          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
            <Check size={11} />
            Fully distributed
          </span>
        )}
      </div>

      {value.length === 0 ? (
        <div className="p-6 text-center text-[11px] text-muted-foreground">
          No karigars added yet. Use "Add Karigar" to distribute this order, or
          enter it later from the order detail page.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-3 py-2 text-left text-[11px] font-semibold border-r border-border">
                  Karigar
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold border-r border-border">
                  Pattern
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold border-r border-border w-28">
                  Pieces Given
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold border-r border-border w-28">
                  Weight
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold border-r border-border w-32">
                  Notes
                </th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {value.map((row) => {
                const target = targetById.get(row.itemId);
                const remaining = remainingPiecesForItem(
                  targets,
                  value,
                  type,
                  row.itemId,
                  row.id,
                );
                const grams =
                  target?.weightPerPiece && row.allottedPieces
                    ? gramsForPieces(target, row.allottedPieces)
                    : Number(row.allottedGrams) || 0;
                return (
                  <tr key={row.id} className="border-b border-border">
                    <td className="px-3 py-2 border-r border-border align-top">
                      <Combobox
                        options={karigarOptions}
                        value={row.karigarId}
                        onChange={(v) => handleKarigarChange(row, v)}
                        placeholder="Select karigar"
                        emptyMessage="No karigars available"
                        className={`h-8 text-xs ${!row.karigarId ? "border-destructive" : ""}`}
                      />
                      {!row.karigarId && (
                        <p className="text-[10px] text-destructive mt-1">
                          Select a karigar
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 border-r border-border align-top">
                      <Combobox
                        options={targetOptions}
                        value={row.itemId}
                        onChange={(v) => handleItemChange(row, v)}
                        placeholder="Whole order"
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 border-r border-border align-top">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          className="h-8 text-xs"
                          value={row.allottedPieces || ""}
                          placeholder="0"
                          onChange={(e) =>
                            handlePiecesChange(row, e.target.value)
                          }
                        />
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          pc
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        max {remaining} free
                      </p>
                    </td>
                    <td className="px-3 py-2 border-r border-border align-top text-xs whitespace-nowrap">
                      <span className="font-semibold">
                        {grams.toFixed(3)} g
                      </span>
                      {type === "wax" && target?.treeSize ? (
                        <div className="text-[10px] text-muted-foreground">
                          {treesForPieces(target, row.allottedPieces)} tree
                          {treesForPieces(target, row.allottedPieces) === 1
                            ? ""
                            : "s"}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 border-r border-border align-top">
                      <Input
                        className="h-8 text-xs"
                        placeholder="Notes…"
                        value={row.notes}
                        onChange={(e) =>
                          patchRow(row.id, { notes: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-center align-top">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="text-destructive hover:text-destructive/80 p-1 hover:bg-destructive/10 rounded transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {targets.length > 1 && (
        <div className="px-4 py-2 border-t border-border flex flex-col gap-1">
          {targets.map((target) => {
            const allotted = value
              .filter((row) => row.itemId === target.id)
              .reduce((sum, row) => sum + (Number(row.allottedPieces) || 0), 0);
            const remaining = target.pieces - allotted;
            return (
              <div
                key={target.id}
                className="flex items-center justify-between text-[10px]"
              >
                <span className="truncate text-muted-foreground">
                  {target.label}
                </span>
                <span
                  className={
                    remaining < 0
                      ? "text-destructive font-semibold"
                      : remaining === 0
                        ? "text-emerald-600 font-semibold"
                        : "text-amber-600 font-semibold"
                  }
                >
                  {allotted.toLocaleString()}/{target.pieces.toLocaleString()} pcs
                  {remaining !== 0 &&
                    ` · ${remaining > 0 ? `${remaining.toLocaleString()} left` : `${Math.abs(remaining).toLocaleString()} over`}`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {missingKarigar && (
        <div className="px-4 py-2 border-t border-border text-[10px] text-destructive">
          Every allotment needs a karigar before the order can be saved.
        </div>
      )}
    </div>
  );
}
