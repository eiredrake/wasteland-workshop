import ast,csv,io,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
seed=next(ast.literal_eval(n.value) for n in ast.parse((root/'tools/ui-visual-check.py').read_text(encoding='utf-8')).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='seed' for t in n.targets))
base=os.environ.get('HISTORY_TEST_URL','http://127.0.0.1:5187')
out=root/'tests/visual/actual/history-export';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 for engine in ['chrome','firefox']:
  browser=p.chromium.launch(channel='chrome') if engine=='chrome' else p.firefox.launch()
  for width in ([320,360,390,768,1280] if engine=='chrome' else [390,1280]):
   page=browser.new_page(viewport={'width':width,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(base)
   if '127.0.0.1' in base:page.evaluate(seed)
   else:
    fixture=json.loads((out/'fixture.json').read_text(encoding='utf-8'))
    page.evaluate("data=>{localStorage.clear();localStorage.setItem('wasteland-workshop-build-queue',JSON.stringify(data))}",fixture)
   page.evaluate(r'''()=>{const key='wasteland-workshop-build-queue',data=JSON.parse(localStorage.getItem(key));for(const item of data.builds){if(item.status!=='Completed'){item.status='Enqueued';item.timer.status='idle';item.timer.remainingMs=item.timer.originalDurationMs;delete item.timer.endTimeMs}}const old=data.builds.find(b=>b.status==='Completed');if(!data.builds.some(b=>b.id==='csv-special'))data.builds.push({...structuredClone(old),id:'csv-special',blueprintName:'CSV, "quoted" caf\u00e9',notes:'=SUM(1,2)\nLine two',completedAt:old.completedAt+1000});localStorage.setItem(key,JSON.stringify(data));localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}))}''')
   (out/'fixture.json').write_text(page.evaluate("localStorage.getItem('wasteland-workshop-build-queue')"),encoding='utf-8')
   page.reload();page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Work History',exact=True).click()
   before=page.evaluate("localStorage.getItem('wasteland-workshop-build-queue')")
   expected=sorted([b for b in json.loads(before)['builds'] if b['status']=='Completed'],key=lambda b:b['completedAt'],reverse=True)
   button=page.get_by_role('button',name='Export Work History',exact=True);button.click();dialog=page.get_by_role('dialog',name='Export Work History')
   expect(dialog).to_be_visible();dialog.get_by_role('button',name='Cancel',exact=True).click();expect(button).to_be_focused();assert page.evaluate("localStorage.getItem('wasteland-workshop-build-queue')")==before
   page.evaluate("()=>Object.defineProperty(window,'showSaveFilePicker',{configurable:true,writable:true,value:undefined})")
   for fmt in ['json','csv']:
    button.click();dialog.get_by_label('File format').select_option(fmt)
    page.screenshot(path=str(out/f'{engine}-{width}-{fmt}.png'))
    with page.expect_download() as download:dialog.get_by_role('button',name='Download File',exact=True).click()
    target=out/f'{engine}-{width}.{fmt}';download.value.save_as(str(target));assert download.value.suggested_filename.endswith('.'+fmt)
    text=target.read_text(encoding='utf-8-sig')
    if fmt=='json':assert json.loads(text)['activities']==expected
    else:
     rows=list(csv.DictReader(io.StringIO(text)));assert len(rows)==len(expected)
     assert rows[0]['Name']==expected[0]['blueprintName'];assert rows[0]['Notes']=="'"+expected[0]['notes'];assert json.loads(rows[0]['Recipe (JSON)'])==expected[0]['recipe'];assert json.loads(rows[0]['Action Snapshot (JSON)'])==expected[0]['actionSnapshot']
    expect(dialog).not_to_be_visible();expect(page.get_by_role('status')).to_have_text('Work history download started.')
   page.evaluate(r'''()=>{window.saveMode='cancel';window.savedText='';window.saveClosed=false;window.saveAborted=false;window.showSaveFilePicker=async opts=>{window.saveOptions=opts;if(window.saveMode==='cancel')throw new DOMException('Cancelled','AbortError');return {createWritable:async()=>({write:async blob=>{if(window.saveMode==='fail')throw Error('Test disk full');window.savedText=await blob.text()},close:async()=>{window.saveClosed=true},abort:async()=>{window.saveAborted=true}})}}}''')
   button.click();dialog.get_by_role('button',name='Save File',exact=True).click();expect(dialog).to_be_visible();expect(dialog.get_by_role('button',name='Save File',exact=True)).to_be_enabled();expect(page.get_by_text('Work history saved.',exact=True)).to_have_count(0)
   page.evaluate("window.saveMode='fail'");dialog.get_by_role('button',name='Save File',exact=True).click();expect(dialog.get_by_role('alert')).to_contain_text('Test disk full');assert page.evaluate('window.saveAborted') is True
   page.screenshot(path=str(out/f'{engine}-{width}-error.png'))
   page.evaluate("window.saveMode='ok'");dialog.get_by_role('button',name='Save File',exact=True).click();expect(dialog).not_to_be_visible();expect(page.get_by_role('status')).to_have_text('Work history saved.');assert page.evaluate('window.saveClosed') is True
   assert json.loads(page.evaluate('window.savedText'))['activities']==expected
   assert page.evaluate('window.saveOptions.types[0].accept')=={'application/json':['.json']}
   assert page.evaluate("localStorage.getItem('wasteland-workshop-build-queue')")==before
   button.click();page.keyboard.press('Escape');expect(dialog).not_to_be_visible()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
   page.evaluate("()=>localStorage.setItem('wasteland-workshop-build-queue',JSON.stringify({version:2,builds:[]}))")
   page.reload();page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Work History',exact=True).click();expect(button).to_be_disabled();expect(page.get_by_text('No completed activities.',exact=True)).to_be_visible()
   page.close();print('PASS history JSON/CSV downloads/save picker/cancel/error/no mutation',engine,width,flush=True)
  browser.close()
