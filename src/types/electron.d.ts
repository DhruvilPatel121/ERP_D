export interface ElectronAPI {
  dbQuery: (sql: string, params?: any[]) => Promise<DbResult>;
  dbRun: (sql: string, params?: any[]) => Promise<DbResult>;
  dbGet: (sql: string, params?: any[]) => Promise<DbResult>;
  getAppVersion: () => Promise<string>;
  getAppPath: () => Promise<string>;
}

export interface DbResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
