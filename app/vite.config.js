import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    root: 'src',
    publicDir: 'public',
    server: {
        port: 8000,
        host: true
    },
    resolve: {
        alias: {
            '@': path.resolve(process.cwd(), './src'), // eslint-disable-line
            '@common': path.resolve(process.cwd(), '../common') // eslint-disable-line
        }
    }
});
