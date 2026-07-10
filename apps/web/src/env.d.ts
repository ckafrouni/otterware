import '@tanstack/react-start'

declare global {
  interface OtterwareEnv {
    APP_URL: string
    CONTENT_URL: string
    ADMIN_EMAIL: string
    BETTER_AUTH_SECRET: string
    CONTENT_SIGNING_KEY: string
    GOOGLE_CLIENT_ID: string
    GOOGLE_CLIENT_SECRET: string
    DB: D1Database
    ARTIFACTS: R2Bucket
    ASSETS: Fetcher
  }

  interface Env extends OtterwareEnv {}

  namespace Cloudflare {
    interface Env extends OtterwareEnv {}
  }
}
