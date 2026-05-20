import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            // ORDER IS IMPORTANT!!!!!!
            {
                find: '@/ROUTES',
                replacement: path.resolve(__dirname, '../back/src/routes/_endpoints'),
            },
            {
                find: '@/MODELS',
                replacement: path.resolve(__dirname, '../back/src/models'),
            },
            // generic alias must be last to avoid it replacing the '@' in above aliases
            {
                find: '@',
                replacement: path.resolve(__dirname, 'src'),
            },
        ],
    },
})
