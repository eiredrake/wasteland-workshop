import { useEffect, useState } from 'react'
import { localDate } from './Expiration'
export function useCalendarDay() {
  const [today,setToday]=useState(localDate)
  useEffect(()=>{
    const update=()=>setToday(localDate()), timer=window.setInterval(update,60000)
    window.addEventListener('focus',update); document.addEventListener('visibilitychange',update)
    return ()=>{clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update)}
  },[])
  return today
}
