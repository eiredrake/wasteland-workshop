import { useState } from 'react'
import type { BlueprintCollection } from './BlueprintCollection'
import './BlueprintCollectionsView.css'

type BlueprintCollectionsViewProps = {
  collections: BlueprintCollection[]
  activeCollectionId: string | undefined
  onAddCollection: (name: string) => void
  onSetActiveCollection: (collectionId: string) => void
}

function BlueprintCollectionsView({
  collections,
  activeCollectionId,
  onAddCollection,
  onSetActiveCollection,
}: BlueprintCollectionsViewProps) {
  const [addingCollection, setAddingCollection] = useState(false)
  const [collectionName, setCollectionName] = useState('')

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

  return (
    <section className="blueprint-collections-page">
      <header className="blueprint-collections-header">
        <div>
          <h2>Blueprint Collections</h2>

          <p>
            Track blueprints you have access to and blueprints you want to
            acquire.
          </p>
        </div>

        {!addingCollection && (
          <button
            type="button"
            className="primary-button"
            onClick={() => setAddingCollection(true)}
          >
            Add Collection
          </button>
        )}
      </header>

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
              setCollectionName(event.target.value)
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
            Create a collection for a character, shared library, or any other
            group of blueprints you want to track.
          </p>
        </div>
      ) : (
        <div className="blueprint-collections-list">
          {collections.map((collection) => {
            const acquiredCount = collection.entries.filter(
              (entry) => entry.status === 'acquired'
            ).length

            const wantedCount = collection.entries.filter(
              (entry) => entry.status === 'to-acquire'
            ).length

            const isActive =
              collection.id === activeCollectionId

            return (
              <div
                key={collection.id}
                className={`blueprint-collection-card${
                  isActive ? ' blueprint-collection-card-active' : ''
                }`}
              >
                <div className="blueprint-collection-card-header">
                  <div>
                    <h3>{collection.name}</h3>

                    <p>
                      {acquiredCount} acquired · {wantedCount} to acquire
                    </p>
                  </div>

                  {isActive && (
                    <span className="blueprint-collection-active-badge">
                      Active
                    </span>
                  )}
                </div>

                {!isActive && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      onSetActiveCollection(collection.id)
                    }
                  >
                    Set Active
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default BlueprintCollectionsView