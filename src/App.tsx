import BackupSettingsView from './features/backup/BackupSettingsView'
import WarehouseSettingsView from './features/settings/WarehouseSettingsView'
import { loadExpirationWarningDays, saveExpirationWarningDays } from './features/settings/WarehouseSettings'
import WarehouseView from './features/warehouse/WarehouseView'
import { useWarehouse } from './features/warehouse/useWarehouse'
import {
  useEffect,
  useState,
} from 'react'

import './App.css'

import ShoppingListsView from './features/shopping/ShoppingListsView'
import type { BlueprintShoppingProps } from './features/shopping/BlueprintShoppingAction'
import type { Blueprint } from './features/blueprints/Blueprint'
import { loadShoppingLists, saveShoppingLists } from './features/shopping/ShoppingListRepository'
import type { ShoppingListState } from './features/shopping/ShoppingList'
import { addBlueprintComponents, replaceShoppingList, selectShoppingList } from './features/shopping/ShoppingListService'

import BlueprintSearch from './features/blueprints/BlueprintSearch'
import BlueprintCollectionsView from './features/blueprints/BlueprintCollectionsView'
import WorkshopView from './features/blueprints/WorkshopView'
import EconomicsSettingsView from './features/settings/EconomicsSettingsView'
import AboutView from './features/help/AboutView'
import ValuationAlgorithmView from './features/help/ValuationAlgorithmView'

import AlarmSettingsView from './features/settings/AlarmSettingsView'
import { loadAlarmSettings, saveAlarmSettings } from './features/timer/AlarmSettings'
import { playAlarm, prepareAlarmAudio } from './features/timer/CraftAlarm'

import CraftTimer from './components/CraftTimer/CraftTimer'
import {
  createIdleCraftTimer,
} from './features/timer/CraftTimerState'

import BuildQueueView from './features/builds/BuildQueueView'
import BuildStatusBadge from './components/BuildStatusBadge/BuildStatusBadge'
import { useBuildQueue } from './features/builds/useBuildQueue'
import { addBuild, enqueueBlueprintBuild, changeBuildTimer, toggleBuildStatus, workingBuild } from './features/builds/BuildQueueService'


import { DefaultCostCalculator } from './economics/DefaultCostCalculator'
import {
  resolveEconomicsSettings,
  type EconomicsOverrides,
} from './economics/EconomicsSettings'
import { loadEconomicsOverrides, saveEconomicsOverrides } from './economics/EconomicsSettingsRepository'

import type {
  BlueprintAccessStatus,
  BlueprintCollection,
  BlueprintCollectionEntry,
} from './features/blueprints/BlueprintCollection'

import {
  loadBlueprintCollections,
  saveBlueprintCollections,
  loadActiveBlueprintCollectionId,
  saveActiveBlueprintCollectionId,
} from './features/blueprints/BlueprintCollectionRepository'

import ToastContainer from './components/Toast/ToastContainer'
import type {
  ToastMessage,
  ToastType,
} from './components/Toast/Toast'

type AppView =
  | 'workshop'
  | 'catalog'
  | 'collections'
  | 'warehouse'
  | 'shopping'
  | 'builds'
  | 'timer'
  | 'settings'
  | 'about'
  | 'algorithm'

function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  const [currentView, setCurrentView] =
    useState<AppView>('workshop')

  const [
    economicsOverrides,
    setEconomicsOverrides,
  ] = useState<EconomicsOverrides>(loadEconomicsOverrides)
  const economicsSettings = resolveEconomicsSettings(economicsOverrides)

  const [toasts, setToasts] =
    useState<ToastMessage[]>([])

  const [
    blueprintCollections,
    setBlueprintCollections,
  ] = useState<BlueprintCollection[]>(
    loadBlueprintCollections
  )

  const [
    activeBlueprintCollectionId,
    setActiveBlueprintCollectionId,
  ] = useState<string | undefined>(
    loadActiveBlueprintCollectionId
  )

  const [shoppingState, setShoppingState] = useState(loadShoppingLists)

  const [alarmSettings, setAlarmSettings] = useState(loadAlarmSettings)
  const [timerBuildId, setTimerBuildId] = useState<string>()


  useEffect(() => {
    if (!alarmSettings.sound) return
    const prepare = () => { void prepareAlarmAudio() }
    document.addEventListener('pointerdown', prepare)
    document.addEventListener('keydown', prepare)
    return () => {
      document.removeEventListener('pointerdown', prepare)
      document.removeEventListener('keydown', prepare)
    }
  }, [alarmSettings.sound])

  const calculator =
    new DefaultCostCalculator(
      economicsSettings
    )

  const activeBlueprintCollection =
    blueprintCollections.find(
      (collection) =>
        collection.id ===
        activeBlueprintCollectionId
    )

  const navigateTo = (
    view: AppView
  ) => {
    setCurrentView(view)
    setMenuOpen(false)
  }

  const dismissToast = (
    id: number
  ) => {
    setToasts((currentToasts) =>
      currentToasts.filter(
        (toast) => toast.id !== id
      )
    )
  }

  const showToast = (
    message: string,
    type: ToastType = 'info'
  ) => {
    const id = Date.now()

    setToasts((currentToasts) => [
      ...currentToasts,
      {
        id,
        message,
        type,
      },
    ])

    window.setTimeout(() => {
      dismissToast(id)
    }, 4000)
  }

  const [expirationWarningDays,setExpirationWarningDays] = useState(loadExpirationWarningDays)
  const inventory = useWarehouse(message => showToast(message, 'warning'))
  const buildQueue = useBuildQueue(() => { void playAlarm(alarmSettings) }, message => showToast(message, 'warning'))
  const activeBuild = workingBuild(buildQueue.builds)
  const craftTimer = activeBuild?.timer ?? createIdleCraftTimer()
  const timerBuild = buildQueue.builds.find(build => build.id === timerBuildId) ?? activeBuild

  const openCraftTimer = () => {
    if (activeBuild) setTimerBuildId(activeBuild.id)
    navigateTo('timer')
  }
  const addBlueprintToBuildQueue = (blueprint: Blueprint) => {
    if (buildQueue.apply(queue => enqueueBlueprintBuild(queue, blueprint, economicsSettings))) {
      navigateTo('builds')
      showToast('Added "' + blueprint.name + '" to the Build Queue.', 'success')
    }
  }
  const loadBlueprintIntoCraftTimer = (blueprint: Blueprint) => {
    const id = crypto.randomUUID()
    if (buildQueue.apply(queue => addBuild(queue, blueprint, economicsSettings, true, Date.now(), id))) {
      setTimerBuildId(id)
      navigateTo('timer')
      showToast('Crafting "' + blueprint.name + '" — Build started.', 'success')
    }
  }

  const saveEconomicsSettings = (overrides: EconomicsOverrides) => {
    if (!saveEconomicsOverrides(overrides)) {
      showToast('Unable to save Economics Settings. Your changes were not applied.', 'error')
      return
    }
    setEconomicsOverrides(overrides)
    showToast('Settings saved.', 'success')
  }

  const addBlueprintCollection = (
    name: string
  ) => {
    const newCollection:
      BlueprintCollection = {
        id: crypto.randomUUID(),
        name,
        entries: [],
      }

    const updatedCollections = [
      ...blueprintCollections,
      newCollection,
    ]

    setBlueprintCollections(
      updatedCollections
    )

    saveBlueprintCollections(
      updatedCollections
    )

    if (
      blueprintCollections.length === 0
    ) {
      setActiveBlueprintCollectionId(
        newCollection.id
      )

      saveActiveBlueprintCollectionId(
        newCollection.id
      )
    }

    showToast(
      `Created blueprint collection "${name}".`,
      'success'
    )
  }

  const importBlueprintCollection = (
    name: string,
    entries: BlueprintCollectionEntry[]
  ) => {
    const newCollection:
      BlueprintCollection = {
        id: crypto.randomUUID(),
        name,
        entries,
      }

    const updatedCollections = [
      ...blueprintCollections,
      newCollection,
    ]

    setBlueprintCollections(
      updatedCollections
    )

    saveBlueprintCollections(
      updatedCollections
    )

    if (
      blueprintCollections.length === 0
    ) {
      setActiveBlueprintCollectionId(
        newCollection.id
      )

      saveActiveBlueprintCollectionId(
        newCollection.id
      )
    }

    showToast(
      `Imported blueprint collection "${name}" with ${entries.length} blueprints.`,
      'success'
    )
  }

  const deleteBlueprintCollection = (
    collectionId: string
  ) => {
    const collection =
      blueprintCollections.find(
        (item) =>
          item.id === collectionId
      )

    if (!collection) {
      return
    }

    const updatedCollections =
      blueprintCollections.filter(
        (item) =>
          item.id !== collectionId
      )

    setBlueprintCollections(
      updatedCollections
    )

    saveBlueprintCollections(
      updatedCollections
    )

    if (
      activeBlueprintCollectionId ===
      collectionId
    ) {
      setActiveBlueprintCollectionId(
        undefined
      )

      saveActiveBlueprintCollectionId(
        undefined
      )
    }

    showToast(
      `Deleted blueprint collection "${collection.name}".`,
      'info'
    )
  }

  const setActiveBlueprintCollection = (
    collectionId: string
  ) => {
    setActiveBlueprintCollectionId(
      collectionId
    )

    saveActiveBlueprintCollectionId(
      collectionId
    )

    const collection =
      blueprintCollections.find(
        (item) =>
          item.id === collectionId
      )

    if (collection) {
      showToast(
        `"${collection.name}" is now the active blueprint collection.`,
        'info'
      )
    }
  }

  const updateBlueprintCollectionEntry = (
    blueprintId: number,
    blueprintName: string,
    status:
      | BlueprintAccessStatus
      | undefined
  ) => {
    if (!activeBlueprintCollectionId) {
      showToast(
        'Select an active blueprint collection first.',
        'warning'
      )

      return
    }

    const updatedCollections =
      blueprintCollections.map(
        (collection) => {
          if (
            collection.id !==
            activeBlueprintCollectionId
          ) {
            return collection
          }

          const entriesWithoutBlueprint =
            collection.entries.filter(
              (entry) =>
                entry.blueprintId !==
                blueprintId
            )

          if (status === undefined) {
            return {
              ...collection,
              entries:
                entriesWithoutBlueprint,
            }
          }

          return {
            ...collection,
            entries: [
              ...entriesWithoutBlueprint,
              {
                blueprintId,
                status,
              },
            ],
          }
        }
      )

    setBlueprintCollections(
      updatedCollections
    )

    saveBlueprintCollections(
      updatedCollections
    )

    const collection =
      blueprintCollections.find(
        (item) =>
          item.id ===
          activeBlueprintCollectionId
      )

    if (!collection) {
      return
    }

    if (status === 'acquired') {
      showToast(
        `"${blueprintName}" marked acquired in "${collection.name}".`,
        'success'
      )

      return
    }

    if (status === 'to-acquire') {
      showToast(
        `"${blueprintName}" added to the "${collection.name}" wishlist.`,
        'info'
      )

      return
    }

    if (status === 'sell') {
      showToast(
        `"${blueprintName}" added to the "${collection.name}" sell list.`,
        'info'
      )

      return
    }

    showToast(
      `"${blueprintName}" removed from "${collection.name}".`,
      'info'
    )
  }

  const updateShoppingState = (next: ShoppingListState): boolean => {
    try {
      saveShoppingLists(next)
      setShoppingState(next)
      return true
    } catch {
      showToast('Shopping list could not be saved. Your previous list was kept.', 'error')
      return false
    }
  }

  const addComponentsToShoppingList = (blueprint: Blueprint, listId: string): boolean => {
    const list = shoppingState.lists.find(item => item.id === listId)
    const components = blueprint.itemCraftings?.[0]?.craftingComponents
    if (!list || !components?.length) {
      showToast('Select a shopping list and a blueprint with components.', 'warning')
      return false
    }
    try {
      const next = selectShoppingList(replaceShoppingList(shoppingState, addBlueprintComponents(list, components)), listId)
      if (!updateShoppingState(next)) return false
      showToast(`Added all components for "${blueprint.name}" to "${list.name}".`, 'success')
      return true
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Components could not be added.', 'error')
      return false
    }
  }

  const shopping: BlueprintShoppingProps = {
    lists: shoppingState.lists,
    activeListId: shoppingState.activeListId,
    onAddComponents: addComponentsToShoppingList,
    onOpenLists: () => navigateTo('shopping'),
  }

  return (
    <main>
      <header className="app-header">
        <button
          className="menu-button"
          type="button"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() =>
            setMenuOpen(!menuOpen)
          }
        >
          ☰
        </button>

        <div>
          <h1>
            Wasteland Workshop
            <span className="app-version">
              v{__APP_VERSION__}
            </span>
          </h1>
        </div>
      </header>

      {menuOpen && (
        <nav className="app-menu">
          <button
            type="button"
            onClick={() =>
              navigateTo('workshop')
            }
          >
            Workshop
          </button>

          <button
            type="button"
            onClick={() =>
              navigateTo('catalog')
            }
          >
            Blueprint Catalog
          </button>

          <button
            type="button"
            onClick={() =>
              navigateTo(
                'collections'
              )
            }
          >
            Blueprint Collections
          </button>

          <button type="button" onClick={() => navigateTo('shopping')}>
            Shopping Lists
          </button>

          <button type="button" onClick={() => navigateTo('warehouse')}>Warehouse</button>

          <button type="button" onClick={() => navigateTo('builds')}>Build Queue</button>

          <button
            type="button"
            onClick={openCraftTimer}
          >
            Craft Timer
          </button>

          <button
            type="button"
            onClick={() =>
              navigateTo('settings')
            }
          >
            Settings
          </button>

          <div className="menu-heading">
            Help
          </div>

          <button
            type="button"
            onClick={() =>
              navigateTo('about')
            }
          >
            About
          </button>

          <button
            type="button"
            onClick={() =>
              navigateTo('algorithm')
            }
          >
            Valuation Algorithm
          </button>
        </nav>
      )}

      {currentView ===
        'workshop' && (
        <WorkshopView warehouse={inventory.warehouse} warehouseError={inventory.error}
          shopping={shopping}
          onAddBuild={addBlueprintToBuildQueue}
          activeCollection={
            activeBlueprintCollection
          }
          calculator={calculator}
          defaultMarkupPercent={
            economicsSettings
              .defaultMarkupPercent
          }
          craftTimer={craftTimer}
          onUpdateCollectionEntry={
            updateBlueprintCollectionEntry
          }
          onCraftBlueprint={
            loadBlueprintIntoCraftTimer
          }
          onOpenCraftTimer={
            openCraftTimer
          }
        />
      )}

      {currentView ===
        'catalog' && (
        <BlueprintSearch warehouse={inventory.warehouse} warehouseError={inventory.error}
          shopping={shopping}
          onAddBuild={addBlueprintToBuildQueue}
          calculator={calculator}
          defaultMarkupPercent={
            economicsSettings
              .defaultMarkupPercent
          }
          activeCollection={
            activeBlueprintCollection
          }
          craftTimer={craftTimer}
          onUpdateCollectionEntry={
            updateBlueprintCollectionEntry
          }
          onCraftBlueprint={
            loadBlueprintIntoCraftTimer
          }
          onOpenCraftTimer={
            openCraftTimer
          }
        />
      )}

      {currentView ===
        'collections' && (
        <BlueprintCollectionsView
          collections={
            blueprintCollections
          }
          activeCollectionId={
            activeBlueprintCollectionId
          }
          onAddCollection={
            addBlueprintCollection
          }
          onImportCollection={
            importBlueprintCollection
          }
          onDeleteCollection={
            deleteBlueprintCollection
          }
          onSetActiveCollection={
            setActiveBlueprintCollection
          }
        />
      )}

      {currentView === 'shopping' && (
        <ShoppingListsView state={shoppingState} onChange={updateShoppingState}
          calculator={calculator} activeCollection={activeBlueprintCollection}
          onUpdateBlueprint={updateBlueprintCollectionEntry}
          notify={(message, error) => showToast(message, error ? 'error' : 'success')} />
      )}

      {currentView === 'warehouse' && <WarehouseView warningDays={expirationWarningDays} warehouse={inventory.warehouse} apply={inventory.apply} error={inventory.error} />}

      {currentView === 'builds' && <BuildQueueView builds={buildQueue.builds} apply={buildQueue.apply} error={buildQueue.error}
        onTimer={id => { setTimerBuildId(id); navigateTo('timer') }} />}

      {currentView === 'timer' && <>
        <button type="button" className="secondary-button" onClick={() => navigateTo('builds')}>Open Build Queue</button>
        {timerBuild ? <>
          {activeBuild && activeBuild.id !== timerBuild.id && <p>Pause the current Build before starting another.</p>}
          <CraftTimer timer={timerBuild.timer} readOnly={timerBuild.status === 'Completed' || timerBuild.status === 'Enqueued'}
            onChange={timer => buildQueue.apply(queue => changeBuildTimer(queue,timerBuild.id,timer))}
            controls={<BuildStatusBadge build={timerBuild} blocked={!!activeBuild && activeBuild.id !== timerBuild.id && timerBuild.status !== 'Completed'}
              onToggle={() => buildQueue.apply(queue => toggleBuildStatus(queue,timerBuild.id))} />} />
        </> : <p>No Build selected. Add a Blueprint to the Build Queue, or tap its timer to start crafting.</p>}
      </>}

      {currentView ===
        'settings' && (
        <>
        <header className="settings-page settings-header"><h2>Settings</h2></header>
        <BackupSettingsView />
        <WarehouseSettingsView days={expirationWarningDays} onSave={days=>{
          try {saveExpirationWarningDays(days);setExpirationWarningDays(days);showToast('Expiration settings saved.','success');return true}
          catch {showToast('Expiration settings could not be saved.','error');return false}
        }} />
        <AlarmSettingsView settings={alarmSettings} onChange={settings => {
          try {
            saveAlarmSettings(settings)
            setAlarmSettings(settings)
          } catch {
            showToast('Alarm settings could not be saved.', 'error')
          }
        }} />
        <EconomicsSettingsView
          currentOverrides={
            economicsOverrides
          }
          onSave={
            saveEconomicsSettings
          }
        />
        </>
      )}

      {currentView ===
        'about' && (
        <AboutView />
      )}

      {currentView ===
        'algorithm' && (
        <ValuationAlgorithmView />
      )}

      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
      />
    </main>
  )
}

export default App
