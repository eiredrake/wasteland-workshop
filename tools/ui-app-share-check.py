"""App sharing browser workflows and independent QR decoding. Needs Playwright, Pillow, zxing-cpp."""
import os
from pathlib import Path
from io import BytesIO
from PIL import Image, ImageChops
import zxingcpp
from playwright.sync_api import sync_playwright, expect
root=Path(__file__).resolve().parents[1]
out=root/'tests/visual/actual';out.mkdir(parents=True,exist_ok=True)
URL='https://workshop.foundationsrpg.org/'
with sync_playwright() as p:
 browser=p.chromium.launch()
 for width,height in [(1280,900),(768,1024),(390,844),(360,800),(320,700),(844,390)]:
  context=browser.new_context(viewport={'width':width,'height':height})
  page=context.new_page()
  page.add_init_script("localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true,completed:false}}}));Object.defineProperty(navigator,'share',{value:undefined,configurable:true});")
  page.goto(os.environ.get('APP_SHARE_TEST_URL','http://127.0.0.1:5186'))
  page.get_by_role('button',name='Open menu').click()
  expect(page.get_by_text('Guided Tours',exact=True)).to_be_visible()
  expect(page.get_by_role('button',name='About',exact=True)).to_be_visible()
  context.set_offline(True)
  page.get_by_role('button',name='Share Wasteland Workshop',exact=True).click()
  dialog=page.get_by_role('dialog',name='Wasteland Workshop',exact=True)
  expect(dialog).to_be_visible()
  expect(dialog.get_by_role('button',name='Share',exact=True)).to_have_count(0)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert dialog.evaluate('e=>e.scrollWidth<=e.clientWidth')
  expect(dialog.get_by_role('button',name='Close',exact=True)).to_be_focused()
  png=dialog.locator('svg').screenshot()
  decoded=zxingcpp.read_barcode(Image.open(BytesIO(png)))
  assert decoded and decoded.text==URL,decoded
  page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.copied=value}}})")
  dialog.get_by_role('button',name='Copy Link',exact=True).click()
  expect(dialog.get_by_role('status')).to_have_text('Link copied!')
  assert page.evaluate('window.copied')==URL
  page.evaluate("() => { navigator.clipboard.writeText=async()=>{throw new Error('Denied')} }")
  dialog.get_by_role('button',name='Copy Link',exact=True).click()
  expect(dialog.get_by_role('alert')).to_contain_text('copy it manually')
  manual=dialog.get_by_role('textbox',name='Website link');expect(manual).to_have_value(URL)
  manual.focus();assert manual.evaluate('e=>e.selectionEnd-e.selectionStart')==len(URL)
  page.keyboard.press('Escape');expect(dialog).to_have_count(0)
  expect(page.get_by_role('button',name='Open menu')).to_be_focused()
  # All sharing resources are already present: close/reopen with network disabled.
  page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Share Wasteland Workshop',exact=True).click()
  expect(dialog.locator('svg')).to_be_visible()
  if width in (1280,390):
   page.mouse.move(0,0);page.wait_for_timeout(250)
   filename=f'app-share-{width}.png'
   data=dialog.screenshot();(out/filename).write_bytes(data)
   reference=(root/'tests/visual/baselines'/filename).read_bytes()
   # Dev/production Chromium may differ on up to 20 border antialias pixels.
   if data!=reference:
    actual=Image.open(BytesIO(data)).convert('RGB');baseline=Image.open(BytesIO(reference)).convert('RGB')
    assert actual.size==baseline.size,filename+' dimensions changed'
    pixels=list(ImageChops.difference(actual,baseline).get_flattened_data())
    assert sum(any(pixel) for pixel in pixels)<=20 and max(max(pixel) for pixel in pixels)<=25,filename+' visual difference'
  dialog.get_by_role('link').focus()
  page.keyboard.press('Tab');expect(dialog.get_by_role('button',name='Copy Link',exact=True)).to_be_focused()
  assert dialog.get_by_role('button',name='Copy Link',exact=True).evaluate('e=>getComputedStyle(e).outlineStyle')!='none'
  page.keyboard.press('Tab');expect(dialog.get_by_role('button',name='Close',exact=True)).to_be_focused()
  page.keyboard.press('Shift+Tab');expect(dialog.get_by_role('button',name='Copy Link',exact=True)).to_be_focused()
  dialog.get_by_role('button',name='Close',exact=True).click()
  # Supported native sharing, cancellation, failure and exact payload.
  page.evaluate("Object.defineProperty(navigator,'share',{configurable:true,writable:true,value:async data=>{window.shareData=data}})")
  page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Share Wasteland Workshop',exact=True).click()
  dialog.get_by_role('button',name='Share',exact=True).click()
  page.wait_for_function('window.shareData')
  assert page.evaluate('window.shareData.url')==URL
  page.evaluate("() => { navigator.share=async()=>{throw new DOMException('cancel','AbortError')} }")
  dialog.get_by_role('button',name='Share',exact=True).click();expect(dialog.get_by_role('alert')).to_have_count(0)
  page.evaluate("() => { navigator.share=async()=>{throw new Error('Denied')} }")
  dialog.get_by_role('button',name='Share',exact=True).click();expect(dialog.get_by_role('alert')).to_contain_text('Try Copy Link')
  context.close()
 browser.close()
print('App sharing passed: six layouts, offline opening/reopening, independent exact-URL decoding, clipboard success/failure, native share/cancel/error, focus and Escape.')
