"""Verify focus taps, modal confirmation and consistent scanner navigation."""
import base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=root/'tests/visual/actual';out.mkdir(exist_ok=True,parents=True)
photo='data:image/jpeg;base64,'+base64.b64encode((root/'tests/fixtures/scanner/freeiron-dry-pack.jpg').read_bytes()).decode()
with sync_playwright() as p:
 b=p.chromium.launch()
 for width in [320,390,1280]:
  page=b.new_page(viewport={'width':width,'height':900});page.set_default_timeout(60000)
  page.add_init_script("""window.focusRequests=[];navigator.mediaDevices.getSupportedConstraints=()=>({pointsOfInterest:true});navigator.mediaDevices.getUserMedia=async()=>{const c=document.createElement('canvas');c.width=800;c.height=1050;const ctx=c.getContext('2d'),image=new Image();image.src="""+json.dumps(photo)+""";await image.decode();const sx=image.width*.075,sy=image.height*.12,sw=image.width*.65,scale=720/sw;ctx.fillStyle='white';ctx.fillRect(0,0,800,1050);ctx.drawImage(image,40-sx*scale,(1050-720/3.4)/2-sy*scale,image.width*scale,image.height*scale);const stream=c.captureStream(15),track=stream.getVideoTracks()[0];window.tracks=stream.getTracks();track.getCapabilities=()=>({focusMode:['continuous','single-shot']});track.getConstraints=()=>({});track.applyConstraints=async value=>{window.focusRequests.push(value)};track.getSettings=()=>({focusMode:'single-shot',pointsOfInterest:window.focusRequests.at(-1)?.advanced?.at(-1)?.pointsOfInterest});return stream}""")
  page.goto('http://127.0.0.1:5186');page.evaluate("""()=>{localStorage.clear();localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}));localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'scan',name:'Scanner Collection',entries:[]} ]));localStorage.setItem('wasteland-workshop-active-blueprint-collection','scan')}""");page.reload()
  def open_scanner():page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Blueprint Collections',exact=True).click();page.get_by_role('button',name='Scan & Acquire',exact=True).click()
  open_scanner();assert page.locator('.scanner-controls').first.locator('button').first.inner_text().endswith('Back to Collections');assert page.get_by_role('button',name='Take Photo',exact=True).count()==0
  assert 'primary-button' in page.get_by_role('button',name='Use Camera',exact=True).get_attribute('class')
  page.get_by_role('button',name='Use Camera',exact=True).click();page.get_by_role('button',name='Auto Capture: On',exact=True).click()
  view=page.get_by_role('button',name='Tap live preview to focus');box=view.bounding_box();view.click(position={'x':box['width']*.2,'y':box['height']*.7})
  expect(page.get_by_text('Focus requested at that spot.',exact=True)).to_be_visible()
  point=page.evaluate('window.focusRequests.at(-1).advanced.at(-1).pointsOfInterest[0]');assert .15<point['x']<.25 and .5<point['y']<.6
  assert page.locator('.scan-magnifier').count()==0
  page.get_by_role('button',name='Capture Photo',exact=True).click();dialog=page.locator('dialog.print-claim-dialog');expect(dialog).to_be_visible(timeout=60000)
  assert dialog.locator('strong').inner_text()=='Freeiron Dry Pack'
  assert dialog.evaluate('(e)=>getComputedStyle(e).borderTopColor')=='rgb(116, 140, 88)'
  expect(dialog.get_by_text('Blueprint identified',exact=True)).to_be_visible()
  rects=[dialog.get_by_role('button',name=n,exact=True).bounding_box() for n in ['Back','Claim Blueprint']]
  if abs(rects[0]['y']-rects[1]['y'])<20:assert abs((rects[0]['y']+rects[0]['height']/2)-(rects[1]['y']+rects[1]['height']/2))<1
  assert 'back-button' in dialog.get_by_role('button',name='Back',exact=True).get_attribute('class')
  assert page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0].entries.length")==0
  page.locator('.scanner-panel').screenshot(path=str(out/f'claim-dialog-{width}.png'))
  page.keyboard.press('Escape');expect(dialog).not_to_be_visible();assert page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0].entries.length")==0
  open_scanner();page.get_by_role('button',name='Use Camera',exact=True).click();page.get_by_role('button',name='Auto Capture: On',exact=True).click();page.get_by_role('button',name='Capture Photo',exact=True).click();expect(dialog).to_be_visible(timeout=60000);dialog.get_by_role('button',name='Claim Blueprint',exact=True).click();expect(dialog).not_to_be_visible()
  assert page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0].entries[0].status")=='acquired'
  page.get_by_role('button',name='Back to Collections',exact=True).click();assert page.locator('.scanner-panel').count()==0 and page.evaluate("window.tracks.every(t=>t.readyState==='ended')")
  open_scanner()
  with page.expect_file_chooser() as chooser:page.get_by_role('button',name='Choose Photo',exact=True).click()
  chooser.value.set_files(str(root/'tests/fixtures/scanner/freeiron-dry-pack.jpg'));expect(page.locator('.photo-adjuster img')).to_be_visible()
  assert page.get_by_role('textbox',name='Recognized Text').count()==0
  assert page.get_by_role('button',name='Search Catalog').count()==0
  page.get_by_role('button',name='Analyze Photo',exact=True).click();expect(dialog).to_be_visible(timeout=60000);expect(dialog.get_by_role('button',name='Already acquired',exact=True)).to_be_disabled();page.locator('.scanner-panel').screenshot(path=str(out/f'already-acquired-{width}.png'));dialog.get_by_role('button',name='Back',exact=True).click();open_scanner()
  from PIL import Image
  blank=out/'unidentified-photo.png';Image.new('RGB',(800,600),'white').save(blank)
  with page.expect_file_chooser() as chooser:page.get_by_role('button',name='Choose Photo',exact=True).click()
  chooser.value.set_files(str(blank));expect(page.locator('.photo-adjuster img')).to_be_visible()
  page.get_by_role('button',name='Analyze Photo',exact=True).click();expect(dialog).to_be_visible(timeout=60000)
  expect(dialog.get_by_text('Unable to identify blueprint',exact=True)).to_be_visible()
  assert dialog.evaluate('(e)=>getComputedStyle(e).borderTopColor')==dialog.evaluate("e=>{const t=document.createElement('span');t.style.color='var(--color-selection)';e.append(t);const c=getComputedStyle(t).color;t.remove();return c}")
  page.locator('.scanner-panel').screenshot(path=str(out/f'failure-dialog-{width}.png'))
  dialog.get_by_role('button',name='Try again',exact=True).click();expect(dialog).not_to_be_visible()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.get_by_role('button',name='Back to Collections',exact=True).click();assert page.locator('.scanner-panel').count()==0
  page.close()
 b.close()
print('Scanner changes passed on desktop/mobile: tap-point focus, no closeup/native-capture button, green/gold identification modal, yellow failure modal, no manual text search, retry, explicit claim, photo confirmation and Back/Escape resource cleanup.')
