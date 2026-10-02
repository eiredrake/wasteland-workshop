import { useState } from 'react'
import './App.css'
import BlueprintSearch from './features/blueprints/BlueprintSearch'
import EconomicsSettingsView from './features/settings/EconomicsSettingsView'
import { DefaultCostCalculator } from './economics/DefaultCostCalculator'
import {
  defaultEconomicsSettings,
  type EconomicsSettings,
} from './economics/EconomicsSettings'

type AppView = 'workshop' | 'settings' | 'about' | 'algorithm'

const ECONOMICS_SETTINGS_KEY = 'wasteland-workshop-economics-settings'

function loadEconomicsSettings(): EconomicsSettings {
  const savedSettings = localStorage.getItem(ECONOMICS_SETTINGS_KEY)

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
  const [currentView, setCurrentView] = useState<AppView>('workshop')
  const [economicsSettings, setEconomicsSettings] =
    useState<EconomicsSettings>(loadEconomicsSettings)

  const calculator = new DefaultCostCalculator(economicsSettings)

  const navigateTo = (view: AppView) => {
    setCurrentView(view)
    setMenuOpen(false)
  }

  const saveEconomicsSettings = (settings: EconomicsSettings) => {
    setEconomicsSettings(settings)

    localStorage.setItem(
      ECONOMICS_SETTINGS_KEY,
      JSON.stringify(settings)
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
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>

        <div>
          <h1>Wasteland Workshop</h1>
          <p>Dystopia Rising crafting economics and build planning.</p>
        </div>
      </header>

      {menuOpen && (
        <nav className="app-menu">
          <button type="button" onClick={() => navigateTo('workshop')}>
            Workshop
          </button>

          <button type="button" onClick={() => navigateTo('settings')}>
            Settings
          </button>

          <div className="menu-heading">Help</div>

          <button type="button" onClick={() => navigateTo('about')}>
            About
          </button>

          <button type="button" onClick={() => navigateTo('algorithm')}>
            Valuation Algorithm
          </button>
        </nav>
      )}

      {currentView === 'workshop' && (
        <BlueprintSearch
        calculator={calculator}
        defaultMarkupPercent={economicsSettings.defaultMarkupPercent}/>
      )}

      {currentView === 'settings' && (
        <EconomicsSettingsView
          currentSettings={economicsSettings}
          onSave={saveEconomicsSettings}
        />
      )}

      {currentView === 'about' && (
        <section>
          <h2>About Wasteland Workshop</h2>
          <p>About information coming soon.</p>
        </section>
      )}

      {currentView === 'algorithm' && (
        <section>
          <h2>Valuation Algorithm</h2>
          <p>Algorithm documentation coming soon.</p>
        </section>
      )}
    </main>
  )
}

export default App