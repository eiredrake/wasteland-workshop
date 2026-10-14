"""Unified file review, real static OCR, camera-only acquisition, gestures and resource cleanup."""
import io,json,os
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];engine=os.environ.get('SCANNER_BROWSER','chromium');out=root/'tests/visual/actual'/('unified-'+engine);out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('SCANNER_TEST_URL','http://127.0.0.1:5187')
def fixture(lines=['AA Blade'],fmt='PNG',orientation=None):
 im=Image.new('RGB',(1200,900),'white');d=ImageDraw.Draw(im);font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',52 if len(lines)==1 else 40)
 for index,line in enumerate(lines):d.text((340,420+index*65),line,font=font,fill='black')
 d.text((60,30),'Hooch',font=font,fill='black') # Must remain outside target.
 kwargs={}
 if orientation==6:im=im.transpose(Image.Transpose.ROTATE_90);exif=Image.Exif();exif[274]=6;kwargs['exif']=exif
 buf=io.BytesIO();im.save(buf,format=fmt,**kwargs);return buf.getvalue()
camera_script="""()=>{
 window.cameraCalls=[];window.cameraStreams=[];window.cameraMode='ok';window.nativeCameraApi=!!navigator.mediaDevices?.getUserMedia;
 if(typeof HTMLCanvasElement.prototype.captureStream!=='function')return;
 const makeStream=()=>{const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=900;const c=canvas.getContext('2d');c.fillStyle='white';c.fillRect(0,0,1200,900);c.fillStyle='black';c.font='52px Arial';c.fillText('AA Blade',340,470);const stream=canvas.captureStream(12);const interval=setInterval(()=>{c.fillStyle='white';c.fillRect(0,0,2,2)},70);for(const track of stream.getTracks()){const stop=track.stop.bind(track);track.stop=()=>{clearInterval(interval);stop()}}window.cameraStreams.push(stream);return stream};
 const devices={getUserMedia:async constraints=>{window.cameraCalls.push(constraints);if(window.cameraMode==='denied')throw new DOMException('Test camera permission denied','NotAllowedError');if(window.cameraMode==='missing')throw new DOMException('Test camera missing','NotFoundError');if(window.cameraMode==='busy')throw new DOMException('Test camera busy','NotReadableError');if(window.cameraMode==='pending')return new Promise(resolve=>{window.finishCamera=()=>resolve(makeStream())});return makeStream()},enumerateDevices:async()=>[{kind:'videoinput',deviceId:'rear-1',label:'Rear test camera'},{kind:'videoinput',deviceId:'front-2',label:'Front test camera'}]};
 Object.defineProperty(navigator,'mediaDevices',{value:devices,configurable:true});
}"""
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome') if engine=='chrome' else getattr(p,engine).launch()
 widths=[320,360,390,768,1280] if engine=='chromium' else [390,1280]
 for width in widths:
  context=b.new_context(viewport={'width':width,'height':1000},has_touch=width<768,device_scale_factor=3 if width<768 else 1);page=context.new_page();page.set_default_timeout(30000);errors=[];workers=[]
  page.on('pageerror',lambda e:errors.append(str(e)) if '/cdn-cgi/rum' not in str(e) else None);page.on('worker',lambda worker:workers.append(worker))
  page.goto(base);page.evaluate("""()=>{localStorage.clear();localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'qa',name:'Unified QA',entries:[]}]));localStorage.setItem('wasteland-workshop-active-blueprint-collection','qa');localStorage.setItem('wasteland-workshop-scanner-settings',JSON.stringify({version:1,diagnostics:true,includeImages:false}));localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}))}""");page.reload();page.evaluate(camera_script)
  def nav(name):page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name=name,exact=True).click()
  nav('Scan Prints');expect(page.get_by_role('dialog',name='Loading OCR Library')).not_to_be_visible(timeout=60000)
  choose=page.get_by_role('button',name='Choose Image',exact=True);camera=page.get_by_role('button',name='Scan Image',exact=True)
  a=choose.bounding_box();c=camera.bounding_box();assert abs(a['y']-c['y'])<1 and a['x']<c['x'];assert a['height']>=44 and c['height']>=44
  assert choose.evaluate("e=>getComputedStyle(e).color")=='rgb(230, 225, 213)';assert page.get_by_role('button',name='Confirm Image').count()==0;page.screenshot(path=str(out/f'entry-{width}.png'))
  def logs(label):
   details=page.locator('section[aria-label="Scan Prints"] details')
   if details.get_attribute('open') is None:details.locator('summary').click()
   with page.expect_download() as download:page.get_by_role('button',name='Export Scan Diagnostics').click()
   path=out/f'{label}-{width}.json';download.value.save_as(str(path));return json.loads(path.read_text())['records']
  def select(data,name='native-camera-return.data',mime='image/png'):
   with page.expect_file_chooser() as fc:choose.click()
   fc.value.set_files({'name':name,'mimeType':mime,'buffer':data})
   expect(page.get_by_role('dialog',name='FILE SELECTED')).not_to_be_visible()
  def review_ready():
   expect(page.get_by_role('heading',name='Review Image')).to_be_visible();expect(page.get_by_role('button',name='Confirm Image')).to_be_enabled()
  def confirm_success():
   page.get_by_role('button',name='Confirm Image').click();success=page.get_by_role('dialog',name='PRINT IDENTIFIED');expect(success).to_be_visible(timeout=60000);expect(success.get_by_text('Blueprint: AA Blade',exact=True)).to_be_visible();page.screenshot(path=str(out/f'success-{width}.png'));success.get_by_role('button',name='OK').click()
  select(fixture(['Item Name AA Blade :','Item Type Test']));review_ready();assert not any(e['type']=='OCR_SCAN_REQUEST' for e in logs('before-confirm'))
  viewport=page.get_by_role('group',name='Position blueprint image');viewport.scroll_into_view_if_needed();target=viewport.locator('.scanner-target');target_before=target.bounding_box();transform_before=viewport.locator('img').get_attribute('style')
  box=viewport.bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.mouse.move(box['x']+box['width']/2+18,box['y']+box['height']/2+8,steps=4);page.mouse.up();expect(viewport.locator('img')).not_to_have_attribute('style',transform_before);assert target.bounding_box()==target_before
  page.get_by_role('button',name='Zoom In').click();assert target.bounding_box()==target_before;page.get_by_role('button',name='Reset View').click();assert viewport.locator('img').get_attribute('style')==transform_before
  # Exercise the same pointer gesture code for multi-pointer touch; real touch pinch is additionally checked via Chromium CDP below.
  rect=viewport.bounding_box()
  for pointer,x in [(41,rect['x']+100),(42,rect['x']+180)]:viewport.dispatch_event('pointerdown',{'pointerId':pointer,'pointerType':'touch','button':0,'clientX':x,'clientY':rect['y']+100})
  viewport.dispatch_event('pointermove',{'pointerId':42,'pointerType':'touch','clientX':rect['x']+220,'clientY':rect['y']+100});expect(viewport.locator('img')).not_to_have_attribute('style',transform_before)
  for pointer in [41,42]:viewport.dispatch_event('pointercancel',{'pointerId':pointer,'pointerType':'touch'})
  page.get_by_role('button',name='Reset View').click();viewport.focus();page.keyboard.press('ArrowLeft');expect(viewport.locator('img')).not_to_have_attribute('style',transform_before);page.keyboard.press('Home');assert viewport.locator('img').get_attribute('style')==transform_before
  if engine in ['chromium','chrome'] and width<768:
   viewport.scroll_into_view_if_needed();rect=viewport.bounding_box();session=context.new_cdp_session(page);cy=rect['y']+rect['height']/2;cx=rect['x']+rect['width']/2
   session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':cx-30,'y':cy,'id':1},{'x':cx+30,'y':cy,'id':2}]})
   session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':cx-55,'y':cy,'id':1},{'x':cx+55,'y':cy,'id':2}]});session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});expect(viewport.locator('img')).not_to_have_attribute('style',transform_before)
   page.get_by_role('button',name='Reset View').click()
  assert viewport.evaluate("e=>getComputedStyle(e).touchAction")=='none';assert page.locator('body').evaluate("e=>getComputedStyle(e).touchAction")=='auto'
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not any(e['type']=='OCR_SCAN_REQUEST' for e in logs('positioned-not-confirmed'))
  page.get_by_role('button',name='Zoom Out',exact=True).click()
  page.get_by_role('button',name='Zoom Out',exact=True).click()
  page.get_by_role('button',name='Zoom Out',exact=True).click()
  expect(page.get_by_role('button',name='Confirm Image')).to_be_enabled()
  page.get_by_role('button',name='Reset View').click()

  viewport.scroll_into_view_if_needed();rect=viewport.bounding_box();viewport.dispatch_event('pointerdown',{'pointerId':51,'pointerType':'mouse','button':0,'clientX':rect['x']+100,'clientY':rect['y']+100});viewport.dispatch_event('pointermove',{'pointerId':51,'pointerType':'mouse','clientX':rect['x']+1100,'clientY':rect['y']+100});viewport.dispatch_event('pointerup',{'pointerId':51,'pointerType':'mouse'});expect(page.get_by_role('button',name='Confirm Image')).to_be_disabled();expect(page.get_by_role('alert')).to_contain_text('yellow box overlaps');page.get_by_role('button',name='Reset View').click();review_ready()
  page.screenshot(path=str(out/f'review-{width}.png'));confirm_success()
  records=logs('file-result');scan=next(e for e in records if e['type']=='SCAN_STARTED');assert scan['sourceType']=='FILE';assert scan['transformation']['scale']>0;assert scan['target']['width']<1200;assert all('Hooch' not in e.get('text','') for e in records if e['type']=='OCR_SCAN_RESULT')
  result=next(e for e in records if e['type']=='OCR_SCAN_RESULT');assert result['extractedWidth']==scan['target']['width'];assert result['extractedHeight']==scan['target']['height']
  # Repeated same-file selection and EXIF-oriented pixels are static FILE inputs.
  select(fixture(fmt='JPEG',orientation=6),'camera-from-gallery.jpeg','image/jpeg');review_ready();expect(viewport.locator('img')).to_have_attribute('width','1200');expect(viewport.locator('img')).to_have_attribute('height','900');confirm_success()
  select(fixture(fmt='WEBP'),'another.webp','image/webp');review_ready()
  expect(page.get_by_role('button',name='Choose Another')).to_have_count(0)
  with page.expect_file_chooser():choose.click()
  page.locator('section[aria-label="Scan Prints"] input[type=file]').dispatch_event('cancel');review_ready()
  select(b'invalid bytes','bad.jpg','image/jpeg');failed=page.get_by_role('dialog',name='IMAGE ERROR');expect(failed).to_be_visible();failed.get_by_role('button',name='OK').click()
  failed_events=logs('image-failure')
  decode_failures=[e for e in failed_events if e['type']=='IMAGE_DECODE_FAILED']
  assert decode_failures and all('exceptionName' in e and 'exceptionMessage' in e and e['scanId']==e['acquisitionId'] for e in decode_failures)
  select(bytes([0x1a,0x45,0xdf,0xa3]),'video.webm','video/webm');expect(failed).to_be_visible();expect(failed.get_by_text('Reason: Video input is unsupported for this static-image scanner.')).to_be_visible();failed.get_by_role('button',name='OK').click()
  select(fixture(['Unknown static title']));review_ready();page.get_by_role('button',name='Confirm Image').click();match_failed=page.get_by_role('dialog',name='PRINT IDENTIFICATION FAILED');expect(match_failed).to_be_visible();expect(match_failed.get_by_text('Reason: No matching blueprint was found.')).to_be_visible();match_failed.get_by_role('button',name='OK').click()
  select(fixture(['AA Blade','Hooch']));review_ready();page.get_by_role('button',name='Confirm Image').click();expect(match_failed).to_be_visible();expect(match_failed.get_by_text('Reason: Multiple blueprint names matched the image.')).to_be_visible();page.screenshot(path=str(out/f'ambiguous-{width}.png'));match_failed.get_by_role('button',name='OK').click()
  picker=page.locator('section[aria-label="Scan Prints"] input[type=file]');assert picker.get_attribute('capture') is None and picker.get_attribute('multiple') is None
  picker.evaluate("e=>{e.click=()=>{throw Error('Native picker test failure')}}");choose.click();picker_error=page.get_by_role('dialog',name='FILE SELECTION FAILED');expect(picker_error).to_be_visible();expect(picker_error.get_by_text('Reason: Native picker test failure')).to_be_visible();page.keyboard.press('Escape');picker.evaluate('e=>delete e.click')
  # Native stream fixture, only in engines exposing canvas.captureStream. No physical camera activated.
  if page.evaluate("typeof HTMLCanvasElement.prototype.captureStream==='function'"):
   before=len([e for e in logs('before-camera') if e['type']=='OCR_SCAN_REQUEST']);camera.click()
   capture=page.get_by_role('button',name='Capture still image inside targeting box');expect(capture).to_be_enabled();page.screenshot(path=str(out/f'camera-{width}.png'));assert page.locator('video').evaluate('e=>e.videoWidth')==1200
   assert len([e for e in logs('live-camera') if e['type']=='OCR_SCAN_REQUEST'])==before
   page.locator('#scanner-camera-device').select_option('front-2');expect(capture).to_be_enabled();assert page.evaluate("window.cameraStreams.slice(0,-1).every(s=>s.getTracks().every(t=>t.readyState==='ended'))")
   capture.focus();page.keyboard.press('Enter');review_ready();assert page.locator('video').count()==0;assert page.evaluate("window.cameraStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))")
   assert len([e for e in logs('captured') if e['type']=='OCR_SCAN_REQUEST'])==before
   confirm_success();records=logs('camera-result');assert any(e['type']=='SCAN_STARTED' and e['sourceType']=='CAMERA_CAPTURE' for e in records)
   assert all(c['audio'] is False for c in page.evaluate('window.cameraCalls'))
   if width==390:
    page.get_by_role('button',name='Retake').click();expect(capture).to_be_enabled()
    page.evaluate("()=>{window.qaVisibility='hidden';Object.defineProperty(document,'visibilityState',{get:()=>window.qaVisibility,configurable:true});document.dispatchEvent(new Event('visibilitychange'))}")
    expect(page.get_by_role('button',name='Resume Camera')).to_be_visible();assert page.evaluate("window.cameraStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))")
    page.evaluate("()=>{window.qaVisibility='visible';document.dispatchEvent(new Event('visibilitychange'))}");page.get_by_role('button',name='Resume Camera').click();expect(capture).to_be_enabled();page.get_by_role('button',name='Close Camera').click();review_ready()

   page.get_by_role('button',name='Retake').click();expect(capture).to_be_enabled();page.get_by_role('button',name='To Collections').click();expect(page.get_by_role('heading',name='Blueprint Collections',exact=True)).to_be_visible();assert page.evaluate("window.cameraStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))")
   nav('Scan Prints');page.evaluate("window.cameraMode='denied'");camera.click();camera_error=page.get_by_role('dialog',name='CAMERA ERROR');expect(camera_error).to_be_visible();expect(camera_error.get_by_text('Camera permission was denied.',exact=False)).to_be_visible();camera_error.get_by_role('button',name='OK').click();records=logs('camera-denied');assert any(e.get('error',{}).get('code')=='CAMERA_PERMISSION_DENIED' for e in records)
   if width==390:
    page.evaluate("window.cameraMode='pending'");camera.click();page.wait_for_function("typeof window.finishCamera==='function'");page.get_by_role('button',name='To Collections').click();page.evaluate('window.finishCamera()');page.wait_for_function("window.cameraStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))");assert page.locator('dialog').count()==0
    nav('Scan Prints');page.evaluate("window.cameraMode='missing'");camera.click();expect(camera_error).to_be_visible();expect(camera_error.get_by_text('No available camera was found.',exact=False)).to_be_visible();camera_error.get_by_role('button',name='OK').click()
    page.evaluate("window.cameraMode='busy'");camera.click();expect(camera_error).to_be_visible();expect(camera_error.get_by_text('It may already be in use',exact=False)).to_be_visible();camera_error.get_by_role('button',name='OK').click()

  else:
   camera.click();camera_error=page.get_by_role('dialog',name='CAMERA ERROR');expect(camera_error).to_be_visible();expect(camera_error.get_by_text('This browser does not provide camera access.',exact=False)).to_be_visible();camera_error.get_by_role('button',name='OK').click()
  assert len(workers)==1,len(workers);assert not errors,errors;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  context.close();print(engine,'passed unified acquisition/review/OCR at',width,flush=True)
 b.close()
