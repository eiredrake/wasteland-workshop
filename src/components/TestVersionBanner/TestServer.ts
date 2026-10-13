export function isTestServer(hostname:string):boolean {
 return ['workshop-test.foundationsrpg.org','workbench-test.foundationsrpg.org'].includes(hostname.toLowerCase().replace(/\.$/,''))
}
