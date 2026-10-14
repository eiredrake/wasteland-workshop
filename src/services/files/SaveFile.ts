export type ExportFormat='json'|'csv'
export type ExportFile={name:string;mimeType:string;extension:string;content:string}
type Writable={write:(data:Blob)=>Promise<void>;close:()=>Promise<void>;abort:()=>Promise<void>}
type SavePicker=(options:{suggestedName:string;types:{description:string;accept:Record<string,string[]>}[];excludeAcceptAllOption:boolean})=>Promise<{createWritable:()=>Promise<Writable>}>
type SaveWindow=Window&{showSaveFilePicker?:SavePicker}
export function supportsSavePicker(){return typeof (window as SaveWindow).showSaveFilePicker==='function'}
export async function saveExportFile(file:ExportFile):Promise<'saved'|'downloaded'|'cancelled'>{
 const picker=(window as SaveWindow).showSaveFilePicker
 if(picker){
  let writable:Writable|undefined;let picked=false
  try{
   const handle=await picker.call(window,{suggestedName:file.name,types:[{description:file.extension.toUpperCase()+' file',accept:{[file.mimeType]:['.'+file.extension]}}],excludeAcceptAllOption:true})
   picked=true;writable=await handle.createWritable()
   await writable.write(new Blob([file.content],{type:file.mimeType+';charset=utf-8'}))
   await writable.close()
   return 'saved'
  }catch(error){
   if(writable)await writable.abort().catch(()=>{})
   if(!picked&&error instanceof DOMException&&error.name==='AbortError')return 'cancelled'
   throw error
  }
 }
 const url=URL.createObjectURL(new Blob([file.content],{type:file.mimeType+';charset=utf-8'}))
 const link=document.createElement('a');link.href=url;link.download=file.name
 try{document.body.appendChild(link);link.click()}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return 'downloaded'
}
