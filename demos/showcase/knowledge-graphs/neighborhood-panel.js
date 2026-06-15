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
  CloneTypes,
  FreeNodeLabelModel,
  Graph,
  GraphCopier,
  IBend,
  IEdge,
  ILabel,
  INode,
  IPort,
  Rect
} from '@yfiles/yfiles'
import { getLabelStyle } from './styles/graph-styles'
import { toggleComponentPanel } from './explorer-component'
import { getLabelTag } from './types'

/**
 * Shows the neighborhood of the given node from the sourceComponent inside the targetComponent.
 *
 * @param sourceComponent - The GraphComponent to copy items from.
 * @param targetComponent - The GraphComponent to copy items into (displayed neighborhood).
 * @param node - The node whose neighborhood should be shown.
 */
export async function showNeighborhood(sourceComponent, targetComponent, node) {
  toggleComponentPanel(true)
  document.querySelector('#explorer-title-text').innerText = 'Neighborhood View'

  const srcGraph = sourceComponent.graph
  // Replace the graph that will be placed in the target component to copy the srcGraph to the target graph without GraphComponent
  // keeping its configuration.
  // This is important because the GraphCopier copies the WebGLZoomVisibilityPolicy in the label styles which
  // cannot be used in multiple GraphComponents.
  const tgtGraph = new Graph()
  const nodesToCopy = new Set([node, ...srcGraph.neighbors(node)])
  const edgesToCopy = srcGraph.edgesAt(node)

  // Merge nodes and edges into one collection
  const itemsToCopy = new Set([...nodesToCopy, ...edgesToCopy])

  // Copy with predicate
  const graphCopier = new GraphCopier({ cloneTypes: CloneTypes.ALL })
  graphCopier.copy({
    sourceGraph: srcGraph,
    targetGraph: tgtGraph,
    copyPredicate: (item) => shouldCopyItem(item, itemsToCopy),
    itemCopiedCallback: (original, copy) => {
      if (copy instanceof ILabel) {
        // Apply a label style suitable for the neighborhood view
        tgtGraph.setStyle(copy, getLabelStyle(original, true))
        // Set a free node label model that supports rotation during layout
        if (
          original.owner !== node &&
          copy.owner instanceof INode &&
          getLabelTag(copy).type === 'text'
        ) {
          tgtGraph.setLabelLayoutParameter(copy, FreeNodeLabelModel.CENTER)
        }
      } else if (copy instanceof INode) {
        // Position copied node at the center of the target component for a nicer layout animation
        tgtGraph.setNodeLayout(
          copy,
          Rect.from([
            targetComponent.center.x,
            targetComponent.center.y,
            original.layout.width,
            original.layout.height
          ])
        )
      }
    }
  })

  // Assign the copied graph to the target component
  targetComponent.graph = tgtGraph
}

/**
 * Predicate used by the GraphCopier to determine which source items should be copied.
 *
 * @param item - The item being considered for copying.
 * @param itemsToCopy - A set containing nodes and edges selected for copying.
 * @returns true if the item should be copied into the target graph.
 */
function shouldCopyItem(item, itemsToCopy) {
  if (item instanceof INode || item instanceof IEdge) {
    return itemsToCopy.has(item)
  } else if (item instanceof ILabel || item instanceof IPort || item instanceof IBend) {
    return itemsToCopy.has(item.owner)
  }
  return true
}
