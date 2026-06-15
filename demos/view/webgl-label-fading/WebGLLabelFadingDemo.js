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
import {
  CircularLayout,
  ExteriorNodeLabelModel,
  Font,
  GraphComponent,
  GraphViewerInputMode,
  IEnumerable,
  License,
  WebGLFocusIndicatorManager,
  WebGLGraphModelManager,
  WebGLHighlightIndicatorManager,
  WebGLLabelShape,
  WebGLLabelStyle,
  WebGLPolylineEdgeStyle,
  WebGLSelectionIndicatorManager,
  WebGLShapeNodeShape,
  WebGLShapeNodeStyle,
  WebGLStroke,
  WebGLZoomScalingPolicy,
  WebGLZoomVisibilityPolicy
} from '@yfiles/yfiles'

import { initDemoStyles } from '@yfiles/demo-app/demo-styles'
import licenseData from '../../../lib/license.json'
import { checkWebGL2Support } from '@yfiles/demo-app/modern/element-utils'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'

async function run() {
  if (!checkWebGL2Support()) {
    return
  }

  License.value = licenseData

  // initialize a GraphComponent with a view-only input mode
  const graphComponent = new GraphComponent('#graphComponent')

  graphComponent.inputMode = new GraphViewerInputMode()
  initDemoStyles(graphComponent.graph)

  // Render graph in WebGL to utilize its label fading capabilities
  enableWebGLRendering(graphComponent)

  // create an initial sample graph
  graphComponent.zoom = 0.01
  createGraph(graphComponent.graph)
  await graphComponent.fitGraphBounds()

  // set up zoom threshold select
  initializeUI(graphComponent)
}

/**
 * Enables WebGL as the rendering technique.
 */
function enableWebGLRendering(graphComponent) {
  graphComponent.graphModelManager = new WebGLGraphModelManager()
  graphComponent.selectionIndicatorManager = new WebGLSelectionIndicatorManager()
  graphComponent.highlightIndicatorManager = new WebGLHighlightIndicatorManager()
  graphComponent.focusIndicatorManager = new WebGLFocusIndicatorManager()
}

/**
 * Configures the threshold values dropdown menu.
 */
function initializeUI(graphComponent) {
  const zoomLevelSpan = document.querySelector('#current-zoom')
  zoomLevelSpan.textContent = getZoom(graphComponent)

  graphComponent.addEventListener('zoom-changed', () => {
    zoomLevelSpan.textContent = getZoom(graphComponent)
  })
}

/**
 * Creates an initial sample graph.
 */
function createGraph(graph) {
  graph.clear()
  createTree(graph)
  graph.applyLayout(new CircularLayout())
}

function createTree(graph, { maxDepth = 4, minChildren = 6, maxChildren = 2 } = {}) {
  graph.nodeDefaults.labels.layoutParameter = ExteriorNodeLabelModel.BOTTOM

  let counter = 1

  // we define some visibility policies for each layer in our tree that we can share
  // between nodes and edges - labels get their own policy.
  const layerVisibility = IEnumerable.ofRange(0, maxDepth + 1)
    .map((layer) => {
      if (layer === 1) {
        // keep elements at level 1
        return undefined
      }
      const size = 30 + 30 * (maxDepth - layer)
      const minEffectiveSize = 10
      const minZoom = minEffectiveSize / size

      return new WebGLZoomVisibilityPolicy({ lowerThreshold: minZoom })
    })
    .toArray()

  // helper method for the colors used in the demo
  function colorForLayer(layer) {
    const t = maxDepth <= 1 ? 0 : (layer - 1) / (maxDepth - 1)

    // blue -> teal -> green-ish
    const r = Math.round(90 + (120 - 90) * t)
    const g = Math.round(140 + (200 - 140) * t)
    const b = Math.round(240 + (140 - 240) * t)

    return `rgb(${r}, ${g}, ${b})`
  }

  // now we define the label style with the webgl styling and zoom dependent policies
  function labelStyleForLayer(layer) {
    // for each layer we determine a size for the font of the label
    const size = 12 + 12 * (maxDepth - layer)
    // we define two effective font sizes as thresholds for the visibility
    const minEffectiveSize = 8
    const maxEffectiveSize = 64
    // and this results in zoom levels where we want to hide our labels
    const minZoom = minEffectiveSize / size
    const maxZoom = maxEffectiveSize / size

    // we use this to create the policy for the fading/visibility
    const zoomVisibilityPolicy = new WebGLZoomVisibilityPolicy({
      lowerThreshold: minZoom,
      upperThreshold: maxZoom,
      transitionDuration: '0.2s'
    })

    // also we determine a zoom policy - i.e. a threshold for a zoom level at which
    // we want to keep the label at the same size on the screen, independently of the zoom level
    const lowerThreshold = (minZoom + maxZoom) / 2

    // this defines a function that ...
    const zoomControlPoints = [
      [0, 0], // makes sure that when we zoom out, labels actually get small
      [0.2, lowerThreshold], // but starting from a given threshold we want to keep the size constant
      [lowerThreshold, lowerThreshold] // after this, the size will start increasing, again
    ]

    // we create the policy for the style
    const zoomScalingPolicy = new WebGLZoomScalingPolicy({ controlPoints: zoomControlPoints })

    // now create the style instance with the policies
    return new WebGLLabelStyle({
      backgroundColor: colorForLayer(layer),
      backgroundStroke: `2px solid white`,
      padding: size / 3, // increase the padding with the font size
      shape: WebGLLabelShape.SQUIRCLE,
      font: new Font({ fontSize: size }),
      zoomVisibilityPolicy: zoomVisibilityPolicy,
      zoomScalingPolicy: zoomScalingPolicy
    })
  }

  // cache the styles for each layer so that the total number of style instances stays small
  const labelStyles = IEnumerable.ofRange(0, maxDepth + 1)
    .map(labelStyleForLayer)
    .toArray()

  // the same for the edges ...
  function edgeStyleForLayer(layer) {
    const size = 3 + 3 * (maxDepth - layer)
    return new WebGLPolylineEdgeStyle({
      stroke: `${size}px solid ${colorForLayer(layer + 0.5)}`,
      zoomVisibilityPolicy: layerVisibility[layer]
    })
  }

  const edgeStyles = IEnumerable.ofRange(0, maxDepth + 1)
    .map(edgeStyleForLayer)
    .toArray()

  // and for nodes...
  function nodeStyleForLayer(layer) {
    return new WebGLShapeNodeStyle({
      shape: WebGLShapeNodeShape.ELLIPSE,
      fill: colorForLayer(layer),
      stroke: WebGLStroke.NONE,
      zoomVisibilityPolicy: layerVisibility[layer]
    })
  }

  const nodeStyles = IEnumerable.ofRange(0, maxDepth + 1)
    .map(nodeStyleForLayer)
    .toArray()

  // helper for creating the random graph
  function childCount() {
    return Math.floor(Math.random() * (maxChildren - minChildren + 1)) + minChildren
  }

  // a helper method to build a layer connected to a root node in our graph
  function build(layer, parent) {
    const size = 30 + 30 * (maxDepth - layer)

    const node = graph.createNode({ style: nodeStyles[layer], layout: [0, 0, size, size] })

    if (parent) {
      graph.createEdge(parent, node, edgeStyles[layer])
    }

    graph.addLabel({ owner: node, text: `Layer ${layer}: ${counter++}`, style: labelStyles[layer] })

    if (layer < maxDepth) {
      for (let i = childCount(); i >= 0; i--) {
        build(layer + 1, node)
      }
    }

    return node
  }

  return build(1)
}

// a helper method to get the current graphComponent's zoom as percentage
function getZoom(graphComponent) {
  return Math.round(graphComponent.zoom * 100) + '%'
}

run().then(finishLoading)
