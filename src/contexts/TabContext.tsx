import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface Tab {
  id: string;
  title: string;
  path: string;
  isActive: boolean;
}

interface TabContextType {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (title: string, path: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export function TabProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const addTab = useCallback((title: string, path: string) => {
    setTabs((prev) => {
      // Check if tab with same path already exists
      const existingIndex = prev.findIndex((t) => t.path === path);
      if (existingIndex >= 0) {
        // Activate existing tab
        const id = prev[existingIndex].id;
        setActiveTabId(id);
        return prev.map((t, i) => ({
          ...t,
          isActive: i === existingIndex,
        }));
      }

      // Create new tab
      const id = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newTab: Tab = {
        id,
        title,
        path,
        isActive: true,
      };

      const deactivated = prev.map((t) => ({ ...t, isActive: false }));
      setActiveTabId(id);
      return [...deactivated, newTab];
    });
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== tabId);
      
      if (activeTabId === tabId && newTabs.length > 0) {
        const lastTab = newTabs[newTabs.length - 1];
        setActiveTabId(lastTab.id);
        return newTabs.map((t) => ({
          ...t,
          isActive: t.id === lastTab.id,
        }));
      }
      
      if (newTabs.length === 0) {
        setActiveTabId(null);
      }
      
      return newTabs;
    });
  }, [activeTabId]);

  const setActiveTab = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((t) => ({
        ...t,
        isActive: t.id === tabId,
      }))
    );
    setActiveTabId(tabId);
  }, []);

  return (
    <TabContext.Provider
      value={{
        tabs,
        activeTabId,
        addTab,
        closeTab,
        setActiveTab,
      }}
    >
      {children}
    </TabContext.Provider>
  );
}

export function useTabs() {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error("useTabs must be used within a TabProvider");
  }
  return context;
}
