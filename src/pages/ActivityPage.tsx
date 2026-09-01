import { useState, useMemo } from "react";
import { getActivityLogs } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { PageToolbar } from "@/components/layouts/AppLayout";
import { SearchInput } from "@/components/common/SearchInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { ActivityLog } from "@/types/erp";

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-100 text-green-700",
  updated: "bg-blue-100 text-blue-700",
  deleted: "bg-red-100 text-red-700",
  login: "bg-purple-100 text-purple-700",
  export: "bg-amber-100 text-amber-700",
  backup: "bg-teal-100 text-teal-700",
  default: "bg-muted text-muted-foreground",
};

function getActionColor(action: string) {
  return ACTION_COLORS[action] || ACTION_COLORS.default;
}

export default function ActivityPage() {
  const [logs] = useState<ActivityLog[]>(() => getActivityLogs());
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const entities = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entityType))).sort(),
    [logs],
  );
  const actions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))).sort(),
    [logs],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter((l) => {
      const matchSearch =
        !q ||
        l.description.toLowerCase().includes(q) ||
        l.userId.toLowerCase().includes(q) ||
        l.entityType.toLowerCase().includes(q);
      const matchEntity =
        entityFilter === "all" || l.entityType === entityFilter;
      const matchAction = actionFilter === "all" || l.action === actionFilter;
      return matchSearch && matchEntity && matchAction;
    });
  }, [logs, search, entityFilter, actionFilter]);

  return (
    <div className="flex flex-col h-full">
      <PageToolbar
        breadcrumbs={[{ label: "Activity Log" }]}
        title="Activity Log"
        subtitle={`${logs.length} total entries`}
      />

      {/* Toolbar */}
      <div className="erp-toolbar border-b border-border bg-background">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search descriptions…"
          className="h-7 w-56 text-xs"
        />
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="h-7 w-36 text-xs">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {entities.map((e) => (
              <SelectItem key={e} value={e} className="capitalize">
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a} className="capitalize">
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} entries
        </span>
      </div>

      {/* Table */}
      <div className="erp-content">
        <div className="overflow-x-auto h-full">
          <table className="erp-table">
            <thead>
              <tr>
                {["Timestamp", "User", "Entity", "Action", "Description"].map(
                  (h) => (
                    <th key={h}>{h}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    {search || entityFilter !== "all" || actionFilter !== "all"
                      ? "No entries match your filter."
                      : "No activity logged yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="whitespace-nowrap text-xs">{log.userId}</td>
                    <td className="whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className="text-[10px] capitalize"
                      >
                        {log.entityType}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium capitalize ${getActionColor(log.action)}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="text-xs">{log.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
