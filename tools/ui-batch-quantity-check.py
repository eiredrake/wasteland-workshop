"""Isolated browser acceptance checks; mobile sizes/touch are emulated, not physical-device QA."""
import functools,json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/visual/actual/batch-quantity';OUT.mkdir(parents=True,exist_ok=True)
DATA=json.loads((ROOT/'src/data/wasteland-blueprints.json').read_text(encoding='utf-8'))['blueprints']
BP=next(b for b in DATA if b['name']=='AA Blade');COMPONENTS=BP['itemCraftings'][0]['craftingComponents']
QUEUE='wasteland-workshop-build-queue';SHOPPING='wasteland-workshop-shopping-lists';WAREHOUSE='wasteland-workshop-warehouse'
first=COMPONENTS[0]['component']
state={'version':1,'activeListId':'a','lists':[{'id':'a','name':'Alpha','items':[{'kind':'resource','resourceId':first['id'],'name':first['name'],'quantity':4,'acquired':True}]},{'id':'b','name':'Zeta','items':[]}]}
seed="""() => { if(localStorage.getItem('batch-qa-seeded'))return;
 localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true,completed:false}}}));
 localStorage.setItem('wasteland-workshop-build-queue',JSON.stringify({version:2,builds:[]}));
 localStorage.setItem('wasteland-workshop-shopping-lists',STATE);
 localStorage.setItem('wasteland-workshop-warehouse',JSON.stringify({version:2,credits:23,entries:[]}));
 localStorage.setItem('batch-qa-seeded','true'); }""".replace('STATE',json.dumps(json.dumps(state)))
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=None
base=os.environ.get('BATCH_URL')
if not base:
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT/'dist')))
 threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
base=base.rstrip('/')+'/'
engine=os.environ.get('BATCH_BROWSER','chromium')
with sync_playwright() as p:
 browser=getattr(p,engine).launch(**({'channel':'chrome'} if engine=='chromium' else {}))
 widths=[320,360,390,768,1280] if engine=='chromium' else [390,1280]
 for width in widths:
  context=browser.new_context(viewport={'width':width,'height':900},has_touch=True)
  page=context.new_page();page.set_default_timeout(10000);page.add_init_script('('+seed+')()')
  page.goto(base+f'#/catalog/{BP["id"]}',wait_until='networkidle')
  def queue():return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key)).builds',QUEUE)
  def lists():return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',SHOPPING)
  def count():return len(queue())
  def details():
   page.goto(base+f'#/catalog/{BP["id"]}');page.locator('.blueprint-details').wait_for()
  def primary():return page.locator('[data-tour-target="blueprint-build"]')
  def choose(label='Choose build quantity'):
   page.get_by_role('button',name=label,exact=True).click();page.locator('dialog.quantity-dialog').wait_for()
  def confirm(n):
   page.locator('dialog select').select_option(str(n));page.get_by_role('button',name=f'Add {n}',exact=True).click()
  def cancel():page.get_by_role('button',name='Cancel',exact=True).click();assert page.locator('dialog').count()==0
  def hold(button=None):
   button=button if button is not None else primary()
   button.scroll_into_view_if_needed();box=button.bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.wait_for_timeout(600)
   page.locator('dialog.quantity-dialog').wait_for();page.mouse.up()
  warehouse=page.evaluate('(key)=>localStorage.getItem(key)',WAREHOUSE)
  primary().click();assert count()==1
  details();hold();assert count()==1
  assert page.locator('dialog select').input_value()=='1'
  assert page.locator('dialog option').evaluate_all('(options)=>options.map(o=>o.value)')==[str(i) for i in range(1,11)]
  assert page.get_by_role('button',name='Add 1',exact=True).count()==1
  page.locator('dialog select').select_option('3');assert page.get_by_role('button',name='Add 3',exact=True).count()==1
  page.get_by_role('button',name='Add 3',exact=True).evaluate('(button)=>{button.click();button.click()}')
  assert count()==4, ('After long-press batch', count(), page.locator('dialog').count(), page.locator('dialog').inner_text() if page.locator('dialog').count() else '');assert len({a['id'] for a in queue()})==4
  assert [a['status'] for a in queue()]==['Working','Enqueued','Enqueued','Enqueued']
  details();page.screenshot(path=str(OUT/f'{engine}-build-{width}.png'));choose();assert page.locator('dialog select').input_value()=='1'
  assert page.locator('dialog').evaluate('(d)=>d.getBoundingClientRect().width')<=width
  assert page.locator('dialog select').evaluate('(d)=>d.getBoundingClientRect().height')>=44
  for button in page.locator('dialog button').all():assert button.bounding_box()['height']>=44
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(OUT/f'{engine}-quantity-{width}.png'),full_page=False)
  page.locator('dialog select').select_option('10');cancel();assert count()==4
  # Pointer movement/scroll/cancel cannot turn into a hold or single addition.
  primary().scroll_into_view_if_needed();box=primary().bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
  page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+25,y);page.wait_for_timeout(600);page.mouse.up();assert count()==4;assert page.locator('dialog').count()==0
  primary().dispatch_event('pointerdown',{'isPrimary':True,'button':0,'pointerId':9,'pointerType':'pen','clientX':x,'clientY':y})
  primary().dispatch_event('pointercancel',{'isPrimary':True,'pointerId':9,'pointerType':'pen'})
  page.wait_for_timeout(550);primary().dispatch_event('click',{'detail':1});assert count()==4;assert page.locator('dialog').count()==0
  primary().dispatch_event('pointerdown',{'isPrimary':True,'button':0,'pointerId':10,'pointerType':'touch','clientX':x,'clientY':y})
  page.evaluate('window.dispatchEvent(new Event("scroll"))');page.wait_for_timeout(550)
  primary().dispatch_event('pointerup',{'isPrimary':True,'pointerId':10});primary().dispatch_event('click',{'detail':1});assert count()==4;assert page.locator('dialog').count()==0
  # Keyboard recovers after canceled touch and arrow/Escape restores focus.
  primary().focus();page.keyboard.press('Space');assert count()==5
  details();page.get_by_role('button',name='Choose build quantity',exact=True).focus();page.keyboard.press('Enter');page.locator('dialog').wait_for()
  page.keyboard.press('Escape');assert page.locator('dialog').count()==0
  assert page.get_by_role('button',name='Choose build quantity',exact=True).evaluate('(b)=>b===document.activeElement')
  # Failed queue persistence leaves all old state intact, retains quantity and permits retry.
  choose();page.locator('dialog select').select_option('3');before=queue()
  page.evaluate('(key)=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw Error("Simulated storage failure");return window.originalSetItem.call(this,k,v)}}',QUEUE)
  page.get_by_role('button',name='Add 3',exact=True).click();page.locator('dialog [role=alert]').wait_for();assert queue()==before
  page.evaluate('()=>{Storage.prototype.setItem=window.originalSetItem}');page.get_by_role('button',name='Add 3',exact=True).click();assert count()==8
  # Independently edit one batch activity.
  row=page.locator('li.build-card').nth(2);row.locator('summary').click();row.get_by_role('button',name='Notes & Overrides',exact=True).click()
  page.get_by_label('Notes',exact=True).fill('Only second batch instance');page.locator('input[id$="-mindCostPerPoint"]').fill('9')
  page.get_by_role('button',name='Save Activity',exact=True).click();assert queue()[2]['overrides']['mindCostPerPoint']==9
  assert queue()[1]['overrides']=={} and queue()[3]['overrides']=={}
  details();page.wait_for_timeout(800);choose();confirm(10);assert count()==18
  # Shopping destinations and aggregated multiples.
  details();page.locator('#blueprint-shopping-target').select_option('b');page.get_by_role('button',name='Add All Components',exact=True).click()
  assert lists()['activeListId']=='b'
  for c in COMPONENTS:assert next(r for r in lists()['lists'][1]['items'] if r['resourceId']==c['component']['id'])['quantity']==c['amount']
  shopping_button=page.get_by_role('button',name='Add All Components',exact=True)
  shopping_button.scroll_into_view_if_needed();before_touch=lists()
  if engine=='chromium':
   cdp=context.new_cdp_session(page);box=shopping_button.bounding_box();point={'x':box['x']+box['width']/2,'y':box['y']+box['height']/2}
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]});page.wait_for_timeout(600)
   page.locator('dialog.quantity-dialog').wait_for();cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cdp.detach()
  else:hold(shopping_button)
  assert lists()==before_touch
  confirm(3)
  # A prior normal addition is guarded for 750ms; allow it to settle before retrying if necessary.
  if page.locator('dialog').count():
   page.wait_for_timeout(800);page.get_by_role('button',name='Add 3',exact=True).click()
  for c in COMPONENTS:assert next(r for r in lists()['lists'][1]['items'] if r['resourceId']==c['component']['id'])['quantity']==4*c['amount']
  assert len(lists()['lists'][1]['items'])==len({c['component']['id'] for c in COMPONENTS})
  before=lists();choose('Choose shopping list quantity');page.locator('dialog select').select_option('10');cancel();assert lists()==before
  page.locator('#blueprint-shopping-target').select_option('a');page.wait_for_timeout(800);choose('Choose shopping list quantity');confirm(3)
  assert lists()['activeListId']=='a'
  for c in COMPONENTS:
   expected=3*c['amount']+(4 if c['component']['id']==first['id'] else 0)
   assert next(r for r in lists()['lists'][0]['items'] if r['resourceId']==c['component']['id'])['quantity']==expected
  page.wait_for_timeout(800);choose('Choose shopping list quantity');page.locator('dialog select').select_option('3');before=lists()
  page.evaluate('(key)=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw Error("Simulated storage failure");return window.originalSetItem.call(this,k,v)}}',SHOPPING)
  page.get_by_role('button',name='Add 3',exact=True).click();page.locator('dialog [role=alert]').wait_for();assert lists()==before
  page.evaluate('()=>{Storage.prototype.setItem=window.originalSetItem}');page.get_by_role('button',name='Add 3',exact=True).click();assert page.locator('dialog').count()==0
  assert page.evaluate('(key)=>localStorage.getItem(key)',WAREHOUSE)==warehouse
  # Offline, both operations remain usable after a refresh.
  page.evaluate('''async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));}''')
  context.set_offline(True);page.reload(wait_until='load');page.locator('.blueprint-details').wait_for();page.wait_for_timeout(800)
  choose();confirm(3);assert count()==21
  details();choose('Choose shopping list quantity');confirm(3)
  assert page.locator('dialog').count()==0
  context.set_offline(False)
  # Actions expose the identical selector and produce independent activities.
  page.goto(base+'#/builds');page.locator('details.work-entry > summary').click();page.get_by_role('button',name='Action',exact=True).click()
  picker=page.get_by_role('combobox',name='Find an Action');picker.fill('Explore with Vaguely Trustworthy Map Set');page.get_by_role('option',name='Explore with Vaguely Trustworthy Map Set',exact=True).click()
  choose('Choose action quantity');confirm(3);assert count()==24;assert all(a.get('sourceType')=='Action' for a in queue()[-3:])
  assert len({a['id'] for a in queue()})==24
  if width==390:
   picker=page.get_by_role('combobox',name='Find an Action');picker.fill('Explore with Vaguely Trustworthy Map Set');page.get_by_role('option',name='Explore with Vaguely Trustworthy Map Set',exact=True).click()
   page.locator('[data-tour-target="action-submit"]').click();assert count()==25
  if width==320:
   long_name=max((b for b in DATA if b.get('itemCraftings')),key=lambda b:len(b['name']))
   page.goto(base+f'#/catalog/{long_name["id"]}');choose();assert long_name['name'] in page.locator('dialog').inner_text()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(OUT/f'{engine}-long-name-{width}.png'));cancel()
  # Landscape layout and another keyboard cancel.
  page.set_viewport_size({'width':844,'height':390});details();choose();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.keyboard.press('Escape')
  page.evaluate('window.scrollTo(0,0)');page.mouse.move(5,200);page.mouse.wheel(0,300);page.wait_for_timeout(250);assert page.evaluate('scrollY')>0
  context.close();print(f'{engine} {width}px: quantity, gestures, snapshots, shopping, atomic retry, Actions and offline checks passed.',flush=True)
 browser.close()
if server:server.shutdown()
