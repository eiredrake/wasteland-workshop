"""Scanner cleanup: hidden diagnostics, preference persistence, real live OCR and mobile layout."""
import base64,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=root/'tests/visual/actual';out.mkdir(exist_ok=True,parents=True)
base_url=os.environ.get('SCANNER_TEST_URL','http://127.0.0.1:5186').rstrip('/')
photo='data:image/jpeg;base64,'+base64.b64encode((root/'tests/fixtures/scanner/freeiron-dry-pack.jpg').read_bytes()).decode()
with sync_playwright() as p:
 browser=p.chromium.launch()
 for label,width,height in [('desktop',1280,900),('mobile',390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height},has_touch=label=='mobile');page.set_default_timeout(60000)
  page.add_init_script("""navigator.mediaDevices.getUserMedia=async()=>{const c=document.createElement('canvas');c.width=800;c.height=1050;const ctx=c.getContext('2d'),image=new Image();image.src="""+json.dumps(photo)+""";await image.decode();const sx=image.width*.075,sy=image.height*.12,sw=image.width*.65,scale=720/sw;ctx.fillStyle='white';ctx.fillRect(0,0,800,1050);ctx.drawImage(image,40-sx*scale,(1050-720/3.4)/2-sy*scale,image.width*scale,image.height*scale);const stream=c.captureStream(15);window.cameraTracks=stream.getTracks();return stream}""")
  page.goto(base_url);page.evaluate("""()=>{localStorage.clear();localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}));localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'scan',name:'Scanner Collection',entries:[]} ]));localStorage.setItem('wasteland-workshop-active-blueprint-collection','scan')}""");page.reload()
  page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Blueprint Collections',exact=True).click();page.get_by_role('button',name='Scan & Acquire').click()
  expect(page.get_by_role('button',name='Auto Capture: On',exact=True)).to_be_visible()
  # No manual shutter click: two preview samples trigger a still and full OCR.
  expect(page.get_by_role('heading',name='Blueprint identified: Freeiron Dry Pack')).to_be_visible(timeout=60000)
  assert page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0].entries.length")==0
  expect(page.locator('.scanner-counts')).to_contain_text('1 scanned')
  page.locator('.scanner-panel').screenshot(path=str(out/f'{label}-scanner-auto-result.png'))
  page.get_by_role('button',name='Acquire Freeiron Dry Pack',exact=True).click();expect(page.get_by_text('Acquired and saved in Scanner Collection.',exact=True)).to_be_visible()
  page.get_by_role('button',name='Scan Next Blueprint',exact=True).click()
  expect(page.get_by_text('Already Acquired',exact=True)).to_be_visible(timeout=60000);expect(page.locator('.scanner-counts')).to_contain_text('2 scanned')
  assert page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0].entries.length")==1
  page.get_by_role('button',name='Exit Scanner',exact=True).click();assert page.evaluate("window.cameraTracks.every(t=>t.readyState==='ended')")
  page.close()
 browser.close()
print('Automatic capture passed on desktop/mobile: no shutter click, stable exact matching, explicit acquisition, one capture per review, repeated owned blueprint, next scan and camera cleanup.')
