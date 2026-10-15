"""Built PWA acceptance: cold offline launch with server stopped, reference/OCR and update safety."""
import io,json,threading,tempfile,os,re
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright,expect
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[1];out=root/'tests/visual/actual/pwa';out.mkdir(parents=True,exist_ok=True)
state={'directory':root/'dist','fail':None}
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(state['directory']),**kwargs)
 def log_message(self,*args):pass
 def do_GET(self):
  if state['fail'] and state['fail'] in self.path:self.send_error(503);return
  super().do_GET()
 def end_headers(self):self.send_header('Cache-Control','no-cache');super().end_headers()
class Server(ThreadingHTTPServer):allow_reuse_address=True;request_queue_size=64
server=Server(('127.0.0.1',0),Handler);port=server.server_port
threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{port}'
engine=os.environ.get('PWA_BROWSER','chromium')
seed="""()=>{
 localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'qa',name:'Offline Test',entries:[{blueprintId:5328,status:'acquired'}]}]));
 localStorage.setItem('wasteland-workshop-active-blueprint-collection','qa');
 localStorage.setItem('wasteland-workshop-warehouse',JSON.stringify({version:2,credits:25,entries:[{itemId:3866,quantity:3}]}));
 localStorage.setItem('wasteland-workshop-shopping-lists',JSON.stringify({version:1,activeListId:'qa',lists:[{id:'qa',name:'Offline Shopping',items:[{kind:'resource',resourceId:3866,name:'Basic Scrap',quantity:2,acquired:false}]}]}));
}"""

def nav(page,name):page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name=name,exact=True).click()
def cached(page):return page.evaluate('''async()=>{const result=[];for(const key of await caches.keys()){const c=await caches.open(key);result.push(...(await c.keys()).map(r=>r.url))}return result}''')
with tempfile.TemporaryDirectory(prefix='workshop-pwa-') as profile,sync_playwright() as p:
 browser=getattr(p,engine)
 context=browser.launch_persistent_context(profile,viewport={'width':390,'height':1000},accept_downloads=True);page=context.pages[0];page.set_default_timeout(60000)
 page.goto(base);page.evaluate(seed);page.evaluate("()=>localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true,completed:true},actions:{viewed:true,completed:true}}}))");page.reload()
 page.wait_for_function('navigator.serviceWorker.controller!==null');page.get_by_text('Install app and offline status',exact=True).click();expect(page.get_by_role('status')).to_contain_text('Ready for offline use')
 manifest=page.evaluate("async()=>await (await fetch('/manifest.webmanifest')).json()")
 assert manifest['id']=='/' and manifest['scope']=='/' and manifest['display']=='standalone';assert any(i.get('purpose')=='maskable' for i in manifest['icons'])
 urls=cached(page)
 for file in (root/'dist').rglob('*'):
  relative=file.relative_to(root/'dist').as_posix()
  if file.is_file() and (relative.startswith('assets/') or relative.startswith('ocr/')):assert any(relative in url for url in urls),relative
 stored_keys=['wasteland-workshop-blueprint-collections','wasteland-workshop-active-blueprint-collection','wasteland-workshop-warehouse','wasteland-workshop-shopping-lists','wasteland-workshop-economics-settings']
 before=page.evaluate('keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]))',stored_keys)
 context.close();server.shutdown();server.server_close();print('Initial precache complete. Server stopped before cold browser restart.',flush=True)
 context=browser.launch_persistent_context(profile,viewport={'width':390,'height':1000},accept_downloads=True);context.set_offline(True) if engine!='webkit' else None;page=context.pages[0];page.set_default_timeout(60000)
 if engine=='chromium':context.new_cdp_session(page).send('Network.clearBrowserCache')
 page.on('pageerror',lambda e:print('Browser error:',e,flush=True));external=[];page.on('request',lambda r:external.append(r.url) if r.url.startswith('http') and not r.url.startswith(base) else None)
 for route,title in [('catalog/5328','AA Blade'),('collections','Blueprint Collections'),('warehouse','Warehouse'),('builds','Work Queue'),('history','Work History'),('shopping','Shopping Lists')]:
  print('Offline route:',route,flush=True);page.goto(base+'/#/'+route);expect(page.get_by_role('heading',name=title,exact=True).first).to_be_visible();page.reload();expect(page.get_by_role('heading',name=title,exact=True).first).to_be_visible()
 # First-ever visit to the scanner/worker after offline restart: no warmed OCR runtime.
 nav(page,'Scan Prints');expect(page.get_by_role('button',name='Choose Image',exact=True)).to_be_visible();expect(page.get_by_role('dialog',name='Loading OCR Library')).not_to_be_visible(timeout=60000)
 im=Image.new('RGB',(1000,400),'white');ImageDraw.Draw(im).text((220,180),'AA Blade',font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',52),fill='black');buf=io.BytesIO();im.save(buf,format='PNG')
 with page.expect_file_chooser() as fc:page.get_by_role('button',name='Choose Image',exact=True).click()
 fc.value.set_files({'name':'offline.png','mimeType':'image/png','buffer':buf.getvalue()});page.get_by_role('button',name='Confirm Image',exact=True).click();expect(page.get_by_role('dialog')).to_contain_text('AA Blade',timeout=60000)
 page.get_by_role('dialog').get_by_role('button',name=re.compile('^(Cancel|OK|Done)$')).click()
 nav(page,'Warehouse');page.evaluate("()=>Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true})");page.get_by_role('button',name='Export Warehouse',exact=True).click();dialog=page.get_by_role('dialog');dialog.get_by_label('File format').select_option('json')
 with page.expect_download() as download:dialog.get_by_role('button',name='Download File').click()
 download.value.save_as(str(out/(engine+'-offline-warehouse.json')))
 # Offline queue, timer and history behavior; no server API participates.
 page.clock.install()
 nav(page,'Work Queue');page.locator('.work-entry summary').click();page.get_by_role('button',name='Action',exact=True).click();picker=page.get_by_role('combobox',name='Find an Action');picker.fill('First Aid');picker.press('ArrowDown');picker.press('Enter');page.locator('.action-configuration select').select_option('stabilize');page.locator('.action-configuration').get_by_role('button',name='Add to Queue',exact=True).click()
 timer=page.locator('.blueprint-craft-timer');timer.click();expect(timer).to_contain_text('Stopped');timer.click();page.clock.fast_forward(121000);nav(page,'Work History');expect(page.get_by_text('First Aid',exact=True).first).to_be_visible()
 nav(page,'Settings')
 with page.expect_download() as backup_download:page.get_by_role('button',name='Export All Data',exact=True).click()
 backup=out/(engine+'-offline-backup.json');backup_download.value.save_as(str(backup));assert json.loads(backup.read_text(encoding='utf-8'))['data']['buildQueue']['builds']
 page.get_by_label('Import / Restore Data',exact=True).set_input_files(str(backup));page.get_by_role('button',name='Replace & Restore',exact=True).click();expect(page.get_by_role('heading',name='Data Backup & Restore',exact=True)).to_be_visible()
 nav(page,'Warehouse')
 after=page.evaluate('keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]))',stored_keys)
 for key in stored_keys:
  if key.endswith('economics-settings') and before[key] is None:continue # Existing restore materializes default settings.
  assert json.loads(after[key])==json.loads(before[key]) if key!='wasteland-workshop-active-blueprint-collection' else after[key]==before[key],(key,before[key],after[key])
 before=after
 assert not external,external
 page.screenshot(path=str(out/(engine+'-offline.png')))
 print('Offline cold launch, all section/detail refresh, first-use OCR and export passed; stored data preserved.',flush=True)
 # Prove future installation and update behavior using a second normal Vite build.
 update=os.environ.get('PWA_UPDATE_DIST')
 if update:
  state['directory']=Path(update).resolve();server=Server(('127.0.0.1',port),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();context.set_offline(False)
  sw=(state['directory']/'service-worker.js').read_text(encoding='utf-8');state['fail']=re.search(r'url:"(assets/index-[^"]+\.js)"',sw)[1]
  page.evaluate('async()=>{const r=await navigator.serviceWorker.ready;await r.update()}');page.wait_for_function('''async()=>{const r=await navigator.serviceWorker.ready;return !r.installing&&!r.waiting}''');expect(page.get_by_role('button',name='Update and reload')).to_have_count(0)
  page.reload();expect(page.get_by_role('heading',name='Warehouse',exact=True)).to_be_visible();print('Failed update retained working app and data.',flush=True)
  state['fail']=None;page.evaluate('async()=>{const r=await navigator.serviceWorker.ready;await r.update()}');expect(page.get_by_role('button',name='Update and reload')).to_be_visible(timeout=60000)
  for width in [320,360,390,768,1280]:
   page.set_viewport_size({'width':width,'height':1000});page.get_by_role('button',name='Update and reload').scroll_into_view_if_needed();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/f'update-{engine}-{width}.png'))
  # Waiting update must not activate before the user requests it.
  assert page.evaluate('async()=>!!(await navigator.serviceWorker.ready).waiting')
  page.get_by_role('button',name='Update and reload').click();page.wait_for_function('async()=>!(await navigator.serviceWorker.ready).waiting');page.reload();expect(page.get_by_role('heading',name='Warehouse',exact=True)).to_be_visible()
  assert page.evaluate('keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]))',stored_keys)==before
  server.shutdown();server.server_close();context.set_offline(True);page.reload();expect(page.get_by_role('heading',name='Warehouse',exact=True)).to_be_visible();print('Accepted update survived server shutdown and preserved user data.',flush=True)
 context.close()
(out/(engine+'-result.json')).write_text(json.dumps({'offlineColdRestart':True,'serverStopped':True,'allSectionsRefresh':True,'firstOfflineOcr':True,'dataPreserved':True,'externalRequests':external,'cachedAssets':urls,'updateTested':bool(update)},indent=2),encoding='utf-8')
