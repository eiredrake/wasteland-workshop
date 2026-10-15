import ast,csv,io,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=root/'tests/visual/actual/section-export';out.mkdir(parents=True,exist_ok=True)
seed=next(ast.literal_eval(n.value) for n in ast.parse((root/'tools/ui-visual-check.py').read_text(encoding='utf-8')).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='seed' for t in n.targets))
base=os.environ.get('SECTION_TEST_URL','http://127.0.0.1:5187')
keys=['wasteland-workshop-warehouse','wasteland-workshop-shopping-lists','wasteland-workshop-blueprint-collections','wasteland-workshop-active-blueprint-collection']
with sync_playwright() as p:
 for engine in ['chrome','firefox']:
  browser=p.chromium.launch(channel='chrome') if engine=='chrome' else p.firefox.launch()
  for width in ([320,360,390,768,1280] if engine=='chrome' else [390,1280]):
   page=browser.new_page(viewport={'width':width,'height':1000});page.goto(base)
   if '127.0.0.1' in base:
    page.evaluate(seed)
    page.evaluate(r"""()=>{localStorage.setItem('wasteland-workshop-warehouse',JSON.stringify({version:2,credits:12.5,entries:[{itemId:3866,quantity:2,expirationDate:'2020-01-01'},{itemId:3866,quantity:3,expirationDate:'2030-01-01'},{itemId:99999999,quantity:4}]}));const key='wasteland-workshop-shopping-lists',data=JSON.parse(localStorage.getItem(key));data.lists.push({id:'other',name:'Other, "caf\u00e9"',items:[{kind:'resource',resourceId:3866,name:'Basic Scrap',quantity:4,acquired:true},{kind:'resource',resourceId:99999999,name:'Unknown',quantity:2,acquired:false}]});localStorage.setItem(key,JSON.stringify(data));localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}))}""")
    (out/'fixture.json').write_text(json.dumps(page.evaluate("()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]))")),encoding='utf-8')
   else:page.evaluate("data=>{localStorage.clear();for(const [k,v] of Object.entries(data))localStorage.setItem(k,v)}",json.loads((out/'fixture.json').read_text(encoding='utf-8')))
   page.reload()
   def nav(name):page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name=name,exact=True).click()
   before=page.evaluate("keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]))",keys)
   page.evaluate("()=>Object.defineProperty(window,'showSaveFilePicker',{configurable:true,writable:true,value:undefined})")
   nav('Warehouse');page.get_by_role('searchbox',name='Search inventory').fill('not a match')
   for fmt in ['json','csv']:
    page.get_by_role('button',name='Export Warehouse',exact=True).click();dialog=page.get_by_role('dialog',name='Export Warehouse');dialog.get_by_label('File format').select_option(fmt)
    page.screenshot(path=str(out/f'{engine}-{width}-warehouse-{fmt}.png'))
    with page.expect_download() as d:dialog.get_by_role('button',name='Download File').click()
    target=out/f'{engine}-{width}-warehouse.{fmt}';d.value.save_as(str(target));text=target.read_text(encoding='utf-8-sig')
    if fmt=='json':
     data=json.loads(text)['warehouse'];assert data['credits']==12.5;assert len(data['entries'])==3;assert data['entries'][0]['expirationDate']=='2020-01-01'
    else:
     rows=list(csv.DictReader(io.StringIO(text)));assert rows[0]['Credits On Hand']=='12.5';assert len(rows)==4;assert rows[1]['Expiration Date']=='2020-01-01'
   nav('Shopping Lists');card=page.locator('.shopping-list-cards .blueprint-collection-card').last
   for fmt in ['json','csv']:
    card.get_by_role('button',name='Export',exact=True).click();dialog=page.get_by_role('dialog',name='Export Shopping List');dialog.get_by_label('File format').select_option(fmt)
    page.screenshot(path=str(out/f'{engine}-{width}-shopping-{fmt}.png'))
    with page.expect_download() as d:dialog.get_by_role('button',name='Download File').click()
    target=out/f'{engine}-{width}-shopping.{fmt}';d.value.save_as(str(target));text=target.read_text(encoding='utf-8-sig')
    if fmt=='json':
     shopping=json.loads(text);assert shopping['name']=='Other, "café"';assert len(shopping['items'])==2;assert shopping['items'][0]['acquired'] is True;assert len(shopping['blueprintsToAcquire'])>0
    else:
     rows=list(csv.DictReader(io.StringIO(text)));assert rows[0]['List']=='Other, "café"';assert rows[0]['Status']=='Acquired';assert rows[1]['Status']=='Needed';assert any(r['Kind']=='blueprint' for r in rows)
   card.get_by_role('button',name='Export',exact=True).click();page.keyboard.press('Escape');expect(dialog).not_to_be_visible();expect(card.get_by_role('button',name='Export',exact=True)).to_be_focused()
   page.evaluate("""()=>{window.saveMode='cancel';window.savedText='';window.showSaveFilePicker=async()=>{if(window.saveMode==='cancel')throw new DOMException('Cancelled','AbortError');return {createWritable:async()=>({write:async blob=>{if(window.saveMode==='fail')throw Error('Disk full');window.savedText=await blob.text()},close:async()=>{},abort:async()=>{}})}}}""")
   card.get_by_role('button',name='Export',exact=True).click();dialog.get_by_role('button',name='Save File').click();expect(dialog).to_be_visible()
   page.evaluate("window.saveMode='fail'");dialog.get_by_role('button',name='Save File').click();expect(dialog.get_by_role('alert')).to_contain_text('Disk full')
   page.evaluate("window.saveMode='ok'");dialog.get_by_role('button',name='Save File').click();expect(dialog).not_to_be_visible();assert json.loads(page.evaluate('window.savedText'))['name']=='Other, "café"'
   assert page.evaluate("keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]))",keys)==before
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.close();print('PASS section exports/no mutation',engine,width,flush=True)
  browser.close()
