export function runningInstalledApp(){
 return window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true
}
export function isWorkshopApp(app:{platform?:string;id?:string;url?:string},origin:string){
 if(app.platform!=='webapp')return false
 try{return app.id?new URL(app.id,origin).href===new URL('/',origin).href:!!app.url&&new URL(app.url,origin).href===new URL('/manifest.webmanifest',origin).href}catch{return false}
}
