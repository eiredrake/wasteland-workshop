"""Deterministic recovery checks around the shared OCR interface."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
mock="""export function matchPaddleLines(){return {confidence:'none',candidates:[]}};export function createScanRecognizer(){return {recognize:async(image,catalog)=>{window.inputs??=[];window.inputs.push([image.width,image.height]);const candidates=[{blueprint:catalog.find(b=>b.id===5234),score:.9},{blueprint:catalog.find(b=>b.name==='Hooch'),score:.89}];if(window.mode==='pending')return new Promise(resolve=>{window.resolvePhoto=()=>resolve({confidence:'high',candidates:[candidates[0]],readText:'Freeiron Dry Pack'})});if(window.mode==='error')throw new Error('Simulated OCR error');return {confidence:'ambiguous',candidates,readText:'Freeiron Dry Pock'}},close:async()=>{window.readerClosed=(window.readerClosed??0)+1}}}"""
with sync_playwright() as p:
 browser=p.chromium.launch();page=browser.new_page(viewport={'width':390,'height':900});page.set_default_timeout(8000)
 page.route('**/src/features/scanner/ScanRecognition.ts',lambda route:route.fulfill(status=200,content_type='application/javascript',body=mock))
 page.goto('http://127.0.0.1:5186');page.evaluate("""()=>{localStorage.clear();localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}));localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'scan',name:'Recovery Collection',entries:[]} ]));localStorage.setItem('wasteland-workshop-active-blueprint-collection','scan')}""");page.reload()
 page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Blueprint Collections',exact=True).click();page.get_by_role('button',name='Scan & Acquire').click()
 def choose():
  with page.expect_file_chooser() as chooser:page.get_by_role('button',name='Choose Photo',exact=True).click()
  chooser.value.set_files(str(root/'tests/fixtures/scanner/freeiron-dry-pack.jpg'));expect(page.locator('.photo-adjuster img')).to_be_visible()
 choose();page.get_by_role('button',name='Analyze Photo',exact=True).click();expect(page.get_by_role('heading',name='Possible Matches')).to_be_visible()
 assert page.get_by_role('button',name='Acquire',exact=True).count()==0
 page.get_by_role('button',name='Freeiron Dry Pack',exact=True).click();assert page.get_by_role('button',name='Acquire',exact=True).is_enabled()
 page.evaluate("""()=>{const set=Storage.prototype.setItem;window.restoreStorage=()=>Storage.prototype.setItem=set;Storage.prototype.setItem=function(key,value){if(key==='wasteland-workshop-blueprint-collections')throw new Error('Simulated write failure');return set.call(this,key,value)}}""")
 page.get_by_role('button',name='Acquire',exact=True).click();expect(page.get_by_role('alert')).to_be_visible();assert page.get_by_text('Acquired and saved.',exact=True).count()==0
 page.evaluate('()=>{window.restoreStorage()}');page.get_by_role('button',name='Try Again').click();expect(page.get_by_role('heading',name='Possible Matches')).to_be_visible();expect(page.locator('.scanner-counts')).to_contain_text('1 scanned')
 before=page.evaluate('window.inputs.at(-1)');page.get_by_text('Adjust Crop and Rotation',exact=True).click();page.get_by_role('button',name='Rotate Right 90°').click();page.get_by_role('button',name='Analyze Photo',exact=True).click();expect(page.get_by_role('heading',name='Possible Matches')).to_be_visible();rotated=page.evaluate('window.inputs.at(-1)');assert before[0]<before[1] and rotated[0]>rotated[1]
 page.get_by_role('button',name='Crop Title Region').click();page.get_by_role('button',name='Analyze Photo',exact=True).click();expect(page.get_by_role('heading',name='Possible Matches')).to_be_visible();cropped=page.evaluate('window.inputs.at(-1)');assert cropped[0]<=rotated[0] and cropped[1]<rotated[1] and cropped[0]/cropped[1]>rotated[0]/rotated[1]
 page.get_by_role('button',name='Reset Adjustments').click();page.get_by_role('button',name='Analyze Photo',exact=True).click();expect(page.get_by_role('heading',name='Possible Matches')).to_be_visible();assert page.evaluate('window.inputs.at(-1)')==before
 page.get_by_role('button',name='Cancel',exact=True).click();choose();page.evaluate("window.mode='pending'");page.get_by_role('button',name='Analyze Photo',exact=True).click()
 assert page.get_by_role('button',name='Analyze Photo',exact=True).is_disabled()
 page.get_by_role('button',name='Cancel',exact=True).click();page.evaluate('window.resolvePhoto()');assert page.get_by_role('heading',name='Blueprint Identified!').count()==0
 assert page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0].entries.length")==0
 assert page.evaluate('window.readerClosed')>0
 choose();page.evaluate("window.mode='error'");page.get_by_role('button',name='Analyze Photo',exact=True).click();expect(page.get_by_role('alert')).to_contain_text('Recognition failed')
 page.get_by_role('button',name='Cancel',exact=True).click();choose();page.evaluate("window.mode='pending'");page.get_by_role('button',name='Analyze Photo',exact=True).click();page.get_by_role('button',name='Exit Scanner').click();page.evaluate('window.resolvePhoto()');expect(page.get_by_role('heading',name='Scan Session Complete')).to_be_visible()
 browser.close()
print('Photo recovery checks passed: ambiguous selection, failed save, retry counters, duplicate Analyze prevention, OCR failure, cancellation and exit with late OCR results.')
