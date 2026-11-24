import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronRight, Hammer, Gem, Eye, Trash2, MessageCircle, Pencil } from "lucide-react";
import html2canvas from "html2canvas";
import { getOrders, updateOrder, deleteOrder, getKarigars } from "@/lib/db";
import { formatDate, nanoid } from "@/lib/utils";
import { ORDER_STATUS_LABELS, getNextStatuses } from "@/lib/orderStatus";
import { PageToolbar } from "@/components/layouts/AppLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KarigarSplitEditor } from "@/components/common/KarigarSplitEditor";
import {
  assignmentsOfType,
  buildSplitTargets,
  describeAllotment,
  splitBalance,
  type SplitTarget,
} from "@/lib/karigarSplit";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { KarigarAssignment, Order, OrderStatus } from "@/types/erp";

const WAX_STAGES: OrderStatus[] = [
  "assigned",
  "wax_in_progress",
  "wax_completed",
];
const STONE_STAGES: OrderStatus[] = [
  "stone_setting_pending",
  "stone_setting_in_progress",
  "stone_setting_completed",
];
const ALL_PRODUCTION_STAGES: OrderStatus[] = [
  ...WAX_STAGES,
  ...STONE_STAGES,
  "production_completed",
];

/** One table row per karigar allotment, used inside the WhatsApp work-order images */
function distributionRowsHTML(
  assignments: KarigarAssignment[],
  targets: SplitTarget[],
): string {
  return assignments
    .map((a) => {
      const target = targets.find((t) => t.id === a.itemId);
      const pieces = Number(a.allottedPieces) || 0;
      const grams = target
        ? pieces * (target.weightPerPiece || 0)
        : Number(a.allottedGrams) || 0;
      const label = target ? target.label : "Whole order";
      const gramsText = grams > 0 ? ` · ${grams.toFixed(3)} g` : "";
      return `<tr>
        <td style="padding: 4px 6px; border-bottom: 1px solid #eee;">${a.karigarName}</td>
        <td style="padding: 4px 6px; border-bottom: 1px solid #eee;">${label}</td>
        <td style="padding: 4px 6px; border-bottom: 1px solid #eee; text-align: right; white-space: nowrap;">${pieces} pcs${gramsText}</td>
      </tr>`;
    })
    .join("");
}

/** Distribution block shared by the wax and stone work-order images */
function distributionTableHTML(
  assignments: KarigarAssignment[],
  targets: SplitTarget[],
): string {
  if (assignments.length === 0) return "";

  const allotted = assignments.reduce(
    (sum, a) => sum + (Number(a.allottedPieces) || 0),
    0,
  );
  const required = targets.reduce((sum, t) => sum + t.pieces, 0);

  return `
    <div style="margin-top: 15px; margin-bottom: 5px;">
      <strong>${assignments.length > 1 ? "Karigar Distribution:" : "Karigar:"}</strong>
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <thead>
        <tr>
          <th style="text-align: left; padding: 4px 6px; border-bottom: 1px solid #ddd;">Karigar</th>
          <th style="text-align: left; padding: 4px 6px; border-bottom: 1px solid #ddd;">Pattern</th>
          <th style="text-align: right; padding: 4px 6px; border-bottom: 1px solid #ddd;">Qty</th>
        </tr>
      </thead>
      <tbody>${distributionRowsHTML(assignments, targets)}</tbody>
    </table>
    <div style="margin-top: 6px; font-size: 12px; color: #444;">
      Distributed: <strong>${allotted}</strong> / ${required} pcs
    </div>
    `;
}

// Generate WhatsApp JPG for the wax karigar(s)
function generateWaxKarigarJPG(
  order: Order,
  assignments: KarigarAssignment[],
  targets: SplitTarget[],
): string {
  const totalWaxTrees = order.items.reduce((sum, item) => {
    const calc = item.calculation;
    return sum + (calc?.waxTreesRequired || 0);
  }, 0);

  return `
    <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 400px; background: white;">
      <div style="border: 2px solid #d4af37; border-radius: 10px; padding: 15px;">
        <h2 style="color: #d4af37; margin: 0 0 15px 0; text-align: center; font-size: 18px;">${assignments.length > 1 ? "Wax Work Distribution" : "Wax Work Assignment"}</h2>
        <div style="margin-bottom: 10px;">
          <strong>Party/Customer:</strong> ${order.customerName}
        </div>
        <div style="margin-bottom: 10px;">
          <strong>Order Number:</strong> ${order.orderNumber}
        </div>
        <div style="margin-bottom: 10px;">
          <strong>Pattern Details:</strong>
        </div>
        ${order.items.map(item => `
          <div style="margin-left: 15px; margin-bottom: 5px;">
            • ${item.snapshot?.patternNumber || 'N/A'} - ${item.snapshot?.patternName || 'N/A'}
          </div>
        `).join('')}
        ${distributionTableHTML(assignments, targets)}
        <div style="margin-top: 15px; margin-bottom: 10px;">
          <strong>Total Wax Trees Required:</strong> ${totalWaxTrees}
        </div>
        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
          Generated on ${new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  `;
}

// Generate WhatsApp JPG for the stone setting karigar(s)
function generateStoneKarigarJPG(
  order: Order,
  assignments: KarigarAssignment[],
  targets: SplitTarget[],
): string {
  const stoneDetails = order.items.reduce((acc: any[], item) => {
    const config = item.snapshot?.stoneConfig || [];
    config.forEach((stone: any) => {
      const existing = acc.find(s => s.size === stone.size && s.type === stone.type);
      if (existing) {
        existing.quantity += (item.calculation?.totalStones || 0) * (stone.quantityPerPiece || 1);
      } else {
        acc.push({
          size: stone.size,
          type: stone.type,
          shape: stone.shape,
          quantity: (item.calculation?.totalStones || 0) * (stone.quantityPerPiece || 1)
        });
      }
    });
    return acc;
  }, []);

  const totalWaxPieces = assignments.reduce(
    (sum, a) => sum + (Number(a.allottedPieces) || 0),
    0,
  );

  return `
    <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 400px; background: white;">
      <div style="border: 2px solid #d4af37; border-radius: 10px; padding: 15px;">
        <h2 style="color: #d4af37; margin: 0 0 15px 0; text-align: center; font-size: 18px;">${assignments.length > 1 ? "Stone Setting Distribution" : "Stone Setting Assignment"}</h2>
        <div style="margin-bottom: 10px;">
          <strong>Party/Customer:</strong> ${order.customerName}
        </div>
        <div style="margin-bottom: 10px;">
          <strong>Order Number:</strong> ${order.orderNumber}
        </div>
        <div style="margin-bottom: 10px;">
          <strong>Pattern Details:</strong>
        </div>
        ${order.items.map(item => `
          <div style="margin-left: 15px; margin-bottom: 5px;">
            • ${item.snapshot?.patternNumber || 'N/A'} - ${item.snapshot?.patternName || 'N/A'}
          </div>
        `).join('')}
        ${distributionTableHTML(assignments, targets)}
        <div style="margin-top: 15px; margin-bottom: 10px;">
          <strong>Stone Requirements:</strong>
        </div>
        ${stoneDetails.map(stone => `
          <div style="margin-left: 15px; margin-bottom: 5px;">
            • ${stone.type === 'micro' ? 'Micro' : stone.shape} ${stone.size}: ${stone.quantity} pcs
          </div>
        `).join('')}
        <div style="margin-top: 15px; margin-bottom: 10px;">
          <strong>Total Pieces Handed Over:</strong> ${totalWaxPieces}
        </div>
        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
          Generated on ${new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  `;
}

async function shareToWhatsApp(imageDataUrl: string, phoneNumber?: string) {
  try {
    // Convert data URL to blob
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    const file = new File([blob], 'assignment.jpg', { type: 'image/jpeg' });

    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/jpeg': file })
      ]);
      toast.success("Image copied to clipboard! Paste in WhatsApp (Ctrl+V)");
    }

    // Open WhatsApp
    const phone = phoneNumber || '';
    const whatsappUrl = `https://wa.me/${phone}`;
    window.open(whatsappUrl, '_blank');
  } catch (error) {
    console.error('Failed to share:', error);
    toast.error("Failed to share. Please try screenshot method.");
  }
}

/**
 * Render a work-order snippet off-screen, copy it to the clipboard and open
 * WhatsApp. When the work is split between several karigars there is no single
 * phone number, so the chat is left for the user to pick.
 */
async function renderAndShare(
  htmlContent: string,
  phoneNumber: string,
  karigarCount: number,
) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  tempDiv.style.position = 'fixed';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '0';
  document.body.appendChild(tempDiv);

  try {
    const canvas = await html2canvas(tempDiv, {
      backgroundColor: '#ffffff',
      scale: 2,
    });
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    await shareToWhatsApp(imageDataUrl, phoneNumber);
    if (karigarCount > 1) {
      toast.info("Insert the image in the chat of the karigar you want to notify.");
    }
  } catch (error) {
    console.error('Failed to generate image:', error);
    toast.error("Failed to generate image");
  } finally {
    document.body.removeChild(tempDiv);
  }
}

function InlineAssignPanel({
  order,
  type,
  onDone,
}: {
  order: Order;
  type: "wax" | "stone";
  onDone: () => void;
}) {
  const karigars = useMemo(
    () => getKarigars().filter((k) => k.isActive && k.type === type),
    [type],
  );
  const targets = useMemo(() => buildSplitTargets(order.items), [order.items]);
  const [rows, setRows] = useState<KarigarAssignment[]>(() =>
    assignmentsOfType(order.karigarAssignments ?? [], type).map((a) => ({ ...a })),
  );

  const handle = () => {
    if (rows.some((row) => !row.karigarId)) {
      toast.error("Every allotment needs a karigar");
      return;
    }
    if (rows.some((row) => !row.allottedPieces)) {
      toast.error("Enter the number of pieces for every karigar");
      return;
    }

    const balance = splitBalance(targets, rows, type, "");
    if (balance.overAllocated) {
      toast.error(
        `Distribution exceeds the order by ${balance.totalAllotted - balance.totalRequired} pcs. Please adjust the quantities.`,
      );
      return;
    }

    const saved: KarigarAssignment[] = rows.map((row) => ({
      ...row,
      id: row.id || nanoid(),
      assignedAt: row.assignedAt || new Date().toISOString(),
    }));

    const advancesTo: OrderStatus =
      type === "wax" ? "wax_in_progress" : "stone_setting_in_progress";
    const earlierStages: OrderStatus[] =
      type === "wax"
        ? ["pending", "assigned"]
        : ["pending", "assigned", "wax_in_progress", "wax_completed", "stone_setting_pending"];
    const shouldAdvance = saved.length > 0 && earlierStages.includes(order.status);

    updateOrder(order.id, {
      karigarAssignments: [
        ...(order.karigarAssignments ?? []).filter((a) => a.type !== type),
        ...saved,
      ],
      ...(shouldAdvance
        ? {
            status: advancesTo,
            statusHistory: [
              ...order.statusHistory,
              {
                status: advancesTo,
                changedAt: new Date().toISOString(),
                changedBy: "admin",
                notes: `${type === "wax" ? "Wax" : "Stone"} work distributed to ${saved.length} karigar${saved.length > 1 ? "s" : ""}`,
              },
            ],
          }
        : {}),
    });

    if (balance.unallocated > 0) {
      toast.warning(
        `${balance.unallocated} pcs are still without a karigar and can be distributed later.`,
      );
    }
    toast.success(
      `${type === "wax" ? "Wax" : "Stone"} work saved for ${saved.length} karigar${saved.length > 1 ? "s" : ""}`,
    );
    onDone();
  };

  return (
    <tr>
      <td colSpan={7} className="px-4 py-3 bg-muted/40 border-b border-border">
        <div className="flex flex-col gap-2">
          <KarigarSplitEditor
            type={type}
            targets={targets}
            karigars={karigars}
            value={rows}
            onChange={setRows}
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={onDone}
            >
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={handle}>
              Save Distribution
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
}

function AdvanceStatusButton({
  order,
  onDone,
}: {
  order: Order;
  onDone: () => void;
}) {
  const next = getNextStatuses(order.status).filter((s) => s !== "cancelled");
  if (next.length === 0) return null;
  const handleClick = () => {
    const newStatus = next[0];
    updateOrder(order.id, {
      status: newStatus,
      statusHistory: [
        ...order.statusHistory,
        {
          status: newStatus,
          changedAt: new Date().toISOString(),
          changedBy: "admin",
          notes: "Advanced via Production board",
        },
      ],
    });
    toast.success(`Status → ${ORDER_STATUS_LABELS[newStatus]}`);
    onDone();
  };
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs"
      onClick={handleClick}
    >
      <ChevronRight size={12} className="mr-1" /> {ORDER_STATUS_LABELS[next[0]]}
    </Button>
  );
}

function KarigarAllotmentCell({
  type,
  assignments,
  targets,
  totalPieces,
  allottedPieces,
  onEdit,
  onShare,
}: {
  type: "wax" | "stone";
  assignments: KarigarAssignment[];
  targets: SplitTarget[];
  totalPieces: number;
  allottedPieces: number;
  onEdit: () => void;
  onShare: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {assignments.map((a) => (
        <div
          key={a.id || `${a.karigarId}-${a.itemId}`}
          className="flex items-center gap-1"
        >
          {type === "wax" ? (
            <Hammer size={10} className="text-orange-500 shrink-0" />
          ) : (
            <Gem size={10} className="text-pink-500 shrink-0" />
          )}
          <span className="font-medium">{a.karigarName}</span>
          <span className="text-muted-foreground">
            {describeAllotment(a, targets)}
          </span>
        </div>
      ))}
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[10px] text-muted-foreground">
          {allottedPieces}/{totalPieces} pcs · {assignments.length} karigar
          {assignments.length > 1 ? "s" : ""}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
          title="Edit distribution"
        >
          <Pencil size={10} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0 text-green-600 hover:text-green-700"
          onClick={onShare}
          title="Share via WhatsApp"
        >
          <MessageCircle size={10} />
        </Button>
      </div>
    </div>
  );
}

function ProductionOrderRow({
  order,
  onRefresh,
}: {
  order: Order;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const [assignType, setAssignType] = useState<"wax" | "stone" | null>(null);
  const targets = useMemo(() => buildSplitTargets(order.items), [order.items]);
  const waxAssignments = assignmentsOfType(
    order.karigarAssignments ?? [],
    "wax",
  );
  const stoneAssignments = assignmentsOfType(
    order.karigarAssignments ?? [],
    "stone",
  );
  const waxAllottedPieces = waxAssignments.reduce(
    (sum, a) => sum + (Number(a.allottedPieces) || 0),
    0,
  );
  const stoneAllottedPieces = stoneAssignments.reduce(
    (sum, a) => sum + (Number(a.allottedPieces) || 0),
    0,
  );
  const totalPieces = targets.reduce((sum, t) => sum + t.pieces, 0);

  const isWaxStage = WAX_STAGES.includes(order.status);
  const isStoneStage = STONE_STAGES.includes(order.status);

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to delete order ${order.orderNumber}? This cannot be undone.\n\nStones used in this order will be restored to inventory.`)) return;
    try {
      deleteOrder(order.id);
      toast.success("Order deleted and stones restored to inventory");
      onRefresh();
    } catch (error) {
      toast.error("Failed to delete order");
      console.error(error);
    }
  };

  const handleShareWax = async () => {
    if (waxAssignments.length === 0) return;
    const phone =
      waxAssignments.length === 1
        ? getKarigars().find((k) => k.id === waxAssignments[0].karigarId)
            ?.mobile || ""
        : "";
    await renderAndShare(
      generateWaxKarigarJPG(order, waxAssignments, targets),
      phone,
      waxAssignments.length,
    );
  };

  const handleShareStone = async () => {
    if (stoneAssignments.length === 0) return;
    const phone =
      stoneAssignments.length === 1
        ? getKarigars().find((k) => k.id === stoneAssignments[0].karigarId)
            ?.mobile || ""
        : "";
    await renderAndShare(
      generateStoneKarigarJPG(order, stoneAssignments, targets),
      phone,
      stoneAssignments.length,
    );
  };

  return (
    <>
      <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
        <td className="px-3 py-2 whitespace-nowrap">
          <button
            onClick={() => navigate(`/orders/${order.id}`)}
            className="font-medium text-primary hover:underline text-xs"
          >
            {order.orderNumber}
          </button>
        </td>
        <td className="px-3 py-2 whitespace-nowrap text-xs">
          {order.customerName}
        </td>
        <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
          {formatDate(order.orderDate)}
        </td>
        <td className="px-3 py-2 whitespace-nowrap">
          <StatusBadge status={order.status} />
        </td>
        <td className="px-3 py-2 whitespace-nowrap text-xs">
          {waxAssignments.length > 0 ? (
            <KarigarAllotmentCell
              type="wax"
              assignments={waxAssignments}
              targets={targets}
              totalPieces={totalPieces}
              allottedPieces={waxAllottedPieces}
              onEdit={() => setAssignType(assignType === "wax" ? null : "wax")}
              onShare={handleShareWax}
            />
          ) : isWaxStage ? (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-1.5"
              onClick={() => setAssignType(assignType === "wax" ? null : "wax")}
            >
              <Hammer size={9} className="mr-1" /> Assign
            </Button>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-3 py-2 whitespace-nowrap text-xs">
          {stoneAssignments.length > 0 ? (
            <KarigarAllotmentCell
              type="stone"
              assignments={stoneAssignments}
              targets={targets}
              totalPieces={totalPieces}
              allottedPieces={stoneAllottedPieces}
              onEdit={() =>
                setAssignType(assignType === "stone" ? null : "stone")
              }
              onShare={handleShareStone}
            />
          ) : isStoneStage ? (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-1.5"
              onClick={() =>
                setAssignType(assignType === "stone" ? null : "stone")
              }
            >
              <Gem size={9} className="mr-1" /> Assign
            </Button>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-3 py-2 whitespace-nowrap">
          <div className="flex items-center gap-1">
            <AdvanceStatusButton order={order} onDone={onRefresh} />
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6"
              onClick={() => navigate(`/orders/${order.id}`)}
            >
              <Eye size={11} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 size={11} />
            </Button>
          </div>
        </td>
      </tr>
      {assignType && (
        <InlineAssignPanel
          order={order}
          type={assignType}
          onDone={() => {
            setAssignType(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}

export default function ProductionPage() {
  const [orders, setOrders] = useState(() =>
    getOrders().filter((o) => ALL_PRODUCTION_STAGES.includes(o.status)),
  );
  const refresh = () =>
    setOrders(
      getOrders().filter((o) => ALL_PRODUCTION_STAGES.includes(o.status)),
    );

  const waxOrders = useMemo(
    () => orders.filter((o) => WAX_STAGES.includes(o.status)),
    [orders],
  );
  const stoneOrders = useMemo(
    () => orders.filter((o) => STONE_STAGES.includes(o.status)),
    [orders],
  );
  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === "production_completed"),
    [orders],
  );

  const tableHead = [
    "Order #",
    "Customer",
    "Date",
    "Status",
    "Wax Karigar(s)",
    "Stone Karigar(s)",
    "Actions",
  ];

  function OrderTable({ data }: { data: Order[] }) {
    return (
      <div className="overflow-x-auto">
        <table className="erp-table">
          <thead>
            <tr>
              {tableHead.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No orders in this stage.
                </td>
              </tr>
            ) : (
              data.map((o) => (
                <ProductionOrderRow key={o.id} order={o} onRefresh={refresh} />
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageToolbar
        breadcrumbs={[{ label: "Production" }]}
        title="Production Tracking"
        subtitle={`${orders.length} orders in pipeline`}
      />
      <div className="erp-toolbar border-b border-border bg-background">
        <div className="flex items-center gap-4 ml-auto text-xs text-muted-foreground">
          <span>
            <Hammer size={11} className="inline mr-1 text-orange-500" />
            Wax: <strong>{waxOrders.length}</strong>
          </span>
          <span>
            <Gem size={11} className="inline mr-1 text-pink-500" />
            Stone: <strong>{stoneOrders.length}</strong>
          </span>
          <span>
            Done: <strong>{completedOrders.length}</strong>
          </span>
        </div>
      </div>
      <div className="erp-content">
        <Tabs defaultValue="wax" className="flex flex-col h-full">
          <div className="px-4 pt-3 border-b border-border bg-card">
            <TabsList className="h-8">
              <TabsTrigger value="wax" className="text-xs h-7">
                Wax Work ({waxOrders.length})
              </TabsTrigger>
              <TabsTrigger value="stone" className="text-xs h-7">
                Stone Setting ({stoneOrders.length})
              </TabsTrigger>
              <TabsTrigger value="complete" className="text-xs h-7">
                Completed ({completedOrders.length})
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="wax" className="flex-1 m-0 overflow-auto">
            <OrderTable data={waxOrders} />
          </TabsContent>
          <TabsContent value="stone" className="flex-1 m-0 overflow-auto">
            <OrderTable data={stoneOrders} />
          </TabsContent>
          <TabsContent value="complete" className="flex-1 m-0 overflow-auto">
            <OrderTable data={completedOrders} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
