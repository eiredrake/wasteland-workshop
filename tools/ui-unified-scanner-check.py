"""Unified file review, real static OCR, camera-only acquisition, gestures and resource cleanup."""
import io,json,os
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
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
camera_script="""()=>{window.cameraCalls=[];Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{window.cameraCalls.push('unexpected');throw Error('Live camera must not be opened')}}})}"""
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome') if engine=='chrome' else getattr(p,engine).launch()
 widths=[320,360,390,768,1280] if engine=='chromium' else [390,1280]
 for width in widths:
  context=b.new_context(viewport={'width':width,'height':1000},has_touch=width<768,device_scale_factor=3 if width<768 else 1);page=context.new_page();page.set_default_timeout(30000);errors=[];workers=[]
  page.on('pageerror',lambda e:errors.append(str(e)) if '/cdn-cgi/rum' not in str(e) else None);page.on('worker',lambda worker:workers.append(worker))
  page.goto(base);page.evaluate("""()=>{localStorage.clear();localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'qa',name:'Unified QA',entries:[]}]));localStorage.setItem('wasteland-workshop-active-blueprint-collection','qa');localStorage.setItem('wasteland-workshop-scanner-settings',JSON.stringify({version:1,diagnostics:true,includeImages:true}));localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}))}""");page.reload();page.evaluate(camera_script)
  def nav(name):page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name=name,exact=True).click()
  nav('Scan Prints');expect(page.get_by_role('dialog',name='Loading OCR Library')).not_to_be_visible(timeout=60000)
  choose=page.get_by_role('button',name='Choose Image',exact=True);camera=page.get_by_role('button',name='Scan Image',exact=True)
  a=choose.bounding_box();c=camera.bounding_box();assert a['y']<=c['y'];assert a['height']>=44 and c['height']>=44
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
   page.get_by_role('button',name='Confirm Image').click();success=page.get_by_role('dialog',name='PRINT MATCHES');expect(success).to_be_visible(timeout=60000);page.screenshot(path=str(out/f'success-{width}.png'))
   if success.get_by_role('button',name='Acquire AA Blade',exact=True).count():success.get_by_role('button',name='Acquire AA Blade',exact=True).click()
   else:expect(success).to_contain_text('AA Blade is already in the active collection');success.get_by_role('button',name='Done',exact=True).click()
   expect(success).not_to_be_visible();assert any(e['status']=='acquired' for e in page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0].entries"))
  page.evaluate("()=>{const original=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){const file=this;return new Promise((resolve,reject)=>{window.finishFileRead=()=>original.call(file).then(resolve,reject)})}}")
  select(fixture(['Item Name AA Blade :','Item Type Test']))
  expect(choose).to_be_disabled()
  assert page.locator('input[type=file]:not([capture])').evaluate('e=>e.files.length')==1
  page.evaluate('()=>window.finishFileRead()')
  review_ready()
  expect(choose).to_be_enabled()
  assert page.locator('input[type=file]:not([capture])').evaluate('e=>e.files.length')==0
  page.evaluate('()=>{delete File.prototype.arrayBuffer}')
  assert not any(e['type']=='OCR_SCAN_REQUEST' for e in logs('before-confirm'))
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
  crop_view=page.get_by_role('region',name='Exact OCR input')
  expect(crop_view).to_be_visible()
  expect(crop_view.get_by_role('img')).to_have_js_property('naturalWidth',scan['target']['width'])
  with page.expect_download() as crop_download:crop_view.get_by_role('button',name='Save OCR Input PNG').click()
  crop_path=out/f'exact-ocr-input-{width}.png';crop_download.value.save_as(str(crop_path))
  actual=Image.open(crop_path).convert('RGBA');t=scan['target']
  original=Image.open(io.BytesIO(fixture(['Item Name AA Blade :','Item Type Test']))).convert('RGBA')
  expected=original.crop((t['x'],t['y'],t['x']+t['width'],t['y']+t['height']))
  assert actual.size==expected.size and ImageChops.difference(actual,expected).getbbox() is None
  page.screenshot(path=str(out/f'exact-ocr-preview-{width}.png'))

  # Repeated same-file selection and EXIF-oriented pixels are static FILE inputs.
  select(fixture(fmt='JPEG',orientation=6),'camera-from-gallery.jpeg','image/jpeg');review_ready();expect(viewport.locator('img')).to_have_attribute('width','1200');expect(viewport.locator('img')).to_have_attribute('height','900');confirm_success()
  select(fixture(['AA Blxde']),'near-name.png');review_ready();confirm_success()
  assert any(e.get('matchMode')=='APPROXIMATE' for e in logs('approximate-match'))
  select(fixture(fmt='WEBP'),'another.webp','image/webp');review_ready()
  expect(page.get_by_role('button',name='Choose Another')).to_have_count(0)
  with page.expect_file_chooser():choose.click()
  page.locator('section[aria-label="Scan Prints"] input[type=file]:not([capture])').dispatch_event('cancel');review_ready()
  select(b'invalid bytes','bad.jpg','image/jpeg');failed=page.get_by_role('dialog',name='IMAGE ERROR');expect(failed).to_be_visible();failed.get_by_role('button',name='OK').click()
  failed_events=logs('image-failure')
  decode_failures=[e for e in failed_events if e['type']=='IMAGE_DECODE_FAILED']
  assert decode_failures and all('exceptionName' in e and 'exceptionMessage' in e and e['scanId']==e['acquisitionId'] for e in decode_failures)
  full_reads=[e for e in failed_events if e['type']=='IMAGE_READ_SUCCEEDED']
  assert full_reads and all(e['operation']=='read-full-file' and e['byteLength']==e['fileSize'] and e['readScope']=='entire file' for e in full_reads)
  assert any(e['type']=='IMAGE_SNAPSHOT_SUCCEEDED' for e in failed_events)
  # Exercise clipboard success and rejection without relying on desktop OS permissions.
  page.evaluate("()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedDiagnostics=text}}})")
  page.get_by_role('button',name='Copy Scan Diagnostics').click()
  expect(page.locator('section[aria-label="Scan Prints"]').get_by_role('status')).to_have_text('Diagnostics copied to clipboard.')
  copied=json.loads(page.evaluate('window.copiedDiagnostics'))
  assert copied['records']==failed_events and copied['imageExportImplemented'] is False
  page.evaluate("()=>{navigator.clipboard.writeText=async()=>{throw new DOMException('Test clipboard denied','NotAllowedError')}}")
  page.get_by_role('button',name='Copy Scan Diagnostics').click()
  expect(page.get_by_role('alert')).to_contain_text('Test clipboard denied')
  expect(page.get_by_text('Diagnostics copied to clipboard.',exact=True)).to_have_count(0)
  page.evaluate("()=>{navigator.clipboard.writeText=async text=>{window.copiedDiagnostics=text}}")
  page.get_by_role('button',name='Copy Scan Diagnostics').click()
  expect(page.locator('section[aria-label="Scan Prints"]').get_by_role('status')).to_have_text('Diagnostics copied to clipboard.')
  page.screenshot(path=str(out/f'copy-diagnostics-{width}.png'))

  select(bytes([0x1a,0x45,0xdf,0xa3]),'video.webm','video/webm');expect(failed).to_be_visible();expect(failed.get_by_text('Reason: Video input is unsupported for this static-image scanner.')).to_be_visible();failed.get_by_role('button',name='OK').click()
  select(fixture(['Unknown static title']));review_ready();page.get_by_role('button',name='Confirm Image').click();match_failed=page.get_by_role('dialog',name='SELECT PRINT');expect(match_failed).to_be_visible();expect(match_failed).to_contain_text('not identified');match_failed.get_by_role('button',name='Cancel').click();expect(page.get_by_role('button',name='Confirm Image')).not_to_be_visible()
  select(fixture(['AA Blade','Hooch']));review_ready();page.get_by_role('button',name='Confirm Image').click();choices=page.get_by_role('dialog',name='PRINT MATCHES');expect(choices).to_be_visible();page.screenshot(path=str(out/f'ambiguous-{width}.png'));choices.get_by_role('button',name='Cancel',exact=True).click();assert not any(e['blueprintId']==4407 for e in page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0].entries"));select(fixture(['AA Blade','Hooch']));review_ready();page.get_by_role('button',name='Confirm Image').click();expect(choices).to_be_visible();choices.get_by_role('button',name='Acquire Hooch',exact=True).click();expect(choices).not_to_be_visible();assert any(e['blueprintId']==4407 and e['status']=='acquired' for e in page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0].entries"))
  picker=page.locator('section[aria-label="Scan Prints"] input[type=file]:not([capture])');assert picker.get_attribute('capture') is None and picker.get_attribute('multiple') is None
  picker.evaluate("e=>{e.click=()=>{throw Error('Native picker test failure')}}");choose.click();picker_error=page.get_by_role('dialog',name='FILE SELECTION FAILED');expect(picker_error).to_be_visible();expect(picker_error.get_by_text('Reason: Native picker test failure')).to_be_visible();page.keyboard.press('Escape');picker.evaluate('e=>delete e.click')
  # Simulate the native camera returning a static photo; actual OS UI/focus requires a phone.
  before=len([e for e in logs('before-native-camera') if e['type']=='OCR_SCAN_REQUEST'])
  native=page.locator('input[type=file][capture=environment]')
  expect(native).to_have_count(1);assert native.get_attribute('accept')=='image/*'
  with page.expect_file_chooser():camera.click()
  native.dispatch_event('cancel');expect(page.get_by_role('button',name='Confirm Image')).not_to_be_visible()
  with page.expect_file_chooser() as camera_choice:camera.click()
  camera_choice.value.set_files({'name':'native-photo.jpg','mimeType':'image/jpeg','buffer':fixture(fmt='JPEG',orientation=6)})
  review_ready();assert page.locator('video').count()==0
  assert len([e for e in logs('native-review') if e['type']=='OCR_SCAN_REQUEST'])==before
  page.screenshot(path=str(out/f'native-camera-review-{width}.png'))
  previous=viewport.locator('img').get_attribute('src')
  with page.expect_file_chooser():page.get_by_role('button',name='Retake').click()
  native.dispatch_event('cancel');review_ready();assert viewport.locator('img').get_attribute('src')==previous
  with page.expect_file_chooser() as retake:page.get_by_role('button',name='Retake').click()
  retake.value.set_files({'name':'native-photo.jpg','mimeType':'image/jpeg','buffer':fixture(fmt='JPEG')})
  review_ready();confirm_success()
  records=logs('native-result');assert any(e['type']=='SCAN_STARTED' and e['sourceType']=='CAMERA_CAPTURE' for e in records)
  assert any(e['type']=='FILE_PICKER_SELECTED' and e.get('operation')=='capture-image-native' for e in records)
  assert page.evaluate('window.cameraCalls')==[]
  general=page.get_by_role('button',name='Choose Image',exact=True)
  expect(page.get_by_role('button',name='Choose File',exact=True)).to_have_count(0)
  general_input=page.locator('input[type=file]:not([accept])')
  expect(general_input).to_have_count(1)
  assert general_input.get_attribute('capture') is None
  with page.expect_file_chooser() as general_choice:general.click()
  general_choice.value.set_files({'name':'downloads-copy.jpg','mimeType':'image/jpeg','buffer':fixture(fmt='JPEG')})
  review_ready();confirm_success()
  assert any(e['type']=='FILE_PICKER_SELECTED' and e.get('operation')=='choose-image-unrestricted' for e in logs('general-file'))
  page.screenshot(path=str(out/f'general-file-{width}.png'))
  assert len(workers)==1,len(workers);assert not errors,errors;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  context.close();print(engine,'passed unified acquisition/review/OCR at',width,flush=True)
 b.close()
