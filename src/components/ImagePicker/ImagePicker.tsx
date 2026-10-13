import {useRef,type RefObject} from 'react'
import './ImagePicker.css'
// Acquisition only: every completed native-picker File follows the image path.
export default function ImagePicker({onSelected,onError,buttonRef}:{onSelected:(file:File)=>void;onError:(error:unknown)=>void;buttonRef?:RefObject<HTMLButtonElement|null>}){
 const input=useRef<HTMLInputElement>(null)
 function choose(){try{if(input.current){input.current.value='';input.current.click()}}catch(error){onError(error)}}
 function selected(){try{const file=input.current?.files?.[0];if(file)onSelected(file)}catch(error){onError(error)}finally{if(input.current)input.current.value=''}}
 return <div className="image-picker"><input ref={input} type="file" accept=".jpg,.jpeg,.png,.webp,.webm,image/jpeg,image/png,image/webp,video/webm" hidden onChange={selected}/><button ref={buttonRef} type="button" className="primary-button primary-button-cream" onClick={choose}>Choose Image</button></div>
}
