import React from "react";
import { useNavigate } from "react-router-dom";
import { useTabs } from "@/contexts/TabContext";

export function TabContent() {
  const { tabs, activeTabId } = useTabs();
  const navigate = useNavigate();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Navigate to the active tab's path
  React.useEffect(() => {
    if (activeTab && activeTab.path !== window.location.pathname) {
      navigate(activeTab.path);
    }
  }, [activeTab, navigate]);

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">No tabs open</p>
          <p className="text-xs mt-1">Click the + button to open a new tab</p>
        </div>
      </div>
    );
  }

  return null; // Content is rendered by the router
}
