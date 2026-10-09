"""Isolated browser checks for workflows affected by theme migration."""
import ast,json,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
seed=next(ast.literal_eval(n.value) for n in ast.parse((root/'tools/ui-visual-check.py').read_text(encoding='utf-8')).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='seed' for t in n.targets))
with sync_playwright() as p:
 b=p.chromium.launch();page=b.new_page(viewport={'width':390,'height':844});page.set_default_timeout(8000)
 page.goto('http://127.0.0.1:5186');page.evaluate(seed);page.reload()
 def nav(name):page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name=name,exact=True).click()
 def records():return page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-build-queue')).builds")
 nav('Workshop');page.get_by_role('searchbox').fill('AA Blade');assert page.locator('tbody tr').count()==1;page.get_by_text('AA Blade',exact=True).click();page.get_by_role('searchbox').fill('Dodge');assert page.locator('.blueprint-details').count()==0
 nav('Work Queue');page.locator('li.build-card details').last.locator('summary').click();assert page.get_by_role('button',name='Start / Resume',exact=True).is_disabled()
 page.locator('.blueprint-craft-timer').click();assert not any(r['status']=='Working' for r in records())
 page.get_by_role('button',name='Start / Resume',exact=True).click();assert records()[0]['id']=='pending' and records()[0]['status']=='Working'
 page.locator('.build-timer-settings').click();assert page.locator('dialog').count()==0;page.get_by_role('button',name='Add one minute',exact=True).click();assert records()[0]['timer']['remainingMs']>650000;page.get_by_role('button',name='Back to Work Queue',exact=True).click()
 page.locator('.blueprint-craft-timer').click();remaining=records()[0]['timer']['remainingMs'];page.reload();assert records()[0]['timer']['remainingMs']==remaining;nav('Work Queue')
 page.locator('.work-entry summary').click();page.get_by_role('button',name='Action',exact=True).click();picker=page.get_by_role('combobox',name='Find an Action');picker.fill('Mine');picker.press('ArrowDown');picker.press('Enter');assert page.locator('.action-configuration').count()==1
 page.get_by_role('button',name='Add to Queue',exact=True).click();assert len(records())==4
 nav('Work History');page.locator('details.blueprint-collection-card summary').click();page.get_by_role('button',name='Details & Notes',exact=True).click();assert page.locator('input[type=number]').count()==0;page.get_by_label('Notes',exact=True).fill('Theme migration QA');page.get_by_role('button',name='Save Activity',exact=True).click();assert any(r['notes']=='Theme migration QA' for r in records())
 nav('Settings');page.locator('#expiration-warning-days').fill('45');page.get_by_role('button',name='Save Expiration Settings',exact=True).click();page.reload();nav('Settings');assert page.locator('#expiration-warning-days').input_value()=='45'
 with tempfile.TemporaryDirectory() as folder:
  with page.expect_download() as download:page.get_by_role('button',name='Export All Data',exact=True).click()
  path=Path(folder)/'backup.json';download.value.save_as(str(path));data=json.loads(path.read_text(encoding='utf-8'));assert data['schemaVersion']==4
  nav('Work Queue');page.get_by_role('button',name='Select All',exact=True).click();page.get_by_role('button',name='Delete Selected (3)',exact=True).click();assert page.locator('dialog').count()==1;page.get_by_role('button',name='Cancel',exact=True).click();assert len(records())==4
  page.get_by_role('button',name='Delete Selected (3)',exact=True).click();page.get_by_role('button',name='Delete Selected',exact=True).click();assert len(records())==1
  nav('Settings');page.locator('#backup-file').set_input_files(str(path));page.get_by_role('button',name='Replace & Restore',exact=True).click();page.wait_for_timeout(500);assert len(records())==4
 nav('Warehouse');quantity=page.get_by_role('spinbutton',name='Quantity on hand: Basic Herb (2027-09-01)');page.get_by_role('button',name='Add one Basic Herb (2027-09-01)',exact=True).click();assert quantity.input_value()=='3';page.get_by_role('button',name='Subtract one Basic Herb (2027-09-01)',exact=True).click();assert quantity.input_value()=='2';page.get_by_role('button',name='Remove Basic Herb (2027-09-01)',exact=True).click();assert page.locator('dialog').count()==0
 nav('Shopping Lists');page.get_by_role('button',name='Remove Basic Herb',exact=True).click();page.get_by_role('button',name='Cancel',exact=True).click();assert page.get_by_role('button',name='Remove Basic Herb',exact=True).count()==1;page.get_by_role('button',name='Remove Basic Herb',exact=True).click();page.get_by_role('button',name='Remove Item',exact=True).click();assert page.get_by_role('button',name='Remove Basic Herb',exact=True).count()==0
 page.get_by_role('button',name='Delete list Audit List',exact=True).click();page.get_by_role('button',name='Delete List',exact=True).click();assert page.get_by_role('button',name='Delete list Audit List',exact=True).count()==0
 nav('Blueprint Collections');page.get_by_role('button',name='Delete collection Audit Collection',exact=True).click();page.get_by_role('button',name='Cancel',exact=True).click();assert page.get_by_role('button',name='Delete collection Audit Collection',exact=True).count()==1;page.get_by_role('button',name='Delete collection Audit Collection',exact=True).click();page.get_by_role('button',name='Delete Collection',exact=True).click();assert page.get_by_role('button',name='Delete collection Audit Collection',exact=True).count()==0
 b.close();print('Isolated mobile-width workflow checks passed: searches, keyboard picker, queue, timer/persistence, history, settings, export/restore, bulk/record confirmation and quantity changes.')
