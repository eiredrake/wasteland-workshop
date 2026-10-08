import type { Blueprint } from '../../features/blueprints/Blueprint'
import { useBlueprintReadHistory } from '../../features/blueprints/useBlueprintReadHistory'
import BlueprintUsageBadges from '../BlueprintUsageBadges/BlueprintUsageBadges'
import './BlueprintName.css'
export default function BlueprintName({blueprint}:{blueprint:Blueprint}) {
  const {readIds} = useBlueprintReadHistory(), read = readIds.includes(blueprint.id)
  return <span><span className={read?'blueprint-name-read':'blueprint-name-unread'}>{!read && <span className="blueprint-unread-dot" aria-hidden="true" />}{blueprint.name}</span>{!read && <span className="blueprint-unread-accessible"> (Unread)</span>}<BlueprintUsageBadges blueprint={blueprint}/></span>
}
