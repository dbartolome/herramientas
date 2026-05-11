import { ScanType } from '../scans/scan-type.enum';

export interface ToolConfig {
  type: ScanType;
  enabled: boolean;
  displayName: string;
  description: string;
  defaultParams: Record<string, unknown>;
  timeoutMs: number;
  maxAssetLength: number;
  updatedAt: string;
}

export const DEFAULT_TOOL_CONFIGS: Record<ScanType, Omit<ToolConfig, 'updatedAt'>> = {
  [ScanType.EMAIL_SECURITY]: {
    type: ScanType.EMAIL_SECURITY,
    enabled: true,
    displayName: 'Seguridad del correo electrónico',
    description: 'SPF, DKIM, DMARC, MX, MTA-STS y TLS-RPT.',
    defaultParams: {},
    timeoutMs: 90000,
    maxAssetLength: 255,
  },
  [ScanType.EMAIL_BREACH]: {
    type: ScanType.EMAIL_BREACH,
    enabled: true,
    displayName: 'Vulneración de correo',
    description: 'Consulta de exposición en brechas (HIBP).',
    defaultParams: {},
    timeoutMs: 90000,
    maxAssetLength: 255,
  },
  [ScanType.SPEED_TEST]: {
    type: ScanType.SPEED_TEST,
    enabled: true,
    displayName: 'Test de velocidad',
    description: 'Auditoría con PageSpeed Insights.',
    defaultParams: { strategy: 'mobile' },
    timeoutMs: 120000,
    maxAssetLength: 255,
  },
  [ScanType.GDPR_WEB]: {
    type: ScanType.GDPR_WEB,
    enabled: true,
    displayName: 'Estado RGPD web',
    description: 'Análisis técnico de consentimiento y cookies.',
    defaultParams: {},
    timeoutMs: 120000,
    maxAssetLength: 255,
  },
  [ScanType.DOMAIN_SECURITY]: {
    type: ScanType.DOMAIN_SECURITY,
    enabled: true,
    displayName: 'Seguridad del dominio',
    description: 'Revisión DNS de postura básica de seguridad.',
    defaultParams: {},
    timeoutMs: 90000,
    maxAssetLength: 255,
  },
  [ScanType.WEB_SECURITY]: {
    type: ScanType.WEB_SECURITY,
    enabled: true,
    displayName: 'Seguridad de tu página web',
    description: 'Escaneo de superficie y cabeceras de seguridad.',
    defaultParams: {},
    timeoutMs: 120000,
    maxAssetLength: 255,
  },
};
