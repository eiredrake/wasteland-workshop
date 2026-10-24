"""Production-build PWA update checks with a real service worker and simulated 530."""
import functools,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 fail_update=False
 def log_message(self,*args):pass
 def do_GET(self):
  if self.fail_update and self.path.split('?')[0]=='/service-worker.js':
   self.send_response(530);self.end_headers();self.wfile.write(b'error code: 1016');return
  super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chrome')
  for width in [320,390,1280]:
   Handler.fail_update=False
   context=browser.new_context(viewport={'width':width,'height':900})
   page=context.new_page()
   page.add_init_script("localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true,completed:false}}}))")
   page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='networkidle')
   page.evaluate('async()=>{await navigator.serviceWorker.ready}')
   page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Update app',exact=True).click()
   button=page.get_by_role('button',name='Check for updates',exact=True)
   before=page.evaluate('JSON.stringify(localStorage)')
   Handler.fail_update=True;button.click()
   expect(page.get_by_text('Unable to check for updates right now.',exact=False)).to_be_visible()
   assert 'Failed to update a ServiceWorker' not in page.locator('main').inner_text()
   assert 'No new update is available.' not in page.locator('main').inner_text()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert page.evaluate('JSON.stringify(localStorage)')==before
   output=root/'tests/visual/actual';output.mkdir(parents=True,exist_ok=True)
   page.screenshot(path=str(output/f'update-check-530-{width}.png'),full_page=True)
   Handler.fail_update=False;button.click()
   expect(page.get_by_text('No new update is available.',exact=True)).to_be_visible()
   expect(page.get_by_text('Unable to check for updates right now.',exact=False)).to_have_count(0)
   context.set_offline(True);button.click()
   expect(page.get_by_text('Connect to the internet to check for updates.',exact=False)).to_be_visible()
   assert page.evaluate('JSON.stringify(localStorage)')==before
   print(f'{width}px: HTTP 530, retry/no update, offline, saved data and layout passed',flush=True)
   context.close()
  browser.close()
finally:server.shutdown()
