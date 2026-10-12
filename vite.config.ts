import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// Serve and emit pinned, same-origin OCR assets. No image or model CDN requests.
const ocrAssets = new Map<string,string>([
 ['TESSERACT-LICENSE.txt',resolve('node_modules/tesseract.js/LICENSE.md')],
 ['CORE-LICENSE.txt',resolve('node_modules/tesseract.js-core/LICENSE')],
 ['worker.min.js',resolve('node_modules/tesseract.js/dist/worker.min.js')],
 ['eng.traineddata.gz',resolve('node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz')],
 ...readdirSync('node_modules/tesseract.js-core').filter(name=>/\.wasm(\.js)?$/.test(name)).map(name=>[name,resolve('node_modules/tesseract.js-core',name)] as [string,string]),
])
const paddleAssets=new Map<string,string>([
 ['worker.js',resolve('node_modules/@paddleocr/paddleocr-js/dist/assets/worker-entry-C9UNuyOJ.js')],
 ['ort-wasm-simd-threaded.jsep.mjs',resolve('node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs')],
 ['ort-wasm-simd-threaded.jsep.wasm',resolve('node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm')],

])
export default defineConfig({
  plugins: [react(), {
    name:'workshop-local-ocr',
    configureServer(server) {
      server.middlewares.use((request,response,next)=>{
        const name=request.url?.split('?')[0]?.replace(/^\/ocr\//,'')
        const path=name&&request.url?.startsWith('/ocr/')?ocrAssets.get(name):undefined
        if(!path)return next()
        response.setHeader('Content-Type',name?.endsWith('.js')?'application/javascript':name?.endsWith('.wasm')?'application/wasm':'application/octet-stream')
        response.end(readFileSync(path))
      })
    },
    generateBundle(){for(const [name,path] of ocrAssets)this.emitFile({type:'asset',fileName:'ocr/'+name,source:readFileSync(path)})},
  }, {
    name:'workshop-paddle-assets',
    configureServer(server){server.middlewares.use((request,response,next)=>{
     const name=request.url?.split('?')[0]?.replace(/^\/ocr-paddle\//,''),path=name&&request.url?.startsWith('/ocr-paddle/')?paddleAssets.get(name):undefined
     if(!path)return next()
     response.setHeader('Content-Type',name?.endsWith('.js')||name?.endsWith('.mjs')?'application/javascript':name?.endsWith('.wasm')?'application/wasm':'text/plain');response.end(readFileSync(path))
    })},
    generateBundle(){for(const [name,path] of paddleAssets)this.emitFile({type:'asset',fileName:'ocr-paddle/'+name,source:readFileSync(path)})},
  }, {
    name: 'workshop-version',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) })
    },
  }, {
    name:'workshop-scanner-offline', enforce:'post',
    generateBundle(_options,bundle) {
      const assets=['index.html',...Object.keys(bundle).filter(name=>name.startsWith('assets/')||name.startsWith('ocr/')),...[...paddleAssets.keys()].map(name=>'ocr-paddle/'+name),'ocr-paddle/PP-OCRv5_mobile_det.tar','ocr-paddle/PP-OCRv5_mobile_rec.tar']
      const cache='workshop-scanner-'+version+'-'+Object.keys(bundle).find(name=>/^assets\/index-.*\.js$/.test(name))?.replace(/[^a-z0-9-]/gi,'')
      this.emitFile({type:'asset',fileName:'scanner-offline.js',source:`const CACHE=${JSON.stringify(cache)},ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);try{for(const path of ASSETS){const url=new URL(path,self.registration.scope);const response=await fetch(url,{cache:'reload'});if(!response.ok)throw new Error('Offline asset unavailable');await cache.put(url,response)}await self.skipWaiting()}catch(error){await caches.delete(CACHE);throw error}})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('workshop-scanner-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url),scope=new URL(self.registration.scope);if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);if(event.request.mode==='navigate'){try{return await fetch(event.request)}catch{return (await cache.match(new URL('index.html',scope)))||Response.error()}}const saved=await cache.match(event.request,{ignoreVary:true});return saved||fetch(event.request)})())});`})
    },
  }],
  define: { __APP_VERSION__: JSON.stringify(version) },
})
