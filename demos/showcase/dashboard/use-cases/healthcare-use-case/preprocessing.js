/****************************************************************************
 ** @license
 ** This demo file is part of yFiles for HTML.
 ** Copyright (c) 2026 by yWorks GmbH, Vor dem Kreuzberg 28,
 ** 72070 Tuebingen, Germany. All rights reserved.
 **
 ** yFiles demo files exhibit yFiles for HTML functionalities. Any redistribution
 ** of demo files in source code or binary form, with or without
 ** modification, is not permitted.
 **
 ** Owners of a valid software license for a yFiles for HTML version that this
 ** demo is shipped with are allowed to use the demo source code as basis
 ** for their own yFiles for HTML powered applications. Use of such programs is
 ** governed by the rights and conditions as set out in the yFiles for HTML
 ** license agreement.
 **
 ** THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESS OR IMPLIED
 ** WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 ** MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN
 ** NO EVENT SHALL yWorks BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 ** SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 ** TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 ** PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 ** LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 ** NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 ** SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **
 ***************************************************************************/
import rawData from './healthcare-data.json'

export function preprocessHealthCareData() {
  const nodes = []
  const edges = []

  const seenNodes = new Set()
  let edgeIdCounter = 1

  const data = rawData

  // ── Snapshot time = last hospital unit event ───────────────────────────────
  const hospitalUnitIds = new Set(data.units.map((u) => u.id))
  const lastUnitEventTs = data.events
    .filter((e) => e.type === 'arrive' && e.unitId && hospitalUnitIds.has(e.unitId))
    .map((e) => new Date(e.ts).getTime())
  const snapshotTime = new Date(Math.max(...lastUnitEventTs))

  // ── Total arrivals per unit over entire window ─────────────────────────────
  const totalArrivalsByUnit = new Map()
  data.events.forEach((event) => {
    if (event.type === 'arrive' && event.unitId && hospitalUnitIds.has(event.unitId)) {
      totalArrivalsByUnit.set(event.unitId, (totalArrivalsByUnit.get(event.unitId) ?? 0) + 1)
    }
  })

  // ── Normalize load per hospital ────────────────────────────────────────────
  const maxArrivalsByHospital = new Map()
  const unitCountByHospital = new Map()
  data.units.forEach((unit) => {
    const arrivals = totalArrivalsByUnit.get(unit.id) ?? 0
    const current = maxArrivalsByHospital.get(unit.hospitalId) ?? 0
    maxArrivalsByHospital.set(unit.hospitalId, Math.max(current, arrivals))
    unitCountByHospital.set(unit.hospitalId, (unitCountByHospital.get(unit.hospitalId) ?? 0) + 1)
  })

  // ── Build patient journeys ─────────────────────────────────────────────────
  const patientJourneyMap = new Map()
  data.events.forEach((event) => {
    if (!patientJourneyMap.has(event.patientId)) {
      patientJourneyMap.set(event.patientId, [])
    }
    patientJourneyMap.get(event.patientId).push(event)
  })

  // ── Count patients in each unit at snapshot time ───────────────────────────
  const patientCountByUnit = new Map()

  patientJourneyMap.forEach((events) => {
    const arriveEvents = events
      .filter((e) => e.type === 'arrive' && e.unitId)
      .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())

    let currentUnit = null
    for (const event of arriveEvents) {
      if (new Date(event.ts) <= snapshotTime) {
        currentUnit = event.unitId ?? null
      } else {
        break
      }
    }

    if (currentUnit && hospitalUnitIds.has(currentUnit)) {
      patientCountByUnit.set(currentUnit, (patientCountByUnit.get(currentUnit) ?? 0) + 1)
    }
  })

  // ── Hospital capacity accumulators ─────────────────────────────────────────
  const hospCapacityMap = new Map()

  data.hospitals.forEach((hospital) => {
    hospCapacityMap.set(hospital.id, {
      beds: 0,
      doctor: { required: 0, onDuty: 0 },
      nurse: { required: 0, onDuty: 0 },
      practitioner: { required: 0, onDuty: 0 },
      tech: { required: 0, onDuty: 0 }
    })

    nodes.push({
      id: hospital.id,
      name: hospital.name,
      type: 'hospital',
      location: { lat: hospital.lat, lng: hospital.lon },
      city: hospital.city,
      country: hospital.country,
      hospitalId: hospital.id,
      capacity: hospCapacityMap.get(hospital.id),
      activePatients: 0,
      bedOccupancy: 0,
      staffLoad: 0,
      loadPercentage: 0,
      isGroup: true
    })
    seenNodes.add(hospital.id)
  })

  // ── Unit nodes ─────────────────────────────────────────────────────────────
  data.units.forEach((unit) => {
    const hospital = data.hospitals.find((o) => o.id === unit.hospitalId)
    const hospCapacity = hospCapacityMap.get(unit.hospitalId)

    if (hospCapacity) {
      hospCapacity.beds += unit.capacity.beds
      if (unit.capacity.doctor) {
        hospCapacity.doctor.required += unit.capacity.doctor.required
        hospCapacity.doctor.onDuty += unit.capacity.doctor.onDuty
      }
      if (unit.capacity.nurse) {
        hospCapacity.nurse.required += unit.capacity.nurse.required
        hospCapacity.nurse.onDuty += unit.capacity.nurse.onDuty
      }
      if (unit.capacity.practitioner) {
        hospCapacity.practitioner.required += unit.capacity.practitioner.required
        hospCapacity.practitioner.onDuty += unit.capacity.practitioner.onDuty
      }
      if (unit.capacity.tech) {
        hospCapacity.tech.required += unit.capacity.tech.required
        hospCapacity.tech.onDuty += unit.capacity.tech.onDuty
      }
    }

    const activePatients = patientCountByUnit.get(unit.id) ?? 0
    const totalArrivals = totalArrivalsByUnit.get(unit.id) ?? 0
    const maxForHospital = maxArrivalsByHospital.get(unit.hospitalId) ?? 1
    const hospUnitCount = unitCountByHospital.get(unit.hospitalId) ?? 1

    const bedOccupancy =
      unit.capacity.beds > 0
        ? Math.min(100, Math.round((activePatients / unit.capacity.beds) * 100))
        : 0

    const staffTypes = ['doctor', 'nurse', 'practitioner', 'tech']
    let totalRequired = 0
    let totalOnDuty = 0
    for (const staffType of staffTypes) {
      const staff = unit.capacity[staffType]
      if (staff) {
        totalRequired += staff.required
        totalOnDuty += staff.onDuty
      }
    }

    const patientRatio = unit.capacity.beds > 0 ? activePatients / unit.capacity.beds : 1
    const adjustedRequired = Math.max(totalRequired, Math.round(totalRequired * patientRatio))
    const staffLoad =
      adjustedRequired > 0 ? Math.min(100, Math.round((totalOnDuty / adjustedRequired) * 100)) : 100

    // loadPercentage: normalized arrivals for multi-unit hospitals,
    // bed+staff metrics for single-unit hospitals (e.g. REHA)
    const loadPercentage =
      hospUnitCount === 1
        ? Math.min(100, Math.round(bedOccupancy * 0.6 + (100 - staffLoad) * 0.4))
        : Math.round((totalArrivals / maxForHospital) * 100)

    nodes.push({
      id: unit.id,
      name: unit.name,
      type: 'unit',
      location: { lat: hospital?.lat ?? 0, lng: hospital?.lon ?? 0 },
      city: hospital?.city ?? '',
      country: hospital?.country ?? '',
      hospitalId: unit.hospitalId,
      parentId: unit.hospitalId,
      deptId: unit.deptId,
      capacity: {
        beds: Math.round(unit.capacity.beds),
        doctor: {
          required: Math.round(unit.capacity.doctor?.required ?? 0),
          onDuty: Math.round(unit.capacity.doctor?.onDuty ?? 0)
        },
        nurse: {
          required: Math.round(unit.capacity.nurse?.required ?? 0),
          onDuty: Math.round(unit.capacity.nurse?.onDuty ?? 0)
        },
        practitioner: {
          required: Math.round(unit.capacity.practitioner?.required ?? 0),
          onDuty: Math.round(unit.capacity.practitioner?.onDuty ?? 0)
        },
        tech: {
          required: Math.round(unit.capacity.tech?.required ?? 0),
          onDuty: Math.round(unit.capacity.tech?.onDuty ?? 0)
        }
      },
      activePatients,
      bedOccupancy,
      staffLoad,
      loadPercentage
    })
    seenNodes.add(unit.id)
  })

  // ── Aggregate hospital metrics from units ──────────────────────────────────
  nodes.forEach((node) => {
    if (node.type !== 'hospital' || !node.hospitalId) return

    const hospCap = hospCapacityMap.get(node.hospitalId)
    if (hospCap) {
      node.capacity = {
        beds: Math.round(hospCap.beds),
        doctor: {
          required: Math.round(hospCap.doctor.required),
          onDuty: Math.round(hospCap.doctor.onDuty)
        },
        nurse: {
          required: Math.round(hospCap.nurse.required),
          onDuty: Math.round(hospCap.nurse.onDuty)
        },
        practitioner: {
          required: Math.round(hospCap.practitioner.required),
          onDuty: Math.round(hospCap.practitioner.onDuty)
        },
        tech: {
          required: Math.round(hospCap.tech.required),
          onDuty: Math.round(hospCap.tech.onDuty)
        }
      }
    }

    const hospUnits = nodes.filter((n) => n.type === 'unit' && n.hospitalId === node.hospitalId)
    const totalPatients = hospUnits.reduce((sum, u) => sum + (u.activePatients ?? 0), 0)
    const totalBeds = hospUnits.reduce((sum, u) => sum + (u.capacity?.beds ?? 0), 0)
    const avgBedOccupancy =
      totalBeds > 0 ? Math.min(100, Math.round((totalPatients / totalBeds) * 100)) : 0
    const avgStaffLoad =
      hospUnits.length > 0
        ? Math.round(hospUnits.reduce((sum, u) => sum + (u.staffLoad ?? 0), 0) / hospUnits.length)
        : 0
    const avgLoadPercentage =
      hospUnits.length > 0
        ? Math.round(
            hospUnits.reduce((sum, u) => sum + (u.loadPercentage ?? 0), 0) / hospUnits.length
          )
        : 0

    node.activePatients = totalPatients
    node.bedOccupancy = avgBedOccupancy
    node.staffLoad = avgStaffLoad
    node.loadPercentage = avgLoadPercentage
  })

  // ── Source + destination nodes ─────────────────────────────────────────────
  data.events.forEach((event) => {
    if (event.source && !seenNodes.has(normalizeSourceId(event.source))) {
      nodes.push({
        id: normalizeSourceId(event.source),
        name: event.source,
        type: 'source',
        location: { lat: 0, lng: 0 },
        city: '',
        country: '',
        activePatients: 0,
        bedOccupancy: 0,
        staffLoad: 0,
        loadPercentage: 0
      })
      seenNodes.add(normalizeSourceId(event.source))
    }
  })

  if (!seenNodes.has('HOME')) {
    nodes.push({
      id: 'HOME',
      name: 'Home',
      type: 'destination',
      location: { lat: 0, lng: 0 },
      city: '',
      country: '',
      activePatients: 0,
      bedOccupancy: 0,
      staffLoad: 0,
      loadPercentage: 0
    })
    seenNodes.add('HOME')
  }

  // ── Edges — one per patient transition ────────────────────────────────────
  patientJourneyMap.forEach((events) => {
    const sorted = events
      .filter((e) => e.type === 'arrive' && e.unitId)
      .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())

    let previousUnitId = null
    let pathId = null

    sorted.forEach((event) => {
      const currentUnitId = event.unitId
      let sourceStringId = null

      if (event.source) {
        sourceStringId = normalizeSourceId(event.source)
        if (!pathId) pathId = sourceStringId
      } else if (previousUnitId && previousUnitId !== currentUnitId) {
        sourceStringId = previousUnitId
      }

      if (sourceStringId && sourceStringId !== currentUnitId) {
        edges.push({
          id: edgeIdCounter++,
          source: sourceStringId,
          target: currentUnitId,
          type: 'patient-transfer',
          time: event.ts,
          pathId: normalizeSourceId(pathId ?? sourceStringId)
        })
      }

      previousUnitId = currentUnitId
    })
  })

  return { nodes, edges }
}

export function normalizeSourceId(source) {
  const mapping = { 'EMS (Ground)': 'ems-ground', 'EMS (Air)': 'ems-air', 'Walk-in': 'walk-in' }
  return mapping[source] ?? source.toLowerCase().replace(/\s+/g, '-')
}
