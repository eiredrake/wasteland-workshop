import type { ReactNode } from 'react'
import './InformationPanel.css'
export default function InformationPanel({title,tone='rust',children}:{title:string;tone?:'rust'|'gold'|'green'|'neutral';children:ReactNode}){return <section className={'blueprint-details-card information-panel information-panel-'+tone}><h3>{title}</h3>{children}</section>}
