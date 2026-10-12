"""Verify a fresh production setup can reload and recognize photos offline."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];base='http://127.0.0.1:5187'
with sync_playwright() as p:
 browser=p.chromium.launch();context=browser.new_context();page=context.new_page();page.set_default_timeout(60000)
 page.goto(base)
 page.evaluate("""()=>{localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}));localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'offline',name:'Offline Collection',entries:[]} ]));localStorage.setItem('wasteland-workshop-active-blueprint-collection','offline')}""")
 page.reload();page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Blueprint Collections',exact=True).click();page.get_by_role('button',name='Scan & Acquire').click()
 page.get_by_text('Offline Use',exact=True).click();page.get_by_role('button',name='Prepare Offline Scanning').click()
 page.evaluate("""async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}))}""")
 expect(page.get_by_text('Scanner assets ready for offline use.',exact=True)).to_be_visible()

 if os.environ.get('SCANNER_TEST_FALLBACK')=='1':
  page.evaluate("""async()=>{for(const key of await caches.keys()){const cache=await caches.open(key);await cache.delete(new URL('/ocr-paddle/PP-OCRv5_mobile_det.tar',location.origin))}}""")
 context.set_offline(True);page.reload()
 page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Blueprint Collections',exact=True).click();page.get_by_role('button',name='Scan & Acquire').click()
 with page.expect_file_chooser() as chooser:page.get_by_role('button',name='Choose Photo',exact=True).click()
 chooser.value.set_files(str(root/'tests/fixtures/scanner/freeiron-dry-pack.jpg'))
 expect(page.locator('.photo-adjuster img')).to_be_visible()
 page.get_by_text('Adjust Crop and Rotation',exact=True).click();page.get_by_role('button',name='Crop Title Region').click();page.get_by_role('button',name='Analyze Photo',exact=True).click()
 expect(page.get_by_role('button',name='Freeiron Dry Pack',exact=True)).to_be_visible(timeout=60000)
 page.get_by_role('button',name='Freeiron Dry Pack',exact=True).click();page.get_by_role('button',name='Acquire',exact=True).click();expect(page.get_by_text('Acquired and saved.',exact=True)).to_be_visible()
 assert page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0].entries[0].blueprintId")==5234
 assert page.evaluate("JSON.stringify(localStorage).includes('data:image')")==False
 browser.close()
print('Fresh production offline check passed: app reload, bundled OCR assets, photo recognition and acquisition without network.')
