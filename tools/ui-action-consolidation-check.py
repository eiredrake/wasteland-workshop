"""Queue-only Action creation, mechanical fields, legacy history/progress and mobile layouts."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
root=Path(__file__).resolve().parents[1];out=root/'tests/visual/actual';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch()
 for width,height in [(1280,900),(390,844),(320,700),(768,1024)]:
  page=browser.new_page(viewport={'width':width,'height':height});page.set_default_timeout(10000)
  page.clock.install()
  page.goto('http://127.0.0.1:5186')
  page.evaluate("""async()=>{
   localStorage.clear();localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true,completed:false},'actions':{viewed:true,completed:true},'warehouse':{viewed:true,completed:true}}}));
   const {actionCatalog}=await import('/src/features/actions/ActionCatalog.ts');const {addActionActivity}=await import('/src/features/actions/ActionService.ts');const {tickBuildQueue}=await import('/src/features/builds/BuildQueueService.ts');const {resolveEconomicsSettings}=await import('/src/economics/EconomicsSettings.ts');
   const time=Date.now()-2000000;const records=tickBuildQueue(addActionActivity([],actionCatalog.find(a=>a.id==='proficient-medical-mangle'),'mangle',{limbs:3},resolveEconomicsSettings(),'Legacy Patient',undefined,time,'legacy'),Date.now());
   localStorage.setItem('wasteland-workshop-build-queue',JSON.stringify({version:2,builds:records}));
  }""");page.reload()
  def nav(name):
   page.get_by_role('button',name='Open menu').click()
   expect(page.locator('nav').get_by_role('button',name='Actions',exact=True)).to_have_count(0)
   page.get_by_role('button',name=name,exact=True).click()
  def records():return page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-build-queue')).builds")
  before=records()[0]
  nav('Work History');page.locator('details.blueprint-collection-card summary').click()
  expect(page.get_by_text('Target: Legacy Patient',exact=True)).to_be_visible()
  expect(page.get_by_text('Affected limbs: 3',exact=True)).to_be_visible()
  nav('Work Queue');page.locator('.work-entry summary').click();page.get_by_role('button',name='Action',exact=True).click()
  picker=page.get_by_role('combobox',name='Find an Action')
  def choose(name):picker.fill(name);picker.press('ArrowDown');picker.press('Enter')
  choose('Treat Mangle')
  expect(page.get_by_label('Affected limbs')).to_have_value('1')
  expect(page.get_by_label('Target',exact=False)).to_have_count(0)
  page.get_by_label('Affected limbs').fill('3')
  expect(page.locator('[data-tour-target="action-costs"]')).to_contain_text('00:14:00 · Mind: 15 · Resolve: 0')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  if width in (1280,390):page.locator('.work-entry').screenshot(path=str(out/f'action-consolidation-{width}.png'))
  page.locator('.action-configuration').get_by_role('button',name='Add to Queue',exact=True).click()
  current=next(r for r in records() if r['id']!='legacy');assert current['status']=='Working';assert current['actionSnapshot']['configuration']=={'limbs':3};assert 'target' not in current['actionSnapshot']
  page.locator('.blueprint-craft-timer').click();paused=next(r for r in records() if r['id']!= 'legacy');assert paused['status']=='Paused';remaining=paused['timer']['remainingMs']
  page.reload();nav('Work Queue');assert next(r for r in records() if r['id']!= 'legacy')['timer']['remainingMs']==remaining
  page.locator('.blueprint-craft-timer').click();page.clock.fast_forward(remaining+1000)
  expect(page.locator('li.build-card')).to_have_count(0)
  assert records()[0]['actionSnapshot']==before['actionSnapshot']
  nav('Work Queue');page.locator('.work-entry summary').click();page.get_by_role('button',name='Action',exact=True).click()
  choose('Basic Agricultural')
  expect(page.locator('.action-configuration select')).to_have_count(0)
  expect(page.get_by_label('Herbs in this gathering')).to_have_value('1')
  page.get_by_label('Herbs in this gathering').fill('3')
  # Recalculation does not wait for the mandatory session identifier.
  expect(page.locator('[data-tour-target="action-costs"]')).to_contain_text('00:30:00 · Mind: 15')
  page.locator('.action-configuration').get_by_role('button',name='Add to Queue',exact=True).click();assert len(records())==2
  page.get_by_label('Session ID').fill('field-session');page.locator('.action-configuration').get_by_role('button',name='Add to Queue',exact=True).click()
  latest=next(r for r in records() if r['status']=='Working');assert latest['actionSnapshot']['configuration']=={'quantity':3,'herb':'Basic Herb'};assert latest['actionSnapshot']['option']['outputs']==[{'name':'Basic Herb','quantity':3}]
  choose('Master Agricultural');page.locator('.action-configuration select').select_option('named-herb')
  expect(page.get_by_label('Selected herb (same throughout session)')).to_be_visible();expect(page.get_by_label('Session ID')).to_be_visible()
  choose('Basic Medical — Healing');page.get_by_label('Additional Mind (1 Mind included)').fill('9');expect(page.locator('[data-tour-target="action-costs"]')).to_contain_text('00:10:00 · Mind: 10')
  choose('Helscape Mine');page.locator('.action-configuration select').select_option('rare-scrap');expect(page.locator('[data-tour-target="action-costs"]')).to_contain_text('00:10:00 · Mind: 15')
  nav('Settings')
  result=page.evaluate("""async()=>{const {createBackup}=await import('/src/features/backup/BackupRepository.ts');const {parseBackup}=await import('/src/features/backup/Backup.ts');return parseBackup(JSON.stringify(createBackup()))}""")
  assert result['data']['guidedTours']['actions']=={'viewed':True,'completed':True}
  assert next(r for r in result['data']['buildQueue']['builds'] if r['id']=='legacy')['actionSnapshot']==before['actionSnapshot']
  page.get_by_role('button',name='Open menu').click();page.get_by_text('Guided Tours',exact=True).click()
  expect(page.locator('.guided-tours-menu').get_by_role('button',name='Actions',exact=True)).to_have_count(0)
  page.locator('.guided-tours-menu').get_by_role('button',name='Work Queue',exact=True).click()
  panel=page.get_by_role('region',name='Guided tour');seen=[]
  while panel.count():
   seen.append(panel.get_by_role('heading').inner_text())
   button=panel.get_by_role('button',name='Finish Tour',exact=True)
   if button.count():button.click();break
   panel.get_by_role('button',name='Next',exact=True).click()
  assert 'Find an Action' in seen and 'Configure relevant inputs' in seen and 'Review costs and requirements' in seen
  progress=page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-guided-tours')).progress")
  assert progress['actions']['completed'] and progress['warehouse']['completed'] and progress['work-queue']['completed']
  page.close()
 browser.close()
print('Action consolidation passed: four layouts, queue-only navigation, medical/gathering/mine inputs, dynamic costs, validation, pause/resume/completion, legacy snapshots/backup/tour progress and revised Work Queue tour.')
