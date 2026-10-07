import { useId, useRef, useState } from 'react'
import './SearchablePicker.css'

type SearchablePickerProps<T> = {
  label: string
  options: readonly T[]
  getOptionKey: (option: T) => string | number
  getOptionLabel: (option: T) => string
  onChange: (option: T | undefined) => void
  placeholder?: string
  required?: boolean
}

export default function SearchablePicker<T>({ label, options, getOptionKey, getOptionLabel,
  onChange, placeholder, required = false }: SearchablePickerProps<T>) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const [selectedKey, setSelectedKey] = useState<string | number>()
  const normalized = query.trim().toLocaleLowerCase()
  const matches = options.filter(option => getOptionLabel(option).toLocaleLowerCase().includes(normalized))
  const expanded = open && matches.length > 0
  const select = (option: T) => {
    setQuery(getOptionLabel(option))
    setSelectedKey(getOptionKey(option))
    setOpen(false)
    setHighlighted(-1)
    onChange(option)
  }

  return <div className="searchable-picker" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }}>
    <label htmlFor={id}>{label}</label>
    <input ref={input} id={id} role="combobox" type="text" autoComplete="off"
      aria-autocomplete="list" aria-expanded={expanded} aria-controls={`${id}-options`}
      aria-activedescendant={expanded && highlighted >= 0 ? `${id}-option-${highlighted}` : undefined}
      aria-describedby={open && matches.length === 0 ? `${id}-empty` : undefined}
      placeholder={placeholder} required={required} value={query}
      onFocus={() => setOpen(true)} onClick={() => setOpen(true)}
      onChange={event => {
        const text = event.target.value
        setQuery(text); setOpen(true); setHighlighted(-1); setSelectedKey(undefined)
        const exact = options.filter(option => getOptionLabel(option).toLocaleLowerCase() === text.trim().toLocaleLowerCase())
        const selection = exact.length === 1 ? exact[0] : undefined
        if (selection) setSelectedKey(getOptionKey(selection))
        onChange(selection)
      }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing) return
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          setOpen(true)
          const next = matches.length === 0 ? -1 : event.key === 'ArrowDown'
            ? (highlighted + 1) % matches.length
            : (highlighted <= 0 ? matches.length - 1 : highlighted - 1)
          setHighlighted(next)
          if (next >= 0) requestAnimationFrame(() => document.getElementById(`${id}-option-${next}`)?.scrollIntoView({ block: 'nearest' }))
        } else if (event.key === 'Enter' && open) {
          event.preventDefault()
          const option = matches[highlighted] ?? (matches.length === 1 ? matches[0] : undefined)
          if (option) select(option)
        } else if (event.key === 'Escape' && open) {
          event.preventDefault(); event.stopPropagation(); setOpen(false); setHighlighted(-1)
        }
      }} />
    {expanded && <ul id={`${id}-options`} role="listbox" aria-label={label} className="searchable-picker-options">
      {matches.map((option, index) => <li key={getOptionKey(option)} id={`${id}-option-${index}`}
        role="option" tabIndex={-1} aria-selected={selectedKey === getOptionKey(option)}
        className={index === highlighted ? 'searchable-picker-highlighted' : undefined}
        onPointerDown={event => { if (event.pointerType === 'mouse') event.preventDefault() }}
        onClick={() => { select(option); input.current?.focus(); setOpen(false) }}>
        {getOptionLabel(option)}
      </li>)}
    </ul>}
    {open && matches.length === 0 && <p id={`${id}-empty`} className="searchable-picker-empty" role="status">No matches found.</p>}
  </div>
}

