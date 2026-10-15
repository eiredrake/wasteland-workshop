import io,json,os
from PIL import Image,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('SCANNER_TEST_URL','https://workshop-test.foundationsrpg.org')
def fixture(names):
 im=Image.new('RGB',(1200,900),'white');draw=ImageDraw.Draw(im);font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',26)
 for i,name in enumerate(names):draw.text((340,380+i*33),name,fill='black',font=font)
 b=io.BytesIO();im.save(b,format='PNG');return b.getvalue()
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome')
 for width in [int(value) for value in os.environ.get('SCANNER_WIDTHS','320,360,390,768,1280').split(',')]:
  page=browser.new_page(viewport={'width':width,'height':1000});page.goto(base)
  page.evaluate('''()=>{localStorage.clear();localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'qa',name:'Acquisition QA',entries:[]},{id:'other',name:'Other collection',entries:[{blueprintId:5362,status:'acquired'}]}]));localStorage.setItem('wasteland-workshop-active-blueprint-collection','qa');localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}))}''')
  page.reload();page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Scan Prints',exact=True).click();expect(page.get_by_role('dialog',name='Loading OCR Library')).not_to_be_visible(timeout=60000)
  def scan(names):
   with page.expect_file_chooser() as picker:page.get_by_role('button',name='Choose Image',exact=True).click()
   picker.value.set_files({'name':'candidate.png','mimeType':'image/png','buffer':fixture(names)})
   expect(page.get_by_role('button',name='Confirm Image')).to_be_enabled();page.get_by_role('button',name='Confirm Image').click()
  def entries():return page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0].entries")
  scan(['Hooch']);dialog=page.get_by_role('dialog',name='PRINT MATCHES');expect(dialog).to_be_visible(timeout=60000);expect(dialog).to_contain_text('1 match found');dialog.get_by_role('button',name='Cancel',exact=True).click();assert entries()==[]
  expect(page.get_by_role('button',name='Confirm Image')).not_to_be_visible();scan(['Hooch']);expect(dialog).to_be_visible(timeout=60000)
  page.evaluate('''()=>{window.originalStorageWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='wasteland-workshop-blueprint-collections')throw new DOMException('Test storage full','QuotaExceededError');return window.originalStorageWrite.call(this,key,value)}}''')
  dialog.get_by_role('button',name='Acquire Hooch',exact=True).click();expect(dialog).to_contain_text('Could not save');assert entries()==[]
  page.evaluate('()=>{Storage.prototype.setItem=window.originalStorageWrite}');dialog.get_by_role('button',name='Acquire Hooch',exact=True).click();expect(dialog).not_to_be_visible();assert entries()==[{'blueprintId':4407,'status':'acquired'}]
  scan(['Hooch']);expect(dialog).to_be_visible(timeout=60000);expect(dialog).to_contain_text('already in the active collection "Acquisition QA"');expect(dialog.get_by_role('button',name='Acquire Hooch',exact=True)).to_have_count(0)
  page.screenshot(path=f'tests/visual/actual/scanner-owned-result-{width}.png')
  dialog.get_by_role('button',name='Done',exact=True).click();assert len(entries())==1;expect(page.get_by_role('button',name='Confirm Image')).not_to_be_visible()
  for names in [['Hooch','Mercy'],['Hooch','Mercy','AA Blade']]:
   scan(names);expect(dialog).to_be_visible(timeout=60000);expect(dialog).to_contain_text(str(len(names))+' matches found');assert dialog.locator('.scanner-match-candidates button').count()==len(names)-1;expect(dialog).to_contain_text('Hooch is already in the active collection');expect(dialog.get_by_role('button',name='Acquire Hooch',exact=True)).to_have_count(0)
   page.screenshot(path=f'tests/visual/actual/scanner-matches-{len(names)}-{width}.png')
   dialog.get_by_role('button',name='Cancel',exact=True).click();expect(dialog).not_to_be_visible();assert len(entries())==1
  scan(['Hooch','Mercy','AA Blade','Alert System']);manual=page.get_by_role('dialog',name='SELECT PRINT');expect(manual).to_be_visible(timeout=60000);expect(manual).to_contain_text('More than three');assert len(entries())==1
  acquire=manual.get_by_role('button',name='Acquire',exact=True);expect(acquire).to_be_disabled()
  field=manual.get_by_role('combobox',name='Blueprint name');field.fill('Mercy');field.press('ArrowDown');field.press('Enter');expect(acquire).to_be_enabled()
  page.screenshot(path=f'tests/visual/actual/scanner-manual-selected-{width}.png')
  manual.get_by_role('button',name='Cancel',exact=True).click();assert len(entries())==1;expect(page.get_by_role('button',name='Confirm Image')).not_to_be_visible()
  scan(['Unidentified nonsense']);expect(manual).to_be_visible(timeout=60000);expect(manual).to_contain_text('not identified');expect(acquire).to_be_disabled()
  field.fill('Hooch');expect(manual).to_contain_text('already in the active collection "Acquisition QA"');expect(acquire).to_have_count(0)
  page.screenshot(path=f'tests/visual/actual/scanner-owned-manual-{width}.png')
  field.fill('zzzzunknown');expect(acquire).to_be_disabled();expect(manual).to_contain_text('No matches found.')
  field.fill('Toothpiq');expect(manual.get_by_role('listbox')).to_be_visible()
  page.screenshot(path=f'tests/visual/actual/scanner-manual-options-{width}.png')
  manual.get_by_role('option',name='Toothpiq Throwing Spike',exact=True).click();expect(acquire).to_be_enabled()
  page.evaluate('''()=>{window.originalStorageWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='wasteland-workshop-blueprint-collections')throw new DOMException('Test storage full','QuotaExceededError');return window.originalStorageWrite.call(this,key,value)}}''')
  acquire.click();expect(manual).to_contain_text('Could not save');assert len(entries())==1
  page.evaluate('()=>{Storage.prototype.setItem=window.originalStorageWrite}')
  acquire.click();expect(manual).not_to_be_visible();assert {'blueprintId':5362,'status':'acquired'} in entries()
  expect(page.get_by_role('button',name='Confirm Image')).not_to_be_visible()
  scan(['Unidentified nonsense']);expect(manual).to_be_visible(timeout=60000);expect(acquire).to_be_disabled()
  field.fill('Mercy');expect(acquire).to_be_enabled();field.press('Escape');field.press('Escape');expect(manual).not_to_be_visible();assert len(entries())==2
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  expect(page.get_by_role('button',name='Confirm Image')).not_to_be_visible()
  # Wanted prints must remain acquirable; Sell prints must keep their status.
  page.evaluate('''()=>{const collections=JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'));collections[0].entries.push({blueprintId:4593,status:'to-acquire'},{blueprintId:5234,status:'sell'});localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify(collections))}''')
  page.reload();page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Scan Prints',exact=True).click();expect(page.get_by_role('dialog',name='Loading OCR Library')).not_to_be_visible(timeout=60000)
  scan(['Alert System']);expect(dialog).to_be_visible(timeout=60000);dialog.get_by_role('button',name='Acquire Alert System',exact=True).click();assert {'blueprintId':4593,'status':'acquired'} in entries()
  scan(['Freeiron Dry Pack']);expect(dialog).to_be_visible(timeout=60000);expect(dialog).to_contain_text('already in the active collection');expect(dialog.get_by_role('button',name='Acquire Freeiron Dry Pack',exact=True)).to_have_count(0);dialog.get_by_role('button',name='Done',exact=True).click();assert {'blueprintId':5234,'status':'sell'} in entries()
  page.close();print('PASS acquisition persistence/cancel/save retry/1-3 shared modal/manual selection/reset at',width,flush=True)
 browser.close()
