import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, ChevronLeft, Search, Trash2, X, Loader2, AlertCircle, Printer } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RENT_STATUS_STYLES, rentStatusLabel } from '@/lib/rentStatus'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { colors } from '@/theme'

const PAGE_SIZE = 10

const STATUS_STYLE = {
  vacant: { label: 'Vacant', color: colors.success },
  occupied: { label: 'Occupied', color: colors.accent },
  maintenance: { label: 'Maintenance', color: '#c98a2c' },
}

const OCCUPANCY_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'vacant', label: 'Vacant' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'maintenance', label: 'Maintenance' },
]

const RENT_STATUS_FILTERS = [
  { value: 'all', label: 'All rent statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'partially_paid', label: 'Partially paid' },
]

function StatusBadge({ status }) {
  const style = STATUS_STYLE[status] || STATUS_STYLE.vacant
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ color: style.color, background: `${style.color}1a` }}
    >
      {style.label}
    </span>
  )
}

export default function BuildingUnitsPanel({ buildingId, onClose, onUnitsChanged }) {
  const { fetchBuildingDetail, deleteUnit, fetchUnitsReportPdf } = useAuth()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [occupancyFilter, setOccupancyFilter] = useState('all')
  const [rentFilter, setRentFilter] = useState('all')
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [selected, setSelected] = useState(() => new Set())
  const [pages, setPages] = useState({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [reportLoading, setReportLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    setLoadError('')
    try {
      setDetail(await fetchBuildingDetail(buildingId))
    } catch (err) {
      setLoadError(err.message || 'Could not load units.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    setSelected(new Set())
    setCollapsed(new Set())
    setPages({})
  }, [buildingId])

  useEffect(() => {
    setPages({})
  }, [search, occupancyFilter, rentFilter])

  const groups = useMemo(() => {
    if (!detail) return []
    const query = search.trim().toLowerCase()
    const hasActiveFilter = Boolean(query) || occupancyFilter !== 'all' || rentFilter !== 'all'
    return detail.unit_types
      .map((ut) => {
        const nameMatches = ut.name.toLowerCase().includes(query)
        let units = nameMatches ? ut.units : ut.units.filter((u) => u.unit_number.toLowerCase().includes(query))
        if (occupancyFilter !== 'all') units = units.filter((u) => u.status === occupancyFilter)
        if (rentFilter !== 'all') units = units.filter((u) => u.tenant?.rent_status === rentFilter)
        return { ...ut, units }
      })
      .filter((ut) => !hasActiveFilter || ut.units.length > 0)
  }, [detail, search, occupancyFilter, rentFilter])

  const visibleUnitIds = useMemo(() => groups.flatMap((g) => g.units.map((u) => u.id)), [groups])
  const allSelected = visibleUnitIds.length > 0 && visibleUnitIds.every((id) => selected.has(id))

  const toggleGroup = (id) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAllGroups = () => {
    setCollapsed((prev) => (prev.size > 0 ? new Set() : new Set(groups.map((g) => g.id))))
  }

  const toggleUnit = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(visibleUnitIds))
  }

  const handleDeleteSelected = async () => {
    setDeleting(true)
    setDeleteError('')
    const failures = []
    for (const unitId of selected) {
      try {
        await deleteUnit(unitId)
      } catch (err) {
        failures.push(err.message || `Could not delete unit ${unitId}`)
      }
    }
    setDeleting(false)
    setShowDeleteConfirm(false)
    setSelected(new Set())
    if (failures.length) setDeleteError(failures.join(' '))
    await load()
    onUnitsChanged?.()
  }

  const handlePrintReport = async () => {
    setReportLoading(true)
    try {
      const blob = await fetchUnitsReportPdf(buildingId, { occupancyStatus: occupancyFilter, rentStatus: rentFilter })
      const url = URL.createObjectURL(blob)
      // A direct download (rather than window.open on the blob URL) is what
      // reliably delivers an actual .pdf file across browsers — mobile browsers
      // in particular are inconsistent about rendering blob: URLs in a new tab.
      const link = document.createElement('a')
      link.href = url
      link.download = `Nyumba-units-report-${detail?.building_code || buildingId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      toast.success('Report downloaded.')
    } catch (err) {
      toast.error(err.message || 'Could not generate the report.')
    } finally {
      setReportLoading(false)
    }
  }

  const totalUnits = detail?.units_count ?? 0
  const totalTypes = detail?.unit_types_count ?? 0

  return (
    <Card style={{ borderColor: colors.cream[200] }}>
      <CardContent className="space-y-4 py-5">
        <div className="flex items-center justify-between">
          <h2 style={{ fontWeight: 700, color: colors.brown[800] }}>Units</h2>
          <Button variant="ghost" size="icon" onClick={onClose} title="Back to all buildings">
            <X size={16} />
          </Button>
        </div>

        {loading && (
          <p style={{ color: colors.brown[600], fontSize: '0.9rem' }} className="py-6 text-center">
            Loading units…
          </p>
        )}

        {loadError && (
          <Alert variant="destructive">
            <AlertCircle size={16} />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {!loading && !loadError && detail && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={toggleAllGroups} className="border-[#e8d5b7]">
                {collapsed.size > 0 ? 'Expand All' : 'Collapse All'}
              </Button>
              <div className="relative max-w-xs flex-1">
                <Search size={14} className="absolute top-1/2 left-2.5 -translate-y-1/2" color={colors.brown[400]} />
                <Input
                  className="h-9 pl-8"
                  placeholder="Search by unit number or type"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={occupancyFilter} onValueChange={setOccupancyFilter} items={OCCUPANCY_FILTERS}>
                <SelectTrigger className="h-9 w-40 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OCCUPANCY_FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={rentFilter} onValueChange={setRentFilter} items={RENT_STATUS_FILTERS}>
                <SelectTrigger className="h-9 w-44 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RENT_STATUS_FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selected.size > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-[#e8d5b7] text-destructive hover:text-destructive"
                >
                  <Trash2 size={14} /> Delete selected ({selected.size})
                </Button>
              )}
              <Button
                size="sm"
                onClick={handlePrintReport}
                disabled={reportLoading}
                className="bg-[#a0622a] text-white hover:bg-[#8a5424]"
              >
                {reportLoading ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />} Print report
              </Button>
            </div>

            {deleteError && (
              <Alert variant="destructive">
                <AlertCircle size={16} />
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between" style={{ fontSize: '0.85rem', color: colors.brown[600] }}>
              <span>
                {totalUnits} unit{totalUnits === 1 ? '' : 's'} across {totalTypes} unit type{totalTypes === 1 ? '' : 's'}
              </span>
              <label className="flex items-center gap-2">
                <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} disabled={visibleUnitIds.length === 0} />
                Select all
              </label>
            </div>

            <div className="overflow-hidden rounded-lg border" style={{ borderColor: colors.cream[200] }}>
              {groups.length === 0 && (
                <p className="py-8 text-center" style={{ color: colors.brown[600], fontSize: '0.9rem' }}>
                  No units match your search.
                </p>
              )}
              {groups.map((group) => {
                const isCollapsed = collapsed.has(group.id)
                const totalPages = Math.max(1, Math.ceil(group.units.length / PAGE_SIZE))
                const currentPage = Math.min(pages[group.id] || 1, totalPages)
                const pageUnits = group.units.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                const goToPage = (page) => setPages((prev) => ({ ...prev, [group.id]: page }))

                return (
                  <div key={group.id} style={{ borderBottom: `1px solid ${colors.cream[200]}` }} className="last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className="flex w-full items-center justify-between px-4 py-3"
                      style={{ background: colors.cream[50] }}
                    >
                      <span className="flex items-center gap-2" style={{ fontWeight: 600, color: colors.brown[800], fontSize: '0.9rem' }}>
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        {group.name}
                        <span style={{ color: colors.brown[600], fontWeight: 400 }}>
                          · KES {group.computed_rent.toLocaleString()}
                          {group.size_sqft ? ` · ${group.size_sqft} sq.ft` : ''}
                        </span>
                      </span>
                      <span style={{ color: colors.brown[600], fontSize: '0.8rem' }}>
                        {group.units.length} unit{group.units.length === 1 ? '' : 's'}
                      </span>
                    </button>

                    {!isCollapsed && (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10" />
                              <TableHead>Unit</TableHead>
                              <TableHead>Floor</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Tenant</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pageUnits.map((unit) => (
                              <TableRow key={unit.id}>
                                <TableCell>
                                  <Checkbox checked={selected.has(unit.id)} onCheckedChange={() => toggleUnit(unit.id)} />
                                </TableCell>
                                <TableCell style={{ fontWeight: 600, color: colors.brown[800] }}>{unit.unit_number}</TableCell>
                                <TableCell style={{ color: colors.brown[600] }}>{unit.floor ?? '—'}</TableCell>
                                <TableCell>
                                  <StatusBadge status={unit.status} />
                                </TableCell>
                                <TableCell>
                                  {unit.tenant ? (
                                    <div className="flex items-center gap-2">
                                      <div>
                                        <p style={{ fontWeight: 600, color: colors.brown[800], fontSize: '0.85rem' }}>
                                          {unit.tenant.name}
                                        </p>
                                        <p style={{ fontSize: '0.75rem', color: colors.brown[600] }}>{unit.tenant.phone}</p>
                                      </div>
                                      <Badge style={RENT_STATUS_STYLES[unit.tenant.rent_status] || {}}>
                                        {rentStatusLabel(unit.tenant.rent_status)}
                                      </Badge>
                                    </div>
                                  ) : (
                                    <span style={{ color: colors.brown[400] }}>—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>

                        {totalPages > 1 && (
                          <div
                            className="flex items-center justify-between px-4 py-2.5"
                            style={{ borderTop: `1px solid ${colors.cream[200]}` }}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={currentPage === 1}
                              onClick={() => goToPage(currentPage - 1)}
                            >
                              <ChevronLeft size={14} /> Previous
                            </Button>
                            <span style={{ fontSize: '0.8rem', color: colors.brown[600] }}>
                              Page {currentPage} of {totalPages}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={currentPage === totalPages}
                              onClick={() => goToPage(currentPage + 1)}
                            >
                              Next <ChevronRight size={14} />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} unit(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Occupied units are protected and will be skipped. This can't be undone for the rest.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
