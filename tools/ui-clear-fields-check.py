"""Check shared clear buttons, picker selection reset, focus and form behavior."""
import ast
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
seed=next(ast.literal_eval(n.value) for n in ast.parse((root/'tools/ui-visual-check.py').read_text(encoding='utf-8')).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='seed' for t in n.targets))
with sync_playwright() as p:
 browser=p.chromium.launch()
 for width in [320,390,768,1280]:
  page=browser.new_page(viewport={'width':width,'height':900});page.set_default_timeout(8000)
  page.goto('http://127.0.0.1:5186');page.evaluate(seed);page.reload()
  def nav(name):
   page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name=name,exact=True).click()
  nav('Warehouse')
  picker=page.get_by_role('combobox',name='Find an item or resource');clear=page.get_by_role('button',name='Clear Find an item or resource')
  assert clear.count()==0
  picker.fill('Basic Scrap');picker.press('ArrowDown');picker.press('Enter')
  assert clear.count()==1 and picker.input_value()=='Basic Scrap'
  page.locator('#warehouse-add-expiration').fill('2027-10-10')
  clear.click();assert picker.input_value()=='' and picker.evaluate('(el)=>el===document.activeElement')
  assert page.locator('#warehouse-add-expiration').input_value()==''
  assert clear.count()==0
  picker.fill('zzzz-no-match');assert page.get_by_text('No matches found.',exact=True).count()==1
  picker.press('Tab');clear.press('Enter');assert picker.input_value()=='' and picker.evaluate('(el)=>el===document.activeElement')
  picker.fill('Basic Herb');picker.press('ArrowDown');picker.press('Enter')
  box=clear.bounding_box();assert box['width']>=44 and box['height']>=44
  assert float(picker.evaluate('(el)=>getComputedStyle(el).paddingRight').replace('px',''))>=88
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  if width in [390,1280]:
   folder=root/'tests/visual/actual';folder.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(folder/f'clear-picker-{width}.png'),full_page=True)
  nav('Work Queue');page.locator('.work-entry summary').click()
  queue_picker=page.get_by_role('combobox',name='Find a Blueprint');queue_picker.fill('AA Blade');queue_picker.press('ArrowDown');queue_picker.press('Enter')
  assert page.get_by_role('button',name='Add to Queue',exact=True).is_enabled()
  page.get_by_role('button',name='Clear Find a Blueprint').click();assert page.get_by_role('button',name='Add to Queue',exact=True).is_disabled()
  page.get_by_role('button',name='Action',exact=True).click()
  action=page.get_by_role('combobox',name='Find an Action');action.fill('Repair Equipment');action.press('ArrowDown');action.press('Enter')
  assert page.locator('.action-configuration').count()==1
  page.get_by_role('button',name='Clear Find an Action').click();assert page.locator('.action-configuration').count()==0
  nav('Shopping Lists');page.get_by_role('button',name='Add List',exact=True).click()
  name=page.locator('#shopping-list-name');name.fill('Temporary');page.get_by_role('button',name='Clear List Name').click()
  assert name.input_value()=='' and name.evaluate('(el)=>el===document.activeElement')
  assert page.get_by_role('button',name='Save List',exact=True).is_disabled()
  page.close()
 browser.close()
print('Clear controls passed: Warehouse, queue pickers, plain name fields, selection reset, required state, keyboard focus, touch size and responsive layout.')
