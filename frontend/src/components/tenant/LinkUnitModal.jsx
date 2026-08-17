import { useEffect, useState } from 'react'
import { ChevronsUpDown, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { colors } from '@/theme'

export default function LinkUnitModal({ open, forced, onOpenChange, onSuccess }) {
  const { fetchBuildingsDirectory, fetchVacantUnits, submitApplication, fetchApplications } = useAuth()
  const [buildings, setBuildings] = useState([])
  const [buildingsLoading, setBuildingsLoading] = useState(true)
  const [buildingPopoverOpen, setBuildingPopoverOpen] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const [units, setUnits] = useState([])
  const [unitsLoading, setUnitsLoading] = useState(false)
  const [unitPopoverOpen, setUnitPopoverOpen] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [moveInDate, setMoveInDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [applications, setApplications] = useState([])

  useEffect(() => {
    if (!open) return
    setBuildingsLoading(true)
    fetchBuildingsDirectory()
      .then((data) => setBuildings(data.buildings))
      .catch((err) => setError(err.message || 'Could not load buildings.'))
      .finally(() => setBuildingsLoading(false))
    fetchApplications().then((data) => setApplications(data.applications)).catch(() => setApplications([]))
  }, [open])

  const pendingForSelected = selectedUnit && applications.find(
    (application) => application.unit_id === selectedUnit.id && application.status === 'submitted'
  )

  const handleSelectBuilding = async (building) => {
    setSelectedBuilding(building)
    setSelectedUnit(null)
    setBuildingPopoverOpen(false)
    setUnitsLoading(true)
    setError('')
    try {
      const data = await fetchVacantUnits(building.id)
      setUnits(data.units)
    } catch (err) {
      setError(err.message || 'Could not load units.')
    } finally {
      setUnitsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedUnit) {
      setError('Select a unit to continue.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await submitApplication({ unit_id: selectedUnit.id, proposed_move_in_date: moveInDate })
      toast.success('Application submitted. Your landlord will review it shortly.')
      // Close from within the workflow as well as notifying the parent, so this
      // remains correct when the modal is reused from another page.
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Could not submit your application.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (forced && !next) return; onOpenChange(next) }}>
      <DialogContent className="w-full max-w-md sm:max-w-md" showCloseButton={!forced}>
        <DialogHeader>
          <DialogTitle style={{ color: colors.brown[800] }}>Apply for a unit</DialogTitle>
          <DialogDescription>Select the unit you want to rent. Your landlord must approve your application before it is linked.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle size={16} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label>Building</Label>
            <Popover open={buildingPopoverOpen} onOpenChange={setBuildingPopoverOpen}>
              <PopoverTrigger
                render={<Button variant="outline" className="w-full justify-between font-normal" />}
              >
                <span className="truncate">
                  {selectedBuilding ? `${selectedBuilding.name} — ${selectedBuilding.location}` : 'Search buildings...'}
                </span>
                <ChevronsUpDown size={14} className="shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-(--anchor-width) p-0">
                <Command>
                  <CommandInput placeholder="Search by name or location..." />
                  <CommandList>
                    {buildingsLoading ? (
                      <div className="py-6 text-center text-sm" style={{ color: colors.brown[600] }}>
                        Loading…
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>No buildings found.</CommandEmpty>
                        <CommandGroup>
                          {buildings.map((b) => (
                            <CommandItem
                              key={b.id}
                              value={`${b.name} ${b.location}`}
                              data-checked={selectedBuilding?.id === b.id}
                              onSelect={() => handleSelectBuilding(b)}
                            >
                              {b.name} — {b.location}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label>Proposed move-in date</Label>
            <Input type="date" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Popover open={unitPopoverOpen} onOpenChange={setUnitPopoverOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    disabled={!selectedBuilding || unitsLoading}
                    className="h-10 w-full justify-between bg-white font-normal"
                  />
                }
              >
                <span className="truncate">
                  {selectedUnit
                    ? selectedUnit.unit_number
                    : !selectedBuilding
                      ? 'Pick a building first'
                      : unitsLoading
                        ? 'Loading units…'
                        : 'Search units...'}
                </span>
                <ChevronsUpDown size={14} className="shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-(--anchor-width) p-0">
                <Command>
                  <CommandInput placeholder="Search by unit number..." />
                  <CommandList>
                    <CommandEmpty>No vacant units found.</CommandEmpty>
                    <CommandGroup>
                      {units.map((u) => (
                        <CommandItem
                          key={u.id}
                          value={u.unit_number}
                          data-checked={selectedUnit?.id === u.id}
                          onSelect={() => {
                            setSelectedUnit(u)
                            setUnitPopoverOpen(false)
                            setError('')
                          }}
                        >
                          {u.unit_number}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedBuilding && !unitsLoading && units.length === 0 && (
              <p style={{ fontSize: '0.8rem', color: colors.brown[600] }}>
                No vacant units in this building right now.
              </p>
            )}
          </div>

          {pendingForSelected && (
            <Alert
              style={{
                color: '#9a6211',
                background: '#fff4de',
                borderColor: '#f0ca7b',
              }}
            >
              <AlertCircle size={16} />
              <AlertDescription>
                Your application for this unit is awaiting the landlord’s review. Submitted {new Date(pendingForSelected.created_at).toLocaleDateString('en-KE')}.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedUnit || Boolean(pendingForSelected)}
            className="w-full bg-[#a0622a] text-white hover:bg-[#8a5424]"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : pendingForSelected ? 'Application awaiting review' : 'Submit application'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
