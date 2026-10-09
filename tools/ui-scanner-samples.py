"""Run actual local browser OCR on explicitly provided reference photos; no upload."""
import base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch();page=browser.new_page();page.goto('http://127.0.0.1:5186')
 requests=[];page.on('request',lambda r:requests.append(r.url))
 results=[]
 for path,expected in [(root/'tests/fixtures/scanner/freeiron-dry-pack.jpg','Freeiron Dry Pack'),(root/'tests/fixtures/scanner/hooch.jpg','Hooch')]:
  photo='data:image/jpeg;base64,'+base64.b64encode(Path(path).read_bytes()).decode()
  for variant,angle,brightness in [('original',0,1),('rotation-5deg',5,1),('dim',0,.4),('rotation-minus-5deg',-5,1),('name-only',0,1)]:
   result=page.evaluate("""async ({photo,angle,brightness,variant})=>{
   const {createScanRecognizer}=await import('/src/features/scanner/ScanRecognition.ts');const {masterBlueprints}=await import('/src/features/blueprints/blueprints.ts');
   const image=await createImageBitmap(await(await fetch(photo)).blob());const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=Math.round(1600/3.4);const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(angle*Math.PI/180);ctx.filter='brightness('+brightness+')';const sy=image.height*(image.width===2113?.12:.13);const sw=image.width*.65;if(variant==='name-only'){const sourceWidth=image.width*.5,sourceHeight=image.height*.018,targetHeight=sourceHeight*canvas.width/sourceWidth;ctx.drawImage(image,image.width*.275,image.height*(image.width===2113?.137:.149),sourceWidth,sourceHeight,-canvas.width/2,-targetHeight/2,canvas.width,targetHeight)}else ctx.drawImage(image,image.width*.075,sy,sw,sw/3.4,-canvas.width/2,-canvas.height/2,canvas.width,canvas.height);image.close();
   window.sampleRecognizer??=createScanRecognizer();const started=performance.now();const debug=variant==='name-only'?canvas.toDataURL('image/png'):undefined;const match=await window.sampleRecognizer.recognize(canvas,masterBlueprints);canvas.width=canvas.height=0;
   return {debug,readText:match.readText,confidence:match.confidence,candidates:match.candidates.map(c=>({id:c.blueprint.id,name:c.blueprint.name,score:c.score})),milliseconds:Math.round(performance.now()-started)};
  }""",{'photo':photo,'angle':angle,'brightness':brightness,'variant':variant})
   if variant=='name-only': (root/'tests/visual/actual'/('name-only-'+expected+'.png')).write_bytes(base64.b64decode(result.pop('debug').split(',')[1]))
   else: result.pop('debug',None)
   result['variant']=variant;result['expected']=expected;results.append(result);print(json.dumps(result))
 assert all(result['confidence']!='none' and result['candidates'][0]['name']==result['expected'] for result in results),results
 assert all(result['confidence']=='high' for result in results if result['variant']!='name-only'),results
 assert all(url.startswith(('http://127.0.0.1:5186','data:','blob:')) for url in requests),requests
 page.evaluate('window.sampleRecognizer.close()');browser.close()
 (root/'tests/visual/actual/scanner-samples.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
