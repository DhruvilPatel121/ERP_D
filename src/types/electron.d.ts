export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getAppPath: () => Promise<string>;
  openExternal: (url: string) => Promise<{ success: boolean }>;
  copyImageToClipboard: (dataUrl: string) => Promise<{ success: boolean; error?: string }>;
  isElectron?: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
