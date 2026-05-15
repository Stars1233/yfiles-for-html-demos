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
import { LatLng, latLng, LatLngBounds, Map as LeafletMap } from 'leaflet'
import { FilteredGraphWrapper, type GraphComponent, type INode } from '@yfiles/yfiles'
import { GraphLayer, GrayTileLayer, type MapData } from './leaflet-graph-layer'
import { getNodeData, type NodeData } from '../data-types'
import { updateLayout } from '../graph/layout'

/**
 * Creates a Leaflet map and adds a graph layer which contains a {@link GraphComponent}.
 */
export function createMap(containerId: string): MapData {
  // Use openstreetmap tiles for this demo
  const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  const osmAttrib = 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'

  // Create the map
  const worldMap = new LeafletMap(containerId, { zoomControl: false })
  worldMap.setView(latLng(47, -35), 4)
  worldMap.addLayer(new GrayTileLayer(osmUrl, { minZoom: 3, maxZoom: 8, attribution: osmAttrib }))

  // Create the tile layer with the correct attribution
  const graphLayer = new GraphLayer({ coordinateMapping, zoomChanged })
  // And add it to the map
  worldMap.addLayer(graphLayer)

  // Add a background div
  const backgroundDiv = document.createElement('div')
  backgroundDiv.id = 'component-background'
  graphLayer.graphComponent.overlayPanel.appendChild(backgroundDiv)

  return { graphLayer, map: worldMap }
}

/**
 * Fits the map bounds to the nodes in the graph.
 */
export function fitMapBounds(graphComponent: GraphComponent, map: LeafletMap): void {
  const items = graphComponent.graph.nodes.map((node) => node.tag as NodeData).toArray()
  if (items.length <= 0) {
    return
  }
  const values = items.reduce(
    (values, item) => {
      values.minLat = Math.min(values.minLat, item.lat)
      values.minLng = Math.min(values.minLng, item.lng)
      values.maxLat = Math.max(values.maxLat, item.lat)
      values.maxLng = Math.max(values.maxLng, item.lng)
      return values
    },
    {
      minLat: Number.POSITIVE_INFINITY,
      minLng: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY
    }
  )
  map.fitBounds(
    new LatLngBounds(
      new LatLng(values.minLat, values.minLng),
      new LatLng(values.maxLat, values.maxLng)
    ),
    { padding: [150, 150], maxZoom: 5 }
  )
}

/**
 * Mapping function that extracts the coordinates for each node from its business data.
 */
function coordinateMapping(node: INode): { lat: number; lng: number } {
  const nodeData = getNodeData(node)
  return { lat: nodeData.lat, lng: nodeData.lng }
}

/**
 * Updates the graph after the map's zoom has changed.
 */
export function zoomChanged(graphComponent: GraphComponent): void {
  const graph = graphComponent.graph
  if (graph instanceof FilteredGraphWrapper) {
    // update visibility of the nodes which depends on the zoom level
    graph.nodePredicateChanged()
    graph.edgePredicateChanged()
  }
}

/**
 * Invalidates the leaflet map size and updates the node locations to match their geospatial coordinates.
 * @param map The leaflet map to invalidate
 * @param graphLayer The layer that holds the yFiles graph
 */
export function invalidateMapSize(map: LeafletMap, graphLayer: GraphLayer): Promise<void> {
  map.invalidateSize()
  return updateLayout(graphLayer, map)
}
