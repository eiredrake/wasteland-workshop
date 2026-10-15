import {ocrAssets} from './tools/ocr-assets.js'
import { VitePWA } from 'vite-plugin-pwa'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const testVersion=process.env.VITE_TEST_VERSION??'0.0.0'
export default defineConfig({
 plugins:[react(),ocrAssets(),VitePWA({
  filename:'service-worker.js', registerType:'prompt', injectRegister:false,
  includeAssets:['app-icon-192.png','app-icon-512.png','app-icon-maskable.png','apple-touch-icon.png'],
  manifest:{id:'/',prefer_related_applications:false,related_applications:[{platform:'webapp',url:'/manifest.webmanifest',id:'/'}],name:'Wasteland Workshop',short_name:'Workshop',description:'Plan, craft, and manage your Wasteland Workshop offline.',start_url:'/',scope:'/',display:'standalone',background_color:'#181816',theme_color:'#181816',icons:[
    {src:'/app-icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
    {src:'/app-icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
    {src:'/app-icon-maskable.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]},
  workbox:{globPatterns:['**/*.{html,js,css,png,svg,ico,json,webmanifest,woff,woff2,ttf,gz,wasm,txt}'],globIgnores:['**/*.map','**/*.pdn','wasteland_workshop_hype.png'],
    maximumFileSizeToCacheInBytes:8*1024*1024, cleanupOutdatedCaches:true,clientsClaim:true,
    navigateFallback:'/index.html',navigateFallbackDenylist:[/^\/api(?:\/|$)/,/^\/(?:assets|ocr)(?:\/|$)/,/\.[^/]+$/]}
 }),{name:'workshop-version',generateBundle(){this.emitFile({type:'asset',fileName:'version.json',source:JSON.stringify({version,testVersion})})}}],
 define:{__APP_VERSION__:JSON.stringify(version),__TEST_VERSION__:JSON.stringify(testVersion)},
})
