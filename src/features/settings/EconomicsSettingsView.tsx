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
    <section className="settings-page">
      <div className="settings-header">
        <h2>Economics Settings</h2>
        <p>
          Configure the assumptions Wasteland Workshop uses when calculating
          production costs and suggested selling prices.
        </p>
      </div>

      <div className="settings-card">
        <h3>Labor Valuation</h3>

        <div className="settings-row">
          <label htmlFor="mind-value">Mind value</label>

          <div className="settings-input">
            <input
              id="mind-value"
              type="number"
              min="0"
              step="0.1"
              value={settings.mindCostPerPoint}
              onChange={(event) =>
                updateSetting(
                  'mindCostPerPoint',
                  Number(event.target.value)
                )
              }
            />
            <span>cr / Mind</span>
          </div>
        </div>

        <div className="settings-row">
          <label htmlFor="time-value">Time value</label>

          <div className="settings-input">
            <input
              id="time-value"
              type="number"
              min="0"
              step="0.01"
              value={settings.timeCostPerMinute}
              onChange={(event) =>
                updateSetting(
                  'timeCostPerMinute',
                  Number(event.target.value)
                )
              }
            />
            <span>cr / minute</span>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h3>Foraging Card Valuation</h3>

        <div className="settings-row">
          <label htmlFor="basic-foraging">Basic</label>

          <div className="settings-input">
            <input
              id="basic-foraging"
              type="number"
              min="0"
              step="1"
              value={settings.basicForagingCardCost}
              onChange={(event) =>
                updateSetting(
                  'basicForagingCardCost',
                  Number(event.target.value)
                )
              }
            />
            <span>cr</span>
          </div>
        </div>

        <div className="settings-row">
          <label htmlFor="proficient-foraging">Proficient</label>

          <div className="settings-input">
            <input
              id="proficient-foraging"
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
            <span>cr</span>
          </div>
        </div>

        <div className="settings-row">
          <label htmlFor="master-foraging">Master</label>

          <div className="settings-input">
            <input
              id="master-foraging"
              type="number"
              min="0"
              step="1"
              value={settings.masterForagingCardCost}
              onChange={(event) =>
                updateSetting(
                  'masterForagingCardCost',
                  Number(event.target.value)
                )
              }
            />
            <span>cr</span>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h3>Selling Price</h3>

        <div className="settings-row">
          <label htmlFor="default-markup">Default markup</label>

          <div className="settings-input">
            <input
              id="default-markup"
              type="number"
              min="0"
              step="1"
              value={settings.defaultMarkupPercent}
              onChange={(event) =>
                updateSetting(
                  'defaultMarkupPercent',
                  Number(event.target.value)
                )
              }
            />
            <span>%</span>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={restoreDefaults}
        >
          Restore Defaults
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={saveSettings}
        >
          Save Settings
        </button>
      </div>
    </section>
  )
}

export default EconomicsSettingsView