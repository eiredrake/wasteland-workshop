import './LoadingIndicator.css'
export default function LoadingIndicator({label}:{label:string}){return <div className="loading-indicator" role="status"><span className="loading-indicator-ring" aria-hidden="true"/><span>{label}</span></div>}
