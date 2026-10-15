"""Scan Prints requires an existing active collection, not merely a saved ID."""
from playwright.sync_api import sync_playwright,expect
with sync_playwright() as p:
 b=p.chromium.launch()
 for width in [390,1280]:
  page=b.new_page(viewport={'width':width,'height':900});page.goto('http://127.0.0.1:5186')
  for active,collections,visible in [(None,[],False),('missing',[],False),(None,[{'id':'qa','name':'Test','entries':[]}],False),('qa',[{'id':'qa','name':'Test','entries':[]}],True)]:
   page.evaluate("""({active,collections})=>{localStorage.clear();localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}));localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify(collections));if(active)localStorage.setItem('wasteland-workshop-active-blueprint-collection',active)}""",{'active':active,'collections':collections});page.reload();page.get_by_role('button',name='Open menu').click();button=page.get_by_role('button',name='Scan Prints',exact=True);assert button.count()==int(visible)
   if visible:button.click();expect(page.get_by_role('heading',name='Scan Prints',exact=True)).to_be_visible()
  page.close()
 b.close()
print('Scan Prints hidden without an active collection, including stale IDs, and available with a valid active collection on mobile/desktop.')
