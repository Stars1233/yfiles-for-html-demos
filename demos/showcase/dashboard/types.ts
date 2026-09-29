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
import type { IGraph, IModelItem, INode } from '@yfiles/yfiles'

type TimestampData = { timestamp: string; utilization: number; event_tag: string }

/**
 * Represents a node or group in the dashboard data.
 */
export type DashboardEntry = {
  id: number | string
  name: string
  type: string
  location?: { lat: number; lng: number }
  city?: string
  country?: string
  parentId?: number | string
  isGroup?: boolean
  lastTimestampData?: TimestampData
  currentTimestampData?: TimestampData
  timeseries?: TimestampData[]
}
/**
 * Represents a connection (edge) in the dashboard data.
 */
export type DashboardConnection = {
  id: number | string
  source: number | string
  target: number | string
  type: string
  time?: string
  lastTimestampData?: TimestampData
  currentTimestampData?: TimestampData
  timeseries?: TimestampData[]
}
/**
 * Represents the complete data set for the dashboard.
 */
export type DashboardData = { nodes: DashboardEntry[]; edges: DashboardConnection[] }

export type ViewIds =
  | 'legend'
  | 'topology'
  | 'sankey'
  | 'map'
  | 'neighborhood'
  | 'filter'
  | 'table'
  | 'properties'
  | 'timeline'
  | 'timelineSlider'
  | 'pie'
  | 'multiplePie'
  | 'gauge'

/**
 * Helper function to retrieve the tag of a graph item, cast to DashboardEntry.
 * @param item The graph item.
 * @returns The item's tag as a DashboardEntry.
 */
export function getTag(item: IModelItem): DashboardEntry {
  return item.tag as DashboardEntry
}

/**
 * Helper function to find a node in the graph by its ID.
 * @param graph The graph to search in.
 * @param id The ID of the node to find.
 * @returns The node if found, otherwise null.
 */
export function findNode(graph: IGraph, id: number | string): INode | null {
  return graph.nodes.find((node) => getTag(node).id === id)
}

/**
 * Converts an input string into a human-friendly label.
 * @param text - The string to convert
 */
export function formatLabel(text: string): string {
  return text
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => {
      if (part === part.toUpperCase()) return part
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    })
    .join(' ')
}
