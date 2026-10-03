import {
  useRef,
  useState,
} from 'react'
import type {
  BlueprintAccessStatus,
  BlueprintCollection,
  BlueprintCollectionEntry,
} from './BlueprintCollection'
import './BlueprintCollectionsView.css'

type BlueprintCollectionImport = {
  format: 'wasteland-workshop-blueprint-collection'
  version: 1
  entries: BlueprintCollectionEntry[]
}

type PendingImport = {
  entries: BlueprintCollectionEntry[]
}

type BlueprintCollectionsViewProps = {
  collections: BlueprintCollection[]
  activeCollectionId: string | undefined
  onAddCollection: (name: string) => void
  onSetActiveCollection: (collectionId: string) => void
  onDeleteCollection: (collectionId: string) => void
  onImportCollection: (
    name: string,
    entries: BlueprintCollectionEntry[]
  ) => void
}

function BlueprintCollectionsView({
  collections,
  activeCollectionId,
  onAddCollection,
  onSetActiveCollection,
  onDeleteCollection,
  onImportCollection,
}: BlueprintCollectionsViewProps) {
  const [addingCollection, setAddingCollection] =
    useState(false)

  const [collectionName, setCollectionName] =
    useState('')

  const [pendingImport, setPendingImport] =
    useState<PendingImport | null>(null)

  const [importName, setImportName] =
    useState('')

  const fileInputRef =
    useRef<HTMLInputElement>(null)

  const handleAddCollection = () => {
    const name = collectionName.trim()

    if (!name) {
      return
    }

    onAddCollection(name)
    setCollectionName('')
    setAddingCollection(false)
  }

  const handleCancel = () => {
    setCollectionName('')
    setAddingCollection(false)
  }

  const handleExportCollection = (
    collection: BlueprintCollection
  ) => {
    const exportData: BlueprintCollectionImport = {
      format:
        'wasteland-workshop-blueprint-collection',
      version: 1,
      entries: collection.entries,
    }

    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      {
        type: 'application/json',
      }
    )

    const url = URL.createObjectURL(blob)

    const safeName = collection.name
      .trim()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')

    const link = document.createElement('a')

    link.href = url
    link.download =
      `${safeName || 'blueprint-collection'}.json`

    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(url)
  }

  const handleDeleteCollection = (
    collection: BlueprintCollection
  ) => {
    const confirmed = window.confirm(
      `Delete "${collection.name}"?\n\nThis cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    onDeleteCollection(collection.id)
  }

  const isBlueprintAccessStatus = (
    value: unknown
  ): value is BlueprintAccessStatus =>
    value === 'acquired' ||
    value === 'to-acquire'

  const isImportEntry = (
    value: unknown
  ): value is BlueprintCollectionEntry => {
    if (
      typeof value !== 'object' ||
      value === null
    ) {
      return false
    }

    const entry = value as {
      blueprintId?: unknown
      status?: unknown
    }

    return (
      typeof entry.blueprintId === 'number' &&
      Number.isInteger(entry.blueprintId) &&
      isBlueprintAccessStatus(entry.status)
    )
  }

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]

    event.target.value = ''

    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const data: unknown = JSON.parse(text)

      if (
        typeof data !== 'object' ||
        data === null
      ) {
        throw new Error('Invalid import file.')
      }

      const imported =
        data as Partial<BlueprintCollectionImport>

      if (
        imported.format !==
          'wasteland-workshop-blueprint-collection' ||
        imported.version !== 1 ||
        !Array.isArray(imported.entries) ||
        !imported.entries.every(isImportEntry)
      ) {
        throw new Error('Invalid import file.')
      }

      setPendingImport({
        entries: imported.entries,
      })

      setImportName('')
    } catch {
      window.alert(
        'That file is not a valid Wasteland Workshop blueprint collection.'
      )
    }
  }

  const handleSaveImport = () => {
    const name = importName.trim()

    if (!name || !pendingImport) {
      return
    }

    onImportCollection(
      name,
      pendingImport.entries
    )

    setPendingImport(null)
    setImportName('')
  }

  const handleCancelImport = () => {
    setPendingImport(null)
    setImportName('')
  }

  return (
    <section className="blueprint-collections-page">
      <header className="blueprint-collections-header">
        <div>
          <h2>Blueprint Collections</h2>

          <p>
            Track blueprints you have access to and
            blueprints you want to acquire.
          </p>
        </div>

        <div className="blueprint-collection-header-actions">
          {!addingCollection && !pendingImport && (
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                Import Collection
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  setAddingCollection(true)
                }
              >
                Add Collection
              </button>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={handleImportFile}
          />
        </div>
      </header>

      {pendingImport && (
        <div className="blueprint-collection-add">
          <label htmlFor="import-collection-name">
            Imported Collection Name
          </label>

          <input
            id="import-collection-name"
            type="text"
            value={importName}
            placeholder="Collection Name"
            autoFocus
            onChange={(event) =>
              setImportName(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleSaveImport()
              }

              if (event.key === 'Escape') {
                handleCancelImport()
              }
            }}
          />

          <p>
            {pendingImport.entries.length}{' '}
            blueprint
            {pendingImport.entries.length === 1
              ? ''
              : 's'}{' '}
            found in import.
          </p>

          <div className="blueprint-collection-add-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleCancelImport}
            >
              Cancel
            </button>

            <button
              type="button"
              className="primary-button"
              disabled={!importName.trim()}
              onClick={handleSaveImport}
            >
              Import Collection
            </button>
          </div>
        </div>
      )}

      {addingCollection && (
        <div className="blueprint-collection-add">
          <label htmlFor="collection-name">
            Collection Name
          </label>

          <input
            id="collection-name"
            type="text"
            value={collectionName}
            placeholder="New Collection"
            autoFocus
            onChange={(event) =>
              setCollectionName(
                event.target.value
              )
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleAddCollection()
              }

              if (event.key === 'Escape') {
                handleCancel()
              }
            }}
          />

          <div className="blueprint-collection-add-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleCancel}
            >
              Cancel
            </button>

            <button
              type="button"
              className="primary-button"
              disabled={!collectionName.trim()}
              onClick={handleAddCollection}
            >
              Save Collection
            </button>
          </div>
        </div>
      )}

      {collections.length === 0 ? (
        <div className="blueprint-collections-empty">
          <h3>No Blueprint Collections</h3>

          <p>
            Create a collection for a character,
            shared library, or any other group of
            blueprints you want to track.
          </p>
        </div>
      ) : (
        <div className="blueprint-collections-list">
          {collections.map((collection) => {
            const acquiredCount =
              collection.entries.filter(
                (entry) =>
                  entry.status === 'acquired'
              ).length

            const wantedCount =
              collection.entries.filter(
                (entry) =>
                  entry.status === 'to-acquire'
              ).length

            const isActive =
              collection.id ===
              activeCollectionId

            return (
              <div
                key={collection.id}
                className={`blueprint-collection-card${
                  isActive
                    ? ' blueprint-collection-card-active'
                    : ''
                }`}
              >
                <div className="blueprint-collection-card-header">
                  <div>
                    <h3>{collection.name}</h3>

                    <p>
                      {acquiredCount} acquired ·{' '}
                      {wantedCount} to acquire
                    </p>
                  </div>

                  {isActive && (
                    <span className="blueprint-collection-active-badge">
                      Active
                    </span>
                  )}
                </div>

                <div className="blueprint-collection-card-actions">
                  {!isActive && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        onSetActiveCollection(
                          collection.id
                        )
                      }
                    >
                      Set Active
                    </button>
                  )}

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      handleExportCollection(
                        collection
                      )
                    }
                  >
                    Export
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      handleDeleteCollection(
                        collection
                      )
                    }
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default BlueprintCollectionsView