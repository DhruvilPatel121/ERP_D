import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTabs } from "@/contexts/TabContext";

export function useTabNavigation() {
  const navigate = useNavigate();
  const { addTab, setActiveTab, tabs } = useTabs();

  const openInNewTab = useCallback(
    (title: string, path: string, content: React.ReactNode) => {
      const newTab = {
        title,
        path,
        content,
      };
      addTab(newTab);
    },
    [addTab]
  );

  const navigateToTab = useCallback(
    (path: string) => {
      const existingTab = tabs.find((t) => t.path === path);
      if (existingTab) {
        setActiveTab(existingTab.id);
      } else {
        navigate(path);
      }
    },
    [tabs, setActiveTab, navigate]
  );

  const closeCurrentTab = useCallback(() => {
    const activeTab = tabs.find((t) => t.isActive);
    if (activeTab) {
      // Navigate to previous tab or dashboard
      const otherTabs = tabs.filter((t) => t.id !== activeTab.id);
      if (otherTabs.length > 0) {
        const lastTab = otherTabs[otherTabs.length - 1];
        setActiveTab(lastTab.id);
      } else {
        navigate("/dashboard");
      }
    }
  }, [tabs, setActiveTab, navigate]);

  const markTabDirty = useCallback(
    (tabId: string, isDirty: boolean = true) => {
      const { updateTab } = useTabs();
      updateTab(tabId, { isDirty });
    },
    []
  );

  return {
    openInNewTab,
    navigateToTab,
    closeCurrentTab,
    markTabDirty,
    tabs,
  };
}
