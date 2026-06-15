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
import type { JSHandle, Locator } from 'playwright'
import {
  CanvasComponent,
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

export async function getGraphComponent(locator: Locator): Promise<JSHandle<GraphComponent>> {
  const element = await locator.elementHandle({ timeout: 5000 })
  return element!.evaluateHandle((e) => (e as any)['data-this'] as GraphComponent)
}

export async function getViewport(
  canvasComponentJSHandle: JSHandle<CanvasComponent>,
  index: number = 0
): Promise<{ x: number; y: number; width: number; height: number; zoom: number }> {
  return await canvasComponentJSHandle.evaluate((gc, index) => {
    const { x, y, width, height } = gc.viewport
    const zoom = gc.zoom
    return { x, y, width, height, zoom }
  }, index)
}

/**
 * Retrieves the counts of nodes, edges, and bends.
 *
 * @param graphComponentHandle - A handle to the graph component from which the statistics are extracted.
 * @return A promise that resolves to an object containing the count of nodes, edges, and bends in the graph.
 */
export async function getGraphStats(
  graphComponentHandle: JSHandle<GraphComponent>
): Promise<{ nodeCount: number; edgeCount: number; bendCount: number }> {
  return await graphComponentHandle.evaluate(({ graph: { nodes, edges, bends } }) => ({
    nodeCount: nodes.size,
    edgeCount: edges.size,
    bendCount: bends.size
  }))
}

export async function getNode(
  graphComponentHandle: JSHandle<GraphComponent>,
  index: number = 0
): Promise<JSHandle<INode>> {
  return (await graphComponentHandle.evaluateHandle(
    (gc, index) => gc.graph.nodes.at(index),
    index
  )) as JSHandle<INode>
}

export async function getEdge(
  graphComponentHandle: JSHandle<GraphComponent>,
  index: number = 0
): Promise<JSHandle<IEdge>> {
  return (await graphComponentHandle.evaluateHandle(
    (gc, index) => gc.graph.edges.at(index),
    index
  )) as JSHandle<IEdge>
}

export async function getSourceNode(edge: JSHandle<IEdge>): Promise<JSHandle<INode>> {
  return edge.getProperty('sourceNode')
}

export async function getTargetNode(edge: JSHandle<IEdge>): Promise<JSHandle<INode>> {
  return edge.getProperty('targetNode')
}

export async function getLabel(
  itemHandle: JSHandle<ILabelOwner>,
  index: number = 0
): Promise<JSHandle<ILabel>> {
  return (await itemHandle.evaluateHandle(
    (owner, index) => owner.labels.at(index),
    index
  )) as JSHandle<ILabel>
}

export async function getLayout(
  node: JSHandle<INode>
): Promise<{ x: number; y: number; width: number; height: number }> {
  return await node.evaluate((n) => {
    const { x, y, width, height } = n.layout
    return { x, y, width, height }
  })
}

export async function getItemWorldLocation(item: JSHandle<IModelItem>) {
  return await item.evaluate((i) => {
    if (typeof (i as INode).layout?.x === 'number') {
      return { x: (i as INode).layout.centerX, y: (i as INode).layout.centerY }
    }
    if (typeof (i as ILabel).layout?.anchorX === 'number') {
      return { x: (i as ILabel).layout.center.x, y: (i as ILabel).layout.center.y }
    }
    if (typeof (i as IBend | IPort).location?.x === 'number') {
      return { x: (i as IBend | IPort).location.x, y: (i as IBend | IPort).location.y }
    }
    if (typeof (i as IEdge).bends !== 'undefined') {
      const firstBend = (i as IEdge).bends.first()
      if (firstBend) {
        return { x: firstBend.location.x, y: firstBend.location.y }
      } else {
        const loc = (i as IEdge).sourcePort.location
          .add((i as IEdge).targetPort.location)
          .multiply(0.5)
        return { x: loc.x, y: loc.y }
      }
    }
    // should not happen
    throw new Error('Unable to handle item')
  })
}

export async function getPageCoordinates(
  location: PointLike,
  locator: Locator | JSHandle<CanvasComponent>
): Promise<PointLike> {
  if (typeof (locator as Locator).scrollIntoViewIfNeeded === 'function') {
    const handle = await (locator as Locator).elementHandle()
    return await (locator as Locator).page().evaluate(
      ([element, location]) => {
        if (element instanceof HTMLElement) {
          const canvas = (element as any)['data-this'] as GraphComponent
          const vc = canvas.worldToViewCoordinates(location)
          const p = canvas.viewToPageCoordinates(vc)
          return { x: p.x, y: p.y } satisfies PointLike
        } else {
          return { x: 0, y: 0 } satisfies PointLike
        }
      },
      [handle, location] as const
    )
  } else {
    return (locator as JSHandle<GraphComponent>).evaluate((canvas) => {
      const vc = canvas.worldToViewCoordinates(location)
      const p = canvas.viewToPageCoordinates(vc)
      return { x: p.x, y: p.y } satisfies PointLike
    })
  }
}

export async function getLabelLayout(
  labelHandle: JSHandle<ILabel>
): Promise<{
  anchorX: number
  anchorY: number
  upX: number
  upY: number
  width: number
  height: number
}> {
  return await labelHandle.evaluate((n) => {
    const { anchorX, anchorY, width, height, upX, upY } = n.layout
    return { anchorX, anchorY, width, height, upX, upY }
  })
}

export async function getBendLocations(edgeHandle: JSHandle<IEdge>): Promise<PointLike[]> {
  return await edgeHandle.evaluate((e) =>
    e.bends.map((b) => ({ x: b.location.x, y: b.location.y }) as PointLike).toArray()
  )
}
