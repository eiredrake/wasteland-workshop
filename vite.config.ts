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
  }],
  define: { __APP_VERSION__: JSON.stringify(version) },
})
