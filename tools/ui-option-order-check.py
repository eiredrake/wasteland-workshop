import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('OPTION_TEST_URL','http://127.0.0.1:5187')
out=Path('tests/visual/actual/option-order');out.mkdir(parents=True,exist_ok=True)
bid=next(x['id'] for x in json.loads(Path('src/data/wasteland-blueprints.json').read_text(encoding='utf-8'))['blueprints'] if x['name']=='AA Blade')
check="""els=>{const c=new Intl.Collator('en',{sensitivity:'base',numeric:true,ignorePunctuation:true});return els.every(e=>{const a=Array.from(e.options).filter(o=>o.value!=='').map(o=>o.textContent.trim());return a.every((v,i)=>i===0||c.compare(a[i-1],v)<=0)})}"""
with sync_playwright() as p:
 for engine in ['chrome','firefox']:
  browser=p.chromium.launch(channel='chrome') if engine=='chrome' else p.firefox.launch()
  for width in ([320,360,390,768,1280] if engine=='chrome' else [390,1280]):
   page=browser.new_page(viewport={'width':width,'height':1000});page.goto(base)
   page.evaluate("""id=>{localStorage.clear();localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'a',name:'Alpha',entries:[{blueprintId:id,status:'acquired'}]}]));localStorage.setItem('wasteland-workshop-active-blueprint-collection','a');localStorage.setItem('wasteland-workshop-shopping-lists',JSON.stringify({version:1,activeListId:'z',lists:[{id:'z',name:'Zulu',items:[]},{id:'a',name:'alpha',items:[]},{id:'b',name:'Beta',items:[]}]}));localStorage.setItem('wasteland-workshop-alarm-settings',JSON.stringify({sound:true,vibration:false}));localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}))}""",bid);page.reload()
   def nav(name):page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name=name,exact=True).click()
   def picker(label):
    field=page.get_by_role('combobox',name=label,exact=True);field.click();box=page.get_by_role('listbox',name=label)
    assert box.locator('[role=option]').evaluate_all("""els=>{const c=new Intl.Collator('en',{sensitivity:'base',numeric:true,ignorePunctuation:true});const a=els.map(e=>e.textContent.trim());return a.every((v,i)=>i===0||c.compare(a[i-1],v)<=0)}""")
    if label=='Find an Action':page.screenshot(path=str(out/f'{engine}-{width}-action-list.png'))
    field.press('Escape');return field
   nav('Work Queue');page.locator('.work-entry summary').click();picker('Find a Blueprint')
   page.get_by_role('button',name='Action',exact=True).click();action=picker('Find an Action')
   action.fill('Agricultural');picker('Find an Action')
   page.screenshot(path=str(out/f'{engine}-{width}-action.png'))
   action.fill('Proficient Agricultural');action.press('ArrowDown');action.press('Enter')
   selects=page.locator('.action-configuration select');assert selects.evaluate_all(check)
   option=page.locator('.action-configuration select').first;assert option.input_value()=='uncommon-herb'
   for value in option.locator('option').evaluate_all('els=>els.map(e=>e.value)'):
    option.select_option(value);assert page.locator('.action-configuration select').evaluate_all(check)
   nav('Warehouse');assert page.locator('select').evaluate_all(check)
   assert page.locator('#warehouse-expiration-filter').input_value()=='Unexpired';assert page.locator('#warehouse-sort').input_value()=='Name'
   picker('Find an item or resource')
   page.get_by_role('button',name='Export Warehouse',exact=True).click();dialog=page.get_by_role('dialog',name='Export Warehouse');assert dialog.locator('select').evaluate_all(check);assert dialog.get_by_label('File format').input_value()=='json';dialog.get_by_role('button',name='Cancel',exact=True).click()
   nav('Workshop');page.get_by_text('AA Blade',exact=True).click()
   target=page.locator('#blueprint-shopping-target');assert target.input_value()=='z';assert page.locator('select').evaluate_all(check)
   assert target.locator('option').all_text_contents()==['Select a list','alpha','Beta','Zulu (Active)']
   nav('Shopping Lists');picker('Find a Resource')
   nav('Settings');assert page.locator('select').evaluate_all(check)
   assert page.locator('#alarm-sound').input_value()=='true';assert page.locator('#alarm-vibration').input_value()=='false'
   page.locator('#scanner-diagnostics').select_option('true');assert page.locator('select').evaluate_all(check)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.close();print('PASS dropdown alphabetical order and preserved defaults',engine,width,flush=True)
  browser.close()
