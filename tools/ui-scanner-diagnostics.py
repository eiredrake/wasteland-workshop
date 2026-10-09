"""Replay explicitly supplied local diagnostic crops against the real local OCR engine."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('files',nargs='+');parser.add_argument('--expect');args=parser.parse_args()
with sync_playwright() as p:
 browser=p.chromium.launch();page=browser.new_page();page.goto('http://127.0.0.1:5186')
 for filename in args.files:
  diagnostic=json.loads(Path(filename).read_text(encoding='utf-8'))
  result=page.evaluate("""async data=>{const {createScanRecognizer}=await import('/src/features/scanner/ScanOcr.ts');const {masterBlueprints}=await import('/src/features/blueprints/blueprints.ts');const image=await createImageBitmap(await(await fetch(data)).blob());const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').drawImage(image,0,0);image.close();const reader=createScanRecognizer(),passes=[];try{const result=await reader.recognize(canvas,masterBlueprints,pass=>passes.push({variant:pass.variant,text:pass.text,milliseconds:pass.milliseconds}));return {confidence:result.confidence,candidates:result.candidates.map(c=>({id:c.blueprint.id,name:c.blueprint.name})),passes}}finally{await reader.close();canvas.width=canvas.height=0}}""",diagnostic['capture']['image'])
  print(Path(filename).name,json.dumps(result))
  if args.expect:assert result['confidence']!='none' and any(c['name']==args.expect for c in result['candidates']),result
 browser.close()
