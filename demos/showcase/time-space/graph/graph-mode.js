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
import { MouseWheelBehaviors } from '@yfiles/yfiles'
import { removeCircleVisual, updateLayout } from './layout'
import { applyLayoutStyles, applyMapStyles } from './styling'

let graphMode = 'geospatial'
let layoutRunning = false
let oldViewport

/**
 * Returns the current graph mode.
 */
export function getGraphMode() {
  return graphMode
}

/**
 * Sets the graph mode and updates the graph component and the Leaflet map accordingly.
 * @param mode The graph mode to set.
 * @param graphLayer The graph layer to update.
 * @param map The Leaflet map to update.
 */
export async function setGraphMode(mode, graphLayer, map) {
  if (graphMode === mode) {
    return
  }
  const oldMode = graphMode
  graphMode = mode
  const graphComponent = graphLayer.graphComponent
  const graph = graphComponent.graph
  const fullGraph = graph.wrappedGraph
  const backgroundDiv = document.getElementById('component-background')

  if (mode === 'centric' || mode === 'tree') {
    if (oldMode === 'geospatial') {
      oldViewport = graphComponent.viewport.toRect()
    }
    // disable the map when the graph is shown with radial layout
    graphLayer.updateMapLayout = false
    map.dragging.disable()
    map.touchZoom.disable()
    map.scrollWheelZoom.disable()
    map.boxZoom.disable()
    map.keyboard.disable()

    if (map.tapHold) {
      map.tapHold.disable()
    }
    // enable mouse wheel zoom for the graph component
    graphComponent.mouseWheelBehavior = MouseWheelBehaviors.ZOOM | MouseWheelBehaviors.SCROLL
    graphComponent.inputMode.moveViewportInputMode.enabled = true

    // make the background visible
    backgroundDiv.style.opacity = '0.85'
    applyLayoutStyles(graph.wrappedGraph)
    if (!layoutRunning) {
      // run a layout with animation
      layoutRunning = true
      fullGraph.edges.forEach((edge) => fullGraph.clearBends(edge))

      await updateLayout(graphLayer, map, null)

      layoutRunning = false
    }
  } else {
    graphLayer.updateMapLayout = true
    map.dragging.enable()
    map.touchZoom.enable()
    map.scrollWheelZoom.enable()
    map.boxZoom.enable()
    map.keyboard.enable()

    if (map.tapHold) {
      map.tapHold.enable()
    }
    // enable mouse wheel zoom for the graph component
    graphComponent.mouseWheelBehavior = MouseWheelBehaviors.NONE
    graphComponent.inputMode.moveViewportInputMode.enabled = false

    // hide the background
    backgroundDiv.style.opacity = '0'
    removeCircleVisual()

    applyMapStyles(graph.wrappedGraph)

    graphComponent.zoomTo(oldViewport)
    graphLayer.updateGraphDiv(map)
  }
}
