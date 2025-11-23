interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string
    readonly VITE_API_WITH_CREDENTIALS?: string
    readonly NODE_ENV?: string
    readonly MODE?: string
    readonly PROD?: boolean
    readonly DEV?: boolean
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
