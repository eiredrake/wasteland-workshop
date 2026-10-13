"""Check runtime host-based test labels on mobile/desktop and across views."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];out=root/'tests/visual/actual';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch()
 for host in ['workshop-test.foundationsrpg.org','workbench-test.foundationsrpg.org','workshop.foundationsrpg.org']:
  for width in [320,390,1280]:
   page=b.new_page(viewport={'width':width,'height':900})
   def local(route):route.fulfill(response=route.fetch(url=route.request.url.replace(host,'127.0.0.1:5186')))
   page.route('http://'+host+'/**',local);page.goto('http://'+host+'/')
   page.evaluate("localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}))");page.reload()
   banner=page.locator('.test-version-banner')
   if '-test.' in host:
    expect(banner).to_have_text('TEST VERSION')
    for view in ['Blueprint Catalog','Blueprint Collections','Shopping Lists','Warehouse','Work Queue','Work History','Timer','Settings','About']:
     page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name=view,exact=True).click();expect(banner).to_be_visible();box=banner.bounding_box();assert box['x']==0 and box['y']==0 and box['width']==width
     assert page.locator('.app-header').bounding_box()['y']>box['height'];assert box['width']<=width
    page.screenshot(path=str(out/f'test-banner-{width}.png'),full_page=True)
   else:assert banner.count()==0
   page.close()
 b.close()
print('TEST VERSION spans the viewport above the shared header on both test hosts in all views; production remains unmarked.')
