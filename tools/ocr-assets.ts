import {readFileSync,readdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import type {Plugin} from 'vite'
export function ocrAssets():Plugin{
 const directory='ocr/tesseract-7.0.0/'
 const assets=new Map<string,Buffer>()
 const add=(name:string,path:string)=>assets.set(directory+name,readFileSync(new URL('../'+path,import.meta.url)))
 // Close failed initialization workers: Tesseract v7 otherwise leaves language/init rejects pending.
 const guard="/* Wasteland Workshop modification: close workers on rejected initialization to release resources. */\nconst originalPost=self.postMessage.bind(self);self.postMessage=(message,...rest)=>{originalPost(message,...rest);if(message.status==='reject'&&['load','loadLanguage','initialize'].includes(message.action))setTimeout(()=>self.close(),0)};\n"
 assets.set(directory+'worker.min.js',Buffer.concat([Buffer.from(guard),readFileSync(new URL('../node_modules/tesseract.js/dist/worker.min.js',import.meta.url))]))
 for(const name of readdirSync(new URL('../node_modules/tesseract.js-core/',import.meta.url))){
  // LSTM-only OEM, scalar/SIMD/relaxed-SIMD embedded WASM variants.
  if(name.endsWith('-lstm.wasm.js'))add(name,'node_modules/tesseract.js-core/'+name)
 }
 add('eng.traineddata.gz','node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz')
 add('TESSERACT-LICENSE.txt','node_modules/tesseract.js/LICENSE.md')
 add('CORE-LICENSE.txt','node_modules/tesseract.js-core/LICENSE')
 assets.set(directory+'ENGLISH-DATA-NOTICE.txt',Buffer.from('English data: @tesseract.js-data/eng 1.0.0, 4.0.0_best_int/eng.traineddata.gz. Package declares MIT; traineddata derives from Tesseract tessdata (Apache-2.0). Sources: https://github.com/naptha/tessdata and https://github.com/tesseract-ocr/tessdata_best. See CORE-LICENSE.txt for Apache-2.0 terms.'))
 assets.set(directory+'manifest.json',Buffer.from(JSON.stringify({provider:'tesseract',version:'7.0.0',assets:[...assets].map(([path,data])=>({path,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')}))},null,2)))
 return {name:'local-ocr-assets',
 configureServer(server){server.middlewares.use((req,res,next)=>{const path=decodeURI((req.url??'').split('?')[0]).slice(1);const data=assets.get(path);if(!data)return next();res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.json')?'application/json':'application/octet-stream');res.end(data)})},
 generateBundle(){
  for(const [fileName,source] of assets)this.emitFile({type:'asset',fileName,source})
 }
 }
}
