import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

// To view the dev server from another machine (for example over a tailnet),
// list the hostnames it may be reached as, comma-separated:
//   DEV_ALLOWED_HOSTS=my-vm.tailnet.ts.net pnpm dev
// This binds the server to all interfaces and allows those Host headers.
// APP_URL/CONTENT_URL in .dev.vars must use the same host or the app's
// host policy and auth origin checks will reject requests.
const devAllowedHosts = process.env.DEV_ALLOWED_HOSTS?.split(',')
  .map((host) => host.trim())
  .filter(Boolean)

const config = defineConfig({
  ...(devAllowedHosts?.length
    ? { server: { host: true, allowedHosts: devAllowedHosts } }
    : {}),
  resolve: {
    tsconfigPaths: true,
    dedupe: ['react', 'react-dom'],
  },
  plugins: [
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart({ server: { entry: './src/server.ts' } }),
    viteReact(),
  ],
})

export default config
