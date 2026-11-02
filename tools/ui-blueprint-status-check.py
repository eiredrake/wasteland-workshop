"""Issue #36 browser acceptance checks. Mobile inputs are emulated, not physical-device QA."""
import functools,json,os,re,tempfile,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
DATA=json.loads((root/'src/data/wasteland-blueprints.json').read_text(encoding='utf-8'))['blueprints']
bp=next(b for b in DATA if b['id']==4403);name=bp['name'];side=[b for b in DATA if b.get('itemCraftings') and b['id']!=bp['id']][:3]
key='wasteland-workshop-blueprint-collections'
initial=[{'id':'a','name':'Alpha QA','entries':[{'blueprintId':b['id'],'status':s} for b,s in zip(side,['acquired','to-acquire','sell'])]},{'id':'b','name':'Beta QA','entries':[{'blueprintId':bp['id'],'status':'to-acquire'}]}]
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=None;base=os.environ.get('STATUS_URL')
if not base:
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root/'dist')))
 threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
base=base.rstrip('/')
engine=os.environ.get('STATUS_BROWSER','chromium')
widths=[int(w) for w in os.environ.get('STATUS_WIDTHS','320,360,390,768,1280' if engine=='chromium' else '390,1280').split(',')]
try:
 with sync_playwright() as p:
  browser=getattr(p,engine).launch(**({'channel':'chrome'} if engine=='chromium' else {}))
  for width in widths:
   context=browser.new_context(viewport={'width':width,'height':960},has_touch=True,is_mobile=width<700 if engine=='chromium' else False)
   page=context.new_page();page.set_default_timeout(15000)
   page.goto(base)
   page.evaluate('(data)=>{localStorage.clear();localStorage.setItem(data.key,JSON.stringify(data.initial));localStorage.setItem("wasteland-workshop-active-blueprint-collection","a");localStorage.setItem("wasteland-workshop-guided-tours",JSON.stringify({version:1,progress:{"intro-blueprints":{viewed:true,completed:false}}}))}',{'key':key,'initial':initial})
   page.goto(base+'/#/catalog');page.reload()
   def saved():return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',key)
   def status(cid='a'):return next((e['status'] for c in saved() if c['id']==cid for e in c['entries'] if e['blueprintId']==bp['id']),None)
   def nav(label):
    page.get_by_role('button',name='Open menu',exact=True).click();page.get_by_role('button',name=label,exact=True).click()
   def search():page.get_by_role('searchbox',name='Search blueprints',exact=True).fill(name)
   def button():return page.get_by_role('button',name=re.compile(r'^(Not Acquired|Acquired|To Acquire|To Sell): '+re.escape(name)+r'\.'))
   def check(expected,cid='a'):
    labels={None:'Not Acquired','acquired':'Acquired','to-acquire':'To Acquire','sell':'To Sell'}
    expect(button()).to_have_attribute('aria-label',re.compile('^'+labels[expected]+':'))
    assert status(cid)==expected
   assert saved()==initial
   search();check(None)
   # Two full cycles, using touch/mouse and native keyboard activation.
   for index,expected in enumerate(['acquired','to-acquire','sell',None]*2):
    if index==1:button().focus();page.keyboard.press('Space')
    elif index==2:button().focus();page.keyboard.press('Enter')
    elif width<700 and engine=='chromium':button().tap()
    else:button().click()
    check(expected);assert saved()[1]==initial[1];assert saved()[0]['entries'][:3]==initial[0]['entries']
   button().click();check('acquired')
   box=button().bounding_box();assert box['width']>=44 and box['height']>=(44 if width<700 and engine=='chromium' else 34)
   print(f'{engine} {width}px: catalog cycle passed',flush=True)
   # Catalog Details uses all four transitions and updates the list immediately.
   page.get_by_role('cell',name=re.compile('^'+re.escape(name))).click()
   for expected in ['to-acquire','sell',None,'acquired']:button().click();check(expected)
   page.get_by_role('button',name='Back to Blueprints',exact=True).click();check('acquired')
   nav('Workshop');check('acquired')
   expect(page.get_by_role('button',name='Acquired (2)',exact=True)).to_be_visible()
   page.get_by_role('button',name='To Acquire (1)',exact=True).click();expect(button()).to_have_count(0)
   page.get_by_role('button',name='All (4)',exact=True).click();button().click();check('to-acquire')
   page.get_by_role('button',name='To Acquire (2)',exact=True).click();check('to-acquire')
   page.get_by_role('button',name='All (4)',exact=True).click();button().click();check('sell');expect(page.get_by_role('button',name='To Sell (2)',exact=True)).to_be_visible();button().click();expect(button()).to_have_count(0);assert status() is None
   # Collection-mode Details and search/navigation see the same active state.
   nav('Blueprint Catalog');search();button().click();nav('Workshop')
   page.get_by_role('cell',name=re.compile('^'+re.escape(name))).click()
   for expected in ['to-acquire','sell',None,'acquired']:button().click();check(expected)
   page.get_by_role('button',name='Back to Alpha QA',exact=True).click();check('acquired')
   nav('Blueprint Collections');page.get_by_role('button',name='Open collection Beta QA',exact=True).click();page.get_by_role('button',name='Cancel',exact=True).click();assert status()=='acquired';assert status('b')=='to-acquire'
   page.get_by_role('button',name='Open collection Beta QA',exact=True).click();page.get_by_role('button',name='Switch and Open Workshop',exact=True).click();check('to-acquire','b')
   button().click();check('sell','b');assert status()=='acquired'
   nav('Blueprint Catalog');search();check('sell','b');page.reload();search();check('sell','b')
   nav('Blueprint Collections');page.get_by_role('button',name='Open collection Alpha QA',exact=True).click();page.get_by_role('button',name='Switch and Open Workshop',exact=True).click();check('acquired')
   nav('Blueprint Catalog');search();before=saved()
   page.evaluate('(key)=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw Error("Test storage full");return window.originalSetItem.call(this,k,v)}}',key)
   button().click();check('acquired');assert saved()==before
   page.evaluate('()=>{Storage.prototype.setItem=window.originalSetItem}');button().click();check('to-acquire')
   output=root/'tests/visual/actual';output.mkdir(parents=True,exist_ok=True)
   page.screenshot(path=str(output/f'status-catalog-{engine}-{width}.png'))
   print(f'{engine} {width}px: cross-screen and collection isolation passed',flush=True)
   # Persisted PWA shell supports refresh and status edits with every request offline.
   page.evaluate('async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener("controllerchange",r,{once:true}))}')
   context.set_offline(True);page.reload(wait_until='load');search();check('to-acquire');button().click();check('sell')
   page.get_by_role('cell',name=re.compile('^'+re.escape(name))).click();check('sell');page.locator('[data-tour-target=blueprint-membership]').scroll_into_view_if_needed();page.screenshot(path=str(output/f'status-details-{engine}-{width}.png'))
   page.close();page=context.new_page();page.goto(base+'/#/catalog',wait_until='load');search();check('sell')
   context.set_offline(False)
   if width==390:
    # Exercise actual Export All Data / restore UI with the existing storage format.
    with tempfile.TemporaryDirectory() as folder:
     nav('Settings')
     with page.expect_download() as download:page.get_by_role('button',name='Export All Data',exact=True).click()
     path=Path(folder)/'backup.json';download.value.save_as(str(path));snapshot=saved()
     nav('Blueprint Catalog');search();button().click();check(None)
     nav('Settings');page.locator('#backup-file').set_input_files(str(path));page.get_by_role('button',name='Replace & Restore',exact=True).click()
     expect(page.get_by_role('button',name='Replace & Restore',exact=True)).to_have_count(0)
     assert saved()==snapshot
     nav('Blueprint Catalog');search();check('sell')
   context.close();print(f'{engine} {width}px: repeated cycles, Details modes, filters/counts, isolation, save failure, reopen and offline passed',flush=True)
  browser.close()
finally:
 if server:server.shutdown()
