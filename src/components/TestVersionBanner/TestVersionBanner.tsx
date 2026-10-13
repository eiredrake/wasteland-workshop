import './TestVersionBanner.css'
import {isTestServer} from './TestServer'
export default function TestVersionBanner({hostname=window.location.hostname}:{hostname?:string}){
 return isTestServer(hostname)?<div className="test-version-banner">TEST VERSION</div>:null
}
