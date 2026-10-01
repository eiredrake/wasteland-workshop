import { useState } from 'react'
import './Datalist.css'

type DatalistColumn<T> = {
  key: keyof T
  label: string
}

type DatalistProps<T> = {
  items: T[]
  title?: string
  columns: DatalistColumn<T>[]
  showAddButton?: boolean
  getRowKey: (item: T) => string | number
  onAdd?: () => void
  emptyMessage?: string
}

function Datalist<T>({
  items,
  title,
  columns,
  showAddButton = false,
  getRowKey,
  onAdd,
  emptyMessage = "No items Found.",
}: DatalistProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null)
  const [sortAscending, setSortAscending] = useState(true)

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortAscending(!sortAscending)
    } else {
      setSortKey(key)
      setSortAscending(true)
    }
  }

  const sortedItems = [...items].sort((a, b) => {
    if (sortKey === null) {
      return 0
    }
  
    const aValue = String(a[sortKey] ?? '')
    const bValue = String(b[sortKey] ?? '')
  
    const comparison = aValue.localeCompare(bValue, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  
    return sortAscending ? comparison : -comparison
  })  

  return (
    <section className="datalist">
        <header className="datalist-header">
          {title && <h2>{title}</h2>}

          {showAddButton && (
            <button type="button" onClick={onAdd} aria-label="Add item">
              +
            </button>
          )}
        </header>

        <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>
                <button
                  type="button"
                  onClick={() => handleSort(column.key)}
                >
                  {column.label}
                  {sortKey === column.key && (sortAscending ? ' ▲' : ' ▼')}
                </button>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sortedItems.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedItems.map((item) => (
              <tr key={getRowKey(item)}>
                {columns.map((column) => (
                  <td key={String(column.key)}>
                    {String(item[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}

export default Datalist