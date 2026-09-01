import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  Printer,
  Share2,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { getOrders, getCustomers, getPatterns, getKarigars } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/orderStatus";
import { PageToolbar } from "@/components/layouts/AppLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Order } from "@/types/erp";

type ExportType =
  | "orders"
  | "customers"
  | "patterns"
  | "karigars"
  | "production";

function getOrdersData() {
  return getOrders().map((o) => ({
    "Order #": o.orderNumber,
    Customer: o.customerName,
    "Order Date": formatDate(o.orderDate),
    "Items Count": o.items.length,
    "Total Trees": o.items.reduce(
      (s, i) => s + i.calculation.waxTreesRequired,
      0,
    ),
    "Total Pieces": o.items.reduce(
      (s, i) => s + i.calculation.finishedPieces,
      0,
    ),
    "Total Stones": o.items.reduce((s, i) => s + i.calculation.totalStones, 0),
    Status: ORDER_STATUS_LABELS[o.status] || o.status,
    Notes: o.notes,
  }));
}

function getCustomersData() {
  return getCustomers().map((c) => ({
    "Customer ID": c.customerId,
    "Party Name": c.partyName,
    "Contact Person": c.contactPerson,
    Mobile: c.mobile,
    WhatsApp: c.whatsapp,
    Email: c.email,
    City: c.city,
    State: c.state,
    GST: c.gst,
    Status: c.isActive ? "Active" : "Inactive",
    "Added On": formatDate(c.createdAt),
  }));
}

function getPatternsData() {
  return getPatterns().map((p) => ({
    "Pattern #": p.patternNumber,
    Name: p.patternName,
    Category: p.categoryName,
    Subcategory: p.subcategory,
    Size: p.patternSize,
    "Weight/Piece (g)": p.weightPerPiece,
    "Tree Size": p.treeSize,
    "Total Stones/Piece": p.totalStonesPerPiece,
    Status: p.isActive ? "Active" : "Inactive",
  }));
}

function getKarigarsData() {
  return getKarigars().map((k) => ({
    "Karigar ID": k.karigarId,
    Name: k.name,
    Mobile: k.mobile,
    WhatsApp: k.whatsapp,
    Type: k.type,
    Status: k.isActive ? "Active" : "Inactive",
    "Added On": formatDate(k.createdAt),
  }));
}

function getProductionData() {
  const productionStatuses = [
    "assigned",
    "wax_in_progress",
    "wax_completed",
    "stone_setting_pending",
    "stone_setting_in_progress",
    "stone_setting_completed",
    "production_completed",
  ];
  return getOrders()
    .filter((o) => productionStatuses.includes(o.status))
    .map((o) => {
      const waxK = o.karigarAssignments
        .filter((a) => a.type === "wax")
        .slice(-1)[0];
      const stoneK = o.karigarAssignments
        .filter((a) => a.type === "stone")
        .slice(-1)[0];
      return {
        "Order #": o.orderNumber,
        Customer: o.customerName,
        "Order Date": formatDate(o.orderDate),
        Status: ORDER_STATUS_LABELS[o.status] || o.status,
        "Wax Karigar": waxK?.karigarName || "-",
        "Stone Karigar": stoneK?.karigarName || "-",
        "Total Trees": o.items.reduce(
          (s, i) => s + i.calculation.waxTreesRequired,
          0,
        ),
        "Total Pieces": o.items.reduce(
          (s, i) => s + i.calculation.finishedPieces,
          0,
        ),
      };
    });
}

function getData(type: ExportType) {
  switch (type) {
    case "orders":
      return getOrdersData();
    case "customers":
      return getCustomersData();
    case "patterns":
      return getPatternsData();
    case "karigars":
      return getKarigarsData();
    case "production":
      return getProductionData();
  }
}

const TYPE_LABELS: Record<ExportType, string> = {
  orders: "All Orders",
  customers: "Customers",
  patterns: "Patterns Master",
  karigars: "Karigars",
  production: "Production Tracking",
};

export default function ExportPage() {
  const [exportType, setExportType] = useState<ExportType>("orders");
  const data = useMemo(() => getData(exportType), [exportType]);

  const handleExcelExport = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, TYPE_LABELS[exportType]);
    XLSX.writeFile(
      wb,
      `${exportType}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast.success("Excel file downloaded");
  };

  const handlePDFExport = () => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(
      `${TYPE_LABELS[exportType]} — ${new Date().toLocaleDateString("en-IN")}`,
      14,
      14,
    );
    const cols = Object.keys(data[0]);
    const rows = data.map((row) =>
      cols.map((c) => String((row as Record<string, unknown>)[c] ?? "")),
    );
    autoTable(doc, {
      head: [cols],
      body: rows,
      startY: 22,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [30, 58, 95],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [244, 246, 248] },
    });
    doc.save(`${exportType}-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF downloaded");
  };

  const handlePrint = () => {
    if (data.length === 0) {
      toast.error("No data to print");
      return;
    }
    const cols = Object.keys(data[0]);
    const html = `<html><head><title>${TYPE_LABELS[exportType]}</title>
      <style>body{font-family:Arial,sans-serif;font-size:11px}h2{color:#1E3A5F;margin-bottom:8px}table{border-collapse:collapse;width:100%}th{background:#1E3A5F;color:white;padding:6px 8px;text-align:left;font-size:10px}td{padding:5px 8px;border-bottom:1px solid #e5e7eb}tr:nth-child(even){background:#f4f6f8}</style></head>
      <body><h2>${TYPE_LABELS[exportType]}</h2><p style="color:#6b7280;font-size:10px">Exported on ${new Date().toLocaleString("en-IN")}</p>
      <table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
      <tbody>${data.map((row) => `<tr>${cols.map((c) => `<td>${(row as Record<string, unknown>)[c] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageToolbar
        breadcrumbs={[{ label: "Export Data" }]}
        title="Export Data"
        subtitle="Export records to Excel, PDF or print"
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleExcelExport}
            >
              <FileSpreadsheet size={12} className="mr-1 text-green-600" />{" "}
              Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handlePDFExport}
            >
              <FileText size={12} className="mr-1 text-red-500" /> PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handlePrint}
            >
              <Printer size={12} className="mr-1" /> Print
            </Button>
          </div>
        }
      />

      {/* Toolbar */}
      <div className="erp-toolbar border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Export Type:</span>
          <Select
            value={exportType}
            onValueChange={(v) => setExportType(v as ExportType)}
          >
            <SelectTrigger className="h-7 w-48 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {data.length} records
          </Badge>
          <Share2 size={12} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {TYPE_LABELS[exportType]}
          </span>
        </div>
      </div>

      {/* Preview */}
      <div className="erp-content">
        <div className="card-l1 mx-4 mt-3">
          <div className="px-4 py-2 border-b border-border bg-muted/30">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Preview — {TYPE_LABELS[exportType]}
            </span>
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)]">
            <table className="erp-table min-w-max">
              <thead>
                <tr>
                  {data.length > 0 &&
                    Object.keys(data[0]).map((col) => <th key={col}>{col}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No data available.
                    </td>
                  </tr>
                ) : (
                  data.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((v, j) => (
                        <td key={j}>{String(v ?? "")}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
