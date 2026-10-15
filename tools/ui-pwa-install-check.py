"""Install menu grouping, retained browser prompt and fallback UI (native confirmation is simulated)."""
import threading
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=root/'tests/visual/actual/pwa';out.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(root/'dist')));threading.Thread(target=s.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{s.server_port}'
with sync_playwright() as p:
 b=p.chromium.launch()
 for width in [320,360,390,768,1280]:
  c=b.new_context(viewport={'width':width,'height':1000});page=c.new_page();page.goto(base);page.wait_for_function('navigator.serviceWorker.controller!==null');page.evaluate("()=>localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true,completed:true}}}))");page.reload()
  def nav(name):page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name=name,exact=True).click()
  page.get_by_role('button',name='Open menu').click();group=page.locator('.menu-heading',has_text='Application');assert group.evaluate("e=>{const labels=[];for(let n=e.nextElementSibling;n&&!n.classList.contains('menu-heading');n=n.nextElementSibling)if(n.tagName==='BUTTON')labels.push(n.textContent);return labels}")==['Install app','Settings','Update app']
  page.get_by_role('button',name='Install app',exact=True).click();expect(page.get_by_role('heading',name='Install app',exact=True)).to_be_visible();expect(page.get_by_role('button',name='Check for updates')).to_have_count(0)
  def offer(outcome='accepted',fail=False):page.evaluate("""({outcome,fail})=>{const event=new Event('beforeinstallprompt',{cancelable:true});event.prompt=async()=>{window.installCalls=(window.installCalls||0)+1;if(fail)throw Error('test')};event.userChoice=Promise.resolve({outcome});window.dispatchEvent(event)}""",{'outcome':outcome,'fail':fail})
  offer();nav('Work Queue');expect(page.get_by_role('button',name='Install Workshop')).to_have_count(0);nav('Install app');expect(page.get_by_role('button',name='Install Workshop')).to_be_visible()
  if width in [390,1280]:page.screenshot(path=str(out/f'install-prompt-{width}.png'))
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  button=page.get_by_role('button',name='Install Workshop');button.focus();page.keyboard.press('Enter');expect(page.get_by_text('Installation requested.',exact=False)).to_be_visible();assert page.evaluate('window.installCalls')==1
  offer('dismissed');button.click();expect(page.get_by_text('Installation canceled.',exact=False)).to_be_visible();offer(fail=True);button.click();expect(page.get_by_text('The browser could not open installation.',exact=False)).to_be_visible()
  page.evaluate("window.dispatchEvent(new Event('appinstalled'))");expect(page.get_by_text('Already installed.',exact=False)).to_be_visible();expect(button).to_have_count(0);page.reload();expect(page.get_by_role('heading',name='Install app',exact=True)).to_be_visible();c.close()
 c=b.new_context(user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',viewport={'width':390,'height':844});page=c.new_page();page.goto(base+'/#/install-app');expect(page.get_by_text('Tap Share, then Add to Home Screen.',exact=True)).to_be_visible();expect(page.get_by_role('button',name='Install Workshop')).to_have_count(0);page.screenshot(path=str(out/'install-iphone-instructions.png'));c.close();b.close()
s.shutdown();s.server_close();print('Install grouping, five widths, prompt retained across navigation, keyboard, acceptance/cancel/error/installed states and iPhone instructions passed')
