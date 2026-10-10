"""Check procedure catalog/details and Action queue routing at desktop/mobile widths."""
import ast
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
seed=next(ast.literal_eval(n.value) for n in ast.parse((root/'tools/ui-visual-check.py').read_text(encoding='utf-8')).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='seed' for t in n.targets))
with sync_playwright() as p:
 browser=p.chromium.launch()
 for width in [320,360,390,768,1280]:
  page=browser.new_page(viewport={'width':width,'height':900})
  page.goto('http://127.0.0.1:5186');page.evaluate(seed);page.reload()
  def nav(name):
   page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name=name,exact=True).click()
  nav('Blueprint Catalog');page.get_by_role('searchbox').fill('Helscape Infection Transfusion')
  page.get_by_text('Helscape Infection Transfusion',exact=True).click()
  assert page.get_by_role('spinbutton',name='Duration (minutes)').input_value()=='20'
  assert page.get_by_role('spinbutton',name='Total Resolve').input_value()=='1'
  assert page.get_by_text('Necrology Station',exact=False).count()>0
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  if width in [390,1280]:
   folder=root/'tests/visual/actual';folder.mkdir(parents=True,exist_ok=True)
   page.screenshot(path=str(folder/f'procedure-{width}.png'),full_page=True)
  page.get_by_role('spinbutton',name='Total Mind').fill('3')
  page.get_by_role('button',name='Add to Queue',exact=True).click()
  records=page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-build-queue')).builds")
  activity=next(r for r in records if r['sourceId']=='procedure-5459')
  assert activity['sourceType']=='Action' and activity['actionSnapshot']['option']['mind']==3
  page.locator('.work-entry summary').click()
  picker=page.get_by_role('combobox',name='Find a Blueprint');picker.fill('Act of Aristippus');picker.press('ArrowDown');picker.press('Enter')
  assert page.get_by_role('spinbutton',name='Duration (minutes)').input_value()=='10'
  page.get_by_role('button',name='Add to Queue',exact=True).click()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  # All three new categories render in catalog and persist as acquired collection entries.
  for name, expected_duration in [('Pallor Mortis','20'),('Cranial Cleansing','20'),('Prep Time','15')]:
   nav('Blueprint Catalog');page.get_by_role('searchbox').fill(name);page.get_by_text(name,exact=True).click()
   assert page.get_by_role('spinbutton',name='Duration (minutes)').input_value()==expected_duration
   page.get_by_role('button',name='Not Acquired',exact=True).click()
   page.get_by_role('button',name='To Acquire',exact=True).click()
   page.reload();nav('Workshop');page.get_by_role('searchbox').fill(name);page.get_by_text(name,exact=True).click()
   assert page.get_by_role('spinbutton',name='Duration (minutes)').input_value()==expected_duration
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  nav('Work Queue');page.locator('.work-entry summary').click();page.get_by_role('button',name='Action',exact=True).click()
  picker=page.get_by_role('combobox',name='Find an Action');picker.fill('Cutting Corners');picker.press('ArrowDown');picker.press('Enter')
  duration=page.get_by_role('spinbutton',name='Duration (minutes)');assert duration.input_value()==''
  page.get_by_role('button',name='Add to Queue',exact=True).click()
  assert duration.evaluate('(el)=>!el.validity.valid')
  assert page.get_by_text('This procedure modifies another activity.',exact=False).count()>0
  duration.fill('25')
  if width in [390,1280]:page.screenshot(path=str(root/f'tests/visual/actual/procedure-modifier-{width}.png'),full_page=True)
  page.get_by_role('button',name='Add to Queue',exact=True).click();page.reload()
  records=page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-build-queue')).builds")
  modifier=next(r for r in records if r['sourceId']=='procedure-6119')
  assert modifier['actionSnapshot']['option']['minutes']==25 and modifier['sourceType']=='Action'
  for name,output in [('Hypocritical Oath','Hypocritical Sample'),('Infectus Copiam','Bottled Infection'),('Nero Extraction','Squid Crystal')]:
   nav('Blueprint Catalog');page.get_by_role('searchbox').fill(name);page.get_by_text(name,exact=True).click()
   assert page.get_by_role('button',name='Add to Queue',exact=True).count()==0
   assert page.get_by_text('This procedure creates '+output+'.',exact=False).count()>0
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
   if name=='Hypocritical Oath' and width in [390,1280]:page.screenshot(path=str(root/f'tests/visual/actual/procedure-output-review-{width}.png'),full_page=True)
  page.close()
 browser.close()
print('Procedure catalog/details and Action routing passed at 320, 360, 390, 768 and 1280px.')

