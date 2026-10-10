"""Scanner cleanup: hidden diagnostics, preference persistence, real live OCR and mobile layout."""
import base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=root/'tests/visual/actual';out.mkdir(exist_ok=True,parents=True)
photo='data:image/jpeg;base64,'+base64.b64encode((root/'tests/fixtures/scanner/freeiron-dry-pack.jpg').read_bytes()).decode()
with sync_playwright() as p:
 browser=p.chromium.launch()
 for label,width,height in [('desktop',1280,900),('mobile',390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height},has_touch=label=='mobile');page.set_default_timeout(30000)
  page.add_init_script("""navigator.mediaDevices.getUserMedia=async()=>{const c=document.createElement('canvas');c.width=800;c.height=1050;const ctx=c.getContext('2d'),image=new Image();image.src="""+json.dumps(photo)+""";await image.decode();const sx=image.width*.075,sy=image.height*.12,sw=image.width*.65,scale=720/sw;ctx.fillStyle='white';ctx.fillRect(0,0,800,1050);ctx.drawImage(image,40-sx*scale,(1050-720/3.4)/2-sy*scale,image.width*scale,image.height*scale);const stream=c.captureStream(15);window.cameraTracks=stream.getTracks();return stream}""")
  page.goto('http://127.0.0.1:5186');page.evaluate("""()=>{localStorage.clear();localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}));localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'scan',name:'Scanner Collection',entries:[]} ]));localStorage.setItem('wasteland-workshop-active-blueprint-collection','scan')}""");page.reload()
  def nav(name):page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name=name,exact=True).click()
  nav('Blueprint Collections');page.get_by_role('button',name='Scan & Acquire').click()
  page.get_by_role('button',name='Auto Capture: On',exact=True).click()
  expect(page.get_by_text('Loading OCR Library',exact=True)).to_be_visible()
  spinner=page.locator('.loading-indicator');bounds=spinner.bounding_box();panel=page.locator('.scanner-result').bounding_box();assert abs((bounds['x']+bounds['width']/2)-(panel['x']+panel['width']/2))<1
  assert spinner.evaluate("e=>getComputedStyle(e).textAlign")=='center'
  page.locator('.scanner-panel').screenshot(path=str(out/f'{label}-scanner-loading.png'))
  expect(page.get_by_text('Loading OCR Library',exact=True)).not_to_be_visible(timeout=60000)
  expect(page.locator('.scan-text-highlights polygon').first).to_be_visible(timeout=30000)
  assert page.get_by_text('Scan Diagnostics',exact=True).count()==0
  assert page.get_by_role('button',name='Download Scan Diagnostics').count()==0
  assert page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0].entries.length")==0
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.locator('.scanner-panel').screenshot(path=str(out/f'{label}-scanner-clean.png'))
  page.get_by_text('Where to aim',exact=True).click();expect(page.get_by_alt_text('Real Freeiron Dry Pack blueprint with the Item Name row outlined in yellow')).to_be_visible()
  page.locator('.scanner-aiming-guide').screenshot(path=str(out/f'{label}-scanner-guide.png'))
  page.get_by_role('button',name='Capture Photo').click();expect(page.get_by_role('heading',name='Blueprint identified: Freeiron Dry Pack')).to_be_visible(timeout=60000)
  badge=page.get_by_role('button',name='Acquire Freeiron Dry Pack',exact=True);expect(badge).to_have_class('blueprint-access-status blueprint-access-status-acquired scanner-acquire')
  expect(page.get_by_text('Loading OCR Library',exact=True)).not_to_be_visible();assert page.get_by_text('Scan Diagnostics',exact=True).count()==0
  page.get_by_role('button',name='Exit Scanner').click();assert page.evaluate("window.cameraTracks.every(t=>t.readyState==='ended')");page.get_by_role('button',name='Done',exact=True).click()
  nav('Settings');page.get_by_label('Scan Diagnostics',exact=True).select_option('true');page.reload();nav('Settings');expect(page.get_by_label('Scan Diagnostics',exact=True)).to_have_value('true')
  page.locator('.settings-page').filter(has=page.get_by_role('heading',name='Blueprint Scanner',exact=True)).screenshot(path=str(out/f'{label}-scanner-settings.png'))
  nav('Blueprint Collections');page.get_by_role('button',name='Scan & Acquire').click();expect(page.get_by_text('Scan Diagnostics',exact=True)).to_be_visible()
  page.get_by_role('button',name='Exit Scanner').click();page.get_by_role('button',name='Done',exact=True).click();nav('Settings');page.get_by_label('Scan Diagnostics',exact=True).select_option('false')
  nav('Blueprint Collections');page.get_by_role('button',name='Scan & Acquire').click();assert page.get_by_text('Scan Diagnostics',exact=True).count()==0
  page.get_by_role('button',name='Exit Scanner').click();page.close()
 browser.close()
print('Scanner cleanup passed on desktop/mobile: real loading lifecycle, live text polygons, no preview acquisition, diagnostics hidden/default and settings persistence, guide, capture, camera cleanup and no horizontal overflow.')
