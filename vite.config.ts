import {ocrAssets} from './tools/ocr-assets.js'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const testVersion=process.env.VITE_TEST_VERSION??'0.0.0'
export default defineConfig({
 plugins:[react(),ocrAssets(),{name:'workshop-version',generateBundle(){this.emitFile({type:'asset',fileName:'version.json',source:JSON.stringify({version,testVersion})})}}],
 define:{__APP_VERSION__:JSON.stringify(version),__TEST_VERSION__:JSON.stringify(testVersion)},
})
