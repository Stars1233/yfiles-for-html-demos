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
import licenseData from '../../../lib/license.json'
import {
  GraphComponent,
  GraphEditorInputMode,
  HierarchicalLayout,
  HierarchicalLayoutData,
  type IEdge,
  type IEdgeStyle,
  type IGraph,
  type ILabel,
  type ILabelStyle,
  type INode,
  type INodeStyle,
  LabelPlacementPolicy,
  LayoutOrientation,
  License,
  Point,
  PopoverDescriptor,
  type PopoverManager,
  Rect
} from '@yfiles/yfiles'
import './ClipboardPopoverContent'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'
import graphData from './graph-data.json'
import { buildGraph, type GraphData } from './build-graph'
import { applyStyle } from './apply-style'

export type PasteOptions = {
  pasteStyle: boolean
  pasteNodeSize: boolean
  pasteLabelPositioning: boolean
}
const pasteOptions: PasteOptions = {
  pasteStyle: true,
  pasteNodeSize: true,
  pasteLabelPositioning: true
}

/**
 * Bootstraps the demo.
 */
async function run(): Promise<void> {
  License.value = licenseData

  // initialize graph component
  const graphComponent = new GraphComponent('#graphComponent')
  const graph = graphComponent.graph

  // enable graph editing
  graphComponent.inputMode = new GraphEditorInputMode()

  // load sample graph
  buildGraph(graphComponent.graph, graphData as GraphData)

  // apply a hierarchical layout
  runLayout(graph)

  // make sure the graph is centered in the view
  await graphComponent.fitGraphBounds()

  // enable undo after the initial graph was populated since we don't want to allow undoing that
  graphComponent.graph.undoEngineEnabled = true

  // wire up the paste button and the three paste options
  initializeToolbar(graphComponent)

  // register listeners for enabling the paste button, showing the popover and the keyboard shortcut
  registerListeners(graphComponent)
}

function runLayout(graph: IGraph): void {
  const hierarchicalLayoutData = new HierarchicalLayoutData()

  // place raw materials in a separate layer and refined materials in a separate layer
  const rawMaterials = graph.nodes.filter((node) => node.tag === 'raw-material')
  rawMaterials
    .drop(1)
    .forEach((node) =>
      hierarchicalLayoutData.layerConstraints.placeInSameLayer(rawMaterials.first()!, node)
    )
  const refinedMaterials = graph.nodes.filter((node) => node.tag === 'refined-material')
  refinedMaterials.forEach((node) =>
    hierarchicalLayoutData.layerConstraints.placeInSameLayer(refinedMaterials.last()!, node)
  )

  graph.applyLayout({
    layout: new HierarchicalLayout({
      layoutOrientation: LayoutOrientation.LEFT_TO_RIGHT,
      minimumLayerDistance: 50,
      nodeDistance: 50
    }),
    layoutData: hierarchicalLayoutData,
    // use the specified label model parameters for positioning instead of the layout result
    labelPlacementPolicies: LabelPlacementPolicy.PREFER_PARAMETER
  })
}

function initializeToolbar(graphComponent: GraphComponent): void {
  document
    .querySelector<HTMLButtonElement>('#paste-style-button')!
    .addEventListener('click', async () => {
      applyStyle(graphComponent, pasteOptions)
    })
  document
    .querySelector<HTMLSelectElement>('#demo-toggle-paste-style')!
    .addEventListener('click', async () => {
      pasteOptions.pasteStyle = !pasteOptions.pasteStyle
    })
  document
    .querySelector<HTMLSelectElement>('#demo-toggle-paste-node-size')!
    .addEventListener('click', async () => {
      pasteOptions.pasteNodeSize = !pasteOptions.pasteNodeSize
    })
  document
    .querySelector<HTMLSelectElement>('#demo-toggle-paste-label-layout-parameter')!
    .addEventListener('click', async () => {
      pasteOptions.pasteLabelPositioning = !pasteOptions.pasteLabelPositioning
    })
}

function registerListeners(graphComponent: GraphComponent): void {
  // enable paste style button on cut and copy
  const pasteStyleButton = document.querySelector<HTMLButtonElement>('#paste-style-button')!
  graphComponent.clipboard.addEventListener('items-copied', () => {
    pasteStyleButton.disabled = false
  })
  graphComponent.clipboard.addEventListener('items-cut', () => {
    pasteStyleButton.disabled = false
  })

  // show popover for clipboard operations
  const inputMode = graphComponent.inputMode as GraphEditorInputMode
  const popoverManager = inputMode.popoverManager
  inputMode.addEventListener('multi-selection-finished', async () => {
    popoverManager.closeAll()
    if (graphComponent.selection.size > 0) {
      await showPopover(popoverManager, graphComponent)
    }
  })
  inputMode.addEventListener('deleted-item', async () => {
    popoverManager.closeAll()
  })

  // paste style on Ctrl + Alt + V
  graphComponent.addEventListener('key-down', (event) => {
    if (event.ctrlKey && event.altKey && event.key === 'v') {
      const selection = graphComponent.selection
      if (selection.size === 0) {
        return
      }
      const clipboard = graphComponent.clipboard
      if (clipboard.isEmpty) {
        return
      }
      applyStyle(graphComponent, pasteOptions)
    }
  })
}

/**
 * Shows a popover with a toolbar for clipboard operations at the bottom right of the selection
 */
async function showPopover(
  popoverManager: PopoverManager,
  graphComponent: GraphComponent
): Promise<void> {
  const popoverToolbar = document.createElement('clipboard-popover-component')
  popoverToolbar.graphComponent = graphComponent
  popoverToolbar.pasteOptions = pasteOptions
  const popoverDescriptor = new PopoverDescriptor({
    content: popoverToolbar,
    // small offset such that the popover does not lie behind the cursor and show a tooltip instantly
    offset: new Point(10, 10),
    anchor: getBounds(graphComponent).bottomRight
  })
  registerPopoverUpdateLocation(graphComponent, popoverDescriptor)

  await popoverManager.open(popoverDescriptor)
}

/**
 * Registers a listener to lazily update the popover location when the selected bounds change.
 */
function registerPopoverUpdateLocation(
  graphComponent: GraphComponent,
  popoverDescriptor: PopoverDescriptor
): void {
  // whether the popover location needs to be updated
  let dirtyLocation = false

  // marks the popover location in need of update
  function invalidateLocation(): void {
    if (popoverDescriptor.isOpen) {
      dirtyLocation = true
    }
  }

  // actually updates the popover location
  function updatePopoverLocation(): void {
    if (dirtyLocation) {
      popoverDescriptor.anchor = getBounds(graphComponent).bottomRight
      dirtyLocation = false
    }
  }

  // listen for changes and update location with the next frame if needed
  graphComponent.graph.addEventListener('node-layout-changed', invalidateLocation)
  graphComponent.addEventListener('updated-visual', updatePopoverLocation)
  popoverDescriptor.addEventListener('closed', () => {
    graphComponent.graph.removeEventListener('node-layout-changed', invalidateLocation)
    graphComponent.removeEventListener('updated-visual', updatePopoverLocation)
  })
}

/**
 * Calculates the bounding rectangle of the selected items.
 */
function getBounds(graphComponent: GraphComponent): Rect {
  const selection = graphComponent.selection
  return Rect.sum(
    selection.nodes
      .concat(selection.edges)
      .concat(selection.labels)
      .map((item) =>
        item.style.renderer
          .getBoundsProvider(
            item as INode & IEdge & ILabel,
            item.style as INodeStyle & IEdgeStyle & ILabelStyle
          )
          .getBounds(graphComponent.canvasContext)
      )
  )
}

void run().then(finishLoading)
