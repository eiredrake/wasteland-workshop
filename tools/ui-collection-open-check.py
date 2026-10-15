from pathlib import Path
import os
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('COLLECTION_TEST_URL','http://127.0.0.1:5187')
out=Path('tests/visual/actual/collection-open');out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome')
 for width in [320,360,390,768,1280]:
  page=b.new_page(viewport={'width':width,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base)
  page.evaluate('''()=>{localStorage.clear();localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'a',name:'First Collection',entries:[{blueprintId:4407,status:'acquired'}]},{id:'b',name:'Second Collection',entries:[{blueprintId:4593,status:'acquired'}]}]));localStorage.setItem('wasteland-workshop-active-blueprint-collection','a');localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}))}''')
  page.reload()
  def nav(name):
   page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name=name,exact=True).click()
  def active():return page.evaluate("localStorage.getItem('wasteland-workshop-active-blueprint-collection')")
  nav('Blueprint Collections')
  card=page.locator('.blueprint-collection-card').filter(has=page.get_by_role('button',name='Open collection First Collection'))
  card.click(position={'x':8,'y':8})
  expect(page.locator('.workshop-active-collection')).to_contain_text('First Collection');expect(page.locator('.workshop-page')).to_contain_text('Hooch');assert active()=='a';assert page.locator('dialog').count()==0
  nav('Blueprint Collections')
  other=page.get_by_role('button',name='Open collection Second Collection')
  other.focus();page.keyboard.press('Enter');dialog=page.get_by_role('dialog',name='Switch Active Collection?');expect(dialog).to_be_visible();expect(dialog).to_contain_text('Second Collection')
  page.screenshot(path=str(out/f'confirm-{width}.png'))
  dialog.get_by_role('button',name='Cancel',exact=True).click();assert active()=='a';expect(other).to_be_focused();expect(page.get_by_role('heading',name='Blueprint Collections',exact=True)).to_be_visible()
  other.click();page.keyboard.press('Escape');expect(dialog).not_to_be_visible();assert active()=='a'
  other.focus();page.keyboard.press('Space');expect(dialog).to_be_visible();dialog.get_by_role('button',name='Switch and Open Workshop').click();expect(page.locator('.workshop-active-collection')).to_contain_text('Second Collection');expect(page.locator('.workshop-page')).to_contain_text('Alert System');assert active()=='b'
  page.reload();expect(page.locator('.workshop-active-collection')).to_contain_text('Second Collection');assert active()=='b'
  nav('Blueprint Collections')
  first=page.locator('.blueprint-collection-card').filter(has=page.get_by_role('button',name='Open collection First Collection'))
  # Card actions must remain independent of the opening overlay.
  with page.expect_download():first.get_by_role('button',name='Export',exact=True).click()
  assert page.locator('dialog').count()==0;assert active()=='b'
  first.get_by_role('button',name='Delete collection First Collection').click();deletion=page.get_by_role('dialog',name='Delete Collection?');expect(deletion).to_be_visible();deletion.get_by_role('button',name='Cancel',exact=True).click();assert active()=='b'
  first.get_by_role('button',name='Set Active',exact=True).click();assert active()=='a';expect(page.get_by_role('heading',name='Blueprint Collections',exact=True)).to_be_visible()
  page.evaluate('''()=>{window.originalWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='wasteland-workshop-active-blueprint-collection')throw new DOMException('Test storage failure','QuotaExceededError');return window.originalWrite.call(this,key,value)}}''')
  other.click();dialog.get_by_role('button',name='Switch and Open Workshop').click();assert active()=='a';expect(page.get_by_role('heading',name='Blueprint Collections',exact=True)).to_be_visible()
  expect(page.locator('.blueprint-collection-card-active')).to_contain_text('First Collection')
  page.evaluate('()=>{Storage.prototype.setItem=window.originalWrite}')
  page.screenshot(path=str(out/f'collections-{width}.png'))
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
  page.close();print('PASS collection opening/switch/cancel/actions/persistence at',width,flush=True)
 b.close()
