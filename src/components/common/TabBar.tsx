import React from "react";
import { X, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTabs } from "@/contexts/TabContext";
import { cn } from "@/lib/utils";

export function TabBar() {
  const { tabs, activeTabId, closeTab, setActiveTab, addTab } = useTabs();
  const navigate = useNavigate();

  const handleTabClick = (tab: { id: string; path: string }) => {
    setActiveTab(tab.id);
    navigate(tab.path);
  };

  const handleNewTab = () => {
    addTab("Dashboard", "/dashboard");
    navigate("/dashboard");
  };

  return (
    <div className="flex items-center gap-1 bg-muted/30 border-b border-border px-2 pt-2 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "group relative flex items-center gap-2 px-3 py-1.5 rounded-t cursor-pointer transition-all select-none min-w-[140px] max-w-[200px]",
            "border border-transparent",
            tab.isActive
              ? "bg-background border-b-0 border-t border-l border-r border-border shadow-sm"
              : "bg-muted/50 hover:bg-muted/80 border-b border-border"
          )}
          onClick={() => handleTabClick(tab)}
        >
          {/* Tab content */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-medium truncate">{tab.title}</span>
          </div>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "w-4 h-4 flex items-center justify-center rounded",
              "hover:bg-destructive/10 hover:text-destructive",
              tab.isActive && "opacity-100"
            )}
          >
            <X size={12} />
          </button>
        </div>
      ))}

      {/* Add new tab button */}
      <button
        onClick={handleNewTab}
        className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted/80 transition-colors shrink-0"
        title="New Tab"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
