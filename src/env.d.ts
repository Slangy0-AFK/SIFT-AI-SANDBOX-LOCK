interface ImportMetaEnv {
  readonly [key: `VITE_${string}`]: string | undefined;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface BrowserNetworkInformation {
  readonly effectiveType?: string;
  readonly downlink?: number;
  readonly rtt?: number;
  readonly saveData?: boolean;
}

interface BrowserBatteryInfo {
  readonly level: number;
  readonly charging: boolean;
}

interface Navigator {
  readonly connection?: BrowserNetworkInformation;
  readonly deviceMemory?: number;
  getBattery?: () => Promise<BrowserBatteryInfo>;
}

interface Window {
  readonly cdc_adoQpoasnfa76pfcZLmcfl_Array?: unknown;
  readonly __MONICA_PLUGIN__?: unknown;
  readonly __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown;
  readonly __REDUX_DEVTOOLS_EXTENSION__?: unknown;
  readonly __VUE_DEVTOOLS_GLOBAL_HOOK__?: unknown;
  readonly webkit?: { readonly messageHandlers?: unknown };
  readonly AndroidBridge?: unknown;
}
