import {
  useRef,
  useState,
  type ReactNode,
} from 'react'
import './Datalist.css'

type DatalistColumn<T> = {
  key: keyof T
  label: string
  render?: (item: T) => ReactNode
}

type DatalistProps<T> = {
  items: T[]
  title?: string
  columns: DatalistColumn<T>[]
  showAddButton?: boolean
  getRowKey: (item: T) => string | number
  onRowClick?: (item: T) => void
  onAdd?: () => void
  emptyMessage?: string
  renderDetails?: (item: T) => ReactNode
  backLabel?: string
}

function Datalist<T>({
  items,
  title,
  columns,
  showAddButton = false,
  getRowKey,
  onRowClick,
  onAdd,
  emptyMessage = 'No items found.',
  renderDetails,
  backLabel = 'Back',
}: DatalistProps<T>) {
  const [sortKey, setSortKey] =
    useState<keyof T | null>(null)

  const [sortAscending, setSortAscending] =
    useState(true)

  const [selectedItem, setSelectedItem] =
    useState<T | null>(null)

  const scrollPosition = useRef(0)

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortAscending(!sortAscending)
    } else {
      setSortKey(key)
      setSortAscending(true)
    }
  }

  const handleRowClick = (item: T) => {
    if (renderDetails) {
      scrollPosition.current = window.scrollY
      setSelectedItem(item)
      window.scrollTo(0, 0)
      return
    }

    onRowClick?.(item)
  }

  const handleBack = () => {
    setSelectedItem(null)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(
          0,
          scrollPosition.current
        )
      })
    })
  }

  const sortedItems = [...items].sort((a, b) => {
    if (sortKey === null) {
      return 0
    }

    const aValue = String(a[sortKey] ?? '')
    const bValue = String(b[sortKey] ?? '')

    const comparison = aValue.localeCompare(
      bValue,
      undefined,
      {
        numeric: true,
        sensitivity: 'base',
      }
    )

    return sortAscending
      ? comparison
      : -comparison
  })

  if (selectedItem && renderDetails) {
    return (
      <section className="datalist datalist-details">
        <button
          type="button"
          className="datalist-back"
          onClick={handleBack}
        >
          ← {backLabel}
        </button>

        {renderDetails(selectedItem)}
      </section>
    )
  }

  return (
    <section className="datalist">
      <header className="datalist-header">
        {title && <h2>{title}</h2>}

        {showAddButton && (
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add item"
          >
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
                  onClick={() =>
                    handleSort(column.key)
                  }
                >
                  {column.label}
                  {sortKey === column.key &&
                    (sortAscending
                      ? ' ▲'
                      : ' ▼')}
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
              <tr
                key={getRowKey(item)}
                onClick={() =>
                  handleRowClick(item)
                }
              >
                {columns.map((column) => (
                  <td key={String(column.key)}>
                    {column.render
                      ? column.render(item)
                      : String(
                          item[column.key] ?? ''
                        )}
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