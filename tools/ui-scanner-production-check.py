"""Smoke-test real OCR through production UI, without source imports or external requests."""
import base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
photo='data:image/jpeg;base64,'+base64.b64encode((root/'tests/fixtures/scanner/freeiron-dry-pack.jpg').read_bytes()).decode()
with sync_playwright() as p:
 browser=p.chromium.launch();page=browser.new_page(viewport={'width':390,'height':844});page.set_default_timeout(30000)
 page.add_init_script("""navigator.mediaDevices.getUserMedia=async()=>{const c=document.createElement('canvas');c.width=800;c.height=1050;const ctx=c.getContext('2d'),image=new Image();image.src="""+json.dumps(photo)+""";await image.decode();const sx=image.width*.075,sy=image.height*.12,sw=image.width*.65,scale=720/sw;ctx.fillStyle='white';ctx.fillRect(0,0,800,1050);ctx.drawImage(image,40-sx*scale,(1050-720/3.4)/2-sy*scale,image.width*scale,image.height*scale);const stream=c.captureStream(15);window.cameraTracks=stream.getTracks();return stream}""")
 requests=[];errors=[];page.on('request',lambda r:requests.append(r.url));page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:5187')
 page.evaluate("""()=>{localStorage.clear();localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}));localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'scan',name:'Scanner Collection',entries:[]} ]));localStorage.setItem('wasteland-workshop-active-blueprint-collection','scan')}""");page.reload()
 page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Blueprint Collections',exact=True).click();page.get_by_role('button',name='Scan & Acquire').click();page.get_by_text('Scan Diagnostics',exact=True).click();page.get_by_role('checkbox',name='Collect diagnostics for the next capture').check();page.get_by_role('button',name='Capture Photo').click()
 expect(page.get_by_role('heading',name='Blueprint identified: Freeiron Dry Pack')).to_be_visible()
 with page.expect_download() as exported:page.get_by_role('button',name='Download Scan Diagnostics').click()
 report=json.loads(Path(exported.value.path()).read_text(encoding='utf-8'));assert report['passes'][0]['engine']=='PaddleOCR PP-OCRv5 mobile'
 page.get_by_role('button',name='Acquire Freeiron Dry Pack',exact=True).click();expect(page.get_by_text('Acquired and saved in Scanner Collection.')).to_be_visible();assert page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0].entries[0].blueprintId")==5234
 page.get_by_role('button',name='Exit Scanner').click();expect(page.get_by_role('heading',name='Scan Session Complete')).to_be_visible();assert page.evaluate("window.cameraTracks.every(t=>t.readyState==='ended')")
 assert not errors,errors;assert all(url.startswith(('http://127.0.0.1:5187','data:','blob:')) for url in requests),requests;assert not any('/src/' in url for url in requests),requests
 browser.close()
print('Production scanner passed: PaddleOCR, local assets only, diagnostic export, canonical acquisition/persistence and camera cleanup.')
