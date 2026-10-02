import { useState } from 'react'
import {
  defaultEconomicsSettings,
  type EconomicsSettings,
} from '../../economics/EconomicsSettings'

type EconomicsSettingsViewProps = {
  currentSettings: EconomicsSettings
  onSave: (settings: EconomicsSettings) => void
}

function EconomicsSettingsView({
  currentSettings,
  onSave,
}: EconomicsSettingsViewProps) {
  const [settings, setSettings] = useState<EconomicsSettings>({
    ...currentSettings,
  })

  const updateSetting = (
    setting: keyof EconomicsSettings,
    value: number
  ) => {
    setSettings({
      ...settings,
      [setting]: value,
    })
  }

  const restoreDefaults = () => {
    setSettings({
      ...defaultEconomicsSettings,
    })
  }

  const saveSettings = () => {
    onSave(settings)
  }

  return (
    <section>
      <h2>Economics Settings</h2>

      <p>
        Configure the assumptions Wasteland Workshop uses when calculating
        production costs and suggested selling prices.
      </p>

      <h3>Labor Valuation</h3>

      <label>
        Mind value
        <input
          type="number"
          min="0"
          step="0.1"
          value={settings.mindCostPerPoint}
          onChange={(event) =>
            updateSetting('mindCostPerPoint', Number(event.target.value))
          }
        />
        cr per Mind
      </label>

      <label>
        Time value
        <input
          type="number"
          min="0"
          step="0.01"
          value={settings.timeCostPerMinute}
          onChange={(event) =>
            updateSetting('timeCostPerMinute', Number(event.target.value))
          }
        />
        cr per minute
      </label>

      <h3>Foraging Card Valuation</h3>

      <label>
        Basic
        <input
          type="number"
          min="0"
          step="1"
          value={settings.basicForagingCardCost}
          onChange={(event) =>
            updateSetting('basicForagingCardCost', Number(event.target.value))
          }
        />
        cr
      </label>

      <label>
        Proficient
        <input
          type="number"
          min="0"
          step="1"
          value={settings.proficientForagingCardCost}
          onChange={(event) =>
            updateSetting(
              'proficientForagingCardCost',
              Number(event.target.value)
            )
          }
        />
        cr
      </label>

      <label>
        Master
        <input
          type="number"
          min="0"
          step="1"
          value={settings.masterForagingCardCost}
          onChange={(event) =>
            updateSetting('masterForagingCardCost', Number(event.target.value))
          }
        />
        cr
      </label>

      <h3>Selling Price</h3>

      <label>
        Default markup
        <input
          type="number"
          min="0"
          step="1"
          value={settings.defaultMarkupPercent}
          onChange={(event) =>
            updateSetting('defaultMarkupPercent', Number(event.target.value))
          }
        />
        %
      </label>

      <div>
        <button type="button" onClick={saveSettings}>
          Save Settings
        </button>

        <button type="button" onClick={restoreDefaults}>
          Restore Defaults
        </button>
      </div>
    </section>
  )
}

export default EconomicsSettingsView