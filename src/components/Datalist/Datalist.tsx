import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import './Datalist.css'

type DatalistColumn<T> = {
  key: keyof T
  label: string
  render?: (item: T) => ReactNode
  sortValue?: (item: T) => string | number

  /*
   * Protected columns are always displayed.
   * Optional columns are displayed when enough
   * horizontal space is available.
   */
  protected?: boolean

  /*
   * Lower priority numbers are displayed first.
   * Only applies to optional columns.
   */
  priority?: number

  /*
   * Approximate minimum width needed for this
   * column when deciding whether it fits.
   */
  minWidth?: number
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

  const [availableWidth, setAvailableWidth] =
    useState(0)

  const scrollPosition = useRef(0)

  const datalistRef =
    useRef<HTMLElement | null>(null)

  useEffect(() => {
    const element = datalistRef.current

    if (!element) {
      return
    }

    const updateWidth = () => {
      setAvailableWidth(
        element.getBoundingClientRect().width
      )
    }

    updateWidth()

    const resizeObserver =
      new ResizeObserver(() => {
        updateWidth()
      })

    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

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
      scrollPosition.current =
        window.scrollY

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

  /*
   * Protected columns always survive.
   *
   * Optional columns are considered in priority
   * order and included while room remains.
   *
   * Columns without minWidth receive a sensible
   * default estimate.
   */
  const protectedColumns =
    columns.filter(
      (column) => column.protected
    )

  const optionalColumns =
    columns
      .filter(
        (column) => !column.protected
      )
      .sort(
        (a, b) =>
          (a.priority ?? 999) -
          (b.priority ?? 999)
      )

  const protectedWidth =
    protectedColumns.reduce(
      (total, column) =>
        total +
        (column.minWidth ?? 140),
      0
    )

  /*
   * A little room is reserved for borders,
   * padding and rounding differences between
   * browsers.
   */
  let remainingWidth =
    Math.max(
      0,
      availableWidth -
        protectedWidth -
        24
    )

  const visibleOptionalColumns =
    optionalColumns.filter(
      (column) => {
        const columnWidth =
          column.minWidth ?? 140

        if (
          remainingWidth <
          columnWidth
        ) {
          return false
        }

        remainingWidth -= columnWidth

        return true
      }
    )

  /*
   * Preserve the original column order rather
   * than rendering protected columns first.
   */
  const visibleColumns =
    columns.filter(
      (column) =>
        column.protected ||
        visibleOptionalColumns.includes(
          column
        )
    )

  const sortedItems = [...items].sort(
    (a, b) => {
      if (sortKey === null) {
        return 0
      }

      const sortColumn =
        columns.find(
          (column) =>
            column.key === sortKey
        )

      const aValue =
        sortColumn?.sortValue
          ? sortColumn.sortValue(a)
          : a[sortKey]

      const bValue =
        sortColumn?.sortValue
          ? sortColumn.sortValue(b)
          : b[sortKey]

      const comparison = String(
        aValue ?? ''
      ).localeCompare(
        String(bValue ?? ''),
        undefined,
        {
          numeric: true,
          sensitivity: 'base',
        }
      )

      return sortAscending
        ? comparison
        : -comparison
    }
  )

  if (
    selectedItem &&
    renderDetails
  ) {
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
    <section
      ref={datalistRef}
      className="datalist"
    >
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
            {visibleColumns.map(
              (column) => (
                <th
                  key={String(
                    column.key
                  )}
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleSort(
                        column.key
                      )
                    }
                  >
                    {column.label}

                    {sortKey ===
                      column.key &&
                      (sortAscending
                        ? ' ▲'
                        : ' ▼')}
                  </button>
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {sortedItems.length === 0 ? (
            <tr>
              <td
                colSpan={
                  visibleColumns.length
                }
              >
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
                {visibleColumns.map(
                  (column) => (
                    <td
                      key={String(
                        column.key
                      )}
                    >
                      {column.render
                        ? column.render(
                            item
                          )
                        : String(
                            item[
                              column.key
                            ] ?? ''
                          )}
                    </td>
                  )
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}

export default Datalist