"""Taxonomy catalog/queue acceptance; isolated data and emulated mobile sizes."""
import functools,json,os,re,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'src/data/wasteland-blueprints.json').read_text(encoding='utf-8'))['blueprints']
prints=[b for b in data if b.get('itemCraftings') and b['itemCraftings'][0]['craftingFinalProducts'][0]['finalProduct']['kind']=='taxonomy']
assert len(prints)==16
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=None;base=os.environ.get('TAXONOMY_URL')
if not base:
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root/'dist')))
 threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
base=base.rstrip('/')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chrome')
  for width in map(int,os.environ.get('TAXONOMY_WIDTHS','320,360,390,768,1280').split(',')):
   context=browser.new_context(viewport={'width':width,'height':960})
   page=context.new_page();page.goto(base,wait_until='networkidle')
   page.evaluate('()=>{localStorage.clear();localStorage.setItem("wasteland-workshop-guided-tours",JSON.stringify({version:1,progress:{"intro-blueprints":{viewed:true}}}))}')
   page.reload()
   def nav(name):
    page.get_by_role('button',name='Open menu',exact=True).click();page.get_by_role('button',name=name,exact=True).click()
   def queue():return page.evaluate('JSON.parse(localStorage.getItem("wasteland-workshop-build-queue")).builds')
   for index,b in enumerate(prints):
    nav('Blueprint Catalog');page.get_by_role('searchbox',name='Search blueprints',exact=True).fill('"'+b['name']+'"')
    row=page.get_by_role('row').filter(has_text=b['name']);expect(row).to_have_count(1)
    row.get_by_role('cell',name=re.compile('^'+re.escape(b['name']))).click()
    page.locator('[data-tour-target="blueprint-build"]').click()
    records=queue();assert len(records)==index+1
    item=next(q for q in records if q['blueprintId']==b['id'])
    assert item['recipe']==b['itemCraftings'][0]
    assert item['timer']['originalDurationMs']==b['itemCraftings'][0]['craftingTimeInMinute']*60000
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   nav('Work Queue')
   card=page.locator('li.build-card').last;card.locator('summary').click()
   card.get_by_role('button',name='Notes & Overrides',exact=True).click()
   page.get_by_label('Notes',exact=True).fill('Chosen output recorded manually')
   page.get_by_role('button',name='Save Activity',exact=True).click()
   page.reload();assert len(queue())==16
   assert queue()[-1]['notes']=='Chosen output recorded manually'
   output=root/'tests/visual/actual/taxonomy';output.mkdir(parents=True,exist_ok=True)
   page.screenshot(path=str(output/f'queue-{width}.png'))
   print(f'{width}px: all 16 Catalog rows enqueue unchanged recipes; notes and reload passed',flush=True)
   context.close()
  browser.close()
finally:
 if server:server.shutdown()
