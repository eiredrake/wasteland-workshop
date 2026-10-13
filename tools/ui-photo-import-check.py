"""Real static OCR, native picker contracts, photo editing and sequential acquisition."""
import json,os,tempfile,time
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=root/'tests/visual/actual';out.mkdir(exist_ok=True,parents=True)
base=os.environ.get('SCANNER_TEST_URL','http://127.0.0.1:5186').rstrip('/')
seed="""()=>{localStorage.clear();localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}));localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'scan',name:'Scanner Collection',entries:[{blueprintId:5234,status:'to-acquire',note:'retain'}]}]));localStorage.setItem('wasteland-workshop-active-blueprint-collection','scan')}"""
with tempfile.TemporaryDirectory() as folder,sync_playwright() as p:
 png=Path(folder)/'blueprint.png';webp=Path(folder)/'blueprint.webp';bad=Path(folder)/'broken.jpg'
 Image.open(root/'tests/fixtures/scanner/freeiron-dry-pack.jpg').save(png);Image.open(root/'tests/fixtures/scanner/hooch.jpg').save(webp);bad.write_text('not an image')
 browser=p.chromium.launch()
 for label,width in [('desktop',1280),('mobile',390)]:
  context=browser.new_context(viewport={'width':width,'height':900},has_touch=label=='mobile');page=context.new_page();page.set_default_timeout(60000)
  page.add_init_script("window.cameraCalls=0;navigator.mediaDevices.getUserMedia=async()=>{window.cameraCalls++;throw new Error('Camera must not be called')}")
  requests=[];page.on('request',lambda r:requests.append(r.url));page.goto(base);page.evaluate(seed);page.reload()
  if '/5187' in base:pass
  page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Blueprint Collections',exact=True).click();page.get_by_role('button',name='Scan & Acquire',exact=True).click()
  assert page.evaluate('window.cameraCalls')==0
  assert page.get_by_role('button',name='Take Photo',exact=True).count()==0
  with page.expect_file_chooser() as chooser:page.get_by_role('button',name='Choose Photo',exact=True).click()
  assert chooser.value.is_multiple() and chooser.value.element.get_attribute('capture') is None
  chooser.value.set_files([str(root/'tests/fixtures/scanner/freeiron-dry-pack.jpg'),str(png),str(bad),str(webp)])
  expect(page.locator('.photo-adjuster img')).to_be_visible();assert page.get_by_role('heading',name='Blueprint Identified!').count()==0
  assert page.evaluate('window.cameraCalls')==0
  page.locator('.scanner-panel').screenshot(path=str(out/f'{label}-photo-preview.png'))
  page.get_by_text('Adjust Crop and Rotation',exact=True).click();page.get_by_role('button',name='Rotate Right 90°').click()
  image=page.locator('.photo-adjuster img');assert image.evaluate('(e)=>e.naturalWidth>e.naturalHeight')
  page.get_by_role('button',name='Reset Adjustments').click();assert image.evaluate('(e)=>e.naturalHeight>e.naturalWidth')
  page.get_by_role('button',name='Crop Title Region').click();assert page.get_by_role('spinbutton',name='Width (%)').input_value()=='78'
  page.get_by_role('button',name='Analyze Photo',exact=True).click()
  expect(page.get_by_role('button',name='Freeiron Dry Pack',exact=True)).to_be_visible(timeout=60000)
  assert page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0].entries[0].status")=='to-acquire'
  candidate=page.get_by_role('button',name='Freeiron Dry Pack',exact=True);
  if not page.locator('dialog.print-claim-dialog').is_visible():candidate.click()
  page.locator('.scanner-panel').screenshot(path=str(out/f'{label}-photo-result.png'))
  page.get_by_role('button',name='Claim',exact=True).click();expect(page.get_by_text('Acquired and saved.',exact=True)).to_be_visible()
  page.get_by_role('button',name='Next Photo',exact=True).click();expect(image).to_be_visible()
  # Manual correction is an explicit catalog search, never a new catalog entry.
  page.get_by_role('textbox',name='Recognized Text').fill('freeiron dry pack');page.get_by_role('button',name='Search Catalog').click()
  page.get_by_role('button',name='Freeiron Dry Pack',exact=True).click();page.get_by_role('button',name='Claim',exact=True).click();expect(page.get_by_text('Already Acquired',exact=True)).to_be_visible()
  page.get_by_role('button',name='Next Photo',exact=True).click();expect(page.get_by_role('alert')).to_contain_text('could not decode')
  page.get_by_role('button',name='Next Photo',exact=True).click();expect(image).to_be_visible()
  page.get_by_role('textbox',name='Recognized Text').fill('Hooch');page.get_by_role('button',name='Search Catalog').click()
  page.get_by_role('button',name='Hooch',exact=True).click();page.get_by_role('button',name='Claim',exact=True).click()
  entries=page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0].entries");assert len(entries)==2 and entries[0]['note']=='retain'
  for check_width in [320,360,390,768,1280]:
   page.set_viewport_size({'width':check_width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.set_viewport_size({'width':width,'height':900})
  page.get_by_role('button',name='Back to Collections').click();assert page.locator('.scanner-panel').count()==0

  assert page.evaluate('window.cameraCalls')==0 and all(url.startswith((base+'/','blob:','data:')) for url in requests)
  context.close()
 browser.close()
print('Photo import passed: real OCR, JPEG/PNG/WebP, preview, rotation/crop/reset, native camera/library pickers, explicit acquire, duplicates, manual correction, sequential batch failure recovery, counters and privacy on desktop/mobile.')
