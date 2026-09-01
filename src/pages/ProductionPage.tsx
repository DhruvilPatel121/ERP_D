import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronRight, Hammer, Gem, Eye } from "lucide-react";
import { getOrders, updateOrder, getKarigars } from "@/lib/db";
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
