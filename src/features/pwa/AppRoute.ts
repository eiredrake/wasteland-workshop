export const appViews=['workshop','catalog','collections','scan-prints','warehouse','shopping','builds','history','timer','settings','about','algorithm'] as const
export type AppView=typeof appViews[number]
export function readAppRoute(hash:string){
 const [view,id]=hash.replace(/^#\/?/,'').split('/')
 return {view:(appViews as readonly string[]).includes(view)?view as AppView:'workshop' as AppView,
  blueprintId:view==='catalog'&&/^\d+$/.test(id??'')?Number(id):undefined}
}
export function appRoute(view:AppView,blueprintId?:number){return '#/'+view+(view==='catalog'&&blueprintId!==undefined?'/'+blueprintId:'')}
