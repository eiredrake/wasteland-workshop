import BackButton from '../../components/BackButton/BackButton'
export default function ScanAcquirePlaceholder({onBack}:{onBack:()=>void}){
 return <section aria-label="Scan & Acquire"><h2>Scan &amp; Acquire</h2><BackButton onClick={onBack}>Back to Collections</BackButton><p>The scanner is being rebuilt.</p><p>Photo selection and blueprint identification are temporarily unavailable.</p></section>
}
