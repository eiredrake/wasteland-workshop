"""Isolated first-run, guided-action and replay checks. Requires local Vite and Playwright."""
from pathlib import Path
import json,argparse,sys
parser=argparse.ArgumentParser();parser.add_argument("--record",action="store_true");args=parser.parse_args();differences=[]
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=root/'tests/visual/actual';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch()
 for name,width,height in [('desktop',1280,900),('mobile',390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height},has_touch=name=='mobile',is_mobile=name=='mobile',reduced_motion='reduce')
  def capture(view):
   page.evaluate('document.fonts.ready');page.wait_for_timeout(400)
   filename=name+'-tour-'+view+'.png';data=page.screenshot(full_page=False,animations='disabled');(out/filename).write_bytes(data)
   baseline=root/'tests/visual/baselines'/filename
   if not args.record and (not baseline.exists() or baseline.read_bytes()!=data):differences.append(filename)
  errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto('http://127.0.0.1:5186')
  panel=page.get_by_role('region',name='Guided tour')
  expect(panel).to_be_visible(timeout=5000)
  assert page.evaluate("Object.keys(JSON.parse(localStorage.getItem('wasteland-workshop-guided-tours')).progress)")==['intro-blueprints']
  capture('welcome')
  panel.get_by_role('button',name='Skip Tour',exact=True).click();page.reload();page.wait_for_timeout(1800);assert panel.count()==0
  def launch(title):
   page.get_by_role('button',name='Open menu').click();page.get_by_text('Guided Tours',exact=True).click();page.locator('.guided-tours-menu').get_by_role('button',name=title,exact=True).click()
  def step(title):expect(panel.get_by_role('heading',name=title,exact=True)).to_be_visible()
  launch('Getting Started: Blueprints');panel.get_by_role('button',name='Start Tour').click();step('The Blueprint Catalog');panel.get_by_role('button',name='Next',exact=True).click();step('Search and Filter')
  page.get_by_role('searchbox').fill('AA Blade');page.get_by_text('AA Blade',exact=True).click();step('Understanding a Blueprint')
  capture('blueprint')
  panel.get_by_role('button',name='Next',exact=True).click();step('Your Blueprint Collections');panel.get_by_role('button',name='Next',exact=True).click();step('Create Your First Collection')
  page.get_by_role('button',name='Add Collection',exact=True).click();page.get_by_label('Collection Name',exact=True).fill('Tour Collection');page.get_by_role('button',name='Save Collection',exact=True).click();step('Add Blueprints to Your Collection')
  page.locator('[data-tour-target="blueprint-membership"]').get_by_role('button',name='Not Acquired',exact=True).click();step('Ready to Make Something?')
  assert page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0].entries[0].status")=='to-acquire'
  capture('build')
  page.get_by_role('button',name='Build',exact=True).click();step('Your Work Queue')
  queue=lambda:page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-build-queue')).builds")
  assert len(queue())==1 and queue()[0]['status']=='Working'
  panel.get_by_role('button',name='Previous Step',exact=True).click();step('Ready to Make Something?');panel.get_by_role('button',name='Use Existing',exact=True).click();assert len(queue())==1
  panel.get_by_role('button',name='Next',exact=True).click();step("You're Ready to Go!");panel.get_by_role('button',name='Finish Tour',exact=True).click();assert panel.count()==0
  page.reload();page.wait_for_timeout(1800);assert panel.count()==0
  page.get_by_role('button',name='Open menu').click();page.get_by_text('Guided Tours',exact=True).click();capture('menu')
  assert '✓' in page.locator('.guided-tours-menu').get_by_role('button',name='Getting Started: Blueprints (completed)',exact=True).inner_text()
  page.get_by_role('button',name='Open menu').click()
  launch('Getting Started: Blueprints (completed)');panel.get_by_role('button',name='Exit Tour',exact=True).click()
  assert page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-guided-tours')).progress['intro-blueprints'].completed")
  launch('Warehouse');panel.get_by_role('button',name='Next',exact=True).click();step('Add an item or resource');assert page.locator('[data-tour-target="warehouse-add"].tour-highlight').count()==1
  page.set_viewport_size({'width':320,'height':700});page.wait_for_timeout(350)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  targets=panel.locator('button').evaluate_all('els=>els.map(e=>e.getBoundingClientRect().height)');assert min(targets)>=44,targets
  page.keyboard.press('Escape');assert panel.count()==0
  assert page.locator('[data-tour-target="menu"]').evaluate('e=>e===document.activeElement')
  # Every other tour is manual, can finish independently, and leaves real data intact.
  titles=['Blueprint Collections','Shopping Lists','Actions','Work Queue','Work History','Timer','Timer Settings','Application Settings & Overrides']
  for title in titles:
   launch(title)
   for _ in range(12):
    finish=panel.get_by_role('button',name='Finish Tour',exact=True)
    if finish.count():finish.click();break
    panel.get_by_role('button',name='Next',exact=True).click()
   assert panel.count()==0
  assert len(queue())==1
  assert not errors,errors
  page.close()
 # Import/initialization never interrupts with a first-run offer.
 page=browser.new_page();page.goto('http://127.0.0.1:5186')
 page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Settings',exact=True).click()
 page.wait_for_timeout(1700);assert page.get_by_role('region',name='Guided tour').count()==0
 old=page.evaluate("async()=>{const {createBackup}=await import('/src/features/backup/BackupRepository.ts');const backup=createBackup();backup.schemaVersion=3;delete backup.data.guidedTours;return JSON.stringify(backup)}")
 page.locator('input[type=file]').set_input_files({'name':'legacy.json','mimeType':'application/json','buffer':old.encode()})
 page.wait_for_timeout(1700);assert page.get_by_role('region',name='Guided tour').count()==0
 page.get_by_role('button',name='Replace & Restore',exact=True).click();page.wait_for_timeout(2000)
 assert page.get_by_role('region',name='Guided tour').count()==0
 assert page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-guided-tours')).progress['intro-blueprints'].viewed")
 page.close()
 browser.close()
if differences:print('Tour visual differences: '+', '.join(differences));sys.exit(1)
print('Desktop/mobile onboarding passed: first offer/skip/reload, real selection/collection/membership/Build, Back without duplicate work, completion/checkmarks/replay, manual-only tours, Escape, highlights, resize and 44px targets.')
