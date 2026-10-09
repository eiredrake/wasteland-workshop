import BackButton from '../BackButton/BackButton'
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
  render?: (
    item: T,
    compact: boolean
  ) => ReactNode
  sortValue?: (item: T) => string | number
  protected?: boolean
  priority?: number
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
  detailsResetKey?: string
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
  detailsResetKey,
}: DatalistProps<T>) {
  const [sortKey, setSortKey] =
    useState<keyof T | null>(null)

  const [sortAscending, setSortAscending] =
    useState(true)

  const [selectedItem, setSelectedItem] =
    useState<T | null>(null)

  const [previousDetailsResetKey, setPreviousDetailsResetKey] =
    useState(detailsResetKey)

  // A new search returns to the list without resetting its sort or the search input.
  if (previousDetailsResetKey !== detailsResetKey) {
    setPreviousDetailsResetKey(detailsResetKey)
    setSelectedItem(null)
  }

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

  const optionalWidthBudget =
    Math.max(
      0,
      availableWidth -
        protectedWidth -
        24
    )

  const visibleOptionalColumns =
    optionalColumns.filter(
      (_column, index) => {
        const widthRequired =
          optionalColumns
            .slice(0, index + 1)
            .reduce(
              (total, candidate) =>
                total +
                (candidate.minWidth ??
                  140),
              0
            )

        return (
          widthRequired <=
          optionalWidthBudget
        )
      }
    )

  const visibleColumns =
    columns.filter(
      (column) =>
        column.protected ||
        visibleOptionalColumns.includes(
          column
        )
    )

    const compact =
      availableWidth > 0 &&
      availableWidth < 500    

  const sortedItems =
    [...items].sort((a, b) => {
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

      const comparison =
        String(
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
    })

  if (
    selectedItem &&
    renderDetails
  ) {
    return (
      <section className="datalist datalist-details">
        <BackButton onClick={handleBack}>{backLabel}</BackButton>

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
                            item,
                            compact
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