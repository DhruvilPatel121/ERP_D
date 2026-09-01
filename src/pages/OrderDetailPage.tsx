import { useState, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronRight,
  Hammer,
  Gem,
  Printer,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ImageDown,
} from "lucide-react";
import html2canvas from "html2canvas";
import {
  getOrderById,
  updateOrder,
  getKarigars,
  getAppSettings,
  getBusinessSettings,
} from "@/lib/db";
import {
  buildWaxMessage,
  buildStoneMessage,
  formatNumber,
} from "@/lib/calculations";
import { formatDateTime, formatDate, cn } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  getNextStatuses,
  isTerminalStatus,
} from "@/lib/orderStatus";
import { PageToolbar } from "@/components/layouts/AppLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Order, OrderStatus } from "@/types/erp";

/* ── Progress Stepper ────────────────────────────────────────── */
function ProgressStepper({ order }: { order: Order }) {
  const FLOW: OrderStatus[] = [
    "pending",
    "assigned",
    "wax_in_progress",
    "wax_completed",
    "stone_setting_pending",
    "stone_setting_in_progress",
    "stone_setting_completed",
    "production_completed",
    "delivered",
  ];
  const currentIdx = FLOW.indexOf(order.status);
  if (order.status === "cancelled")
    return (
      <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
        <CheckCircle2 size={12} className="text-red-500" /> Order Cancelled
      </div>
    );
  return (
    <div className="overflow-x-auto">
      <div className="flex items-center min-w-max py-1">
        {FLOW.map((step, i) => (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2 shrink-0",
                  i < currentIdx
                    ? "bg-primary border-primary text-primary-foreground"
                    : i === currentIdx
                      ? "bg-accent border-accent text-accent-foreground ring-2 ring-accent/30"
                      : "bg-card border-border text-muted-foreground",
                )}
              >
                {i < currentIdx ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "text-[9px] mt-0.5 text-center max-w-[56px] leading-tight",
                  i === currentIdx
                    ? "text-accent font-semibold"
                    : "text-muted-foreground",
                )}
              >
                {ORDER_STATUS_LABELS[step]}
              </span>
            </div>
            {i < FLOW.length - 1 && (
              <div
                className={cn(
                  "w-6 h-px mx-0.5 mt-[-10px]",
                  i < currentIdx ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Inline Karigar Assignment Panel ────────────────────────── */
function KarigarAssignPanel({
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

  const handleAssign = () => {
    if (!karigarId) {
      toast.error("Select a karigar");
      return;
    }
    const karigar = karigars.find((k) => k.id === karigarId)!;
    const newStatus: OrderStatus =
      type === "wax" ? "wax_in_progress" : "stone_setting_in_progress";
    updateOrder(order.id, {
      karigarAssignments: [
        ...order.karigarAssignments,
        {
          type,
          karigarId,
          karigarName: karigar.name,
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
          notes: `${type === "wax" ? "Wax" : "Stone"} karigar: ${karigar.name}`,
        },
      ],
    });
    toast.success(`${karigar.name} assigned for ${type} work`);
    onDone();
  };

  return (
    <div className="card-l1 p-3 flex flex-col gap-2 animate-fade-in">
      <p className="text-xs font-semibold">
        Assign {type === "wax" ? "Wax" : "Stone Setting"} Karigar
      </p>
      <Select value={karigarId} onValueChange={setKarigarId}>
        <SelectTrigger className="h-8 text-sm">
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
        placeholder="Notes (optional)..."
        rows={2}
        className="text-sm"
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
        <Button size="sm" className="h-7 text-xs" onClick={handleAssign}>
          Assign Karigar
        </Button>
      </div>
    </div>
  );
}

/* ── WhatsApp Image Card (hidden, rendered off-screen) ──────── */
function OrderImageCard({
  order,
  ref: cardRef,
}: {
  order: Order;
  ref: React.RefObject<HTMLDivElement>;
}) {
  const appSettings = useMemo(() => getAppSettings(), []);
  const businessSettings = useMemo(() => getBusinessSettings(), []);
  const totalTrees = order.items.reduce(
    (s, i) => s + i.calculation.waxTreesRequired,
    0,
  );
  const totalStones = order.items.reduce(
    (s, i) => s + i.calculation.totalStones,
    0,
  );

  return (
    <div
      ref={cardRef}
      style={{
        position: "fixed",
        left: "-9999px",
        top: 0,
        width: "480px",
        background: "#fff",
        fontFamily: "Inter, sans-serif",
        border: "2px solid #1E3A5F",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{ background: "#1E3A5F", color: "#fff", padding: "16px 20px" }}
      >
        <div
          style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "0.02em" }}
        >
          {businessSettings.businessName || "Silver ERP"}
        </div>
        <div style={{ fontSize: "11px", opacity: 0.7, marginTop: 2 }}>
          Manufacturing Order
        </div>
      </div>

      {/* Order meta */}
      <div
        style={{
          background: "#f4f6f8",
          padding: "12px 20px",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{ fontSize: "15px", fontWeight: 700, color: "#1E3A5F" }}
            >
              {order.orderNumber}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: 2 }}>
              {formatDate(order.orderDate)}
            </div>
          </div>
          <div
            style={{
              background: "#B8965A",
              color: "#fff",
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            {ORDER_STATUS_LABELS[order.status]}
          </div>
        </div>
      </div>

      {/* Customer */}
      <div
        style={{
          padding: "10px 20px",
          borderBottom: "1px solid #e2e8f0",
          fontSize: "13px",
        }}
      >
        <span style={{ color: "#64748b" }}>Customer: </span>
        <strong style={{ color: "#1e293b" }}>{order.customerName}</strong>
        {order.customerMobile && (
          <span style={{ color: "#64748b", marginLeft: 8 }}>
            · {order.customerMobile}
          </span>
        )}
      </div>

      {/* Items */}
      <div style={{ padding: "12px 20px" }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 8,
          }}
        >
          Order Items
        </div>
        {order.items.map((item, i) => (
          <div
            key={item.id}
            style={{
              background: i % 2 === 0 ? "#f8fafc" : "#fff",
              borderRadius: 6,
              padding: "8px 10px",
              marginBottom: 4,
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: "13px",
                color: "#1e293b",
                marginBottom: 4,
              }}
            >
              {item.snapshot?.patternNumber} — {item.snapshot?.patternName}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 4,
                fontSize: "11px",
                color: "#475569",
              }}
            >
              <span>
                Order:{" "}
                <b>
                  {item.orderQuantity}
                  {item.quantityType === "grams" ? "g" : " pcs"}
                </b>
              </span>
              <span>
                Pieces:{" "}
                <b style={{ color: "#1E3A5F" }}>
                  {item.calculation.finishedPieces}
                </b>
              </span>
              <span>
                Trees: <b>{item.calculation.waxTreesRequired}</b>
              </span>
              <span>
                Wt/Pc: <b>{item.snapshot?.weightPerPiece}g</b>
              </span>
              <span>
                Tree Sz: <b>{item.snapshot?.treeSize}</b>
              </span>
              <span>
                Stones:{" "}
                <b style={{ color: "#B8965A" }}>
                  {formatNumber(item.calculation.totalStones)}
                </b>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div
        style={{
          background: "#1E3A5F",
          color: "#fff",
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "12px",
        }}
      >
        <span>
          Total Trees: <strong>{totalTrees}</strong>
        </span>
        <span>
          Total Stones: <strong>{formatNumber(totalStones)}</strong>
        </span>
      </div>
      <div
        style={{
          padding: "8px 20px",
          fontSize: "10px",
          color: "#94a3b8",
          textAlign: "center",
        }}
      >
        Generated by {businessSettings.businessName || "Silver ERP"} ·{" "}
        {formatDate(new Date().toISOString())}
      </div>
    </div>
  );
}

/* ── Main OrderDetailPage ────────────────────────────────────── */
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(() =>
    id ? (getOrderById(id) ?? null) : null,
  );
  const [assignType, setAssignType] = useState<"wax" | "stone" | null>(null);
  const [statusNotes, setStatusNotes] = useState("");
  const [generatingImg, setGeneratingImg] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null!);
  const appSettings = useMemo(() => getAppSettings(), []);

  const refresh = useCallback(() => {
    if (id) setOrder(getOrderById(id) ?? null);
  }, [id]);

  if (!order)
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-16">
        <p className="text-muted-foreground text-sm">Order not found.</p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => navigate("/orders")}
        >
          <ArrowLeft size={12} className="mr-1" /> Back to Orders
        </Button>
      </div>
    );

  const nextStatuses = getNextStatuses(order.status);
  const waxAssignment = order.karigarAssignments
    .filter((a) => a.type === "wax")
    .slice(-1)[0];
  const stoneAssignment = order.karigarAssignments
    .filter((a) => a.type === "stone")
    .slice(-1)[0];

  const handleStatusChange = (nextStatus: OrderStatus) => {
    updateOrder(order.id, {
      status: nextStatus,
      statusHistory: [
        ...order.statusHistory,
        {
          status: nextStatus,
          changedAt: new Date().toISOString(),
          changedBy: "admin",
          notes: statusNotes,
        },
      ],
    });
    toast.success(`Status → ${ORDER_STATUS_LABELS[nextStatus]}`);
    setStatusNotes("");
    refresh();
  };

  const handleSendWaxWhatsApp = (item: (typeof order.items)[0]) => {
    const karigar = order.karigarAssignments.find((a) => a.type === "wax");
    const phone = karigar
      ? getKarigars().find((k) => k.id === karigar.karigarId)?.whatsapp || ""
      : "";
    const msg = buildWaxMessage(appSettings.waxMessageTemplate, {
      party: order.customerName,
      pattern: item.snapshot?.patternNumber || "",
      orderQuantity: `${item.orderQuantity}${item.quantityType === "grams" ? "g" : " pcs"}`,
      finishedPieces: item.calculation.finishedPieces,
      treeSize: item.snapshot?.treeSize || 0,
      waxTrees: item.calculation.waxTreesRequired,
      orderNumber: order.orderNumber,
    });
    window.open(
      `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  const handleSendStoneWhatsApp = (item: (typeof order.items)[0]) => {
    const karigar = order.karigarAssignments.find((a) => a.type === "stone");
    const phone = karigar
      ? getKarigars().find((k) => k.id === karigar.karigarId)?.whatsapp || ""
      : "";
    const msg = buildStoneMessage(appSettings.stoneMessageTemplate, {
      party: order.customerName,
      pattern: item.snapshot?.patternNumber || "",
      finishedPieces: item.calculation.finishedPieces,
      stoneRequirements: item.calculation.stoneRequirements,
      orderNumber: order.orderNumber,
    });
    window.open(
      `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  /* ── WhatsApp Image Share ─────────────────────────────────── */
  const handleWhatsAppImageShare = async () => {
    if (!cardRef.current) return;
    setGeneratingImg(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      // Download JPG
      const link = document.createElement("a");
      link.download = `${order.orderNumber}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
      // Open WhatsApp Web
      setTimeout(() => {
        const phone = order.customerWhatsapp?.replace(/\D/g, "") || "";
        const url = phone
          ? `https://wa.me/${phone}`
          : "https://web.whatsapp.com";
        window.open(url, "_blank");
        toast.success("Image downloaded! Attach it in WhatsApp.");
      }, 400);
    } catch {
      toast.error("Image generation failed");
    } finally {
      setGeneratingImg(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <PageToolbar
        breadcrumbs={[
          { label: "Orders", href: "/orders" },
          { label: order.orderNumber },
        ]}
        title={order.orderNumber}
        subtitle={`${order.customerName} · ${formatDate(order.orderDate)}`}
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleWhatsAppImageShare}
              disabled={generatingImg}
            >
              <ImageDown size={12} className="mr-1" />
              {generatingImg ? "Generating…" : "WhatsApp JPG"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => navigate("/export")}
            >
              <Printer size={12} className="mr-1" /> Export
            </Button>
          </div>
        }
      />

      {/* Hidden image card (rendered off-screen for html2canvas) */}
      <OrderImageCard order={order} ref={cardRef} />

      {/* Main layout — 2-column */}
      <div className="erp-content">
        <div className="flex gap-0 h-full">
          {/* Left column — main content */}
          <div className="flex-1 min-w-0 overflow-y-auto p-4 flex flex-col gap-4">
            {/* Progress */}
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Production Progress
                </span>
                <StatusBadge status={order.status} className="ml-auto" />
              </div>
              <div className="px-4 py-3">
                <ProgressStepper order={order} />
              </div>
            </div>

            {/* Status advance */}
            {!isTerminalStatus(order.status) && nextStatuses.length > 0 && (
              <div className="card-l1 p-3 flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Advance Status
                </p>
                <Textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Status change notes (optional)..."
                  rows={2}
                  className="text-sm"
                />
                <div className="flex flex-wrap gap-1.5">
                  {nextStatuses.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      className={cn(
                        "h-7 text-xs",
                        s === "cancelled"
                          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          : "",
                      )}
                      onClick={() => handleStatusChange(s)}
                    >
                      <ChevronRight size={11} className="mr-1" />
                      {ORDER_STATUS_LABELS[s]}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Karigar assignment */}
            {(
              [
                "assigned",
                "wax_in_progress",
                "wax_completed",
                "stone_setting_pending",
                "stone_setting_in_progress",
              ] as OrderStatus[]
            ).includes(order.status) && (
              <div className="card-l1 p-3 flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Karigar Assignment
                </p>
                <div className="flex gap-2 flex-wrap">
                  {(
                    [
                      "assigned",
                      "wax_in_progress",
                      "wax_completed",
                      "stone_setting_pending",
                      "stone_setting_in_progress",
                    ] as OrderStatus[]
                  ).includes(order.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() =>
                        setAssignType(assignType === "wax" ? null : "wax")
                      }
                    >
                      <Hammer size={11} className="mr-1" />
                      {waxAssignment
                        ? `Wax: ${waxAssignment.karigarName}`
                        : "Assign Wax Karigar"}
                    </Button>
                  )}
                  {(
                    [
                      "wax_completed",
                      "stone_setting_pending",
                      "stone_setting_in_progress",
                      "stone_setting_completed",
                    ] as OrderStatus[]
                  ).includes(order.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() =>
                        setAssignType(assignType === "stone" ? null : "stone")
                      }
                    >
                      <Gem size={11} className="mr-1" />
                      {stoneAssignment
                        ? `Stone: ${stoneAssignment.karigarName}`
                        : "Assign Stone Karigar"}
                    </Button>
                  )}
                </div>
                {assignType && (
                  <KarigarAssignPanel
                    order={order}
                    type={assignType}
                    onDone={() => {
                      setAssignType(null);
                      refresh();
                    }}
                  />
                )}
              </div>
            )}

            {/* Order Items */}
            <div className="card-l1">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Order Items ({order.items.length})
                </span>
              </div>
              <div className="divide-y divide-border">
                {order.items.map((item) => (
                  <div key={item.id} className="p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-xs">
                          {item.snapshot?.patternNumber} —{" "}
                          {item.snapshot?.patternName}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1.5"
                          >
                            {item.quantityType === "grams"
                              ? `${item.orderQuantity}g`
                              : `${item.orderQuantity} pcs`}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            → {item.calculation.finishedPieces} pieces
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-1.5"
                          onClick={() => handleSendWaxWhatsApp(item)}
                        >
                          <Hammer size={9} className="mr-1" /> Wax WA
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-1.5"
                          onClick={() => handleSendStoneWhatsApp(item)}
                        >
                          <Gem size={9} className="mr-1" /> Stone WA
                        </Button>
                      </div>
                    </div>

                    {/* Calc grid */}
                    <div className="grid grid-cols-3 gap-1 bg-muted/30 rounded p-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground">
                          Wt/Piece:{" "}
                        </span>
                        <strong>{item.snapshot?.weightPerPiece}g</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pieces: </span>
                        <strong className="text-primary">
                          {item.calculation.finishedPieces}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Wax Trees:{" "}
                        </span>
                        <strong>{item.calculation.waxTreesRequired}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Tree Size:{" "}
                        </span>
                        <strong>{item.snapshot?.treeSize}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Total Stones:{" "}
                        </span>
                        <strong className="text-accent">
                          {formatNumber(item.calculation.totalStones)}
                        </strong>
                      </div>
                      {item.calculation.expectedWeightGrams !== null && (
                        <div>
                          <span className="text-muted-foreground">
                            Exp. Wt:{" "}
                          </span>
                          <strong>
                            {item.calculation.expectedWeightGrams.toFixed(3)}g
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* Stone breakdown */}
                    {item.calculation.stoneRequirements.length > 0 && (
                      <table className="erp-table">
                        <thead>
                          <tr>
                            <th>Stone</th>
                            <th>Size</th>
                            <th className="text-right">Qty/Piece</th>
                            <th className="text-right">Total Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.calculation.stoneRequirements.map((sr, si) => (
                            <tr key={si}>
                              <td className="text-[11px]">
                                <Badge
                                  variant="outline"
                                  className="text-[9px] h-3.5 px-1 mr-1"
                                >
                                  {sr.stoneType === "micro" ? "M" : "AD"}
                                </Badge>
                                {sr.stoneName}
                              </td>
                              <td className="text-[11px] text-muted-foreground">
                                {sr.stoneSize}
                              </td>
                              <td className="text-right text-[11px]">
                                {sr.qtyPerPiece}
                              </td>
                              <td className="text-right text-[11px] font-semibold text-accent">
                                {formatNumber(sr.requiredQty)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-muted/20">
                            <td
                              colSpan={3}
                              className="text-right text-[11px] font-bold text-muted-foreground"
                            >
                              Total:
                            </td>
                            <td className="text-right text-[11px] font-bold text-accent">
                              {formatNumber(item.calculation.totalStones)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel — order info + history */}
          <div className="w-64 shrink-0 border-l border-border overflow-y-auto flex flex-col bg-card">
            {/* Order summary */}
            <div className="p-3 border-b border-border">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Order Info
              </p>
              <div className="flex flex-col gap-1.5 text-[12px]">
                {[
                  ["Order No", order.orderNumber],
                  ["Date", formatDate(order.orderDate)],
                  ["Customer", order.customerName],
                  ["Mobile", order.customerMobile],
                  ["Items", String(order.items.length)],
                  [
                    "Total Trees",
                    String(
                      order.items.reduce(
                        (s, i) => s + i.calculation.waxTreesRequired,
                        0,
                      ),
                    ),
                  ],
                  [
                    "Total Stones",
                    formatNumber(
                      order.items.reduce(
                        (s, i) => s + i.calculation.totalStones,
                        0,
                      ),
                    ),
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">{k}</span>
                    <span className="font-medium text-right truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Karigar assignments */}
            {order.karigarAssignments.length > 0 && (
              <div className="p-3 border-b border-border">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Karigars
                </p>
                {order.karigarAssignments.map((a, i) => (
                  <div key={i} className="flex items-center gap-1.5 mb-1.5">
                    {a.type === "wax" ? (
                      <Hammer
                        size={11}
                        className="text-muted-foreground shrink-0"
                      />
                    ) : (
                      <Gem
                        size={11}
                        className="text-muted-foreground shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium truncate">
                        {a.karigarName}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {a.type} work
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Status history */}
            <div className="p-3 flex-1 overflow-y-auto">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Status History
              </p>
              <div className="flex flex-col gap-2">
                {order.statusHistory
                  .slice()
                  .reverse()
                  .map((h, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock size={8} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <StatusBadge status={h.status} />
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDateTime(h.changedAt)}
                        </p>
                        {h.notes && (
                          <p className="text-[10px] text-muted-foreground">
                            {h.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
