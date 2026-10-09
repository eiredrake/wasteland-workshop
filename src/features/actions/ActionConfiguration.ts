import type { ActionConfiguration, ActionField, ActionOption } from './Action'
export const visibleActionFields = (option: ActionOption): ActionField[] => option.fields.filter(field => field.type !== 'select' || field.choices.length !== 1)
export function defaultActionConfiguration(option: ActionOption): ActionConfiguration {
  const result: ActionConfiguration = {}
  for (const field of option.fields) {
    if (field.type === 'select' && field.choices.length === 1) result[field.id] = field.choices[0].value
    else if (field.type === 'quantity') result[field.id] = field.min
  }
  return result
}
