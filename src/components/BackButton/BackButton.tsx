import type { ButtonHTMLAttributes } from 'react'
import './BackButton.css'
export default function BackButton({children,className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>){return <button type="button" {...props} className={'back-button '+className}><span aria-hidden="true">←</span> {children}</button>}
