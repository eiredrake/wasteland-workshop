"""Real-photo OCR comparison; altered fixtures are labeled simulations, not phone trials."""
import base64,json,tempfile,time
from pathlib import Path
from PIL import Image,ImageEnhance,ImageFilter
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];results=[]
with tempfile.TemporaryDirectory() as folder,sync_playwright() as p:
 original=Image.open(root/'tests/fixtures/scanner/freeiron-dry-pack.jpg')
 variants=[('clear full-page',original),('simulated 7-degree tilt',original.rotate(7,expand=True,fillcolor='white')),('simulated low light',ImageEnhance.Brightness(original).enhance(.55)),('simulated minor blur',original.filter(ImageFilter.GaussianBlur(.8))),('title close-up',original.crop((int(original.width*.06),int(original.height*.12),int(original.width*.75),int(original.height*.17)))),('second real photo Hooch',Image.open(root/'tests/fixtures/scanner/hooch.jpg'))]
 browser=p.chromium.launch();page=browser.new_page();page.set_default_timeout(60000);page.goto('http://127.0.0.1:5186')
 page.evaluate("""async()=>{const {createScanRecognizer}=await import('/src/features/scanner/ScanRecognition.ts');window.photoReader=createScanRecognizer()}""")
 for label,image in variants:
  path=Path(folder)/(str(len(results))+'.jpg');image.save(path)
  data='data:image/jpeg;base64,'+base64.b64encode(path.read_bytes()).decode()
  for mode in ['full photo','manual title crop','camera-style name crop']:
   result=page.evaluate("""async({data,mode})=>{const {decodePhoto,adjustPhoto,fullPhotoCrop,recognizePhoto,titlePhotoCrop}=await import('/src/features/scanner/PhotoImage.ts');const {masterBlueprints}=await import('/src/features/blueprints/blueprints.ts');const blob=await (await fetch(data)).blob(),image=await decodePhoto(new File([blob],'photo.jpg',{type:'image/jpeg'}));const closeup=image.width>image.height;const crop=mode==='manual title crop'&&!closeup?titlePhotoCrop:mode==='camera-style name crop'&&!closeup?{x:.075,y:.12,width:.65,height:(image.width*.65/3.4)/image.height}:fullPhotoCrop;const canvas=adjustPhoto(image,0,crop),started=performance.now(),texts=[];try{const result=mode==='full photo'?await recognizePhoto(canvas,window.photoReader,masterBlueprints,false,p=>texts.push(p.text)):await window.photoReader.recognize(canvas,masterBlueprints,p=>texts.push(p.text));return {milliseconds:Math.round(performance.now()-started),confidence:result.confidence,candidates:result.candidates.map(c=>({id:c.blueprint.id,name:c.blueprint.name,score:c.score})),readText:result.readText,texts}}finally{image.width=image.height=canvas.width=canvas.height=0}}""",{'data':data,'mode':mode})
   result.update({'fixture':label,'method':mode});results.append(result);print(label,mode,result['confidence'],[c['name'] for c in result['candidates']],result['milliseconds'],flush=True)
 page.evaluate('window.photoReader.close()');browser.close()
 path=root/'tests/visual/actual/photo-recognition-comparison.json';path.write_text(json.dumps(results,indent=2),encoding='utf-8')
print('Comparison report:',path)
