"""All EXIF orientation tags: normalized review pixels match the native original-image coordinate system."""
import io,os
from pathlib import Path
from PIL import Image,ImageDraw,ImageOps
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('SCANNER_TEST_URL','http://127.0.0.1:5187')
im=Image.new('RGB',(800,600));d=ImageDraw.Draw(im);d.rectangle((0,0,399,299),fill=(230,20,20));d.rectangle((400,0,799,299),fill=(20,220,20));d.rectangle((0,300,399,599),fill=(20,20,230));d.rectangle((400,300,799,599),fill=(220,210,20))
with sync_playwright() as p:
 for engine in ['chrome','firefox','webkit']:
  b=p.chromium.launch(channel='chrome') if engine=='chrome' else getattr(p,engine).launch();page=b.new_page();page.set_default_timeout(30000);page.goto(base);page.evaluate("""()=>{localStorage.setItem('wasteland-workshop-blueprint-collections',JSON.stringify([{id:'qa',name:'EXIF QA',entries:[]}]));localStorage.setItem('wasteland-workshop-active-blueprint-collection','qa');localStorage.setItem('wasteland-workshop-guided-tours',JSON.stringify({version:1,progress:{'intro-blueprints':{viewed:true}}}))}""");page.reload();page.get_by_role('button',name='Open menu').click();page.get_by_role('button',name='Scan Prints',exact=True).click();expect(page.get_by_role('dialog',name='Loading OCR Library')).not_to_be_visible(timeout=60000)
  for orientation in range(1,9):
   exif=Image.Exif();exif[274]=orientation;buf=io.BytesIO();im.save(buf,format='JPEG',exif=exif,quality=95);data=buf.getvalue();expected=ImageOps.exif_transpose(Image.open(io.BytesIO(data)));w,h=expected.size;corners=[(20,20),(w-21,20),(20,h-21),(w-21,h-21)]
   with page.expect_file_chooser() as fc:page.get_by_role('button',name='Choose Image',exact=True).click()
   fc.value.set_files({'name':'oriented.jpeg','mimeType':'image/jpeg','buffer':data});expect(page.get_by_role('dialog',name='FILE SELECTED')).not_to_be_visible();expect(page.get_by_role('button',name='Confirm Image')).to_be_enabled()
   actual=page.locator('.scanner-review-image').evaluate("""(img,corners)=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return {width:c.width,height:c.height,pixels:corners.map(([x,y])=>Array.from(ctx.getImageData(x,y,1,1).data).slice(0,3))}}""",corners)
   assert (actual['width'],actual['height'])==(w,h),(engine,orientation,actual)
   for point,pixel in zip(corners,actual['pixels']):assert max(abs(a-b) for a,b in zip(expected.getpixel(point),pixel))<=4,(engine,orientation,point,pixel,expected.getpixel(point))
  print(engine,'all 8 EXIF orientations match normalized review/source pixels.',flush=True);b.close()
