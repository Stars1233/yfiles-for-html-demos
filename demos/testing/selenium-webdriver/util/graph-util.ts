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
/**
 * Graph utility helpers for selenium-webdriver tests.
 *
 * These functions bridge between the Selenium test runner (Node.js) and the
 * live yFiles GraphComponent running inside the browser, using
 * driver.executeScript() to evaluate expressions in the browser context.
 *
 * The GraphComponent instance is obtained via the `data-this` property of the
 * #graphComponent container element, which yFiles populates automatically.
 */

import {By, until, type WebDriver} from 'selenium-webdriver'
import {type GraphComponent} from '@yfiles/yfiles'

export interface PointLike {
  x: number
  y: number
}

export interface NodeLayout extends PointLike {
  width: number
  height: number
}

export interface GraphStats {
  nodeCount: number
  edgeCount: number
  bendCount: number
}

export interface Viewport extends NodeLayout {
  zoom: number
}

/**
 * Waits for the application to finish loading by waiting for `body.loaded`.
 */
export async function waitForAppLoad(driver: WebDriver, timeout = 10000): Promise<void> {
  await driver.wait(until.elementLocated(By.css('body.loaded')), timeout)
}

/**
 * Returns the current graph statistics: node, edge, and bend counts.
 */
export async function getGraphStats(driver: WebDriver): Promise<GraphStats> {
  return driver.executeScript<GraphStats>(() => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    const graph = gc.graph
    return { nodeCount: graph.nodes.size, edgeCount: graph.edges.size, bendCount: graph.bends.size }
  })
}

/**
 * Returns the current viewport state: position, size, and zoom level.
 */
export async function getViewport(driver: WebDriver): Promise<Viewport> {
  return driver.executeScript<Viewport>(() => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    const { x, y, width, height } = gc.viewport
    return { x, y, width, height, zoom: gc.zoom }
  })
}

/**
 * Returns the layout (bounding box) of a node by its zero-based index.
 */
export async function getNodeLayout(driver: WebDriver, index = 0): Promise<NodeLayout> {
  return driver.executeScript<NodeLayout>((index: number) => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    const node = gc.graph.nodes.at(index)
    if (!node) {
      throw new Error(`Unable to find node with index ${index}`)
    }
    const { x, y, width, height } = node.layout
    return { x, y, width, height }
  }, index)
}

/**
 * Returns the world-space center coordinates of a node by its zero-based index.
 * Used to aim mouse actions at a specific node without reading its full layout.
 */
export async function getNodeCenter(driver: WebDriver, index = 0): Promise<PointLike> {
  return driver.executeScript<PointLike>((index: number) => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    const node = gc.graph.nodes.at(index)
    if (!node) {
      throw new Error(`Unable to find node with index ${index}`)
    }
    return { x: node.layout.centerX, y: node.layout.centerY }
  }, index)
}

/**
 * Returns the world-space locations of all bends on an edge by edge index.
 */
export async function getBendLocations(driver: WebDriver, edgeIndex = 0): Promise<PointLike[]> {
  return driver.executeScript<PointLike[]>((edgeIndex: number) => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    const edge = gc.graph.edges.at(edgeIndex)
    if (!edge) {
      throw new Error(`Unable to find edge with index ${edgeIndex}`)
    }
    return edge.bends.map((b) => ({ x: b.location.x, y: b.location.y })).toArray()
  }, edgeIndex)
}

/**
 * Converts a world-space coordinate to a viewport-relative pixel coordinate
 * suitable for Selenium's Actions API.
 */
export async function worldToPageCoordinates(
  driver: WebDriver,
  worldPoint: PointLike
): Promise<PointLike> {
  return driver.executeScript<PointLike>((worldPoint: PointLike) => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    const vc = gc.worldToViewCoordinates(worldPoint)
    const p = gc.viewToPageCoordinates(vc)
    return { x: p.x, y: p.y }
  }, worldPoint)
}

/**
 * Returns the number of currently selected nodes.
 */
export async function getNodeSelectionSize(driver: WebDriver): Promise<number> {
  return driver.executeScript<number>(() => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    return gc.selection.nodes.size
  })
}

/**
 * Returns the current zoom level of the GraphComponent.
 */
export async function getZoom(driver: WebDriver): Promise<number> {
  return driver.executeScript<number>(() => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    return gc.zoom
  })
}

/**
 * Disables animated viewport changes so that zoom/pan operations take effect
 * synchronously, making test assertions reliable.
 */
export async function disableViewportAnimations(driver: WebDriver): Promise<void> {
  await driver.executeScript(() => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    gc.animatedViewportChanges = 'none'
  })
}

/**
 * Clears the graph programmatically (bypassing the UI button).
 */
export async function clearGraphScript(driver: WebDriver): Promise<void> {
  await driver.executeScript(() => {
    const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    gc.graph.clear()
  })
}
