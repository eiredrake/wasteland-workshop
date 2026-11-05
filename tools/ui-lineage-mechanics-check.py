"""Issue #38 gold-badge acceptance checks; mobile viewports are emulated."""
import functools,json,os,re,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
audit=json.loads((root/'docs/audits/issue-38-lineage-after.json').read_text(encoding='utf-8'))
new_named=[r for r in audit['comparison'] if any(b!='Lineage: Any' for b in r['after'])]
catalog=json.loads((root/'src/data/wasteland-blueprints.json').read_text(encoding='utf-8'))['blueprints']
hidden={b['id'] for b in catalog if b.get('itemCraftings') and b['itemCraftings'][0]['craftingFinalProducts'][0]['finalProduct']['kind']=='taxonomy'}
byid={r['id']:r for r in audit['records']}
strain=next(r for r in audit['records'] if any(b['type']=='Strain' for b in r['badges']))
cases=[(r['id'],r['name'],r['after']) for r in new_named]+[(4407,'Hooch',['Lineage: Any']),(5392,'Adrenal Stabilizer Serum Combat Enhancer',['Lineage: Any']),(4403,'Angry Apple Invigorating Brew',['Lineage: Townie']),(strain['id'],strain['name'],['Strain: Iron or Unstable']),(4744,'M.M. Necro-Info Head Jar',[]),(4860,"The Hunter's Secret",[])]
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=None;base=os.environ.get('LINEAGE_URL')
if not base:
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root/'dist')))
 threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
base=base.rstrip('/')
widths=[int(w) for w in os.environ.get('LINEAGE_WIDTHS','390,1280').split(',')]
output=root/'tests/visual/actual/lineage-mechanics';output.mkdir(parents=True,exist_ok=True)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chrome')
  for width in widths:
   context=browser.new_context(viewport={'width':width,'height':960},has_touch=True,is_mobile=width<700)
   page=context.new_page();page.set_default_timeout(15000)
   page.goto(base,wait_until='networkidle')
   collection=[{'id':'lineage-qa','name':'Lineage QA','entries':[{'blueprintId':i,'status':'acquired'} for i,_,_ in cases]}]
   page.evaluate('(c)=>{localStorage.clear();localStorage.setItem("wasteland-workshop-blueprint-collections",JSON.stringify(c));localStorage.setItem("wasteland-workshop-active-blueprint-collection","lineage-qa");localStorage.setItem("wasteland-workshop-guided-tours",JSON.stringify({version:1,progress:{"intro-blueprints":{viewed:true,completed:false}}}))}',collection)
   page.reload();before=page.evaluate('localStorage.getItem("wasteland-workshop-blueprint-collections")')
   def nav(label):page.get_by_role('button',name='Open menu',exact=True).click();page.get_by_role('button',name=label,exact=True).click()
   def badges(locator,expected):
    expect(locator).to_have_count(len(expected))
    assert sorted(locator.all_text_contents())==sorted(expected)
    if expected:
     assert locator.first.evaluate('e=>{const s=getComputedStyle(e),probe=document.createElement("span");probe.className="blueprint-usage-badge";probe.textContent="Lineage: Townie";document.querySelector("main").appendChild(probe);const expected=getComputedStyle(probe).borderColor;probe.remove();return s.borderColor===expected}')
   for item_id,name,expected in cases:
    nav('Blueprint Catalog');page.get_by_role('searchbox',name='Search blueprints',exact=True).fill(chr(34)+name+chr(34))
    row=page.get_by_role('row').filter(has_text=name)
    if item_id in hidden:
     expect(row).to_have_count(0)
     page.goto(base+f'/#/catalog/{item_id}',wait_until='load')
     header=page.locator('.blueprint-details-header');badges(header.locator('.blueprint-usage-badge'),expected)
     header.screenshot(path=str(output/f'details-{item_id}-{width}.png'))
     assert page.evaluate('localStorage.getItem("wasteland-workshop-blueprint-collections")')==before
     continue
    expect(row).to_have_count(1);badges(row.locator('.blueprint-usage-badge'),expected)
    if item_id==4419:page.screenshot(path=str(output/f'catalog-slicker-{width}.png'))
    row.get_by_role('cell',name=re.compile('^'+re.escape(name))).click()
    header=page.locator('.blueprint-details-header');badges(header.locator('.blueprint-usage-badge'),expected)
    page.evaluate('scrollTo(0,0)');header.screenshot(path=str(output/f'details-{item_id}-{width}.png'))
    if item_id in [r['id'] for r in new_named] or item_id in [4407,5392]:
     assert header.locator('.blueprint-usage-badge').first.get_attribute('title').startswith('Target applicability:')
    nav('Workshop');page.get_by_role('searchbox',name='Search collection',exact=True).fill(chr(34)+name+chr(34))
    row=page.get_by_role('row').filter(has_text=name)
    expect(row).to_have_count(1);badges(row.locator('.blueprint-usage-badge'),expected)
    if item_id==4419:page.screenshot(path=str(output/f'workshop-slicker-{width}.png'))
    row.get_by_role('cell',name=re.compile('^'+re.escape(name))).click();badges(page.locator('.blueprint-details-header .blueprint-usage-badge'),expected)
    assert page.evaluate('localStorage.getItem("wasteland-workshop-blueprint-collections")')==before
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),name
   # The same badges remain available after offline PWA refresh.
   page.evaluate('async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener("controllerchange",r,{once:true}))}')
   nav('Blueprint Catalog');context.set_offline(True);page.reload(wait_until='load');page.get_by_role('searchbox',name='Search blueprints',exact=True).fill('Slicker Healing Brew')
   badges(page.locator('.datalist .blueprint-usage-badge'),['Lineage: Townie'])
   assert page.evaluate('localStorage.getItem("wasteland-workshop-blueprint-collections")')==before
   print(f'{width}px: 8 healing brews, 8 poison Details (existing taxonomy filter preserved), Any, Strain, negatives, both visible Details modes, unchanged collections and offline passed',flush=True)
   context.close()
  browser.close()
finally:
 if server:server.shutdown()
