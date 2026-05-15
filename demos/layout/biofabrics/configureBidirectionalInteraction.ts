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
import type { Biofabric } from './Biofabric/Biofabric'
import type { CircularNodeLink } from './CircularNodeLink/CircularNodeLink'
import { IEdge, ILabel, IModelItem, INode } from '@yfiles/yfiles'
import { type EdgeGroup, isNodeGroup, type NodeGroup } from './Biofabric/BiofabricTypes'

/**
 * Compares two objects for shallow equality (only checks first-level properties).
 * Used to match corresponding nodes/edges between the biofabric and circular layout by their tag data.
 * @param obj1 First object to compare
 * @param obj2 Second object to compare
 * @returns True if all first-level properties are equal, false otherwise
 */
function shallowEquals<T extends object>(obj1: T, obj2: T): boolean {
  const keys1 = Object.keys(obj1) as (keyof T)[]
  const keys2 = Object.keys(obj2) as (keyof T)[]

  if (keys1.length !== keys2.length) return false

  return keys1.every((key) => obj1[key] === obj2[key])
}

/**
 * Configures bidirectional highlighting interaction between the biofabric and circular node-link diagrams.
 * When an item is highlighted in one visualization, the corresponding item is automatically highlighted in the other.
 * @param biofabric The biofabric visualization instance
 * @param nodeLink The circular node-link visualization instance
 */
export function configureBidirectionalInteraction(
  biofabric: Biofabric,
  nodeLink: CircularNodeLink
): void {
  // Set up callback for when items are highlighted in the biofabric
  // This will find and highlight corresponding items in the circular layout
  biofabric.highlightItemCallback = (
    item: IModelItem | NodeGroup | EdgeGroup | undefined | null,
    adjacent: boolean
  ) => {
    if (!item) {
      return
    }
    if (item instanceof IModelItem) {
      if (item instanceof INode) {
        const correspondingNode = nodeLink.graphComponent.graph.nodes.find((node) =>
          shallowEquals(node.tag, item.tag)
        )
        if (correspondingNode) {
          nodeLink.addHighlight(correspondingNode, adjacent, true)
        }
      } else if (item instanceof IEdge) {
        const correspondingEdge = nodeLink.graphComponent.graph.edges.find((edge) =>
          shallowEquals(edge.tag, item.tag)
        )
        if (correspondingEdge) {
          nodeLink.addHighlight(correspondingEdge, adjacent, true)
        }
      } else if (item instanceof ILabel) {
        const correspondingLabel = nodeLink.graphComponent.graph.labels.find(
          (label) => label.text === item.text
        )
        if (correspondingLabel) {
          nodeLink.addHighlight(correspondingLabel, adjacent, true)
        }
      }
    } else {
      if (isNodeGroup(item)) {
        nodeLink.nodeGroups[item.id]!.highlighted = true
      }
    }
  }

  biofabric.clearItemCallback = () => {
    nodeLink.clearHighlights(true)
  }

  nodeLink.highlightItemCallback = (item, adjacent: boolean) => {
    if (!item) {
      return
    }
    if (item instanceof IModelItem) {
      if (item instanceof INode) {
        const correspondingNode = biofabric.graphComponent.graph.nodes.find(
          (node: INode): boolean => shallowEquals(node.tag, item.tag)
        )
        if (correspondingNode) {
          biofabric.addHighlight(correspondingNode, adjacent, true)
        }
      } else if (item instanceof IEdge) {
        const correspondingEdge = biofabric.graphComponent.graph.edges.find(
          (edge: IEdge): boolean => shallowEquals(edge.tag, item.tag)
        )
        if (correspondingEdge) {
          biofabric.addHighlight(correspondingEdge, adjacent, true)
          correspondingEdge.labels.forEach((label) => biofabric.addHighlight(label, false, true))
        }
      } else if (item instanceof ILabel) {
        const correspondingLabel = biofabric.graphComponent.graph.labels.find(
          (label: ILabel): boolean => label.text === item.text
        )
        if (correspondingLabel) {
          biofabric.addHighlight(correspondingLabel, adjacent, true)
        }
      }
    } else {
      if (isNodeGroup(item)) {
        biofabric.nodeGroups[item.id]!.highlighted = true
      }
    }
  }
  nodeLink.clearItemCallback = () => {
    biofabric.clearHighlights(true)
  }
}
