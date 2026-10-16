import InformationPanel from '../../components/InformationPanel/InformationPanel'
import ActionConfigurationForm from '../actions/ActionConfigurationForm'
import type { ActionConfiguration } from '../actions/Action'
import type { Blueprint } from './Blueprint'
import { canQueueProcedure, pendingProcedureOutputs, procedureAction } from './ProcedureAction'

export default function ProcedureQueueEntry({ blueprint, onAdd, onClose }: {
  blueprint: Blueprint
  onAdd: (configuration: ActionConfiguration, quantity?: number) => boolean
  onClose: () => void
}) {
  if (!canQueueProcedure(blueprint)) return <InformationPanel title="Crafting output review" tone="gold">
    <p>This procedure creates {pendingProcedureOutputs[blueprint.id] ?? 'an item'}. Its crafting inputs and outputs need review before it can be added to the Work Queue.</p>
    <p>You can still track this print in your collections and read its full rules here.</p>
  </InformationPanel>
  return <ActionConfigurationForm key={blueprint.id} definition={procedureAction(blueprint)} onClose={onClose} onAdd={(_option, configuration, _target, _session, quantity) => onAdd(configuration, quantity)} />
}
