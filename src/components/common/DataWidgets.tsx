import React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  iconColor?: string;
  iconBg?: string;
  onClick?: () => void;
  clickable?: boolean;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  onClick,
  clickable = false,
}: KPICardProps) {
  return (
    <div 
      className={cn(
        "bg-card border border-border rounded-lg p-4 flex items-start gap-3",
        clickable && "cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
      )}
      onClick={clickable ? onClick : undefined}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
          iconBg,
        )}
      >
        <Icon size={18} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium truncate">
          {title}
        </p>
        <p className="text-xl font-semibold text-foreground mt-0.5 leading-tight">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

interface DataTableProps<T> {
  columns: {
    key: string;
    label: string;
    className?: string;
    render?: (row: T) => React.ReactNode;
  }[];
  data: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  onRowClick,
  emptyMessage = "No data found.",
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("w-full max-w-full overflow-x-auto bg-card", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap",
                  col.className,
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-border last:border-0 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-muted/30",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-2.5 whitespace-nowrap",
                      col.className,
                    )}
                  >
                    {col.render
                      ? col.render(row)
                      : ((row as Record<string, unknown>)[
                          col.key
                        ] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function SectionCard({
  title,
  children,
  actions,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg overflow-hidden",
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          {title && (
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          )}
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
