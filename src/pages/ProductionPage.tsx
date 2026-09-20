import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronRight, Hammer, Gem, Eye, Trash2, MessageCircle, Download } from "lucide-react";
import html2canvas from "html2canvas";
import { getOrders, updateOrder, deleteOrder, getKarigars } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, getNextStatuses } from "@/lib/orderStatus";
import { PageToolbar } from "@/components/layouts/AppLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Order, OrderStatus } from "@/types/erp";

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

// Generate WhatsApp JPG for wax karigar
function generateWaxKarigarJPG(order: Order, karigar: any): string {
  const totalWaxTrees = order.items.reduce((sum, item) => {
    const calc = item.calculation;
    return sum + (calc?.waxTreesRequired || 0);
  }, 0);

  return `
    <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 400px; background: white;">
      <div style="border: 2px solid #d4af37; border-radius: 10px; padding: 15px;">
        <h2 style="color: #d4af37; margin: 0 0 15px 0; text-align: center; font-size: 18px;">Wax Work Assignment</h2>
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

// Generate WhatsApp JPG for stone karigar
function generateStoneKarigarJPG(order: Order, karigar: any): string {
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

  const totalWaxPieces = order.items.reduce((sum, item) => {
    const calc = item.calculation;
    return sum + (calc?.totalPieces || 0);
  }, 0);

  return `
    <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 400px; background: white;">
      <div style="border: 2px solid #d4af37; border-radius: 10px; padding: 15px;">
        <h2 style="color: #d4af37; margin: 0 0 15px 0; text-align: center; font-size: 18px;">Stone Setting Assignment</h2>
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
        <div style="margin-top: 15px; margin-bottom: 10px;">
          <strong>Stone Requirements:</strong>
        </div>
        ${stoneDetails.map(stone => `
          <div style="margin-left: 15px; margin-bottom: 5px;">
            • ${stone.type === 'micro' ? 'Micro' : stone.shape} ${stone.size}: ${stone.quantity} pcs
          </div>
        `).join('')}
        <div style="margin-top: 15px; margin-bottom: 10px;">
          <strong>Total Wax Pieces Given:</strong> ${totalWaxPieces}
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

function InlineAssignPanel({
  order,
  type,
  onDone,
}: {
  order: Order;
  type: "wax" | "stone";
  onDone: () => void;
}) {
  const karigars = useMemo(() => getKarigars().filter((k) => k.isActive), []);
  const [karigarId, setKarigarId] = useState("");
  const [notes, setNotes] = useState("");

  const handle = () => {
    if (!karigarId) {
      toast.error("Select a karigar");
      return;
    }
    const k = karigars.find((x) => x.id === karigarId)!;
    const newStatus: OrderStatus =
      type === "wax" ? "wax_in_progress" : "stone_setting_in_progress";
    updateOrder(order.id, {
      karigarAssignments: [
        ...order.karigarAssignments,
        {
          type,
          karigarId,
          karigarName: k.name,
          assignedAt: new Date().toISOString(),
          notes,
        },
      ],
      status: newStatus,
      statusHistory: [
        ...order.statusHistory,
        {
          status: newStatus,
          changedAt: new Date().toISOString(),
          changedBy: "admin",
          notes: `${type} work assigned to ${k.name}`,
        },
      ],
    });
    toast.success(`${k.name} assigned for ${type} work`);
    onDone();
  };

  return (
    <tr>
      <td colSpan={7} className="px-4 py-2 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium whitespace-nowrap">
            Assign {type === "wax" ? "Wax" : "Stone"} Karigar:
          </span>
          <Select value={karigarId} onValueChange={setKarigarId}>
            <SelectTrigger className="h-7 w-52 text-xs">
              <SelectValue placeholder="Select karigar" />
            </SelectTrigger>
            <SelectContent>
              {karigars.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.name} — {k.type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes…"
            rows={1}
            className="h-7 text-xs py-1 w-40 resize-none"
          />
          <Button size="sm" className="h-7 text-xs" onClick={handle}>
            Assign
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={onDone}
          >
            Cancel
          </Button>
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

function ProductionOrderRow({
  order,
  onRefresh,
}: {
  order: Order;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const [assignType, setAssignType] = useState<"wax" | "stone" | null>(null);
  const waxAssign = order.karigarAssignments
    .filter((a) => a.type === "wax")
    .slice(-1)[0];
  const stoneAssign = order.karigarAssignments
    .filter((a) => a.type === "stone")
    .slice(-1)[0];

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
    if (!waxAssign) return;
    const htmlContent = generateWaxKarigarJPG(order, waxAssign);
    
    // Create a temporary div to render the HTML
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
      
      // Get karigar phone number if available
      const karigars = getKarigars();
      const karigar = karigars.find(k => k.id === waxAssign.karigarId);
      const phoneNumber = karigar?.mobile || '';
      
      await shareToWhatsApp(imageDataUrl, phoneNumber);
    } catch (error) {
      console.error('Failed to generate image:', error);
      toast.error("Failed to generate image");
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const handleShareStone = async () => {
    if (!stoneAssign) return;
    const htmlContent = generateStoneKarigarJPG(order, stoneAssign);
    
    // Create a temporary div to render the HTML
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
      
      // Get karigar phone number if available
      const karigars = getKarigars();
      const karigar = karigars.find(k => k.id === stoneAssign.karigarId);
      const phoneNumber = karigar?.mobile || '';
      
      await shareToWhatsApp(imageDataUrl, phoneNumber);
    } catch (error) {
      console.error('Failed to generate image:', error);
      toast.error("Failed to generate image");
    } finally {
      document.body.removeChild(tempDiv);
    }
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
          {waxAssign ? (
            <div className="flex items-center gap-1">
              <Hammer size={10} className="text-orange-500 shrink-0" />
              <span>{waxAssign.karigarName}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 ml-1 text-green-600 hover:text-green-700"
                onClick={handleShareWax}
                title="Share via WhatsApp"
              >
                <MessageCircle size={10} />
              </Button>
            </div>
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
          {stoneAssign ? (
            <div className="flex items-center gap-1">
              <Gem size={10} className="text-pink-500 shrink-0" />
              <span>{stoneAssign.karigarName}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 ml-1 text-green-600 hover:text-green-700"
                onClick={handleShareStone}
                title="Share via WhatsApp"
              >
                <MessageCircle size={10} />
              </Button>
            </div>
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
    "Wax Karigar",
    "Stone Karigar",
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
