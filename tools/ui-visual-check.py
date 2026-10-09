"""Deterministic Chromium screenshot comparison. Requires Python Playwright and its Chromium.
Run Vite separately. --record writes candidates only; reviewed baselines are copied explicitly.
"""
from pathlib import Path
from datetime import datetime,timezone,timedelta
import argparse,json,sys,time
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:5186');parser.add_argument('--record',action='store_true');args=parser.parse_args()
root=Path(__file__).resolve().parents[1];baseline=root/'tests/visual/baselines';actual=root/'tests/visual/actual';actual.mkdir(parents=True,exist_ok=True)
seed="async()=>{\n const {masterBlueprints}=await import('/src/features/blueprints/blueprints.ts');\n const {actionCatalog}=await import('/src/features/actions/ActionCatalog.ts');\n const {addActionActivity}=await import('/src/features/actions/ActionService.ts');\n const {resolveEconomicsSettings}=await import('/src/economics/EconomicsSettings.ts');\n const {toggleBuildStatus,adjustBuildTimerMinutes}=await import('/src/features/builds/BuildQueueService.ts');\n const now=Date.now(),defaults=resolveEconomicsSettings();\n let records=addActionActivity([],actionCatalog[0],'explore',{},defaults,undefined,undefined,now,'history');\n records=toggleBuildStatus(records,'history',now); records=adjustBuildTimerMinutes(records,'history',-30,now);\n records=addActionActivity(records,actionCatalog[0],'explore',{},defaults,undefined,undefined,now,'active');\n records=addActionActivity(records,actionCatalog.find(a=>a.id==='helscape-mine'),'basic-scrap',{},defaults,undefined,undefined,now,'pending');\n localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true,completed:false}}}));\n localStorage.setItem('wasteland-workshop-build-queue',JSON.stringify({version:2,builds:records}));\n const bp=masterBlueprints.find(b=>b.name==='AA Blade')??masterBlueprints[0],other=masterBlueprints.find(b=>b.id!==bp.id);\n localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'audit',name:'Audit Collection',entries:[{blueprintId:bp.id,status:'acquired'},{blueprintId:other.id,status:'to-acquire'}]}]));\n localStorage.setItem('wasteland-workshop-active-blueprint-collection','audit');\n localStorage.setItem('wasteland-workshop-shopping-lists',JSON.stringify({version:1,lists:[{id:'audit',name:'Audit List',items:[{kind:'resource',resourceId:3807,name:'Basic Herb',quantity:2,acquired:false}]}],activeListId:'audit'}));\n localStorage.setItem('wasteland-workshop-warehouse',JSON.stringify({version:2,credits:20,entries:[{itemId:3807,quantity:2,expirationDate:'2027-09-01'},{itemId:3866,quantity:1,expirationDate:'2020-01-01'}]}));\n}"

failures=[]
with sync_playwright() as p:
 browser=p.chromium.launch()
 for size,w,h in [('desktop',1280,900),('mobile',390,844)]:
  page=browser.new_page(viewport={'width':w,'height':h},locale='en-US',timezone_id='America/New_York',reduced_motion='reduce')
  moment=datetime(2026,10,8,18,0,tzinfo=timezone.utc);page.clock.install(time=moment);page.clock.pause_at(moment+timedelta(seconds=1))
  page.goto(args.url);page.evaluate(seed);page.reload()
  def nav(name):
   page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name=name,exact=True).click()
  def capture(name):
   page.locator('.app-version > span').first.evaluate("e=>e.textContent='v0.6.3'");page.evaluate('document.fonts.ready');page.clock.run_for(50);time.sleep(.1);data=page.screenshot(full_page=name!='error-state',animations='disabled');filename=size+'-'+name+'.png';(actual/filename).write_bytes(data)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),name+' horizontal overflow'
   if not args.record and (not (baseline/filename).exists() or data!=(baseline/filename).read_bytes()):failures.append(filename)
  nav('Blueprint Catalog');page.get_by_role('searchbox').fill('AA Blade');capture('blueprint-catalog');page.get_by_text('AA Blade',exact=True).click();capture('blueprint-details')
  center=page.locator('.blueprint-build-button').evaluate('e=>{const r=document.createRange();r.selectNodeContents(e);const t=r.getBoundingClientRect(),b=e.getBoundingClientRect();return [Math.abs(t.x+t.width/2-b.x-b.width/2),Math.abs(t.y+t.height/2-b.y-b.height/2)]}')
  assert max(center)<2,center
  page.locator('.back-button').focus();page.keyboard.press('Tab');page.keyboard.press('Shift+Tab');assert page.locator('.back-button').evaluate('e=>getComputedStyle(e).outlineColor')=='rgb(224, 184, 63)';capture('keyboard-focus')
  nav('Actions');capture('actions');page.get_by_role('searchbox').hover();capture('search-hover');page.get_by_text('Proficient Agricultural',exact=True).first.click();assert page.locator('.back-button').count()==1;capture('action-details')
  nav('Work Queue');
  for heading in page.locator('.build-row-heading').all():
   alignment=heading.evaluate('e=>{const n=e.querySelector("strong").getBoundingClientRect(),s=e.querySelector(".build-status").getBoundingClientRect();return s.left>=n.right-1?Math.abs(n.y+n.height/2-s.y-s.height/2):0}')
   assert alignment<1,alignment
  capture('queue');page.locator('.work-entry summary').click();page.get_by_role('button',name='Action',exact=True).click();assert page.get_by_role('button',name='Action',exact=True).get_attribute('aria-pressed')=='true';capture('selected-source')
  picker=page.get_by_role('combobox',name='Find an Action');picker.fill('Repair Equipment');picker.press('ArrowDown');picker.press('Enter')
  assert page.get_by_role('button',name='Close Action Selection').count()==0
  assert not page.locator('.action-queue-details').get_attribute('open')
  add=page.locator('.action-details').get_by_role('button',name='Add to Queue',exact=True)
  assert add.bounding_box()['y']-picker.bounding_box()['y']<100
  capture('queue-action')
  page.locator('.action-queue-details summary').click();capture('queue-action-expanded');picker.fill('')
  page.locator('li.build-card details').last.locator('summary').click();page.get_by_role('button',name='Delete Activity Helscape Mine',exact=True).click();capture('delete-dialog');page.get_by_role('button',name='Cancel',exact=True).click()
  page.locator('.build-timer-settings').click();assert page.locator('dialog').count()==0;capture('timer-settings');page.get_by_role('button',name='Back to Work Queue',exact=True).click()
  nav('Work History');page.locator('details.blueprint-collection-card summary').click();capture('history')
  nav('Warehouse');
  badge=page.locator('.warehouse-list .remove-badge').first
  assert badge.locator('span').evaluate('e=>getComputedStyle(e).display')=='grid'
  geometry=badge.evaluate('e=>{const s=e.firstElementChild,r=s.getBoundingClientRect(),b=e.getBoundingClientRect();return [Math.abs((r.x+r.width/2)-(b.x+b.width/2)),Math.abs((r.y+r.height/2)-(b.y+b.height/2))]}')
  assert max(geometry)<1,geometry
  assert page.locator('.warehouse-list .warehouse-actions button').first.inner_text()=='−'
  assert page.locator('.warehouse-list .warehouse-actions button').nth(1).inner_text()=='+'
  capture('warehouse');nav('Shopping Lists');
  for row in page.locator('.shopping-status-badges').all():
   centers=row.evaluate('e=>Array.from(e.children).map(c=>{const r=c.getBoundingClientRect();return r.y+r.height/2})')
   assert max(centers)-min(centers)<1,centers
  capture('shopping');nav('Timer');capture('craft-timer')
  nav('Settings');page.locator('#expiration-warning-days').fill('-1');page.get_by_role('alert').scroll_into_view_if_needed();capture('error-state')
  # Important native controls remain accessible, themed and comfortably sized.
  small=page.locator('button:visible').evaluate_all('els=>els.filter(e=>e.getBoundingClientRect().height<43).map(e=>e.getAttribute("aria-label")||e.textContent)');assert not small,small
  page.close()
 (actual/'environment.json').write_text(json.dumps({'browser':browser.version,'platform':sys.platform,'viewports':['1280x900','390x844']},indent=2),encoding='utf-8');browser.close()
if args.record:print('Candidates recorded in tests/visual/actual. Inspect before explicitly copying to baselines; this command never updates baselines.')
elif failures:print('Visual differences (inspect actual and baseline; do not auto-accept): '+', '.join(failures));sys.exit(1)
else:print('34 visual comparisons passed; geometry, keyboard focus, selection and target checks passed.')
