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
import type { JSHandle, Page } from 'puppeteer'
import { GraphComponent, IBend, IEdge, ILabel, type IModelItem, INode, IPort } from '@yfiles/yfiles'
import { PointLike } from './mouse-action'

export async function getGraphComponent(page: Page): Promise<JSHandle<GraphComponent>> {
  const element = await page.$('#graphComponent')
  if (!element) {
    throw Error('No graph component found.')
  }
  return await element.evaluateHandle((e) => (e as any)['data-this'] as GraphComponent)
}

/**
 * Gets the viewport information from the GraphComponent
 */
export async function getViewport(
  graphComponentHandle: JSHandle<GraphComponent>
): Promise<{ x: number; y: number; width: number; height: number; zoom: number }> {
  return await graphComponentHandle.evaluate((gc) => {
    const { x, y, width, height } = gc.viewport
    const zoom = gc.zoom
    return { x, y, width, height, zoom }
  })
}

/**
 * Retrieves the counts of nodes, edges, and bends from the graph
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

/**
 * Gets a node by index
 */
export async function getNode(
  graphComponentHandle: JSHandle<GraphComponent>,
  index: number = 0
): Promise<JSHandle<INode>> {
  return (await graphComponentHandle.evaluateHandle(
    (gc, index) => gc.graph.nodes.at(index),
    index
  )) as JSHandle<INode>
}

/**
 * Gets an edge by index
 */
export async function getEdge(
  graphComponentHandle: JSHandle<GraphComponent>,
  index: number = 0
): Promise<JSHandle<IEdge>> {
  return (await graphComponentHandle.evaluateHandle(
    (gc, index) => gc.graph.edges.at(index),
    index
  )) as JSHandle<IEdge>
}

/**
 * Gets the layout of a node
 */
export async function getLayout(
  nodeHandle: any
): Promise<{ x: number; y: number; width: number; height: number }> {
  return await nodeHandle.evaluate((node: any) => {
    const layout = node.layout
    return { x: layout.x, y: layout.y, width: layout.width, height: layout.height }
  })
}

/**
 * Gets the world coordinates of an item (node center, bend location, etc.)
 */
export async function getItemWorldLocation(item: JSHandle<IModelItem>): Promise<PointLike> {
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

/**
 * Converts world coordinates to page coordinates
 */
export async function getPageCoordinates(page: Page, location: PointLike): Promise<PointLike> {
  return await page.evaluate((loc) => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    const vc = gc.worldToViewCoordinates(loc)
    const p = gc.viewToPageCoordinates(vc)
    return { x: p.x, y: p.y }
  }, location)
}

/**
 * Gets all bend locations for an edge
 */
export async function getBendLocations(edgeHandle: any): Promise<PointLike[]> {
  return await edgeHandle.evaluate((edge: any) => {
    const result: PointLike[] = []
    const iterator = edge.bends
    for (let i = 0; i < iterator.size; i++) {
      const bend = iterator.at(i)
      result.push({ x: bend.location.x, y: bend.location.y })
    }
    return result
  })
}

/**
 * Gets the bounding box of the GraphComponent element
 */
export async function getGraphComponentBoundingBox(page: Page): Promise<any> {
  const element = await page.$('#graphComponent')
  if (!element) {
    throw new Error('GraphComponent element not found')
  }
  return await element.boundingBox()
}

/**
 * Converts viewport coordinates (relative to the GraphComponent) to world coordinates
 */
export async function viewToWorldCoordinates(
  page: Page,
  viewCoordinates: PointLike
): Promise<PointLike> {
  return await page.evaluate((coords) => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    return gc.viewToWorldCoordinates(coords)
  }, viewCoordinates)
}
