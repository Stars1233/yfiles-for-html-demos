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
import type { UseCase } from '../use-case'
import type { DashboardConnection, DashboardData, DashboardEntry, ViewIds } from '../../types'
import data from './electricity-data.json'
import {
  IArrow,
  IEdge,
  ILabelStyle,
  type IModelItem,
  INode,
  PolylineEdgeStyle,
  ShapeNodeStyle,
  Size
} from '@yfiles/yfiles'
import { createElectricityNodeStyle } from './electricity-node-style'
import { getNodeColor, icons, countries } from './electricity-theme'
import { NodeTooltip } from '../../components/tooltips/node-tooltips'

export type ElectricityDashboardEntry = DashboardEntry & {
  capacityMW?: number
  throughputCapacityMW?: number
  peakDemandMW?: number
}

export const ElectricityUseCase: UseCase<ViewIds> = {
  id: 'electricity',
  label: 'Electricity',

  viewIds: [
    'legend',
    'topology',
    'timelineSlider',
    'pie',
    'map',
    'neighborhood',
    'filter',
    'table',
    'properties'
  ],

  loadData(): DashboardData {
    return data as DashboardData
  },

  configureViews(views) {
    if (views.legend) {
      views.legend.title = 'Entity Types'
      views.legend.valueProvider = (node: DashboardEntry) => node.type
      views.legend.colorProvider = (node: DashboardEntry) => getNodeColor(node.type)
    }

    if (views.properties) {
      views.properties.validKeys = [
        'name',
        'type',
        'country',
        'capacityMW',
        'throughputCapacityMW',
        'peakDemandMW',
        'voltageInKV',
        'voltageOutKV'
      ]
    }

    if (views.topology) {
      views.topology.nodeStyleProvider = (_) => createElectricityNodeStyle()
      views.topology.nodeSizeProvider = new Size(288, 138)

      views.topology.edgeStyleProvider = () =>
        new PolylineEdgeStyle({
          smoothingLength: 10,
          stroke: '1px solid currentColor',
          cssClass: 'electricity-edge'
        })

      views.topology.nodeLabelStyleProvider = (_) => ILabelStyle.VOID_LABEL_STYLE

      views.topology.tooltipProvider = (item: INode | IEdge) => {
        if (item instanceof INode) {
          return createElectricityTooltip(item)
        }
        return undefined
      }

      views.topology.heatProvider = (item: INode | IEdge, time = 0): number => {
        if (
          (item instanceof INode &&
            views.topology?.visibleElements?.includes(
              (item.tag as ElectricityDashboardEntry).id
            )) ||
          (item instanceof IEdge &&
            views.topology?.visibleElements?.includes(
              (item.sourceNode.tag as ElectricityDashboardEntry).id
            ) &&
            views.topology.visibleElements.includes(
              (item.targetNode.tag as ElectricityDashboardEntry).id
            ))
        ) {
          const tag = item.tag as ElectricityDashboardEntry
          const lastUtilization =
            tag.lastTimestampData?.utilization ?? tag.currentTimestampData?.utilization ?? 0
          const currentUtilization = tag.currentTimestampData?.utilization ?? 0
          return Math.min(lastUtilization + (currentUtilization - lastUtilization) * time, 1)
        }
        return 0
      }
    }

    if (views.pie) {
      views.pie.filter = (node) => node.type.startsWith('producer')
      views.pie.valueProvider = (node) => {
        const entry = node as ElectricityDashboardEntry
        if (entry.type.startsWith('producer')) {
          return Math.round(
            (entry.currentTimestampData?.utilization ?? 0) * (entry.capacityMW ?? 0)
          )
        }
        return 0
      }
      views.pie.colorProvider = (node: DashboardEntry) => getNodeColor(node.type)
    }

    if (views.filter) {
      views.filter.config = {
        fields: [
          {
            name: 'country',
            label: 'Country',
            control: 'select',
            accessor: (e) => e.country ?? 'ZZ'
          },
          { name: 'type', label: 'Type', control: 'select', accessor: (e) => e.type }
        ]
      }
    }

    if (views.map) {
      views.map.nodeStyleProvider = (dataItem: DashboardEntry) =>
        new ShapeNodeStyle({
          cssClass: `electricity-node ${dataItem.type.toLowerCase()}`,
          shape: 'ellipse'
        })
      views.map.edgeStyleProvider = (_dataItem: DashboardConnection) =>
        new PolylineEdgeStyle({
          sourceArrow: IArrow.NONE,
          targetArrow: IArrow.NONE,
          cssClass: 'electricity-edge'
        })
    }

    if (views.neighborhood) {
      views.neighborhood.nodeSizeProvider = new Size(288, 138)
      views.neighborhood.nodeStyleProvider = () => createElectricityNodeStyle()
      views.neighborhood.nodeLabelStyleProvider = () => ILabelStyle.VOID_LABEL_STYLE
      views.neighborhood.edgeStyleProvider = (_dataItem: DashboardConnection) =>
        new PolylineEdgeStyle({
          smoothingLength: 10,
          stroke: '1px solid currentColor',
          cssClass: 'edge'
        })
    }
  }
}

export function createElectricityTooltip(item: IModelItem | null): HTMLElement | null {
  if (!item || !(item instanceof INode)) return null

  const tag = item.tag as ElectricityDashboardEntry
  const utilization = tag.currentTimestampData?.utilization ?? 0

  const currentUtilization = tag.type.startsWith('consumer')
    ? utilization * (tag.peakDemandMW ?? 0)
    : tag.type.startsWith('producer')
      ? utilization * (tag.capacityMW ?? 0)
      : utilization * (tag.throughputCapacityMW ?? 0)

  const capacity = tag.type.startsWith('consumer')
    ? tag.peakDemandMW
    : tag.type.startsWith('distributor')
      ? tag.throughputCapacityMW
      : tag.capacityMW

  const tooltip = new NodeTooltip()

  tooltip.setData({
    typeColor: getNodeColor(tag.type),
    icon: icons[tag.type] ?? 'favorite',
    title: tag.name,
    location: countries[tag.country!] ?? 'Unknown',

    stats: [
      {
        label: tag.type.startsWith('consumer')
          ? 'Current Demand'
          : tag.type.startsWith('producer')
            ? 'Output'
            : 'Throughput',
        value: `${Math.floor(currentUtilization)}MW`,
        accent: true
      },
      {
        label: tag.type.startsWith('consumer') ? 'Peak Demand' : 'Capacity',
        value: `${capacity ?? 0}MW`
      }
    ],

    progressLabel: 'Utilization',
    progressText: `${(utilization * 100).toFixed(2)}%`,
    progress: utilization
  })

  return tooltip
}
