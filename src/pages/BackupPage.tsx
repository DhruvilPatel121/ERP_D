import { useState } from "react";
import { toast } from "sonner";
import {
  Download,
  Upload,
  Shield,
  AlertTriangle,
  Database,
  CheckCircle2,
} from "lucide-react";
import { exportBackup, importBackup, loadDemoData } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { PageToolbar } from "@/components/layouts/AppLayout";
import { Button } from "@/components/ui/button";
import type { DatabaseSnapshot } from "@/types/erp";

export default function BackupPage() {
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<DatabaseSnapshot | null>(
    null,
  );
  const [lastBackup] = useState<string | null>(() => {
    try {
      return localStorage.getItem("erp_last_backup_time");
    } catch {
      return null;
    }
  });

  const handleExport = () => {
    try {
      const snapshot = exportBackup();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `silver-erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      localStorage.setItem("erp_last_backup_time", new Date().toISOString());
      toast.success("Backup downloaded successfully");
    } catch {
      toast.error("Failed to create backup.");
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const snapshot = JSON.parse(
          ev.target?.result as string,
        ) as DatabaseSnapshot;
        if (!snapshot.version || !snapshot.exportedAt)
          throw new Error("Invalid format");
        setPendingRestore(snapshot);
        setConfirmRestore(true);
      } catch {
        toast.error(
          "Invalid backup file. Please select a valid Silver ERP backup.",
        );
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleRestoreConfirm = () => {
    if (!pendingRestore) return;
    try {
      importBackup(pendingRestore);
      toast.success("Data restored! Reloading…");
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      toast.error("Failed to restore backup.");
    }
    setPendingRestore(null);
    setConfirmRestore(false);
  };

  const handleLoadDemo = () => {
    loadDemoData();
    toast.success("Demo data loaded!");
    setConfirmDemo(false);
  };

  // Inline confirm banner
  function ConfirmBanner({
    message,
    onConfirm,
    onCancel,
    confirmLabel,
    confirmClass,
  }: {
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel: string;
    confirmClass?: string;
  }) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm">
        <AlertTriangle size={15} className="text-amber-600 shrink-0" />
        <span className="flex-1 text-xs text-amber-800">{message}</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className={`h-7 text-xs ${confirmClass ?? ""}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageToolbar
        breadcrumbs={[{ label: "Backup & Restore" }]}
        title="Backup & Restore"
        subtitle="Manage your local data backup and restoration"
        actions={
          <Button size="sm" onClick={handleExport} className="h-7 text-xs">
            <Download size={12} className="mr-1" /> Backup Now
          </Button>
        }
      />

      <div className="erp-content">
        <div className="max-w-xl mx-auto p-4 flex flex-col gap-4">
          {/* Status */}
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <Shield size={16} className="text-green-600 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-green-800">
                All data stored locally on this device
              </p>
              <p className="text-[11px] text-green-600">
                {lastBackup
                  ? `Last backup: ${formatDateTime(lastBackup)}`
                  : "No backup yet — create one to prevent data loss."}
              </p>
            </div>
          </div>

          {/* Inline confirm banners */}
          {confirmRestore && (
            <ConfirmBanner
              message={
                <>
                  This will <strong>overwrite ALL current data</strong> with
                  data from the backup
                  {pendingRestore
                    ? ` (exported ${formatDateTime(pendingRestore.exportedAt)})`
                    : ""}
                  . This cannot be undone.
                </>
              }
              onConfirm={handleRestoreConfirm}
              onCancel={() => {
                setConfirmRestore(false);
                setPendingRestore(null);
              }}
              confirmLabel="Restore Data"
              confirmClass="bg-amber-600 hover:bg-amber-700 text-white"
            />
          )}
          {confirmDemo && (
            <ConfirmBanner
              message="This will add sample data to your existing records. Continue?"
              onConfirm={handleLoadDemo}
              onCancel={() => setConfirmDemo(false)}
              confirmLabel="Load Demo"
            />
          )}

          {/* Export */}
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
              <Download size={13} className="text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Create Backup
              </span>
            </div>
            <div className="px-4 py-4">
              <p className="text-xs text-muted-foreground mb-3">
                Downloads a complete JSON backup of all customers, patterns,
                orders, karigars, stones, and settings. Save this file in a safe
                location such as Google Drive or a USB drive.
              </p>
              <Button onClick={handleExport} className="h-8 text-xs">
                <Download size={12} className="mr-1.5" /> Download Backup File
              </Button>
            </div>
          </div>

          {/* Import */}
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
              <Upload size={13} className="text-amber-600" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Restore from Backup
              </span>
            </div>
            <div className="px-4 py-4">
              <p className="text-xs text-muted-foreground mb-3">
                Restores all data from a previously exported Silver ERP backup
                file.
                <strong className="text-amber-700">
                  {" "}
                  This will overwrite all existing data.
                </strong>
              </p>
              <label>
                <Button
                  variant="outline"
                  className="h-8 text-xs cursor-pointer"
                  asChild
                >
                  <span>
                    <Upload size={12} className="mr-1.5" /> Choose Backup File
                    (.json)
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Demo */}
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
              <Database size={13} className="text-purple-600" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Demo Data
              </span>
            </div>
            <div className="px-4 py-4">
              <p className="text-xs text-muted-foreground mb-3">
                Populates the system with sample customers, patterns, stones,
                and karigars for exploration. Existing data will not be deleted.
              </p>
              <Button
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setConfirmDemo(true)}
              >
                <Database size={12} className="mr-1.5" /> Load Demo Data
              </Button>
            </div>
          </div>

          {/* Tips */}
          <div className="card-l1">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Backup Best Practices
              </span>
            </div>
            <div className="px-4 py-3 flex flex-col gap-1.5">
              {[
                "Create a backup before major changes or at end of each work day",
                "Store backups in multiple locations (Google Drive, USB, email to self)",
                "Test restore on a separate device periodically",
                "Backup file contains all your data in readable JSON format",
              ].map((tip, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <CheckCircle2
                    size={11}
                    className="text-green-500 shrink-0 mt-0.5"
                  />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
