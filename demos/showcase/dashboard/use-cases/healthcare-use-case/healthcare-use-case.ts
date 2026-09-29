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
import type { HealthDashboardConnection, HealthDashboardEntry } from './healthcare-types'
import type { UseCase } from '../use-case'
import { preprocessHealthCareData } from './preprocessing'
import type { DashboardConnection, DashboardData, DashboardEntry, ViewIds } from '../../types'
import type {
  PieCardSetup,
  PieCardSetupBuilder,
  PieNodesFilter
} from '../../components/views/pie-chart-view/MultiplePieChartViewComponent'
import {
  ExteriorNodeLabelModel,
  GroupNodeLabelModel,
  GroupNodeStyle,
  type IEdge,
  INode,
  LabelStyle,
  PolylineEdgeStyle,
  ShapeNodeStyle,
  Size,
  Stroke
} from '@yfiles/yfiles'
import healthcareGaugeStyles from './healthcare-gauge.css?inline'
import type { GaugeConfig, LoadLevel } from '../../components/views/gauge-view/gauge-types'
import {
  getNodeId,
  getTransportTheme,
  HEALTHCARE_ICONS,
  HOSPITAL_THEME,
  UNIT_COLORS
} from './healthcare-theme'
import { NodeTooltip } from '../../components/tooltips/node-tooltips'

export const HealthcareUseCase: UseCase<ViewIds> = {
  id: 'healthcare',
  label: 'Healthcare',

  viewIds: [
    'sankey',
    'gauge',
    'multiplePie',
    'map',
    'neighborhood',
    'filter',
    'legend',
    'properties',
    'timeline'
  ],

  loadData() {
    return preprocessHealthCareData()
  },

  configureViews(views) {
    if (views.legend) {
      views.legend.title = 'Hospital units'
      views.legend.valueProvider = (node: DashboardEntry) =>
        node.isGroup || node.type === 'source' || node.type === 'destination'
          ? undefined
          : node.name

      views.legend.colorProvider = (node) => {
        const entry = node as HealthDashboardEntry
        return UNIT_COLORS[entry.name] ?? HOSPITAL_THEME.opaque
      }
    }
    if (views.properties) {
      views.properties.validKeys = [
        'name',
        'city',
        'country',
        'deptId',
        'activePatients',
        'bedOccupancy',
        'staffLoad'
      ]
    }
    if (views.sankey) {
      views.sankey.heatProvider = (item: INode | IEdge, activePatients?: number): number => {
        if (item instanceof INode) {
          const entry = item.tag as HealthDashboardEntry
          if (entry.isGroup || entry.type === 'source' || entry.type === 'destination') return 0
          if (activePatients !== undefined) {
            const capacity = entry.capacity
            if (capacity) {
              const bedOccupancy =
                capacity.beds > 0
                  ? Math.min(100, Math.round((activePatients / capacity.beds) * 100))
                  : 0

              return Math.sqrt(
                Math.min(100, Math.round(bedOccupancy * 0.6 + (100 - entry.staffLoad!) * 0.4)) / 100
              )
            }
          }
          return Math.sqrt((entry.loadPercentage ?? 0) / 100)
        }
        return 0
      }

      views.sankey.nodeStyleProvider = (dataItem: DashboardEntry) => {
        const entry = dataItem as HealthDashboardEntry
        const isEndpoint = entry.type === 'source' || entry.type === 'destination'
        const transportTheme = getTransportTheme(getNodeId(entry))

        return new ShapeNodeStyle({
          shape: 'round-rectangle',
          stroke: new Stroke({
            fill: isEndpoint ? transportTheme?.opaque : '#6f8faf60',
            thickness: 5
          }),
          fill: isEndpoint ? transportTheme?.transparent : '#6f8faf40',
          cssClass: 'healthcare-node-sankey'
        })
      }

      views.sankey.groupStyleProvider = (_dataItem: DashboardEntry) =>
        new GroupNodeStyle({
          stroke: new Stroke({ fill: HOSPITAL_THEME.opaque, thickness: 20 }),
          renderTransparentContentArea: true,
          contentAreaFill: '#e8536a10',
          tabHeight: 0,
          contentAreaPadding: 80,
          cssClass: 'healthcare-node'
        })

      views.sankey.edgeStyleProvider = (dataItem: HealthDashboardConnection, thickness = 1) => {
        const transportColor = getTransportTheme(dataItem.pathId?.toLowerCase() ?? '')

        return new PolylineEdgeStyle({
          smoothingLength: 100,
          stroke: new Stroke({ fill: transportColor?.opaque ?? '#999', thickness }),
          cssClass: 'healthcare-edge'
        })
      }

      views.sankey.nodeLabelStyleProvider = (dataItem: DashboardEntry) =>
        new LabelStyle({
          verticalTextAlignment: 'center',
          horizontalTextAlignment: 'center',
          font: `bold ${dataItem.type === 'unit' ? 60 : 80}px Poppins,sans-serif`,
          cssClass: 'healthcare-node-label-sankey'
        })

      views.sankey.groupNodeLabelStyleProvider = (_dataItem: DashboardEntry) =>
        new LabelStyle({
          verticalTextAlignment: 'center',
          horizontalTextAlignment: 'center',
          font: 'bold 100px Poppins,sans-serif',
          cssClass: 'healthcare-node-label-sankey'
        })

      const topParameter = new ExteriorNodeLabelModel({ margins: 20 }).createParameter('top')
      views.sankey.nodeLabelLayoutParameterProvider = () => topParameter
      views.sankey.groupNodeLabelLayoutParameterProvider = () => topParameter

      views.sankey.tooltipProvider = (item: INode | IEdge) => {
        if (item instanceof INode) {
          if (
            (item.tag as DashboardEntry).type === 'source' ||
            (item.tag as DashboardEntry).type === 'destination'
          ) {
            return null
          }

          return createHealthTooltip(item)
        }
        return undefined
      }

      views.sankey.nodeSizeProvider = new Size(80, 100)
    }
    if (views.gauge) {
      function resolveLoadLevel(percentage: number): LoadLevel {
        if (percentage > 80) return 'high'
        if (percentage > 65) return 'medium'
        return 'normal'
      }

      function sumStaff(hospital: HealthDashboardEntry): { onDuty: number; required: number } {
        const cap = hospital.capacity
        const roles = ['doctor', 'nurse', 'practitioner', 'tech'] as const
        return {
          required: roles.reduce((sum, role) => sum + (cap?.[role].required ?? 0), 0),
          onDuty: roles.reduce((sum, role) => sum + (cap?.[role].onDuty ?? 0), 0)
        }
      }

      function buildStatItems(
        hospital: HealthDashboardEntry,
        activePatients: number
      ): Array<{ label: string; value: string }> {
        const nurseRatio =
          hospital.capacity?.nurse.onDuty && activePatients
            ? `1 : ${Math.ceil(activePatients / hospital.capacity.nurse.onDuty)}`
            : '0 : 0'

        const availableBeds = Math.max(0, (hospital.capacity?.beds ?? 0) - activePatients)

        return [
          { label: 'Doctors on duty', value: String(hospital.capacity?.doctor.onDuty ?? 0) },
          { label: 'Nurse ratio', value: nurseRatio },
          {
            label: 'Practitioner on duty',
            value: String(hospital.capacity?.practitioner.onDuty ?? 0)
          },
          { label: 'Tech on duty', value: String(hospital.capacity?.tech.onDuty ?? 0) },
          { label: 'Available beds', value: String(availableBeds) }
        ]
      }

      function buildGaugeConfig(
        hospital: HealthDashboardEntry,
        activePatients?: number
      ): GaugeConfig {
        // Use provided activePatients (from timeframe) or fall back to static data
        const patients = activePatients ?? hospital.activePatients ?? 0
        const beds = hospital.capacity?.beds ?? 0
        const bedOccupancy =
          activePatients !== undefined
            ? Math.min(100, (patients / beds) * 100)
            : (hospital.bedOccupancy ?? 0)

        const { onDuty, required } = sumStaff(hospital)
        const staffingPercentage = required > 0 ? Math.min(100, (onDuty / required) * 100) : 0

        return {
          title: hospital.name,
          outerRing: {
            sectionLabel: 'BED OCCUPANCY',
            percentage: bedOccupancy,
            centerLines: [
              { text: `${patients} / ${beds}`, className: 'ring-label-small' },
              { text: 'Occupied', className: 'ring-label-small' }
            ]
          },
          innerRing: {
            percentage: staffingPercentage,
            arcTitle: 'STAFFING',
            centerLines: [
              { text: `${Math.round(staffingPercentage)}%`, className: 'ring-percentage' },
              { text: `${onDuty} / ${required}`, className: 'ring-label-small' },
              { text: 'On duty', className: 'ring-label-small' }
            ]
          },
          statusBadge: {
            label: `${resolveLoadLevel(bedOccupancy).toUpperCase()} LOAD`,
            level: resolveLoadLevel(bedOccupancy)
          },
          statItems: buildStatItems(hospital, patients)
        }
      }

      const healthcareGaugeSheet = new CSSStyleSheet()
      healthcareGaugeSheet.replaceSync(healthcareGaugeStyles)
      views.gauge.extraStyleSheets = [healthcareGaugeSheet]

      views.gauge.configure(
        (data: DashboardData) => data.nodes.filter((n: HealthDashboardEntry) => n.isGroup),
        (hospital: HealthDashboardEntry) => buildGaugeConfig(hospital),
        (entry: HealthDashboardEntry) => (entry.isGroup ? entry.id : entry.parentId) ?? 0
      )

      views.gauge.configTransformer = (
        hospital: DashboardEntry,
        edgeCount: number,
        _baseConfig: GaugeConfig
      ) => {
        return buildGaugeConfig(hospital as HealthDashboardEntry, edgeCount)
      }
    }
    if (views.multiplePie) {
      type HospitalPieData = DashboardData & {
        meta: {
          totalBeds: number
          colors: Record<string, string>
          title: string
          id: string | number
        }
      }

      const healthcarePieNodesFilter: PieNodesFilter<HospitalPieData> = (data) => {
        const hospitals = data.nodes.filter((n) => n.isGroup) as HealthDashboardEntry[]
        return hospitals.map((hospital) => {
          const children = data.nodes.filter((n) => n.parentId === hospital.id)
          const uniqueChildren = [...new Map(children.map((n) => [n.name, n])).values()]
          return {
            ...data,
            nodes: uniqueChildren,
            meta: {
              totalBeds: hospital.capacity?.beds ?? 1,
              colors: UNIT_COLORS,
              title: hospital.name,
              id: hospital.id
            }
          } as HospitalPieData
        })
      }

      const healthcarePieCardSetupBuilder: PieCardSetupBuilder<HospitalPieData> = (
        slicedData
      ): PieCardSetup => ({
        title: slicedData.meta.title,
        colorProvider: (node) =>
          slicedData.meta.colors[(node as HealthDashboardEntry).name] ?? '#ccc',
        valueProvider: (node) => {
          const n = node as HealthDashboardEntry
          return Math.max(0, (n.capacity?.beds ?? 0) - (n.bedOccupancy ?? 0))
        },
        groupKeyProvider: (node) => (node as HealthDashboardEntry).name
      })

      views.multiplePie.selectionMatcher = (
        entry: DashboardEntry,
        sliceType: string,
        pieData: DashboardEntry[]
      ) => {
        const healthEntry = entry as HealthDashboardEntry
        if (healthEntry.isGroup || healthEntry.name !== sliceType) return false

        const entryParentId = healthEntry.parentId ?? healthEntry.id
        return pieData.some(
          (n) => (n as HealthDashboardEntry).parentId === entryParentId || n.id === entryParentId
        )
      }

      views.multiplePie.configure(
        healthcarePieNodesFilter,
        healthcarePieCardSetupBuilder as PieCardSetupBuilder,
        (dataset) => String((dataset as HospitalPieData).meta.id),
        (entry) => String(entry.isGroup ? entry.id : (entry.parentId ?? ''))
      )

      views.multiplePie.timeFrameValueTransformer = (node, edgeCount, _base) => {
        const n = node as HealthDashboardEntry
        return Math.max(0, (n.capacity?.beds ?? 0) - edgeCount)
      }
    }
    if (views.map) {
      views.map.nodeFilter = (n: HealthDashboardEntry) => !!n.isGroup
      views.map.showEdges = false
      views.map.selectionTransform = (
        item: HealthDashboardEntry,
        data: DashboardData | null
      ): HealthDashboardEntry => {
        if (!item.parentId || !data) return item
        return (data.nodes.find((n: HealthDashboardEntry) => n.id === item.parentId) ??
          item) as HealthDashboardEntry
      }

      views.map.nodeStyleProvider = (_dataItem: DashboardEntry) => {
        return new ShapeNodeStyle({
          shape: 'ellipse',
          fill: HOSPITAL_THEME.opaque,
          stroke: new Stroke({ fill: 'white', thickness: 1 }),
          cssClass: 'healthcare-node map'
        })
      }

      views.map.nodeLabelStyleProvider = (_dataItem: DashboardEntry) => {
        return new LabelStyle({
          verticalTextAlignment: 'center',
          horizontalTextAlignment: 'center',
          wrapping: 'wrap-word',
          shape: 'squircle',
          padding: 1,
          backgroundFill: 'white',
          backgroundStroke: HOSPITAL_THEME.opaque,
          textFill: HOSPITAL_THEME.opaque,
          cssClass: 'healthcare-node-label'
        })
      }
    }
    if (views.filter) {
      views.filter.config = {
        fields: [
          {
            name: 'hospitalId',
            label: 'Hospital Name',
            control: 'select',
            accessor: (e: HealthDashboardEntry) => e.hospitalId ?? ''
          },
          {
            name: 'name',
            label: 'Unit Name',
            control: 'select',
            accessor: (e) => (!e.isGroup ? e.name : '')
          }
        ]
      }
    }
    if (views.neighborhood) {
      views.neighborhood.nodeStyleProvider = (dataItem) =>
        new ShapeNodeStyle({
          shape: 'round-rectangle',
          fill: UNIT_COLORS[(dataItem as HealthDashboardEntry).name] ?? '#ccc',
          stroke: 'none'
        })
      views.neighborhood.nodeSizeProvider = new Size(100, 80)
      views.neighborhood.nodeLabelStyleProvider = (_dataItem: DashboardEntry) =>
        new LabelStyle({
          verticalTextAlignment: 'center',
          horizontalTextAlignment: 'center',
          wrapping: 'wrap-word'
        })

      views.neighborhood.groupStyleProvider = (_dataItem) => {
        const fill = HOSPITAL_THEME.transparent
        return new GroupNodeStyle({
          tabPosition: 'top',
          tabFill: fill,
          renderTransparentContentArea: true,
          contentAreaFill: fill,
          stroke: HOSPITAL_THEME.opaque
            ? new Stroke({ fill: HOSPITAL_THEME.opaque, thickness: 2, dashStyle: 'dash' })
            : 'none'
        })
      }
      views.neighborhood.groupNodeLabelLayoutParameterProvider = (_dataItem: DashboardEntry) =>
        new GroupNodeLabelModel().createTabParameter()
      views.neighborhood.groupNodeLabelStyleProvider = (_dataItem: DashboardEntry) => {
        return new LabelStyle({
          verticalTextAlignment: 'center',
          horizontalTextAlignment: 'center',
          wrapping: 'wrap-word',
          textFill: HOSPITAL_THEME.opaque,
          cssClass: 'healthcare-node-label'
        })
      }

      views.neighborhood.edgeStyleProvider = (_dataItem: DashboardConnection) =>
        new PolylineEdgeStyle({
          smoothingLength: 10,
          stroke: '1px solid currentColor',
          cssClass: 'edge'
        })
    }

    if (views.timeline) {
      views.timeline.helpContent = `<ul>
      <li>
        <b>Hover over an edge:</b> View edge details in a tooltip, with the edge and its connected nodes highlighted in the graph and timeline.
      </li>
      <li>
        <b>Hover over a node:</b> View node details in a tooltip. The node, its connected edges, and adjacent nodes are highlighted. Related timestamps appear highlighted in the timeline.
      </li>
      <li>
        <b>Hover over the timeline:</b> All edges at that point in time are highlighted along with their connected nodes.
      </li>
      <li><b>Scroll wheel:</b> Zoom horizontally</li>
      <li><b>Ctrl + Scroll wheel:</b> Zoom vertically</li>
      <li><b>Click and drag the canvas:</b> Pan the view up, down, left, or right</li>
      <li><b>Right-click and drag the canvas:</b> Select a time region to zoom into. Use the <em>Fit to View</em> button to reset.</li>
      <li><b>Click and drag the timeline:</b> Select a time region to zoom into. Use the <em>Fit to View</em> button to reset.</li>
    </ul>`
    }
  }
}

export function createHealthTooltip(item: INode | IEdge): HTMLElement | null {
  if (!(item instanceof INode)) return null

  const tag = item.tag as HealthDashboardEntry

  const activePatients = tag.activePatients ?? 0
  const bedOccupancy = normalize(tag.bedOccupancy ?? 0)
  const staffLoad = normalize(tag.staffLoad ?? 0)
  const loadPercentage = normalize(tag.loadPercentage ?? 0)

  const tooltip = new NodeTooltip()

  const isUnit = tag.type === 'unit'
  let title = tag.name
  if (isUnit) {
    const hospitalId = tag.hospitalId
    let hospitalName
    switch (hospitalId) {
      case 'MH':
        hospitalName = 'Metro Hospital'
        break
      case 'UH':
        hospitalName = 'University Hospital'
        break
      case 'BH':
        hospitalName = 'Bronx Medical Center'
        break
      case 'REHA':
        hospitalName = 'Rehabilitation'
        break
    }
    title = hospitalName + ' ' + title
  }

  tooltip.setData({
    typeColor: (tag.type === 'hospital' ? HOSPITAL_THEME.opaque : UNIT_COLORS[tag.name])! as string,
    icon: HEALTHCARE_ICONS[tag.type] ?? '',
    title: title,
    location: tag.city ?? 'Unknown',

    stats: [
      { label: 'Active Patients', value: `${activePatients}`, accent: true },
      { label: 'Bed Occupancy', value: formatPercent(bedOccupancy) },
      { label: 'Staff Load', value: formatPercent(staffLoad) }
    ],
    progressLabel: 'Load Percentage',
    progressText: formatPercent(loadPercentage),
    progress: loadPercentage
  })

  return tooltip
}

function normalize(value: number): number {
  return value > 1 ? value / 100 : value
}

function formatPercent(value: number): string {
  return `${(normalize(value) * 100).toFixed(2)}%`
}
