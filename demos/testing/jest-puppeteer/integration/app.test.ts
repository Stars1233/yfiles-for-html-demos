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
  getBendLocations,
  getEdge,
  getGraphComponent,
  getGraphStats,
  getLayout,
  getNode,
  getViewport
} from '../util/graph-util'
import { mouseAction } from '../util/mouse-action'

beforeEach(async () => {
  const url = new URL(
    'testing/application-under-test/index.html',
    process.env.TEST_SERVER_URL || 'http://localhost:4242/demos-ts/'
  ).href
  console.log(`Navigating to ${url}`)
  await page.goto(url)
  await page.waitForSelector('.yfiles-canvascomponent')
})

describe('Interactive GraphComponent Tests', () => {
  describe('Graph initialization and node creation', () => {
    it('should initialize with correct counts and create nodes', async () => {
      const graphComponentHandle = await getGraphComponent(page)

      // Verify initial state
      const { nodeCount, edgeCount, bendCount } = await getGraphStats(graphComponentHandle)
      expect(nodeCount).toBe(2)
      expect(bendCount).toBe(0)
      expect(edgeCount).toBe(0)

      // Clear the graph
      await page.click('#clear-graph')

      // Create first node at 300,300
      await mouseAction().click({ x: 300, y: 300 }).perform(page)

      // Create second node at 500,500
      await mouseAction().click({ x: 500, y: 500 }).perform(page)

      // Verify nodes were created
      expect((await getGraphStats(graphComponentHandle)).nodeCount).toBe(2)
    })
  })

  describe('Edge creation and bend manipulation', () => {
    it('should create edge with bend and move it to new location', async () => {
      const graphComponentHandle = await getGraphComponent(page)

      // Setup: Clear and create two nodes
      await page.click('#clear-graph')
      await mouseAction().click({ x: 300, y: 300 }).perform(page)
      await mouseAction().click({ x: 500, y: 500 }).perform(page)

      // Get handles to the created nodes
      const node0 = await getNode(graphComponentHandle, 0)
      const node1 = await getNode(graphComponentHandle, 1)

      // Create edge by dragging from node0, adding a bend, then to node1
      await mouseAction()
        .drag(node0, { x: 500, y: 300 })
        .drag({ x: 500, y: 300 }, node1)
        .perform(page)

      // Verify edge and bend were created
      const { edgeCount } = await getGraphStats(graphComponentHandle)
      expect(edgeCount).toBe(1)
      const edge = await getEdge(graphComponentHandle, 0)
      const bends = await getBendLocations(edge)
      expect(bends.length).toBe(1)

      // Move the bend to a new location
      await mouseAction().drag(bends[0], { x: 450, y: 250 }).perform(page)

      // Verify bend moved to new location
      const newBends = await getBendLocations(edge)
      expect(newBends.length).toBe(1)
      expect(newBends[0].x).toBe(450)
      expect(newBends[0].y).toBe(250)
    })
  })

  describe('Node selection and UI interactions', () => {
    it('should handle selection, tooltips, and context menus', async () => {
      const graphComponentHandle = await getGraphComponent(page)

      // Setup: Clear and create two nodes
      await page.click('#clear-graph')
      await mouseAction().click({ x: 300, y: 300 }).perform(page)
      await mouseAction().click({ x: 500, y: 500 }).perform(page)

      const node0 = await getNode(graphComponentHandle, 0)
      const node1 = await getNode(graphComponentHandle, 1)

      // Test single node selection
      await mouseAction().click(node0).perform(page)
      expect(await graphComponentHandle.evaluate((gc) => gc.selection.nodes.size)).toBe(1)

      // Test multi-selection
      await page.keyboard.down('Control')
      await mouseAction().click(node1).perform(page)
      await page.keyboard.up('Control')
      expect(await graphComponentHandle.evaluate((gc) => gc.selection.nodes.size)).toBe(2)

      // Test tooltip display on hover
      await mouseAction().hover(node0).perform(page)
      const tooltipText = await (await page.waitForSelector('.test-tooltip'))!.evaluate(
        (e) => e.textContent
      )
      expect(tooltipText).toBe('NODE')

      // Clear selection
      await (await page.$('#graphComponent'))!.click()
      expect(await graphComponentHandle.evaluate((gc) => gc.selection.nodes.size)).toBe(0)

      // Test context menu on right-click
      await mouseAction().click(node0, 2).perform(page)
      const contextMenuText = await (await page.waitForSelector(
        '.clear-graph-menu-item'
      ))!.evaluate((e) => e.textContent)
      expect(contextMenuText).toContain('Clear')

      // Click the component to close the menu and remove item from the selection
      await (await page.$('#graphComponent'))!.click()
      await page.waitForSelector('.clear-graph-menu-item', { hidden: true })
      expect((await page.$$('.clear-graph-menu-item')).length).toBe(0)
    })
  })

  describe('Node movement and resizing', () => {
    it('should move and resize nodes correctly', async () => {
      const graphComponentHandle = await getGraphComponent(page)

      // Setup: Clear and create two nodes
      await page.click('#clear-graph')
      await mouseAction().click({ x: 300, y: 300 }).perform(page)
      await mouseAction().click({ x: 500, y: 500 }).perform(page)

      const node1 = await getNode(graphComponentHandle, 1)
      const oldNode1Layout = await getLayout(node1)

      // Move node to new location
      await mouseAction().drag(oldNode1Layout, { x: 150, y: 150 }).perform(page)

      // Verify node moved correctly
      const movedNodeLayout = await getLayout(node1)
      expect(movedNodeLayout.x).toBe(150)
      expect(movedNodeLayout.y).toBe(150)
      expect(movedNodeLayout.width).toBe(oldNode1Layout.width)
      expect(movedNodeLayout.height).toBe(oldNode1Layout.height)

      // Resize node by selecting and dragging the handles that appear around it
      await mouseAction()
        .click(movedNodeLayout)
        .drag(movedNodeLayout, { x: 100, y: 100 }, 0, { x: -5, y: -5 })
        .perform(page)

      // Verify node resized correctly
      const resizedNodeLayout = await getLayout(node1)
      expect(resizedNodeLayout.x).toBe(100)
      expect(resizedNodeLayout.y).toBe(100)
      expect(resizedNodeLayout.width).toBe(oldNode1Layout.width + 50)
      expect(resizedNodeLayout.height).toBe(oldNode1Layout.height + 50)
    })
  })

  describe('Node deletion', () => {
    it('should delete selected node and verify final graph state', async () => {
      const graphComponentHandle = await getGraphComponent(page)

      // Setup: Clear, create two nodes, and create an edge with a bend
      await page.click('#clear-graph')
      await mouseAction().click({ x: 300, y: 300 }).perform(page)
      await mouseAction().click({ x: 500, y: 500 }).perform(page)

      const node0 = await getNode(graphComponentHandle, 0)
      const node1 = await getNode(graphComponentHandle, 1)

      // Create an edge
      await mouseAction()
        .drag(node0, { x: 500, y: 300 })
        .drag({ x: 500, y: 300 }, node1)
        .perform(page)

      // Verify state before deletion
      const beforeDeletionStats = await getGraphStats(graphComponentHandle)
      expect(beforeDeletionStats.nodeCount).toBe(2)
      expect(beforeDeletionStats.edgeCount).toBe(1)
      expect(beforeDeletionStats.bendCount).toBe(1)

      // Select and delete the first node
      await mouseAction().click(node0).perform(page)
      await page.keyboard.press('Delete')

      // Removing the node also removes its adjacent edge and its bends
      const afterDeletionStats = await getGraphStats(graphComponentHandle)
      expect(afterDeletionStats.nodeCount).toBe(1)
      expect(afterDeletionStats.edgeCount).toBe(0)
      expect(afterDeletionStats.bendCount).toBe(0)
    })
  })

  describe('Viewport interaction', () => {
    it('should change viewport with mouse wheel', async () => {
      const graphComponentHandle = await getGraphComponent(page)

      // Setup: Clear and create a node
      await page.click('#clear-graph')
      await mouseAction().click({ x: 300, y: 300 }).perform(page)

      const node0 = await getNode(graphComponentHandle, 0)
      const nodeLayout = await getLayout(node0)

      // Verify initial zoom value
      expect(await graphComponentHandle.evaluate((gc) => gc.zoom)).toBe(1)
      // Disable viewport animations for easier testing
      await graphComponentHandle.evaluate((gc) => (gc.animatedViewportChanges = 'none'))

      // Increase zoom by scrolling up
      const { zoom } = await getViewport(graphComponentHandle)
      await mouseAction().mouseWheel(0, -100, nodeLayout).perform(page)

      // Verify the increased zoom value
      expect(await graphComponentHandle.evaluate((gc) => gc.zoom)).toBeGreaterThan(zoom)

      // Pan viewport horizontally with mousewheel while pressing shift modifier
      const initialViewport = await getViewport(graphComponentHandle)
      await mouseAction().mouseWheel(0, 100, undefined, undefined, 'Shift').perform(page)

      // Verify that the viewport moved horizontally
      expect(await graphComponentHandle.evaluate((gc) => gc.viewport.x)).toBeGreaterThan(
        initialViewport.x
      )
      expect(await graphComponentHandle.evaluate((gc) => gc.viewport.y)).toBe(initialViewport.y)
      expect(await graphComponentHandle.evaluate((gc) => gc.zoom)).toBe(initialViewport.zoom)
    })
  })
})

describe('Test UI elements', () => {
  it('test toolbar buttons', async () => {
    const graphComponentHandle = await getGraphComponent(page)

    // Setup: Start with a graph that has two nodes
    await graphComponentHandle.evaluate((gc) => gc.graph.clear())
    await mouseAction().click({ x: 300, y: 300 }).perform(page)
    await mouseAction().click({ x: 500, y: 500 }).perform(page)

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
