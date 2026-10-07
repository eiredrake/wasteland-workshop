import {
  useEffect,
  useRef,
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
import { createCompletionTracker, playAlarm, prepareAlarmAudio } from './features/timer/CraftAlarm'

import CraftTimer from './components/CraftTimer/CraftTimer'
import {
  createIdleCraftTimer,
  type CraftTimerState,
} from './features/timer/CraftTimerState'

import {
  beginCraftTimer,
  loadCraftTimer,
  pauseCraftTimer,
  resumeCraftTimer,
  tickCraftTimer,
} from './features/timer/CraftTimerEngine'

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
  | 'shopping'
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

  const [craftTimer, setCraftTimer] =
    useState<CraftTimerState>(
      createIdleCraftTimer
    )

  const [alarmSettings, setAlarmSettings] = useState(loadAlarmSettings)
  const [completionTracker] = useState(() => createCompletionTracker(craftTimer.status))

  useEffect(() => {
    if (completionTracker(craftTimer.status)) {
      void playAlarm(alarmSettings)
    }
  }, [craftTimer.status, alarmSettings, completionTracker])

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

  const craftTimerRef = useRef(craftTimer)

  useEffect(() => {
    craftTimerRef.current = craftTimer
  }, [craftTimer])

  useEffect(() => {
    if (craftTimer.status !== 'running') {
      return
    }

    const update = () => {
      const updatedTimer = tickCraftTimer(craftTimerRef.current)
      craftTimerRef.current = updatedTimer
      setCraftTimer(updatedTimer)
    }
    const visible = () => { if (document.visibilityState === 'visible') update() }
    const intervalId = window.setInterval(update, 250)
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('pageshow', update)
    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', visible)
      window.removeEventListener('pageshow', update)
    }
  }, [craftTimer.status])

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

  const openCraftTimer = () => {
    setCurrentView('timer')
    setMenuOpen(false)
  }

  const loadBlueprintIntoCraftTimer = (
    blueprintName: string,
    craftingMinutes: number
  ) => {
    if (
      craftTimer.label ===
        blueprintName &&
      craftTimer.status === 'running'
    ) {
      setCraftTimer(
        pauseCraftTimer(craftTimer)
      )

      return
    }

    if (
      craftTimer.label ===
        blueprintName &&
      craftTimer.status === 'paused'
    ) {
      setCraftTimer(
        resumeCraftTimer(craftTimer)
      )

      return
    }

    const loadedTimer =
      loadCraftTimer(
        craftingMinutes,
        blueprintName
      )

    setCraftTimer(
      beginCraftTimer(loadedTimer)
    )

    showToast(
      `Crafting "${blueprintName}" — ${craftingMinutes} minute timer started.`,
      'success'
    )
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
        <WorkshopView
          shopping={shopping}
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
        <BlueprintSearch
          shopping={shopping}
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

      {currentView ===
        'timer' && (
        <CraftTimer
          timer={craftTimer}
          onChange={setCraftTimer}
        />
      )}

      {currentView ===
        'settings' && (
        <>
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
