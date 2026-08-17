import { useMemo, useState } from 'react'
import { Search, RefreshCw, MoreVertical, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu'
import { colors } from '@/theme'

const PAGE_SIZES = ['10', '25', '50']

/**
 * A grid built from any list of rows: search, a checkbox + row-number column, a
 * Reload/Actions toolbar (Actions receives the currently-selected rows so callers
 * can wire up bulk operations), and First/Prev/Page/Next/Last pagination. The
 * shared shape every list view in the app (Tenants, Payments, …) should use.
 */
export default function DataGrid({
  rows,
  rowId,
  columns,
  searchPlaceholder = 'Search…',
  searchKeys,
  onReload,
  actions,
  actionsLabel = 'Actions',
  itemLabel = 'items',
  emptyMessage = 'Nothing matches your search.',
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState('10')
  const [selected, setSelected] = useState(() => new Set())

  const filtered = useMemo(() => {
    if (!search.trim() || !searchKeys?.length) return rows
    const q = search.trim().toLowerCase()
    return rows.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(q))
    )
  }, [rows, search, searchKeys])

  const size = Number(pageSize)
  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * size
  const pageRows = filtered.slice(startIndex, startIndex + size)

  const goToPage = (p) => setPage(Math.min(Math.max(1, p), totalPages))

  const pageIds = pageRows.map(rowId)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const somePageSelected = pageIds.some((id) => selected.has(id))

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id))
      } else {
        pageIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const clearSelection = () => setSelected(new Set())
  const selectedRows = rows.filter((row) => selected.has(rowId(row)))

  return (
    <div className="rounded-2xl border bg-white" style={{ borderColor: colors.cream[200] }}>
      <div className="flex flex-wrap items-center justify-end gap-2 p-4 pb-3">
        {onReload && (
          <Button
            size="sm"
            onClick={onReload}
            className="rounded-lg bg-[#a0622a] text-white hover:bg-[#8a5424]"
          >
            <RefreshCw size={14} /> Reload
          </Button>
        )}
        {actions && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg border-2"
                  style={{ borderColor: colors.accent, color: colors.accent }}
                />
              }
            >
              <MoreVertical size={14} /> {actionsLabel}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              {actions(selectedRows, { clearSelection })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {searchKeys && (
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" style={{ color: colors.brown[400] }} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder={searchPlaceholder}
              className="h-11 w-full rounded-xl border pl-9 pr-3 text-sm outline-none focus-visible:ring-3"
              style={{ borderColor: colors.cream[200], background: colors.cream[50], color: colors.brown[800] }}
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow style={{ background: colors.cream[50] }}>
              <TableHead className="w-10">
                <Checkbox
                  checked={allPageSelected}
                  indeterminate={!allPageSelected && somePageSelected}
                  onCheckedChange={toggleAllOnPage}
                  disabled={pageRows.length === 0}
                />
              </TableHead>
              <TableHead className="w-14">ID</TableHead>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 2} className="py-10 text-center" style={{ color: colors.brown[600] }}>
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row, i) => {
                const id = rowId(row)
                return (
                  <TableRow key={id}>
                    <TableCell>
                      <Checkbox checked={selected.has(id)} onCheckedChange={() => toggleRow(id)} />
                    </TableCell>
                    <TableCell style={{ color: colors.brown[600] }}>{startIndex + i + 1}</TableCell>
                    {columns.map((col) => (
                      <TableCell key={col.key}>{col.render(row)}</TableCell>
                    ))}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4" style={{ borderColor: colors.cream[200] }}>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '0.85rem', color: colors.brown[600] }}>
            {filtered.length === 0
              ? `Showing 0 of 0 ${itemLabel}`
              : `Showing ${startIndex + 1} - ${Math.min(startIndex + size, filtered.length)} of ${filtered.length} ${itemLabel}`}
          </span>
          <Select value={pageSize} onValueChange={(v) => { setPageSize(v); setPage(1) }} items={PAGE_SIZES.map((s) => ({ value: s, label: `${s} per page` }))}>
            <SelectTrigger className="h-8 w-32 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={s}>{s} per page</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage === 1} onClick={() => goToPage(1)}>
            <ChevronsLeft size={14} />
          </Button>
          <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => goToPage(safePage - 1)}>
            <ChevronLeft size={14} /> Previous
          </Button>
          <span className="px-2" style={{ fontSize: '0.85rem', color: colors.brown[600] }}>
            Page {safePage} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={safePage === totalPages} onClick={() => goToPage(safePage + 1)}>
            Next <ChevronRight size={14} />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage === totalPages} onClick={() => goToPage(totalPages)}>
            <ChevronsRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}
