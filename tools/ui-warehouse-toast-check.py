"""Verify Warehouse success feedback is emitted only after a saved addition."""
import ast
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
seed=next(ast.literal_eval(n.value) for n in ast.parse((root/'tools/ui-visual-check.py').read_text(encoding='utf-8')).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='seed' for t in n.targets))
with sync_playwright() as p:
 browser=p.chromium.launch()
 for width in [390,1280]:
  page=browser.new_page(viewport={'width':width,'height':900});page.set_default_timeout(8000)
  page.goto('http://127.0.0.1:5186');page.evaluate(seed);page.reload()
  page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Warehouse',exact=True).click()
  picker=page.get_by_role('combobox',name='Find an item or resource');picker.fill('Basic Herb');picker.press('ArrowDown');picker.press('Enter')
  page.locator('#warehouse-add-quantity').fill('2');page.locator('#warehouse-add-expiration').fill('2027-10-10')
  page.get_by_role('button',name='Add to Warehouse',exact=True).click()
  toast=page.locator('.toast-success');assert toast.inner_text().startswith('Added 2 × Basic Herb to the Warehouse.')
  lot=page.get_by_role('spinbutton',name='Quantity on hand: Basic Herb (2027-10-10)');assert lot.input_value()=='2'
  page.locator('.toast-success').get_by_role('button',name='Dismiss notification').click()
  page.get_by_role('button',name='Add to Warehouse',exact=True).click();assert lot.input_value()=='4'
  assert page.locator('.toast-success').count()==1
  folder=root/'tests/visual/actual';folder.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(folder/f'warehouse-toast-{width}.png'),full_page=True)
  page.locator('.toast-success').get_by_role('button',name='Dismiss notification').click()
  page.evaluate("""()=>{const save=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='wasteland-workshop-warehouse')throw new Error('Simulated save failure');return save.call(this,key,value)}}""")
  page.get_by_role('button',name='Add to Warehouse',exact=True).click()
  assert page.locator('.toast-success').count()==0 and page.locator('.toast-warning').count()==1
  assert lot.input_value()=='4'
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.close()
 browser.close()
print('Warehouse toast checks passed: saved addition, merged quantity, failed save without success toast, desktop and mobile.')
