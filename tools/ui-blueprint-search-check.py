"""Isolated catalog search regression; mobile viewport is emulated."""
import functools, os, re, threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright, expect
root=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=None
base=os.environ.get('SEARCH_URL')
if not base:
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root/'dist')))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 base=f'http://127.0.0.1:{server.server_port}/'
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome')
 for width in [320,390,1280]:
  context=browser.new_context(viewport={'width':width,'height':900})
  page=context.new_page()
  page.add_init_script("localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true,completed:false}}}))")
  page.goto(base.rstrip('/')+'/#/catalog',wait_until='networkidle')
  field=page.get_by_role('searchbox',name='Search blueprints',exact=True)
  def search(query):
   field.fill(query)
   page.wait_for_timeout(150)
   heading=page.get_by_role('heading',name=re.compile(r'^Blueprints \(\d+\)$'))
   expect(heading).to_be_visible()
   return int(re.search(r'\d+',heading.inner_text()).group())
  counts={q:search(q) for q in ['mind','Mind Brew','Mind+Brew','Mind|Brew','Mind-brew']}
  assert counts['mind']>1 and counts['Mind+Brew']>1
  assert counts['Mind|Brew']>=counts['mind']>=counts['Mind+Brew']
  search('mind')
  expect(page.get_by_role('cell',name=re.compile(r'^Angry Apple Invigorating Brew'))).to_be_visible()
  search('mind-brew')
  expect(page.get_by_role('cell',name=re.compile(r'^Angry Apple Invigorating Brew'))).to_have_count(0)
  search('Townie+brew')
  expect(page.get_by_role('cell',name=re.compile(r'^Angry Apple Invigorating Brew'))).to_be_visible()
  output=root/'tests/visual/actual';output.mkdir(parents=True,exist_ok=True)
  page.screenshot(path=str(output/f'blueprint-search-{width}.png'))
  print(f'{width}px: descriptions, operators and lineage passed: {counts}',flush=True)
  context.close()
 browser.close()
if server:server.shutdown()
