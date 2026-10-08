import './AppMetadata.css'
export default function AppMetadata({version,blueprintsUpdatedAt}:{version:string;blueprintsUpdatedAt:string}) {
  const date = new Date(blueprintsUpdatedAt)
  const valid = blueprintsUpdatedAt.trim() !== '' && Number.isFinite(date.getTime())
  return <span className="app-version app-metadata">
    <span>v{version}</span>
    <span>Blueprints updated: {valid ? <time dateTime={date.toISOString()} title="Master blueprint catalog normalization date (UTC)">{date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'})}</time> : 'Unknown'}</span>
  </span>
}
