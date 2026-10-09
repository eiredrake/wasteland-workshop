import type { ButtonHTMLAttributes } from 'react'
import './RemoveBadge.css'
type Props=Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'aria-label'> & {label:string;size?:'compact'|'standard'}
export default function RemoveBadge({label,size='standard',className='',...props}:Props){return <button type="button" {...props} aria-label={label} className={'remove-badge remove-badge-'+size+' '+className}><span aria-hidden="true">X</span></button>}
