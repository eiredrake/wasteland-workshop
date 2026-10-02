export type BlueprintAccessStatus = 'acquired' | 'to-acquire'

export type BlueprintCollectionEntry = {
  blueprintId: number
  status: BlueprintAccessStatus
}

export type BlueprintCollection = {
  id: string
  name: string
  entries: BlueprintCollectionEntry[]
}