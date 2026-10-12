/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_PROXY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
