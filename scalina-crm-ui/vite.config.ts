import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
    server: {
        port: 5173,
        strictPort: true, // This prevents the port-hopping behavior
    },
    plugins: [
        react(),
        tailwindcss(),
    ],
})