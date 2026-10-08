import { DEFAULT_EXPIRATION_WARNING_DAYS } from '../settings/WarehouseSettings'
import { expirationStatus, lotKey } from './Expiration'
import { useCalendarDay } from './useCalendarDay'
import { useState } from 'react'
import SearchablePicker from '../../components/SearchablePicker/SearchablePicker'
import { inventoryCatalog, inventoryItemById, type InventoryItem } from './InventoryCatalog'
import { addInventoryQuantity, changeInventoryExpiration, changeCredits, setInventoryQuantity, subtractInventoryQuantity } from './WarehouseService'
import type { Warehouse } from './Warehouse'
import './WarehouseView.css'
const count=(value:number) => value.toLocaleString(undefined,{maximumFractionDigits:6})
export default function WarehouseView({warehouse,apply,error,warningDays=DEFAULT_EXPIRATION_WARNING_DAYS}: {
  warningDays?:number; warehouse:Warehouse; apply:(operation:(warehouse:Warehouse)=>Warehouse)=>boolean; error:string
}) {
  const today=useCalendarDay()
  const [expirationDate,setExpirationDate]=useState(''), [sort,setSort]=useState('Name')
  const [selected,setSelected]=useState<InventoryItem>(), [quantity,setQuantity]=useState('1'), [credits,setCredits]=useState(''), [search,setSearch]=useState(''), [category,setCategory]=useState('All'), [expirationFilter,setExpirationFilter]=useState('Unexpired')
  const rows=warehouse.entries.map(entry=>({...entry,item:inventoryItemById.get(entry.itemId) ?? {itemId:entry.itemId,name:`Unknown Item #${entry.itemId}`,kind:'unavailable',category:'Items'}})).filter(row => (category==='All'||row.item.category===category)&&(expirationFilter==='All'||(expirationFilter==='Expired'?expirationStatus(row.itemId,row.expirationDate,warningDays,today)==='expired':expirationStatus(row.itemId,row.expirationDate,warningDays,today)!=='expired'))&&row.item.name.toLowerCase().includes(search.trim().toLowerCase())).sort((a,b)=>{
    const name=a.item.name.localeCompare(b.item.name)
    if(sort==='Name')return name||(a.expirationDate??'9999-99-99').localeCompare(b.expirationDate??'9999-99-99')
    if(!a.expirationDate)return b.expirationDate?1:name
    if(!b.expirationDate)return -1
    return (sort==='Expiration: latest first'?-1:1)*a.expirationDate.localeCompare(b.expirationDate)||name
  })
  function updateCredits(action:'set'|'add'|'subtract') {
    if (!credits.trim()) return
    if (apply(current=>changeCredits(current,action,Number(credits)))) setCredits('')
  }
  return <section className="warehouse-page">
    <h2>Warehouse</h2><p>What you have on hand. Inventory changes only when you update it here.</p>
    {error && <p role="alert">{error}</p>}
    <fieldset disabled={!!error} className="warehouse-controls">
      <section className="warehouse-credits"><h3>Credits on hand</h3><strong className="warehouse-balance">{count(warehouse.credits)} cr</strong>
        <form onSubmit={event=>{event.preventDefault();updateCredits('set')}}>
          <label htmlFor="warehouse-credits">Credits amount</label><input id="warehouse-credits" type="number" inputMode="decimal" min="0" step="any" value={credits} onChange={event=>setCredits(event.target.value)} />
          <div className="warehouse-actions"><button className="secondary-button" type="submit" disabled={!credits.trim()}>Set Credits</button>
            <button className="secondary-button" type="button" disabled={!credits.trim()} onClick={()=>updateCredits('add')}>Add Credits</button>
            <button className="secondary-button" type="button" disabled={!credits.trim()} onClick={()=>updateCredits('subtract')}>Subtract Credits</button></div>
        </form>
      </section>
      <form className="warehouse-add" onSubmit={event=>{event.preventDefault();if(selected&&quantity.trim()) apply(current=>addInventoryQuantity(current,selected.itemId,Number(quantity),selected.kind==='currency'?undefined:expirationDate))}}>
        <h3>Add something</h3><SearchablePicker label="Find an item or resource" options={inventoryCatalog} getOptionKey={item=>item.itemId} getOptionLabel={item=>item.name} onChange={item=>{setSelected(item);setExpirationDate('')}} placeholder="Scrap, herbs, gizmos, brews…" required />
        <label htmlFor="warehouse-add-quantity">Quantity to add</label><input id="warehouse-add-quantity" type="number" inputMode="decimal" min="0" step="any" value={quantity} onChange={event=>setQuantity(event.target.value)} required />
        {selected?.kind!=='currency'&&<><label htmlFor="warehouse-add-expiration">Expiration date</label><input id="warehouse-add-expiration" type="date" value={expirationDate} onChange={event=>setExpirationDate(event.target.value)} required /><p className="warehouse-hint">Use the date on the item. Matching items and dates merge into one row.</p></>}
        <button className="primary-button" type="submit" disabled={!selected||!quantity.trim()||Number(quantity)<=0||(selected.kind!=='currency'&&!expirationDate)}>Add to Warehouse</button>
      </form>
      <div className="warehouse-filters"><div><label htmlFor="warehouse-search">Search inventory</label><input id="warehouse-search" type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Find what you own…" /></div>
        <div><label htmlFor="warehouse-expiration-filter">Expiration</label><select id="warehouse-expiration-filter" value={expirationFilter} onChange={event=>setExpirationFilter(event.target.value)}><option>Unexpired</option><option>Expired</option><option>All</option></select></div>
        <div><label htmlFor="warehouse-category">Type</label><select id="warehouse-category" value={category} onChange={event=>setCategory(event.target.value)}><option value="All">All types</option><option>Resources</option><option>Items</option></select></div>
        <div><label htmlFor="warehouse-sort">Sort by</label><select id="warehouse-sort" value={sort} onChange={event=>setSort(event.target.value)}><option>Name</option><option>Expiration: soonest first</option><option>Expiration: latest first</option></select></div>
      </div>
      <p>{warehouse.entries.length} inventory lots</p>
      <ul className="warehouse-list">{rows.map(row=><li key={lotKey(row.itemId,row.expirationDate)} className={'warehouse-lot-'+expirationStatus(row.itemId,row.expirationDate,warningDays,today)}>
        <div><strong>{row.item.name}</strong><span>{row.item.kind === 'unavailable' ? 'Catalog entry unavailable' : row.item.category}</span><span className={'warehouse-expiration-badge warehouse-expiration-'+expirationStatus(row.itemId,row.expirationDate,warningDays,today)}>{({good:'Good',expiring:'Expiring',expired:'Expired',unknown:'Date needed',currency:'No expiration'})[expirationStatus(row.itemId,row.expirationDate,warningDays,today)]}</span></div>
        {row.item.kind!=='currency'&&<div className="warehouse-expiration"><label htmlFor={'warehouse-expiration-'+lotKey(row.itemId,row.expirationDate)}>Expiration date</label><input id={'warehouse-expiration-'+lotKey(row.itemId,row.expirationDate)} aria-label={'Expiration date: '+row.item.name+' ('+(row.expirationDate??'date needed')+')'} type="date" defaultValue={row.expirationDate??''}
          onBlur={event=>{const value=event.currentTarget.value;if(!value||!apply(current=>changeInventoryExpiration(current,row.itemId,row.expirationDate,value)))event.currentTarget.value=row.expirationDate??''}} /></div>}
        <div className="warehouse-quantity"><label htmlFor={'warehouse-quantity-'+lotKey(row.itemId,row.expirationDate)}>On hand</label><input key={row.quantity} id={'warehouse-quantity-'+lotKey(row.itemId,row.expirationDate)} aria-label={'Quantity on hand: '+row.item.name+' ('+(row.expirationDate??'undated')+')'} type="number" min="0" step="any" inputMode="decimal" defaultValue={row.quantity}
          onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur()}}}
          onBlur={event=>{const value=event.currentTarget.value;if(!value.trim()||!apply(current=>setInventoryQuantity(current,row.itemId,Number(value),row.expirationDate))) event.currentTarget.value=String(row.quantity)}} /></div>
        <div className="warehouse-actions"><button type="button" className="blueprint-access-status blueprint-access-status-acquired warehouse-remove" aria-label={'Subtract one '+row.item.name+' ('+(row.expirationDate??'undated')+')'} disabled={row.quantity<1} onClick={()=>apply(current=>subtractInventoryQuantity(current,row.itemId,1,row.expirationDate))}>−1</button>
          <button type="button" className="blueprint-access-status blueprint-access-status-acquired warehouse-remove" aria-label={'Add one '+row.item.name+' ('+(row.expirationDate??'undated')+')'} onClick={()=>apply(current=>addInventoryQuantity(current,row.itemId,1,row.expirationDate))}>+1</button>
          <button type="button" className="blueprint-access-status blueprint-access-status-untracked warehouse-remove" aria-label={'Remove '+row.item.name+' ('+(row.expirationDate??'undated')+')'} onClick={()=>apply(current=>setInventoryQuantity(current,row.itemId,0,row.expirationDate))}>X</button></div>
      </li>)}</ul>
      {!rows.length&&<p>{warehouse.entries.length?'No matching inventory.':'Your Warehouse is empty. Add what you own above.'}</p>}
      <p className="warehouse-hint">Edit On hand to set a quantity. Edit a date to merge it with any matching lot. Undated older inventory needs a date before it counts toward crafting. Zero removes the row. Adding or removing items does not change Credits.</p>
    </fieldset>
  </section>
}
