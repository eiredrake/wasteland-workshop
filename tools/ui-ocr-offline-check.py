"""Production-build Chromium cold restart offline recognition and explicit missing-cache failure."""
import io,json,uuid,threading,os
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=root/'tests/visual/actual';out.mkdir(parents=True,exist_ok=True)
class QuietHandler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def handle(self):
  try:super().handle()
  except (ConnectionAbortedError,ConnectionResetError,BrokenPipeError):pass
class TestServer(ThreadingHTTPServer):
 request_queue_size=64
server=TestServer(('127.0.0.1',0),partial(QuietHandler,directory=str(root/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
base='http://127.0.0.1:'+str(server.server_port)
im=Image.new('RGB',(1200,900),'white');ImageDraw.Draw(im).text((340,420),'AA Blade',font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',48),fill='black');buf=io.BytesIO();im.save(buf,format='PNG');data=buf.getvalue()
def nav(page,name):page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name=name,exact=True).click()
def scan(page):
 with page.expect_file_chooser() as fc:page.get_by_role('button',name='Choose Image',exact=True).click()
 fc.value.set_files({'name':'offline.png','mimeType':'image/png','buffer':data});expect(page.get_by_role('dialog',name='FILE SELECTED')).not_to_be_visible()
 button=page.get_by_role('button',name='Confirm Image');expect(button).to_be_enabled();button.click();result=page.get_by_role('dialog',name='PRINT IDENTIFIED');expect(result).to_be_visible(timeout=60000);expect(result.get_by_text('Blueprint: AA Blade')).to_be_visible();result.get_by_role('button',name='OK').click()
engine=os.environ.get('SCANNER_BROWSER','chromium')
with sync_playwright() as p:
 browser_type=p.chromium if engine=='chrome' else getattr(p,engine)
 launch_options={'channel':'chrome'} if engine=='chrome' else {}
 profile=out/('ocr-offline-profile-'+uuid.uuid4().hex)
 context=browser_type.launch_persistent_context(str(profile),**launch_options);page=context.pages[0];page.set_default_timeout(60000)
 page.goto(base);page.evaluate("""()=>{localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'qa',name:'Offline Test',entries:[]}]));localStorage.setItem('wasteland-workshop-active-blueprint-collection','qa');localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}))}""");page.reload()
 try:page.wait_for_function('navigator.serviceWorker.controller!==null')
 except Exception:
  print(page.evaluate("async()=>({ready:document.readyState,secure:isSecureContext,registrations:(await navigator.serviceWorker.getRegistrations()).map(r=>({scope:r.scope,active:r.active?.state,waiting:r.waiting?.state,installing:r.installing?.state})),caches:await caches.keys()})"),flush=True)
  raise
 cached=page.evaluate("""async()=>{const key=(await caches.keys()).find(k=>k.startsWith('workshop-app-'));const cache=await caches.open(key);return (await cache.keys()).map(r=>r.url)}""")
 assert len([url for url in cached if '/ocr/' in url])>=8,cached
 nav(page,'Scan Prints');expect(page.get_by_role('dialog',name='Loading OCR Library')).not_to_be_visible(timeout=60000);scan(page);context.close();server.shutdown();server.server_close();print('Online install passed; HTTP server stopped before offline restart.',flush=True)
 context=browser_type.launch_persistent_context(str(profile),**launch_options);context.set_offline(True) if engine!='webkit' else None;page=context.pages[0];context.new_cdp_session(page).send('Network.clearBrowserCache') if engine in ['chromium','chrome'] else None;page.set_default_timeout(60000);requested=[];page.on('request',lambda req:requested.append(req.url))
 page.goto(base);nav(page,'Scan Prints');expect(page.get_by_role('dialog',name='Loading OCR Library')).not_to_be_visible(timeout=60000);scan(page)
 assert all(url.startswith(base) or url.startswith('blob:') or url.startswith('data:') for url in requested),requested
 page.screenshot(path=str(out/('tesseract-offline-restarted-'+engine+'.png')));print('Cold offline recognition passed with the HTTP asset server stopped.',flush=True)
 # Cold restart after deleting a required language model: should report initialization failure, not READY.
 page.evaluate("""async()=>{for(const key of await caches.keys()){if(key.startsWith('workshop-app-')){const cache=await caches.open(key);for(const req of await cache.keys()){if(req.url.endsWith('eng.traineddata.gz'))await cache.delete(req)}}}}""");context.close()
 context=browser_type.launch_persistent_context(str(profile),**launch_options);context.set_offline(True) if engine!='webkit' else None;page=context.pages[0];context.new_cdp_session(page).send('Network.clearBrowserCache') if engine in ['chromium','chrome'] else None;page.set_default_timeout(60000);page.goto(base);nav(page,'Scan Prints');failed=page.get_by_role('dialog',name='OCR INITIALIZATION FAILED');expect(failed).to_be_visible(timeout=60000);page.screenshot(path=str(out/('tesseract-offline-missing-model-'+engine+'.png')));context.close()
 (out/('ocr-offline-result-'+engine+'.json')).write_text(json.dumps({'browser':engine,'onlineInitialized':True,'closedBrowserAndRestartedOffline':True,'offlineRecognized':'AA Blade','missingModelFailsInitialization':True,'cachedAssets':cached},indent=2))
print('Production build: online cache completed, browser closed/restarted offline, real recognition passed; deleting English data produces explicit initialization failure.')
