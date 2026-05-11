export interface GlobalAppSettings {
  brandName: string;
  themeMode: 'light' | 'dark' | 'system';
  accentColor: string;
  allowAnonymousScans: boolean;
  updatedAt: string;
}

export const DEFAULT_GLOBAL_SETTINGS: Omit<GlobalAppSettings, 'updatedAt'> = {
  brandName: 'Nimbus Security Platform',
  themeMode: 'system',
  accentColor: '#3fc2ff',
  allowAnonymousScans: true,
};
