"""Legacy worker handover and incomplete first-install recovery, using only isolated browser data."""
import threading,tempfile,json
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=root/'tests/visual/actual/pwa'
state={'dir':root/'dist','fail':False}
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(state['dir']),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  if state['fail'] and 'eng.traineddata.gz' in self.path:self.send_error(503);return
  super().do_GET()
 def end_headers(self):self.send_header('Cache-Control','no-cache');super().end_headers()
s=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=s.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{s.server_port}'
with sync_playwright() as p:
 b=p.chromium.launch()
 # First install fails atomically if a required model is unavailable.
 c=b.new_context();page=c.new_page();page.set_default_timeout(15000);state['fail']=True;page.goto(base);page.get_by_text('Install app and offline status',exact=True).click();expect(page.get_by_role('status')).to_contain_text('could not finish',timeout=30000)
 assert page.evaluate('navigator.serviceWorker.controller===null')
 state['fail']=False;page.reload();page.wait_for_function('navigator.serviceWorker.controller!==null',timeout=30000);page.get_by_text('Install app and offline status',exact=True).click();expect(page.get_by_role('status')).to_contain_text('Ready for offline use');c.close();print('Failed first installation reports failure and recovers online.',flush=True)
 state['dir']=root/'tests/visual/actual/pwa-legacy-dist';c=b.new_context();page=c.new_page();page.set_default_timeout(30000);page.goto(base);page.wait_for_function('navigator.serviceWorker.controller!==null')
 page.evaluate("()=>localStorage.setItem('wasteland-workshop-warehouse',JSON.stringify({version:2,credits:47,entries:[{itemId:3866,quantity:7}]}))");before=page.evaluate("localStorage.getItem('wasteland-workshop-warehouse')")
 assert any(k.startswith('workshop-app-') for k in page.evaluate('caches.keys()'))
 state['dir']=root/'dist';page.reload();expect(page.get_by_role('button',name='Update and reload')).to_be_visible();page.get_by_role('button',name='Update and reload').click();page.wait_for_function('async()=>!(await navigator.serviceWorker.ready).waiting');page.reload()
 assert page.evaluate("localStorage.getItem('wasteland-workshop-warehouse')")==before
 c.set_offline(True);page.goto(base+'/#/warehouse');expect(page.get_by_role('heading',name='Warehouse',exact=True)).to_be_visible();expect(page.get_by_label('Quantity on hand: Basic Scrap (undated)')).to_have_value('7');page.screenshot(path=str(out/'legacy-upgrade.png'));c.close();b.close()
s.shutdown();s.server_close();print('Legacy service worker migrated to Workbox, kept user inventory, and works offline.',flush=True)
