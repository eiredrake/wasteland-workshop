"""Verify the rebuilding placeholder, preserved manual acquisition and diagnostics."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=root/'tests/visual/actual';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch()
 for width in [320,360,390,768,1280]:
  page=b.new_page(viewport={'width':width,'height':900});requests=[];page.on('request',lambda r:requests.append(r.url))
  page.add_init_script("window.cameraCalls=0;window.workerCalls=0;const W=window.Worker;window.Worker=class extends W{constructor(...args){window.workerCalls++;super(...args)}};if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=async()=>{window.cameraCalls++;throw Error('Scanner must not request camera')}")
  page.goto('http://127.0.0.1:5186');page.evaluate("""()=>{localStorage.clear();localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}));localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'qa',name:'Kept Collection',entries:[{blueprintId:5234,status:'acquired'}]}]));localStorage.setItem('wasteland-workshop-active-blueprint-collection','qa')}""");page.reload()
  def nav(name):page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name=name,exact=True).click()
  nav('Blueprint Collections');before=page.evaluate("localStorage.getItem('wasteland-workshop-blueprint-collections')")
  page.get_by_role('button',name='Scan & Acquire',exact=True).click();expect(page.get_by_role('heading',name='Scan & Acquire',exact=True)).to_be_visible()
  expect(page.get_by_text('The scanner is being rebuilt.',exact=True)).to_be_visible();expect(page.get_by_text('Photo selection and blueprint identification are temporarily unavailable.',exact=True)).to_be_visible()
  section=page.get_by_role('region',name='Scan & Acquire');assert section.locator('button').count()==1 and section.locator('input,video,canvas').count()==0
  assert page.evaluate('window.cameraCalls===0&&window.workerCalls===0');assert not any('/ocr/' in r or '/ocr-paddle/' in r or 'scanner-offline' in r for r in requests)
  assert page.evaluate("localStorage.getItem('wasteland-workshop-blueprint-collections')")==before
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/f'scanner-placeholder-{width}.png'),full_page=True)
  page.get_by_role('button',name='Back to Collections',exact=True).click();expect(page.get_by_text('Kept Collection',exact=True)).to_be_visible()
  nav('Settings');page.get_by_label('Scan Diagnostics',exact=True).select_option('true');page.reload();nav('Settings');assert page.get_by_label('Scan Diagnostics',exact=True).input_value()=='true'
  nav('Blueprint Catalog');page.get_by_role('searchbox').fill('Hooch');page.get_by_text('Hooch',exact=True).click();page.get_by_role('button',name='Not Acquired',exact=True).click();page.get_by_role('button',name='To Acquire',exact=True).click()
  saved=page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0].entries");assert any(e['blueprintId']==4407 and e['status']=='acquired' for e in saved);assert any(e['blueprintId']==5234 and e['status']=='acquired' for e in saved)
  page.reload();nav('Workshop');page.get_by_role('searchbox').fill('Hooch');page.get_by_text('Hooch',exact=True).click();expect(page.get_by_role('button',name='Acquired',exact=True)).to_be_visible()
  page.close()
 b.close()
print('Placeholder, no camera/worker/OCR activity, preserved records/manual acquisition and diagnostics persistence passed at five widths.')
