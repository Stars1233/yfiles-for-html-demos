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
import GraphComponentPage from '../pageobjects/graphcomponent.page.js'
import { mouseAction } from '../../util/mouse-action'

describe('Interactive GraphComponent Tests', () => {
  beforeEach(async () => {
    await GraphComponentPage.open()
    await GraphComponentPage.waitForReady()
  })

  describe('Graph initialization and node creation', () => {
    it('should initialize with correct counts and create nodes', async () => {
      // Verify initial state
      const { nodeCount, edgeCount, bendCount } = await GraphComponentPage.getGraphStats()
      expect(nodeCount).toBe(2)
      expect(bendCount).toBe(0)
      expect(edgeCount).toBe(0)

      // Clear the graph
      await $('#clear-graph').click()

      // Create first node at 300,300
      await mouseAction().click({ x: 300, y: 300 }).perform()

      // Create second node at 500,500
      await mouseAction().click({ x: 500, y: 500 }).perform()

      // Verify nodes were created
      expect(await GraphComponentPage.getNodeCount()).toBe(2)
    })
  })

  describe('Edge creation and bend manipulation', () => {
    it('should create edge with bend and move it to new location', async () => {
      // Setup: Clear and create two nodes
      await $('#clear-graph').click()
      await mouseAction().click({ x: 300, y: 300 }).perform()
      await mouseAction().click({ x: 500, y: 500 }).perform()

      // Get handles to the created nodes
      const node0 = await GraphComponentPage.getNode(0)
      const node1 = await GraphComponentPage.getNode(1)

      // Create edge by dragging from node1, adding a bend, then to node2
      await mouseAction().drag(node0, { x: 500, y: 300 }).drag({ x: 500, y: 300 }, node1).perform()

      // Verify edge and bend were created
      const edge = await GraphComponentPage.getEdge(0)
      const bends = await GraphComponentPage.getBendLocations(edge)
      expect(bends.length).toBe(1)

      expect(await GraphComponentPage.getEdgeCount()).toBe(1)

      // Move the bend to a new location
      await mouseAction().drag(bends[0], { x: 450, y: 250 }).perform()

      // Verify bend moved to new location
      const newBends = await GraphComponentPage.getBendLocations(edge)
      expect(newBends.length).toBe(1)
      expect(newBends[0]).toStrictEqual({ x: 450, y: 250 })
    })
  })

  describe('Node selection and UI interactions', () => {
    it('should handle selection, tooltips, and context menus', async () => {
      // Setup: Clear and create two nodes
      await $('#clear-graph').click()
      await mouseAction().click({ x: 300, y: 300 }).perform()
      await mouseAction().click({ x: 500, y: 500 }).perform()

      // Test single node selection
      const node0 = await GraphComponentPage.locateGraphElement('node_0')
      await node0.click()
      expect(await GraphComponentPage.getSelectionSize()).toBe(1)

      // Test multi-selection with Ctrl+click
      const node1Layout = await GraphComponentPage.getLayout(await GraphComponentPage.getNode(1))
      await mouseAction().click(node1Layout, 0, { x: 0, y: 0 }, 'Control').perform()
      expect(await GraphComponentPage.getSelectionSize()).toBe(2)

      // Test tooltip display on hover
      await GraphComponentPage.hoverNode('node_0')
      const tooltipElement = $('.test-tooltip')
      await tooltipElement.waitForDisplayed()
      const tooltipText = await tooltipElement.getText()
      expect(tooltipText).toBe('NODE')

      // Clear selection
      await GraphComponentPage.graphComponentElement.click()
      expect(await GraphComponentPage.getSelectionSize()).toBe(0)

      // Test context menu on right-click
      await node0.click({ button: 'right' })
      const clearGraphContextMenuButton = $('.clear-graph-menu-item')
      await clearGraphContextMenuButton.waitForDisplayed()

      const menuText = await clearGraphContextMenuButton.getText()
      expect(menuText).toContain('Clear')

      // Click the component to close the menu and remove item from the selection
      await GraphComponentPage.graphComponentElement.click()
      expect(await GraphComponentPage.getSelectionSize()).toBe(0)
      await expect(clearGraphContextMenuButton).not.toBeDisplayed()
    })
  })

  describe('Node movement and resizing', () => {
    it('should move and resize nodes correctly', async () => {
      // Setup: Clear and create two nodes
      await $('#clear-graph').click()
      await mouseAction().click({ x: 300, y: 300 }).perform()
      await mouseAction().click({ x: 500, y: 500 }).perform()

      const node1 = await GraphComponentPage.getNode(1)
      const oldNode1Layout = await GraphComponentPage.getLayout(node1)

      // Move node to new location
      await mouseAction().drag(oldNode1Layout, { x: 150, y: 150 }).perform()

      // Verify node moved correctly
      const movedLayout = await GraphComponentPage.getLayout(node1)
      expect(movedLayout).toStrictEqual({
        x: 150,
        y: 150,
        width: oldNode1Layout.width,
        height: oldNode1Layout.height
      })

      // Resize node by selecting and dragging the handles that appear around it
      await mouseAction()
        .click(movedLayout)
        .drag(movedLayout, { x: 100, y: 100 }, 0, { x: -5, y: -5 })
        .perform()

      // Verify node resized correctly
      const resizedLayout = await GraphComponentPage.getLayout(node1)
      expect(resizedLayout).toStrictEqual({
        x: 100,
        y: 100,
        width: oldNode1Layout.width + 50,
        height: oldNode1Layout.height + 50
      })
    })
  })

  describe('Node deletion', () => {
    it('should delete selected node and verify final graph state', async () => {
      // Setup: Clear, create two nodes, and create an edge with a bend
      await $('#clear-graph').click()
      await mouseAction().click({ x: 300, y: 300 }).perform()
      await mouseAction().click({ x: 500, y: 500 }).perform()

      const node0 = await GraphComponentPage.getNode(0)
      const node1 = await GraphComponentPage.getNode(1)

      // Create an edge with a bend
      await mouseAction().drag(node0, { x: 500, y: 300 }).drag({ x: 500, y: 300 }, node1).perform()

      // Verify state before deletion
      const statsBefore = await GraphComponentPage.getGraphStats()
      expect(statsBefore.nodeCount).toBe(2)
      expect(statsBefore.edgeCount).toBe(1)
      expect(statsBefore.bendCount).toBe(1)

      // Select and delete a node
      const node0Element = await GraphComponentPage.locateGraphElement('node_0')
      await node0Element.click()
      await browser.keys(['Delete'])

      // Removing the node also removes its adjacent edge and its bends
      const statsAfter = await GraphComponentPage.getGraphStats()
      expect(statsAfter.nodeCount).toBe(1)
      expect(statsAfter.edgeCount).toBe(0)
      expect(statsAfter.bendCount).toBe(0)
    })
  })

  describe('Viewport interaction', () => {
    it('should change viewport with mouse wheel', async () => {
      // Setup: Clear and create a node
      await $('#clear-graph').click()
      await mouseAction().click({ x: 300, y: 300 }).perform()

      const node0 = await GraphComponentPage.getNode(0)
      const nodeLayout = await GraphComponentPage.getLayout(node0)

      // Verify initial zoom value
      expect(await GraphComponentPage.getZoom()).toBe(1)

      // Disable viewport animations for easier testing
      await GraphComponentPage.disableViewportAnimations()

      // Increase zoom by a tick to the node location
      const initialZoom = await GraphComponentPage.getZoom()
      await mouseAction().mouseWheel(0, -100, nodeLayout).perform()

      // Verify the increased zoom value
      expect(await GraphComponentPage.getZoom()).toBeGreaterThan(initialZoom)

      // Pan viewport horizontally with mousewheel while pressing shift modifier
      const initialViewport = await GraphComponentPage.getViewport()
      await mouseAction().mouseWheel(0, 100, nodeLayout, undefined, 'Shift').perform()

      // Verify that the viewport moved horizontally
      const finalViewport = await GraphComponentPage.getViewport()
      expect(finalViewport.x).toBeGreaterThan(initialViewport.x)
      expect(finalViewport.y).toBe(initialViewport.y)
      expect(finalViewport.zoom).toBe(initialViewport.zoom)
    })
  })

  describe('Using Test-Ids on Graph Items', () => {
    it('should assign test-ids to each graph element', async () => {
      // Setup: Clear, create two nodes, and create an edge with a bend
      await $('#clear-graph').click()
      await mouseAction().click({ x: 300, y: 300 }).perform()
      await mouseAction().click({ x: 500, y: 500 }).perform()

      // Get handles to the created nodes
      const node0 = await GraphComponentPage.getNode(0)
      const node1 = await GraphComponentPage.getNode(1)

      // Create edge by dragging from node1, adding a bend, then to node2
      await mouseAction().drag(node0, { x: 500, y: 300 }).drag({ x: 500, y: 300 }, node1).perform()

      // Assigns each graph item a distinct test-id
      await GraphComponentPage.enableTestIds()

      // Verify that there is an HTML element with the assigned test id
      expect(await GraphComponentPage.countElementsWithTestId('node-index-0')).toBe(1)
      expect(await GraphComponentPage.countElementsWithTestId('node-index-1')).toBe(1)

      // Verify that there is an HTML element with the assigned test id
      expect(await GraphComponentPage.countElementsWithTestId('edge-index-0')).toBe(1)
    })
  })
})

describe('Test UI elements', () => {
  beforeEach(async () => {
    await GraphComponentPage.open()
    await GraphComponentPage.waitForReady()
  })

  it('test toolbar buttons', async () => {
    // Setup: Start with a graph that has two nodes
    await GraphComponentPage.clearGraphViaAPI()
    await mouseAction().click({ x: 300, y: 300 }).perform()
    await mouseAction().click({ x: 500, y: 500 }).perform()

    // Verify initial state
    const initialStats = await GraphComponentPage.getGraphStats()
    expect(initialStats.nodeCount).toBe(2)
    expect(initialStats.edgeCount).toBe(0)
    expect(initialStats.bendCount).toBe(0)

    // Disable viewport animations for easier testing
    await GraphComponentPage.disableViewportAnimations()

    // Verify that the "Zoom in" button works
    const zoomBeforeIn = await GraphComponentPage.getZoom()
    await $('#zoom-in-button').click()
    expect(await GraphComponentPage.getZoom()).toBeGreaterThan(zoomBeforeIn)

    // Verify that the "Zoom out" button works
    const zoomBeforeOut = await GraphComponentPage.getZoom()
    await $('#zoom-out-button').click()
    expect(await GraphComponentPage.getZoom()).toBeLessThan(zoomBeforeOut)

    // Verify that the "Create Edge" button works
    await $('#create-edge').click()
    const intermediateStats = await GraphComponentPage.getGraphStats()
    expect(intermediateStats.nodeCount).toBe(2)
    expect(intermediateStats.edgeCount).toBe(1)
    expect(intermediateStats.bendCount).toBe(0)

    // Verify that "Clear Graph" button works
    await $('#clear-graph').click()
    const clearedStats = await GraphComponentPage.getGraphStats()
    expect(clearedStats.nodeCount).toBe(0)
    expect(clearedStats.edgeCount).toBe(0)
    expect(clearedStats.bendCount).toBe(0)
  })
})
