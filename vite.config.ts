import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import dotenv from "dotenv";

const env = dotenv.config();

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.CLIENT_ID": JSON.stringify(
      env.parsed?.CLIENT_ID || process.env.CLIENT_ID
    ),
  },
})
