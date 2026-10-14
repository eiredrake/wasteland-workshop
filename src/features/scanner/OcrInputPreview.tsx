import {useEffect,useRef,useState} from 'react'
import type {DiagnosticCrop} from '../../services/scanner/Diagnostics'
export default function OcrInputPreview({crop}:{crop:DiagnosticCrop}){
 const image=useRef<HTMLImageElement>(null),[error,setError]=useState('')
 useEffect(()=>{const element=image.current,url=URL.createObjectURL(crop.blob);if(element)element.src=url;return()=>{element?.removeAttribute('src');URL.revokeObjectURL(url)}},[crop])
 function save(){try{const link=document.createElement('a');link.href=image.current?.src??'';link.download='workshop-ocr-input-'+crop.scanId+'.png';link.click();setError('')}catch(cause){setError(cause instanceof Error?cause.message:String(cause))}}
 return <section className="scanner-ocr-input" aria-label="Exact OCR input"><h3>Exact OCR Input</h3><p>Scan: {crop.scanId}<br/>{crop.width} x {crop.height} pixels. Source crop: x {crop.target.x}, y {crop.target.y}. This is the image sent to Tesseract, scaled here to fit.</p><img ref={image} alt="Exact crop sent to Tesseract" width={crop.width} height={crop.height}/><button type="button" className="secondary-button" onClick={save}>Save OCR Input PNG</button>{error&&<p role="alert">{error}</p>}</section>
}
