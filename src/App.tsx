import {
  useEffect,
  useRef,
  useState,
} from 'react'

import './App.css'

import BlueprintSearch from './features/blueprints/BlueprintSearch'
import BlueprintCollectionsView from './features/blueprints/BlueprintCollectionsView'
import WorkshopView from './features/blueprints/WorkshopView'
import EconomicsSettingsView from './features/settings/EconomicsSettingsView'
import AboutView from './features/help/AboutView'
import ValuationAlgorithmView from './features/help/ValuationAlgorithmView'

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
  defaultEconomicsSettings,
  type EconomicsSettings,
} from './economics/EconomicsSettings'

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
  | 'timer'
  | 'settings'
  | 'about'
  | 'algorithm'

const ECONOMICS_SETTINGS_KEY =
  'wasteland-workshop-economics-settings'

function loadEconomicsSettings(): EconomicsSettings {
  const savedSettings = localStorage.getItem(
    ECONOMICS_SETTINGS_KEY
  )

  if (!savedSettings) {
    return { ...defaultEconomicsSettings }
  }

  try {
    return {
      ...defaultEconomicsSettings,
      ...JSON.parse(savedSettings),
    }
  } catch {
    return { ...defaultEconomicsSettings }
  }
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  const [currentView, setCurrentView] =
    useState<AppView>('workshop')

  const [economicsSettings, setEconomicsSettings] =
    useState<EconomicsSettings>(
      loadEconomicsSettings
    )

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

  const [craftTimer, setCraftTimer] =
    useState<CraftTimerState>(
      createIdleCraftTimer
    )

  const craftTimerRef = useRef(craftTimer)

  useEffect(() => {
    craftTimerRef.current = craftTimer
  }, [craftTimer])

  useEffect(() => {
    if (craftTimer.status !== 'running') {
      return
    }

    const intervalId =
      window.setInterval(() => {
        const updatedTimer =
          tickCraftTimer(
            craftTimerRef.current
          )

        craftTimerRef.current =
          updatedTimer

        setCraftTimer(updatedTimer)
      }, 250)

    return () => {
      window.clearInterval(intervalId)
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

  const saveEconomicsSettings = (
    settings: EconomicsSettings
  ) => {
    setEconomicsSettings(settings)

    localStorage.setItem(
      ECONOMICS_SETTINGS_KEY,
      JSON.stringify(settings)
    )

    showToast(
      'Settings saved.',
      'success'
    )
  }

  const addBlueprintCollection = (name: string) => {
    const newCollection: BlueprintCollection = {
      id: crypto.randomUUID(),
      name,
      entries: [],
    }
  
    const updatedCollections = [
      ...blueprintCollections,
      newCollection,
    ]
  
    setBlueprintCollections(updatedCollections)
    saveBlueprintCollections(updatedCollections)
  
    if (!activeBlueprintCollection) {
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
    if (
      !activeBlueprintCollectionId
    ) {
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

          if (
            status === undefined
          ) {
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

    if (
      status === 'to-acquire'
    ) {
      showToast(
        `"${blueprintName}" added to the "${collection.name}" wishlist.`,
        'info'
      )

      return
    }

    showToast(
      `"${blueprintName}" removed from "${collection.name}".`,
      'info'
    )
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

      {currentView ===
        'timer' && (
        <CraftTimer
          timer={craftTimer}
          onChange={setCraftTimer}
        />
      )}

      {currentView ===
        'settings' && (
        <EconomicsSettingsView
          currentSettings={
            economicsSettings
          }
          onSave={
            saveEconomicsSettings
          }
        />
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