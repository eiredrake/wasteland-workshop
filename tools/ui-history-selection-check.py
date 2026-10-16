"""Work History bulk selection and atomic deletion; isolated browser storage."""
import ast,os
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
seed=next(ast.literal_eval(n.value) for n in ast.parse((root/'tools/ui-visual-check.py').read_text(encoding='utf-8')).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='seed' for t in n.targets))
key='wasteland-workshop-build-queue'
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome')
 fixture=browser.new_page();fixture.clock.install(time=datetime(2026,10,16,8,tzinfo=timezone.utc));fixture.clock.pause_at(datetime(2026,10,16,8,tzinfo=timezone.utc));fixture.goto('http://127.0.0.1:5186');fixture.evaluate(seed)
 fixture.evaluate("""()=>{let s=JSON.parse(localStorage.getItem('wasteland-workshop-build-queue')),h=s.builds.find(b=>b.status==='Completed');for(let i=1;i<=2;i++){const c=structuredClone(h);c.id='history-'+i;c.completedAt=h.completedAt+i;c.notes='Distinct notes '+i;s.builds.push(c)}localStorage.setItem('wasteland-workshop-build-queue',JSON.stringify(s))}""")
 storage=fixture.evaluate('JSON.stringify(localStorage)');fixture.close()
 base=os.environ.get('HISTORY_URL','http://127.0.0.1:5186').rstrip('/')
 for width in [320,390,1280]:
  context=browser.new_context(viewport={'width':width,'height':900})
  page=context.new_page();page.clock.install(time=datetime(2026,10,16,8,tzinfo=timezone.utc));page.clock.pause_at(datetime(2026,10,16,8,tzinfo=timezone.utc));page.goto(base);page.evaluate('(s)=>{for(const [k,v] of Object.entries(JSON.parse(s)))localStorage.setItem(k,v)}',storage);page.goto(base+'/#/history');page.reload()
  def records():return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key)).builds',key)
  before=records();pending=[b for b in before if b['status']!='Completed']
  checks=page.get_by_role('checkbox',name='Select History Record',exact=False)
  expect(checks).to_have_count(3)
  expect(page.get_by_role('button',name='Delete Selected (0)',exact=True)).to_be_disabled()
  checks.first.focus();page.keyboard.press('Space');expect(checks.first).to_be_checked()
  assert page.locator('.history-selection-card details[open]').count()==0
  page.get_by_role('button',name='Select All',exact=True).click();expect(page.locator('.history-selection-card input:checked')).to_have_count(3)
  page.get_by_role('button',name='Deselect All',exact=True).click();expect(page.locator('.history-selection-card input:checked')).to_have_count(0)
  page.get_by_role('button',name='Select All',exact=True).click();page.get_by_role('button',name='Delete Selected (3)',exact=True).click()
  expect(page.get_by_role('dialog')).to_be_visible();page.get_by_role('button',name='Cancel',exact=True).click();assert records()==before, [(a['id'],[(k,a.get(k),b.get(k)) for k in a if a.get(k)!=b.get(k)]) for a,b in zip(before,records()) if a!=b]
  # Save failure leaves every record and checkbox intact; retry succeeds.
  page.get_by_role('button',name='Delete Selected (3)',exact=True).click()
  page.evaluate('(key)=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw Error("Simulated failure");return window.originalSetItem.call(this,k,v)}}',key)
  page.get_by_role('dialog').get_by_role('button',name='Delete Selected',exact=True).click();assert records()==before, [(a['id'],[(k,a.get(k),b.get(k)) for k in a if a.get(k)!=b.get(k)]) for a,b in zip(before,records()) if a!=b];expect(checks).to_have_count(3)
  page.evaluate('()=>{Storage.prototype.setItem=window.originalSetItem}')
  page.get_by_role('button',name='Cancel',exact=True).click()
  checks.last.uncheck();page.get_by_role('button',name='Delete Selected (2)',exact=True).click()
  output=root/'tests/visual/actual';output.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(output/f'history-selection-dialog-{width}.png'))
  page.get_by_role('dialog').get_by_role('button',name='Delete Selected',exact=True).click()
  expect(checks).to_have_count(1);after=records();assert [b for b in after if b['status']!='Completed']==pending
  assert all(b==next(old for old in before if old['id']==b['id']) for b in after if b['status']=='Completed')
  page.reload();expect(checks).to_have_count(1)
  page.screenshot(path=str(output/f'history-selection-{width}.png'))
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.locator('.history-selection-card summary').click();page.get_by_role('button',name='Delete history record',exact=False).click();page.get_by_role('button',name='Delete History Record',exact=True).click()
  expect(checks).to_have_count(0);expect(page.get_by_role('button',name='Select All',exact=True)).to_be_disabled();assert records()==pending
  print(f'{width}px: keyboard, select/deselect, cancel, save failure, bulk/single delete, persistence and untouched queue passed',flush=True)
  context.close()
 browser.close()
