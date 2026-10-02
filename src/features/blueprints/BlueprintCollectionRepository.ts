import type { BlueprintCollection } from './BlueprintCollection'

const STORAGE_KEY = 'wasteland-workshop-blueprint-collections'
const ACTIVE_COLLECTION_STORAGE_KEY = 'wasteland-workshop-active-blueprint-collection'

export function loadBlueprintCollections(): BlueprintCollection[] {
  const savedCollections = localStorage.getItem(STORAGE_KEY)

  if (!savedCollections) {
    return []
  }

  try {
    const collections = JSON.parse(savedCollections)

    return Array.isArray(collections) ? collections : []
  } catch {
    return []
  }
}

export function saveBlueprintCollections(
  collections: BlueprintCollection[]
): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(collections)
  )
}

export function loadActiveBlueprintCollectionId(): string | undefined {
  return (
    localStorage.getItem(ACTIVE_COLLECTION_STORAGE_KEY) ??
    undefined
  )
}

export function saveActiveBlueprintCollectionId(
  collectionId: string | undefined
): void {
  if (collectionId === undefined) {
    localStorage.removeItem(ACTIVE_COLLECTION_STORAGE_KEY)
    return
  }

  localStorage.setItem(
    ACTIVE_COLLECTION_STORAGE_KEY,
    collectionId
  )
}