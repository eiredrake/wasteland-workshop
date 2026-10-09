"""Context-sensitive Blueprint creation, isolated Chromium desktop/mobile checks."""
import ast,json
from pathlib import Path
from datetime import datetime,timezone,timedelta
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
seed=next(ast.literal_eval(n.value) for n in ast.parse((root/'tools/ui-visual-check.py').read_text(encoding='utf-8')).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='seed' for t in n.targets))
out=root/'tests/visual/actual';out.mkdir(exist_ok=True,parents=True)
with sync_playwright() as p:
 browser=p.chromium.launch()
 for size,width,height in [('desktop',1280,900),('mobile',390,844)]:
  for state in ['empty','working','paused','pending','history']:
   page=browser.new_page(viewport={'width':width,'height':height},has_touch=size=='mobile',is_mobile=size=='mobile',reduced_motion='reduce')
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   now=datetime(2026,10,9,14,0,tzinfo=timezone.utc);page.clock.install(time=now);page.clock.pause_at(now+timedelta(seconds=1))
   page.goto('http://127.0.0.1:5186');page.evaluate(seed)
   page.evaluate("""async state=>{let q=JSON.parse(localStorage.getItem('wasteland-workshop-build-queue')).builds;
    if(state==='empty')q=[];
    if(state==='history')q=q.filter(b=>b.status==='Completed');
    if(state==='working')q=q.filter(b=>b.status!=='Completed');
    if(state==='pending')q=q.filter(b=>b.status==='Enqueued');
    if(state==='paused'){const {toggleBuildStatus}=await import('/src/features/builds/BuildQueueService.ts');q=toggleBuildStatus(q.filter(b=>b.status!=='Completed'),'active',Date.now());}
    localStorage.setItem('wasteland-workshop-build-queue',JSON.stringify({version:2,builds:q}));}""",state)
   page.reload()
   def nav(name):page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name=name,exact=True).click()
   def records():return page.evaluate("JSON.parse(localStorage.getItem('wasteland-workshop-build-queue')).builds")
   def detail():
    nav('Workshop');page.get_by_role('searchbox').fill('AA Blade');page.get_by_text('AA Blade',exact=True).click()
   detail();button=page.locator('.blueprint-build-button');expect(button).to_have_text('Build' if state in ['empty','history'] else 'Add toQueue')
   button.focus();button.scroll_into_view_if_needed();page.evaluate('document.fonts.ready');page.clock.run_for(50)
   box=button.bounding_box();assert box['width']>=44 and box['height']>=44 and box['width']==box['height']
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   button.screenshot(path=str(out/f'{size}-queue-mode-{state}.png'),animations='disabled')
   if state in ['empty','working']:page.screenshot(path=str(out/f'{size}-queue-mode-{state}-screen.png'),animations='disabled')
   before=records();button.evaluate("b=>{b.click();b.click()}")
   after=records();assert len(after)==len(before)+1
   added=next(b for b in after if b['id'] not in [old['id'] for old in before])
   assert added['status']==('Working' if state in ['empty','history'] else 'Enqueued')
   for old in before:assert next(b for b in after if b['id']==old['id'])==old
   assert [b['id'] for b in after if b['id']!=added['id']]==[b['id'] for b in before]
   if state in ['empty','history']:
    page.locator('.blueprint-craft-timer').click();paused=records();assert next(b for b in paused if b['id']==added['id'])['status']=='Paused'
    remaining=next(b for b in paused if b['id']==added['id'])['timer']['remainingMs']
    page.reload();nav('Work Queue');assert next(b for b in records() if b['id']==added['id'])['timer']['remainingMs']==remaining
    page.locator('.blueprint-craft-timer').click();assert next(b for b in records() if b['id']==added['id'])['status']=='Working'
   if state in ['empty','history']:
    ring=page.locator('.blueprint-craft-timer');ring.hover();page.mouse.down();page.clock.run_for(1000);page.mouse.up()
    expect(page.get_by_role('button',name='Back to Work Queue',exact=True)).to_be_visible()
    page.get_by_role('button',name='Add one minute',exact=True).click()
    page.get_by_role('button',name='Back to Work Queue',exact=True).click()
    assert next(b for b in records() if b['id']==added['id'])['status']=='Working'
   detail();expect(page.locator('.blueprint-build-button')).to_have_text('Add toQueue')
   # History alone never blocks Build; rerender after the unfinished entries are removed.
   page.evaluate("let q=JSON.parse(localStorage.getItem('wasteland-workshop-build-queue'));q.builds=q.builds.filter(b=>b.status==='Completed');localStorage.setItem('wasteland-workshop-build-queue',JSON.stringify(q))")
   page.reload();detail();expect(page.locator('.blueprint-build-button')).to_have_text('Build')
   assert not errors,errors;page.close()
 browser.close()
print('All five queue states pass on desktop/mobile: labels, shape, touch targets, duplicate clicks, ordering, unchanged timers, pause/resume, persistence and empty/nonempty transitions.')
