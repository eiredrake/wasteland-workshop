import { useId, useRef, type InputHTMLAttributes, type RefObject } from 'react'
import './SearchInput.css'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> & {
  value: string
  onValueChange: (value: string) => void
  label: string
  showLabel?: boolean
  inputType?: 'search' | 'text'
  showSearchIcon?: boolean
  inputRef?: RefObject<HTMLInputElement | null>
}
export default function SearchInput({ value, onValueChange, label, showLabel = false,
  inputType = 'search', showSearchIcon = true, inputRef, className = '', id, ...props }: Props) {
  const generated = useId(), localRef = useRef<HTMLInputElement>(null)
  const inputId = id ?? generated, ref = inputRef ?? localRef
  return <div className={`search-input${showSearchIcon ? '' : ' search-input-text'} ${className}`}>
    {showLabel && <label htmlFor={inputId}>{label}</label>}
    <div className="search-input-field">
      <input {...props} ref={ref} id={inputId} aria-label={label} type={inputType} value={value} onChange={event => onValueChange(event.target.value)} />
      {showSearchIcon && <span className="search-input-icon" aria-hidden="true" />}
      {value && <button type="button" className="search-input-clear" aria-label={'Clear ' + label} disabled={props.disabled} onClick={() => {
        onValueChange('')
        ref.current?.focus()
      }}><span aria-hidden="true">X</span></button>}
    </div>
  </div>
}
