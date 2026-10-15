export function isTestServer(hostname:string):boolean {
 return hostname.toLowerCase().replace(/\.$/,'')==='workshop-test.foundationsrpg.org'
}
