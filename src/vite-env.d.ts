
/// <reference types="vite/client" />

declare module '*.css';

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_DRACONIS_QR_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
