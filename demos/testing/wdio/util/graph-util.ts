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
  GraphComponent,
  IBend,
  IEdge,
  ILabel,
  ILabelOwner,
  IModelItem,
  INode,
  IPort
} from '@yfiles/yfiles'
import type { PointLike } from './mouse-action'

export async function getViewport(): Promise<{
  x: number
  y: number
  width: number
  height: number
  zoom: number
}> {
  return await browser.execute(() => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    const { x, y, width, height } = gc.viewport
    const zoom = gc.zoom
    return { x, y, width, height, zoom }
  })
}

/**
 * Retrieves the counts of nodes, edges, and bends.
 *
 * @return A promise that resolves to an object containing the count of nodes, edges, and bends in the graph.
 */
export async function getGraphStats(): Promise<{
  nodeCount: number
  edgeCount: number
  bendCount: number
}> {
  return browser.execute(() => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    const { nodes, edges, bends } = gc.graph
    return { nodeCount: nodes.size, edgeCount: edges.size, bendCount: bends.size }
  })
}

export async function getNode(index: number = 0): Promise<{ _nodeIndex: number }> {
  return { _nodeIndex: index }
}

export async function getEdge(index: number = 0): Promise<{ _edgeIndex: number }> {
  return { _edgeIndex: index }
}

export async function getSourceNode(edge: { _edgeIndex: number }): Promise<{ _nodeIndex: number }> {
  const sourceNodeIndex = await browser.execute((edgeIndex: number) => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    const edge = gc.graph.edges.at(edgeIndex)
    if (!edge) {
      return -1
    }
    return gc.graph.nodes.toArray().indexOf(edge.sourceNode)
  }, edge._edgeIndex)

  return { _nodeIndex: sourceNodeIndex }
}

export async function getTargetNode(edge: { _edgeIndex: number }): Promise<{ _nodeIndex: number }> {
  const targetNodeIndex = await browser.execute((edgeIndex: number) => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    const edge = gc.graph.edges.at(edgeIndex)
    if (!edge) {
      return -1
    }
    return gc.graph.nodes.toArray().indexOf(edge.targetNode)
  }, edge._edgeIndex)

  return { _nodeIndex: targetNodeIndex }
}

export async function getLabel(
  item: { _nodeIndex?: number; _edgeIndex?: number },
  index: number = 0
) {
  return { ...item, _labelIndex: index }
}

export async function getLayout(node: {
  _nodeIndex: number
}): Promise<{ x: number; y: number; width: number; height: number }> {
  return await browser.execute((nodeIndex: number) => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    const n = gc.graph.nodes.at(nodeIndex)
    if (!n) {
      return {x: 0, y: 0, width: 0, height: 0}
    }
    const { x, y, width, height } = n.layout
    return { x, y, width, height }
  }, node._nodeIndex)
}

export async function getItemWorldLocation(item: {
  _nodeIndex?: number
  _edgeIndex?: number
  _labelIndex?: number
}): Promise<PointLike> {
  return await browser.execute(
    (item: { _nodeIndex?: number; _edgeIndex?: number; _labelIndex?: number }) => {
      const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
      let modelItem: IModelItem | null = null

      if (item._nodeIndex !== undefined) {
        modelItem = gc.graph.nodes.at(item._nodeIndex)
      } else if (item._edgeIndex !== undefined) {
        modelItem = gc.graph.edges.at(item._edgeIndex)
      }

      if (!modelItem) {
        return {x: 0, y: 0}
      }

      if (typeof (modelItem as INode).layout?.x === 'number') {
        return { x: (modelItem as INode).layout.centerX, y: (modelItem as INode).layout.centerY }
      }
      if (typeof (modelItem as ILabel).layout?.anchorX === 'number') {
        return {
          x: (modelItem as ILabel).layout.center.x,
          y: (modelItem as ILabel).layout.center.y
        }
      }
      if (typeof (modelItem as IBend | IPort).location?.x === 'number') {
        return {
          x: (modelItem as IBend | IPort).location.x,
          y: (modelItem as IBend | IPort).location.y
        }
      }
      if (typeof (modelItem as IEdge).bends !== 'undefined') {
        const firstBend = (modelItem as IEdge).bends.first()
        if (firstBend) {
          return { x: firstBend.location.x, y: firstBend.location.y }
        } else {
          const loc = (modelItem as IEdge).sourcePort.location
            .add((modelItem as IEdge).targetPort.location)
            .multiply(0.5)
          return { x: loc.x, y: loc.y }
        }
      }
      return { x: 0, y: 0 }
    },
    item
  )
}

export async function getPageCoordinates(location: PointLike): Promise<PointLike> {
  return await browser.execute((location: PointLike) => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    const vc = gc.worldToViewCoordinates(location)
    const p = gc.viewToPageCoordinates(vc)
    return { x: p.x, y: p.y }
  }, location)
}

export async function getLabelLayout(label: {
  _labelIndex: number
  _nodeIndex?: number
  _edgeIndex?: number
}) {
  return await browser.execute(
    (label: { _labelIndex: number; _nodeIndex?: number; _edgeIndex?: number }) => {
      const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
      let owner: ILabelOwner | null = null

      if (label._nodeIndex !== undefined) {
        owner = gc.graph.nodes.at(label._nodeIndex)
      } else if (label._edgeIndex !== undefined) {
        owner = gc.graph.edges.at(label._edgeIndex)
      }

      if (!owner) {
        return {anchorX: 0, anchorY: 0, width: 0, height: 0, upX: 0, upY: 0}
      }

      const l = owner.labels.at(label._labelIndex)
      if (!l) {
        return {anchorX: 0, anchorY: 0, width: 0, height: 0, upX: 0, upY: 0}
      }

      const { anchorX, anchorY, width, height, upX, upY } = l.layout
      return { anchorX, anchorY, width, height, upX, upY }
    },
    label
  )
}

export async function getBendLocations(edge: { _edgeIndex: number }): Promise<PointLike[]> {
  return await browser.execute((edgeIndex: number) => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    const e = gc.graph.edges.at(edgeIndex)
    if (!e) {
      return []
    }
    return e.bends.map((b) => ({ x: b.location.x, y: b.location.y })).toArray()
  }, edge._edgeIndex)
}
