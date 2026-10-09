"""Camera mocks + real local OCR integration; physical-device verification is separate."""
import argparse,base64,json,sys
parser=argparse.ArgumentParser();parser.add_argument("--record",action="store_true");args=parser.parse_args();differences=[]
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=root/'tests/visual/actual';out.mkdir(exist_ok=True,parents=True)
photo='data:image/jpeg;base64,'+base64.b64encode((root/'tests/fixtures/scanner/freeiron-dry-pack.jpg').read_bytes()).decode()
seed="""()=>{localStorage.clear();localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true,completed:false}}}));localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'scan',name:'Scanner Collection',entries:[{blueprintId:5234,status:'to-acquire',note:'retain'}]}]));localStorage.setItem('wasteland-workshop-active-blueprint-collection','scan')}"""
with sync_playwright() as p:
 browser=p.chromium.launch()
 for name,width,height in [('desktop',1280,900),('mobile',390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height},has_touch=name=='mobile');page.set_default_timeout(15000)
  page.add_init_script("""window.cameraCalls=0;window.cameraTracks=[];navigator.mediaDevices.getUserMedia=async constraints=>{
    window.cameraCalls++;window.cameraConstraints=constraints;
    const canvas=document.createElement('canvas');canvas.width=800;canvas.height=1050;const ctx=canvas.getContext('2d');const image=new Image();image.src="""+json.dumps(photo)+""";await image.decode();const sx=image.width*.075,sy=image.height*.12,sw=image.width*.65,sh=sw/3.4;ctx.fillStyle='white';ctx.fillRect(0,0,800,1050);const scale=720/sw;ctx.drawImage(image,40-sx*scale,(1050-720/3.4)/2-sy*scale,image.width*scale,image.height*scale);window.cameraCanvas=canvas;
    const stream=canvas.captureStream(15);const track=stream.getVideoTracks()[0];track.getCapabilities=()=>({focusMode:['continuous']});track.applyConstraints=async constraints=>{window.requestedFocus=constraints.focusMode;throw new Error('Unsupported focus override')};window.cameraTracks.push(...stream.getTracks());return stream;
   };""")
  requests=[];errors=[];page.on('request',lambda r:requests.append(r.url));page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:5186');page.evaluate(seed);page.reload()
  def capture(view):
   if view=='camera':
    bounds=page.locator('.scan-viewfinder').bounding_box();assert abs(bounds['width']/bounds['height']-3.4)<.02,bounds
    frame=page.locator('.scan-target-frame').bounding_box();assert frame['width']>frame['height']*3,frame
   filename=f'{name}-scanner-{view}.png';page.mouse.move(0,0);page.evaluate('document.fonts.ready');page.wait_for_timeout(100);data=page.locator('.scanner-panel').screenshot(animations='disabled');(out/filename).write_bytes(data)
   baseline=root/'tests/visual/baselines'/filename
   if not args.record and (not baseline.exists() or baseline.read_bytes()!=data):differences.append(filename)
  def nav(label):page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name=label,exact=True).click()
  def collection():return page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0]")
  def scan():page.get_by_role('button',name='Capture Photo',exact=True).click();expect(page.get_by_role('heading',name='Blueprint identified: Freeiron Dry Pack')).to_be_visible(timeout=30000)
  nav('Blueprint Collections');assert page.evaluate('window.cameraCalls')==0;page.get_by_role('button',name='Scan & Acquire',exact=True).click();expect(page.get_by_role('button',name='Capture Photo')).to_be_visible()
  assert page.evaluate('window.requestedFocus')=='continuous'
  capture('camera');page.get_by_text('Scan Diagnostics',exact=True).click();page.get_by_role('checkbox',name='Collect diagnostics for the next capture').check()
  page.set_viewport_size({'width':844,'height':390});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.set_viewport_size({'width':320,'height':700});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.set_viewport_size({'width':width,'height':height})
  expect(page.get_by_text('Scanner Collection',exact=True)).to_be_visible();assert page.evaluate("window.cameraConstraints.video.facingMode.ideal")=='environment'
  before=collection();scan();assert collection()==before
  capture('result')
  with page.expect_download() as exported:page.get_by_role('button',name='Download Scan Diagnostics').click()
  report=json.loads(Path(exported.value.path()).read_text(encoding='utf-8'));assert report['capture']['image'].startswith('data:image/png;base64,');assert report['passes'][0]['text'];assert report['result']['candidates'][0]['id']==5234;assert report['appVersion']
  page.get_by_role('checkbox',name='Collect diagnostics for the next capture').uncheck();page.get_by_text('Scan Diagnostics',exact=True).click();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  button=page.get_by_role('button',name='Acquire Freeiron Dry Pack',exact=True);button.evaluate('b=>{b.click();b.click()}');expect(page.get_by_text('Acquired and saved in Scanner Collection.')).to_be_visible()
  assert collection()['entries']==[{'blueprintId':5234,'status':'acquired','note':'retain'}]
  calls=page.evaluate('window.cameraCalls');page.get_by_role('button',name='Scan Next Blueprint').click();scan();expect(page.get_by_text('Already Acquired',exact=True)).to_be_visible();assert page.evaluate('window.cameraCalls')==calls
  page.get_by_role('button',name='Scan Next Blueprint').click();page.evaluate("window.cameraCanvas.getContext('2d').fillStyle='white';window.cameraCanvas.getContext('2d').fillRect(0,0,800,1050)");page.wait_for_timeout(200);page.get_by_role('button',name='Capture Photo').click();expect(page.get_by_text('Blueprint not identified.',exact=False)).to_be_visible(timeout=30000)
  saved=collection();page.get_by_role('button',name='Retake Photo / Try Again').click();expect(page.locator('.scan-guidance')).to_contain_text('Little text contrast',timeout=3000);page.evaluate("window.cameraCanvas.getContext('2d').fillStyle='rgb(20,20,20)';window.cameraCanvas.getContext('2d').fillRect(0,0,800,1050)");expect(page.locator('.scan-guidance')).to_contain_text('More light needed',timeout=3000);page.evaluate("window.cameraCanvas.getContext('2d').fillStyle='white';window.cameraCanvas.getContext('2d').fillRect(0,0,800,1050)");page.wait_for_timeout(200);page.get_by_role('button',name='Capture Photo').click();expect(page.get_by_text('Blueprint not identified.',exact=False)).to_be_visible(timeout=30000);assert collection()==saved
  expect(page.locator('.scanner-counts')).to_have_text('Scanned: 3 | Acquired: 1 | Already Owned: 1 | Unmatched: 1')
  page.get_by_role('button',name='Exit Scanner').click();expect(page.get_by_role('heading',name='Scan Session Complete')).to_be_visible();capture('summary');assert page.evaluate("window.cameraTracks.every(t=>t.readyState==='ended')")
  page.get_by_role('button',name='Done',exact=True).click();page.reload();assert collection()['entries'][0]['status']=='acquired'
  nav('Blueprint Collections');page.get_by_role('button',name='Scan & Acquire',exact=True).click();expect(page.get_by_role('button',name='Capture Photo')).to_be_visible();scan();expect(page.get_by_text('Already Acquired',exact=True)).to_be_visible()
  page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))")
  expect(page.get_by_role('button',name='Resume Camera')).to_be_visible();assert page.evaluate("window.cameraTracks.every(t=>t.readyState==='ended')")
  page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'})");page.get_by_role('button',name='Resume Camera').click();page.get_by_role('button',name='Scan Next Blueprint').click();expect(page.get_by_role('button',name='Capture Photo')).to_be_visible()
  page.get_by_role('button',name='Exit Scanner').click();page.get_by_role('button',name='Done',exact=True).click()
  assert not errors,errors
  assert all(url.startswith(('http://127.0.0.1:5186','data:','blob:')) for url in requests),requests
  page.close()
 # Permission denial is helpful and offers no unusable Capture button.
 page=browser.new_page();page.add_init_script("navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('Denied','NotAllowedError'))")
 page.goto('http://127.0.0.1:5186');page.evaluate(seed);page.reload();page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Blueprint Collections',exact=True).click();page.get_by_role('button',name='Scan & Acquire').click();expect(page.get_by_role('alert')).to_contain_text('permission was denied');assert page.get_by_role('button',name='Capture Photo').count()==0
 page.close()
 # Controlled recognition edge cases; camera frames still use the real capture service.
 page=browser.new_page(viewport={'width':390,'height':844});page.set_default_timeout(10000)
 page.add_init_script("""navigator.mediaDevices.getUserMedia=async()=>{let c=document.createElement('canvas');c.width=400;c.height=600;c.getContext('2d').fillRect(0,0,400,600);window.mockCanvas=c;return c.captureStream(15)};const save=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(window.failSave&&key==='wasteland-workshop-blueprint-collections')throw new DOMException('Full','QuotaExceededError');return save.call(this,key,value)}""")
 def recognition_route(route):
  if 'real=1' in route.request.url:return route.continue_()
  route.fulfill(content_type='application/javascript',body="""import {captureScanFrame} from '/src/features/scanner/ScanOcr.ts?real=1';export {captureScanFrame};export function createScanRecognizer(){return {recognize:async()=>{if(window.ocrFailure)throw new Error('OCR failed');return window.controlledMatch},close:async()=>{}}}""")
 page.route('**/src/features/scanner/ScanOcr.ts*',recognition_route)
 page.goto('http://127.0.0.1:5186');page.evaluate(seed);page.reload();page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Blueprint Collections',exact=True).click();page.get_by_role('button',name='Scan & Acquire').click();expect(page.get_by_role('button',name='Capture Photo')).to_be_visible()
 page.evaluate("""async()=>{const {masterBlueprints}=await import('/src/features/blueprints/blueprints.ts');window.controlledMatch={confidence:'ambiguous',candidates:masterBlueprints.filter(b=>[5234,4407].includes(b.id)).map(blueprint=>({blueprint,score:.9}))}}""")
 page.get_by_role('button',name='Capture Photo').click();expect(page.get_by_text('Recognition is uncertain.',exact=False)).to_be_visible();assert page.get_by_role('button',name='Acquire Freeiron Dry Pack').count()==0
 page.locator('.scanner-panel').screenshot(path=str(out/'mobile-scanner-ambiguous.png'))
 page.get_by_role('button',name='Freeiron Dry Pack',exact=True).click();before=page.evaluate("localStorage.getItem('wasteland-workshop-blueprint-collections')");page.evaluate('window.failSave=true');page.get_by_role('button',name='Acquire Freeiron Dry Pack',exact=True).click();expect(page.get_by_role('alert')).to_be_visible();assert page.evaluate("localStorage.getItem('wasteland-workshop-blueprint-collections')")==before;expect(page.locator('.scanner-counts')).to_contain_text('Acquired: 0')
 page.evaluate('window.failSave=false');page.get_by_role('button',name='Acquire Freeiron Dry Pack',exact=True).click();expect(page.get_by_text('Acquired and saved in Scanner Collection.')).to_be_visible()
 page.get_by_role('button',name='Scan Next Blueprint').click();page.evaluate("window.ocrFailure=true");page.get_by_role('button',name='Capture Photo').click();expect(page.get_by_role('alert')).to_contain_text('Recognition failed')
 page.get_by_role('button',name='Retake Photo / Try Again').click();page.evaluate("window.ocrFailure=false;window.controlledMatch={confidence:'high',candidates:[window.controlledMatch.candidates.find(c=>c.blueprint.id===4407)]}");page.get_by_role('button',name='Capture Photo').click();expect(page.get_by_role('heading',name='Blueprint identified: Hooch')).to_be_visible();page.evaluate("localStorage.setItem('wasteland-workshop-active-blueprint-collection','other')");page.get_by_role('button',name='Acquire Hooch',exact=True).click();expect(page.get_by_role('alert')).to_contain_text('active collection changed');expect(page.locator('.scanner-counts')).to_contain_text('Scanned: 2 | Acquired: 1')
 page.evaluate("localStorage.setItem('wasteland-workshop-active-blueprint-collection','scan');localStorage.setItem('wasteland-workshop-blueprint-collections','[]')");page.get_by_role('button',name='Acquire Hooch',exact=True).click();expect(page.get_by_role('alert')).to_contain_text('deleted')
 page.get_by_role('button',name='Exit Scanner').click();page.get_by_role('button',name='Done',exact=True).click();page.close()
 # Supported torch toggles and rejected changes never report success.
 page=browser.new_page(viewport={'width':390,'height':844})
 page.add_init_script("""navigator.mediaDevices.getUserMedia=async()=>{const c=document.createElement('canvas');c.width=800;c.height=1050;c.getContext('2d').fillRect(0,0,800,1050);const s=c.captureStream(15),t=s.getVideoTracks()[0];let torch=false;t.getCapabilities=()=>({torch:true});t.getConstraints=()=>({});t.getSettings=()=>({torch});t.applyConstraints=async v=>{if(window.failTorch)throw Error('Unavailable');torch=v.advanced[0].torch};return s}""")
 page.goto('http://127.0.0.1:5186');page.evaluate(seed);page.reload();page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Blueprint Collections',exact=True).click();page.get_by_role('button',name='Scan & Acquire').click()
 page.get_by_role('button',name='Camera Light: Off').click();expect(page.get_by_role('button',name='Camera Light: On')).to_have_attribute('aria-pressed','true')
 page.locator('.scanner-panel').screenshot(path=str(out/'mobile-scanner-light.png'))
 page.get_by_role('button',name='Camera Light: On').click();expect(page.get_by_role('button',name='Camera Light: Off')).to_have_attribute('aria-pressed','false')
 page.evaluate('window.failTorch=true');page.get_by_role('button',name='Camera Light: Off').click();expect(page.get_by_role('alert')).to_contain_text('Camera light could not');expect(page.get_by_role('button',name='Camera Light: Off')).to_have_attribute('aria-pressed','false');page.close()
 page=browser.new_page();page.add_init_script("Object.defineProperty(navigator,'mediaDevices',{value:undefined})");page.goto('http://127.0.0.1:5186');page.evaluate(seed);page.reload();page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Blueprint Collections',exact=True).click();page.get_by_role('button',name='Scan & Acquire').click();expect(page.get_by_role('alert')).to_contain_text('does not support camera');assert page.get_by_role('button',name='Capture Photo').count()==0
 page.close();browser.close()
print('Desktop/mobile scanner passed: real OCR, explicit acquisition, persisted metadata, batch/repeated owned scans, unmatched/retake counters, reopen, interruption, camera release, denial and same-origin requests only.')

if differences:print('Scanner visual differences: '+', '.join(differences));sys.exit(1)
