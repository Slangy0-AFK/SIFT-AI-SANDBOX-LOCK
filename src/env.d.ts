interface ImportMetaEnv {
  readonly [key: `VITE_${string}`]: string | undefined;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
