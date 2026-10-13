"""Check release UI has no blueprint-scanner entry or setting, preserving manual acquisition."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=root/'tests/visual/actual';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch()
 for width in [320,390,1280]:
  page=b.new_page(viewport={'width':width,'height':900});page.goto('http://127.0.0.1:5186')
  page.evaluate("""()=>{localStorage.clear();localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}));localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'qa',name:'Kept Collection',entries:[{blueprintId:5234,status:'acquired'}]}]));localStorage.setItem('wasteland-workshop-active-blueprint-collection','qa')}""");page.reload()
  def nav(name):
   page.get_by_role('button',name='Open menu').click();assert page.get_by_role('button',name='Scan & Acquire',exact=True).count()==0;page.get_by_role('button',name=name,exact=True).click()
  nav('Blueprint Collections');expect(page.get_by_text('Kept Collection',exact=True)).to_be_visible();assert page.get_by_role('button',name='Scan & Acquire',exact=True).count()==0;page.screenshot(path=str(out/f'clean-collections-{width}.png'))
  nav('Settings');assert page.get_by_label('Scan Diagnostics',exact=True).count()==0;assert page.get_by_text('Blueprint Scanner',exact=True).count()==0;page.screenshot(path=str(out/f'clean-settings-{width}.png'))
  nav('Blueprint Catalog');page.get_by_role('searchbox').fill('Hooch');page.get_by_text('Hooch',exact=True).click();page.get_by_role('button',name='Not Acquired',exact=True).click();page.get_by_role('button',name='To Acquire',exact=True).click()
  saved=page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-blueprint-collections'))[0].entries");assert any(e['blueprintId']==4407 and e['status']=='acquired' for e in saved);assert any(e['blueprintId']==5234 and e['status']=='acquired' for e in saved)
  page.close()
 b.close()
print('No scanner navigation/setting; manual acquisition and saved collections preserved on mobile/desktop.')
