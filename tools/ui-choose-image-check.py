"""Phase 1: native picker only, arbitrary Files, real exceptions and accessible result dialogs."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=root/'tests/visual/actual';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch()
 for width in [320,390,1280]:
  page=b.new_page(viewport={'width':width,'height':900});page.goto('http://127.0.0.1:5186');page.evaluate("""()=>{localStorage.clear();localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}));localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'qa',name:'Test Collection',entries:[]} ]));localStorage.setItem('wasteland-workshop-active-blueprint-collection','qa')}""");page.reload();page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Scan Prints',exact=True).click()
  choose=page.get_by_role('button',name='Choose Image',exact=True);box=choose.bounding_box();assert abs(box['x']+box['width']/2-width/2)<1;assert box['height']>=44
  assert choose.evaluate('e=>getComputedStyle(e).color')=='rgb(230, 225, 213)';assert choose.evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(214, 95, 50)'
  picker=page.locator('section[aria-label="Scan Prints"] input[type=file]');assert picker.get_attribute('capture') is None and picker.get_attribute('multiple') is None
  assert all(ext in picker.get_attribute('accept') for ext in ['.jpg','.jpeg','.png','.webp','.webm'])
  page.evaluate("""()=>{window.processingCalls=0;window.createImageBitmap=()=>{window.processingCalls++;throw Error('No decoding allowed')};window.FileReader=class{constructor(){window.processingCalls++;throw Error('No reading allowed')}};window.Worker=class{constructor(){window.processingCalls++;throw Error('No OCR allowed')}}}""")
  before=page.evaluate('JSON.stringify({...localStorage})')
  for name,mime in [('test.jpg','image/jpeg'),('test.jpeg','image/jpeg'),('test.png','image/png'),('test.webp','image/webp'),('test.webm','video/webm'),('no-extension','application/octet-stream'),('weird.unknown','text/plain'),('test.jpg','image/jpeg'),('test.jpg','image/jpeg'),('long-'+('name'*70)+'.jpg','')]:
   with page.expect_file_chooser() as fc:choose.click()
   fc.value.set_files({'name':name,'mimeType':mime,'buffer':b'not an image'})
   dialog=page.get_by_role('dialog',name='FILE SELECTED',exact=True);expect(dialog).to_be_visible();expect(dialog.get_by_text(name,exact=True)).to_be_visible();expect(dialog.get_by_text('File selection successful.',exact=True)).to_be_visible();assert 'confirmation-dialog-success' in dialog.get_attribute('class');assert dialog.locator('button').count()==1
   assert picker.input_value()=='';assert page.evaluate('window.processingCalls')==0;assert page.evaluate('JSON.stringify({...localStorage})')==before;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert dialog.evaluate('e=>e.scrollWidth<=e.clientWidth')
   expect(dialog.get_by_role('button',name='OK',exact=True)).to_be_focused()
   if name.startswith('long-'):page.screenshot(path=str(out/f'choose-image-success-{width}.png'))
   dialog.get_by_role('button',name='OK',exact=True).click();expect(choose).to_be_focused()
  with page.expect_file_chooser() as fc:choose.click()
  picker.dispatch_event('cancel');assert page.locator('dialog').count()==0
  picker.evaluate("e=>{e.click=()=>{throw new Error('Native picker exception: test reason')}}");choose.click();dialog=page.get_by_role('dialog',name='FILE SELECTION FAILED',exact=True);expect(dialog.get_by_text('Native picker exception: test reason',exact=True)).to_be_visible();assert 'confirmation-dialog-danger' in dialog.get_attribute('class');page.screenshot(path=str(out/f'choose-image-failure-{width}.png'));page.keyboard.press('Escape');expect(choose).to_be_focused();picker.evaluate('e=>delete e.click')
  choose.focus();page.keyboard.press('Tab');page.keyboard.press('Shift+Tab');assert choose.evaluate("e=>getComputedStyle(e).outlineColor")=='rgb(224, 184, 63)';page.screenshot(path=str(out/f'choose-image-entry-{width}.png'))
  page.close()
 b.close()
print('Choose Image passed: all advertised formats, unknown/invalid contents, repeated file, cancellation, real picker exception, focus, long filenames, no decoding/OCR/persistence and mobile/desktop layout.')
