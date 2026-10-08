import type { Blueprint } from './Blueprint'
import blueprintData from '../../data/wasteland-blueprints.json'

type BlueprintDatastore = {
  schemaVersion: number
  generatedAt: string
  source: string
  blueprintCount: number
  masterBlueprintCount: number
  excludedNonCraftingCount: number
  blueprints: Blueprint[]
}

const datastore =
  blueprintData as BlueprintDatastore

export const masterBlueprintsUpdatedAt = datastore.generatedAt

export const allBlueprints: Blueprint[] =
  datastore.blueprints

  export const masterBlueprints: Blueprint[] =
  allBlueprints.filter((blueprint) => {
    if (
      (blueprint.itemCraftings?.length ?? 0) ===
      0
    ) {
      return false
    }

    const finalProductKind =
      blueprint.itemCraftings?.[0]
        ?.craftingFinalProducts?.[0]
        ?.finalProduct.kind

    return finalProductKind !== 'taxonomy'
  })