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
import { type Browser, chromium, expect, selectors, test } from '@playwright/test'
import { createGraphElementLocatorEngine } from '../util/graph-selectors'
import type { Page } from 'playwright'
import { preview, type PreviewServer } from 'vite'
import {
  getBendLocations,
  getEdge,
  getGraphComponent,
  getGraphStats,
  getLayout,
  getNode,
  getViewport
} from '../util/graph-util'
import { mouseAction } from '../util/mouse-action'
import { enableTestIds } from '../util/enable-test-ids'

let server: PreviewServer
let browser: Browser
let page: Page

test.beforeAll(async () => {
  // make sure we can use custom graph element locators
  try {
    await selectors.register('graph_item', createGraphElementLocatorEngine)
  } catch (e) {
    // when running in parallel, ignore re-register errors
    if (!(e instanceof Error) || !e.message.includes('has been already registered')) {
      throw e
    }
  }

  server = await preview({ preview: { port: 3000 } })
  browser = await chromium.launch()
  page = await browser.newPage()

  const url = new URL(
    'testing/application-under-test/index.html',
    process.env.TEST_SERVER_URL || 'http://localhost:4242/demos-ts/'
  ).href

  await page.goto(url)
})

test.afterAll(async () => {
  await browser.close()
  await new Promise<void>((resolve, reject) => {
    server.httpServer.close((error) => (error ? reject(error) : resolve()))
  })
})

test.describe.configure({ timeout: 30_000 })

test.describe('Interactive GraphComponent Tests', () => {
  test.describe('Graph initialization and node creation', () => {
    test('should initialize with correct counts and create nodes', async () => {
      const graphComponent = page.locator('#graphComponent')
      const graphComponentHandle = await getGraphComponent(graphComponent)

      expect(graphComponentHandle).toBeTruthy()

      // Verify initial state
      const { nodeCount, edgeCount, bendCount } = await getGraphStats(graphComponentHandle)
      expect(nodeCount).toBe(2)
      expect(bendCount).toBe(0)
      expect(edgeCount).toBe(0)

      // Clear the graph
      const clearGraphButton = page.locator('#clear-graph')
      await clearGraphButton.click()

      // Create first node at 300,300
      await mouseAction().click({ x: 300, y: 300 }).perform(page, graphComponent)

      // Create second node at 500,500
      await mouseAction().click({ x: 500, y: 500 }).perform(page, graphComponent)

      // Verify nodes were created
      expect((await getGraphStats(graphComponentHandle)).nodeCount).toBe(2)
    })
  })

  test.describe('Edge creation and bend manipulation', () => {
    test('should create edge with bend and move it to new location', async () => {
      const graphComponent = page.locator('#graphComponent')
      const graphComponentHandle = await getGraphComponent(graphComponent)

      // Setup: Clear and create two nodes
      await page.locator('#clear-graph').click()
      await mouseAction().click({ x: 300, y: 300 }).perform(page, graphComponent)
      await mouseAction().click({ x: 500, y: 500 }).perform(page, graphComponent)

      // Get handles to the created nodes
      const node0 = await getNode(graphComponentHandle, 0)
      const node1 = await getNode(graphComponentHandle, 1)

      // Create edge by dragging from node1, adding a bend, then to node2
      await mouseAction()
        .drag(node0, { x: 500, y: 300 })
        .drag({ x: 500, y: 300 }, node1)
        .perform(page, graphComponent)

      // Verify edge and bend were created
      const edge = await getEdge(graphComponentHandle, 0)
      const bends = await getBendLocations(edge)
      expect(bends.length).toBe(1)

      const { edgeCount } = await getGraphStats(graphComponentHandle)
      expect(edgeCount).toBe(1)

      // Move the bend to a new location
      await mouseAction().drag(bends[0], { x: 450, y: 250 }).perform(page, graphComponent)

      // Verify bend moved to new location
      const newBends = await getBendLocations(edge)
      expect(newBends.length).toBe(1)
      expect(newBends[0]).toStrictEqual({ x: 450, y: 250 })
    })
  })

  test.describe('Node selection and UI interactions', () => {
    test('should handle selection, tooltips, and context menus', async () => {
      const graphComponent = page.locator('#graphComponent')
      const graphComponentHandle = await getGraphComponent(graphComponent)

      // Setup: Clear and create two nodes
      await page.locator('#clear-graph').click()
      await mouseAction().click({ x: 300, y: 300 }).perform(page, graphComponent)
      await mouseAction().click({ x: 500, y: 500 }).perform(page, graphComponent)

      // Test single node selection
      await graphComponent.locator('graph_item=node_0').click({ timeout: 1000 })
      expect(await graphComponentHandle.evaluate((gc) => gc.selection.nodes.size)).toBe(1)

      // Test multi-selection with Ctrl+click
      await graphComponent
        .locator('graph_item=node_1')
        .click({ timeout: 1000, modifiers: ['Control'] })
      expect(await graphComponentHandle.evaluate((gc) => gc.selection.nodes.size)).toBe(2)

      // Test tooltip display on hover
      await graphComponent.locator('graph_item=node_0').hover({ force: true })
      await expect(page.locator('.test-tooltip').textContent()).resolves.toBe('NODE')

      // Clear selection
      await graphComponent.click({ timeout: 1000 })

      // Test context menu on right-click
      await graphComponent.locator('graph_item=node_0').click({ timeout: 1000, button: 'right' })
      await expect(page.locator('.clear-graph-menu-item')).toContainText('Clear')

      // Click the component to close the menu and remove item from the selection
      await graphComponent.click({ timeout: 1000 })
      expect(await graphComponentHandle.evaluate((gc) => gc.selection.nodes.size)).toBe(0)
      await expect(page.locator('.clear-graph-menu-item')).toHaveCount(0)
    })
  })

  test.describe('Node movement and resizing', () => {
    test('should move and resize nodes correctly', async () => {
      const graphComponent = page.locator('#graphComponent')
      const graphComponentHandle = await getGraphComponent(graphComponent)

      // Setup: Clear and create two nodes
      await page.locator('#clear-graph').click()
      await mouseAction().click({ x: 300, y: 300 }).perform(page, graphComponent)
      await mouseAction().click({ x: 500, y: 500 }).perform(page, graphComponent)

      const node1 = await getNode(graphComponentHandle, 1)
      const oldNode1Layout = await getLayout(node1)

      // Move node to new location
      await mouseAction().drag(oldNode1Layout, { x: 150, y: 150 }).perform(page, graphComponent)

      // Verify node moved correctly
      const movedNodeLayout = await getLayout(node1)
      expect(movedNodeLayout).toStrictEqual({
        x: 150,
        y: 150,
        width: oldNode1Layout.width,
        height: oldNode1Layout.height
      })

      // Resize node by selecting and dragging the handles that appear around it
      await mouseAction()
        .click(movedNodeLayout)
        .drag(movedNodeLayout, { x: 100, y: 100 }, 0, { x: -5, y: -5 })
        .perform(page, graphComponent)

      // Verify node resized correctly
      const resizedNodeLayout = await getLayout(node1)
      expect(resizedNodeLayout).toStrictEqual({
        x: 100,
        y: 100,
        width: oldNode1Layout.width + 50,
        height: oldNode1Layout.height + 50
      })
    })
  })

  test.describe('Node deletion', () => {
    test('should delete selected node and verify final graph state', async () => {
      const graphComponent = page.locator('#graphComponent')
      const graphComponentHandle = await getGraphComponent(graphComponent)

      // Setup: Clear, create two nodes, and create an edge with a bend
      await page.locator('#clear-graph').click()
      await mouseAction().click({ x: 300, y: 300 }).perform(page, graphComponent)
      await mouseAction().click({ x: 500, y: 500 }).perform(page, graphComponent)

      const node0 = await getNode(graphComponentHandle, 0)
      const node1 = await getNode(graphComponentHandle, 1)

      // Create an edge
      await mouseAction()
        .drag(node0, { x: 500, y: 300 })
        .drag({ x: 500, y: 300 }, node1)
        .perform(page, graphComponent)

      // Verify state before deletion
      const beforeDeletionStats = await getGraphStats(graphComponentHandle)
      expect(beforeDeletionStats.nodeCount).toBe(2)
      expect(beforeDeletionStats.edgeCount).toBe(1)
      expect(beforeDeletionStats.bendCount).toBe(1)

      // Select and delete a node
      await graphComponent.locator('graph_item=node_0').click()
      await page.keyboard.press('Delete')

      // Removing the node also removes its adjacent edge and its bends
      const afterDeletionStats = await getGraphStats(graphComponentHandle)
      expect(afterDeletionStats.nodeCount).toBe(1)
      expect(afterDeletionStats.edgeCount).toBe(0)
      expect(afterDeletionStats.bendCount).toBe(0)
    })
  })

  test.describe('Viewport interaction', () => {
    test('should change viewport with mouse wheel', async () => {
      const graphComponent = page.locator('#graphComponent')
      const graphComponentHandle = await getGraphComponent(graphComponent)

      // Setup: Clear and create a node
      await page.locator('#clear-graph').click()
      await mouseAction().click({ x: 300, y: 300 }).perform(page, graphComponent)

      const node0 = await getNode(graphComponentHandle, 0)
      const nodeLayout = await getLayout(node0)

      // Verify initial zoom value
      expect(await graphComponentHandle.evaluate((gc) => gc.zoom)).toBe(1)
      // Disable viewport animations for easier testing
      await graphComponentHandle.evaluate((gc) => (gc.animatedViewportChanges = 'none'))

      // Increase zoom by a tick to the node location
      const { zoom } = await getViewport(graphComponentHandle)
      await mouseAction()
        .mouseWheel(0, -100, { x: nodeLayout.x, y: nodeLayout.y })
        .perform(page, graphComponent)

      // Verify the increased zoom value
      expect(await graphComponentHandle.evaluate((gc) => gc.zoom)).toBeGreaterThan(zoom)

      // Pan viewport horizontally with mousewheel while pressing shift modifier
      const initialViewport = await getViewport(graphComponentHandle)
      await mouseAction()
        .mouseWheel(0, 100, undefined, undefined, 'Shift')
        .perform(page, graphComponent)

      // Verify that the viewport moved horizontally
      expect(await graphComponentHandle.evaluate((gc) => gc.viewport.x)).toBeGreaterThan(
        initialViewport.x
      )
      expect(await graphComponentHandle.evaluate((gc) => gc.viewport.y)).toBe(initialViewport.y)
      expect(await graphComponentHandle.evaluate((gc) => gc.zoom)).toBe(initialViewport.zoom)
    })
  })

  test.describe('Using Test-Ids on Graph Items', () => {
    test('should assign test-ids to each graph element', async () => {
      const graphComponent = page.locator('#graphComponent')
      const graphComponentHandle = await getGraphComponent(graphComponent)

      // Setup: Clear, create two nodes, and create an edge with a bend
      await page.locator('#clear-graph').click()
      await mouseAction().click({ x: 300, y: 300 }).perform(page, graphComponent)
      await mouseAction().click({ x: 500, y: 500 }).perform(page, graphComponent)

      // Get handles to the created nodes
      const node0 = await getNode(graphComponentHandle, 0)
      const node1 = await getNode(graphComponentHandle, 1)

      // Create edge by dragging from node1, adding a bend, then to node2
      await mouseAction()
        .drag(node0, { x: 500, y: 300 })
        .drag({ x: 500, y: 300 }, node1)
        .perform(page, graphComponent)

      // Assigns each graph item a distinct test-id
      await enableTestIds(graphComponentHandle)

      // Verify that there is an HTML element with the assigned test id
      await expect(page.locator('[data-testid=node-index-0]')).toHaveCount(1)
      await expect(page.locator('[data-testid=node-index-1]')).toHaveCount(1)

      // Verify that there is an HTML element with the assigned test id
      await expect(page.locator('[data-testid=edge-index-0]')).toHaveCount(1)
    })
  })
})

test.describe('Test UI elements', () => {
  test('test toolbar buttons', async () => {
    const graphComponent = page.locator('#graphComponent')
    const graphComponentHandle = await getGraphComponent(graphComponent)

    // Setup: Start with a graph that has two nodes
    await graphComponentHandle.evaluate((gc) => gc.graph.clear())
    await mouseAction().click({ x: 300, y: 300 }).perform(page, graphComponent)
    await mouseAction().click({ x: 500, y: 500 }).perform(page, graphComponent)

    // Verify initial state
    const initialStats = await getGraphStats(graphComponentHandle)
    expect(initialStats.nodeCount).toBe(2)
    expect(initialStats.edgeCount).toBe(0)
    expect(initialStats.bendCount).toBe(0)

    // Disable viewport animations for easier testing
    await graphComponentHandle.evaluate((gc) => (gc.animatedViewportChanges = 'none'))

    // Verify that the "Zoom in" button works
    const zoomBeforeIn = (await getViewport(graphComponentHandle)).zoom
    await page.locator('#zoom-in-button').click()
    expect(await graphComponentHandle.evaluate((gc) => gc.zoom)).toBeGreaterThan(zoomBeforeIn)

    // Verify that the "Zoom out" button works
    const zoomBeforeOut = (await getViewport(graphComponentHandle)).zoom
    await page.locator('#zoom-out-button').click()
    expect(await graphComponentHandle.evaluate((gc) => gc.zoom)).toBeLessThan(zoomBeforeOut)

    // Verify that the "Create Edge" button works
    await page.locator('#create-edge').click()
    const intermediateStats = await getGraphStats(graphComponentHandle)
    expect(intermediateStats.nodeCount).toBe(2)
    expect(intermediateStats.edgeCount).toBe(1)
    expect(intermediateStats.bendCount).toBe(0)

    // Verify that "Clear Graph" button works
    await page.locator('#clear-graph').click()
    const clearedStats = await getGraphStats(graphComponentHandle)
    expect(clearedStats.nodeCount).toBe(0)
    expect(clearedStats.edgeCount).toBe(0)
    expect(clearedStats.bendCount).toBe(0)
  })
})
