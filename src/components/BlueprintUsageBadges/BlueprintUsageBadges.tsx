import type { Blueprint } from '../../features/blueprints/Blueprint'
import { blueprintUsageRestrictions } from '../../features/blueprints/UsageRestrictions'
import './BlueprintUsageBadges.css'
export default function BlueprintUsageBadges({blueprint}:{blueprint:Blueprint}) {
  const restrictions = blueprintUsageRestrictions(blueprint)
  if (!restrictions.length) return null
  return <span className="blueprint-usage-badges">{restrictions.map(item => <span key={item.type+item.value} className="blueprint-usage-badge" title={item.source}>{item.type}: {item.value}</span>)}</span>
}
