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
import { Builder, By, Key, Origin, until, type WebDriver } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'
import { after, afterEach, before, beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import {
  clearGraphScript,
  disableViewportAnimations,
  getBendLocations,
  getGraphStats,
  getNodeCenter,
  getNodeLayout,
  getNodeSelectionSize,
  getViewport,
  getZoom,
  waitForAppLoad,
  worldToPageCoordinates
} from '../util/graph-util.js'
import { mouseAction } from '../util/mouse-action.js'
import { enableTestIds } from '../util/enable-test-ids.js'

declare const process: { env: { TEST_SERVER_URL?: string; HEADLESS?: string } }

const APP_URL = new URL(
  'testing/application-under-test/index.html',
  process.env.TEST_SERVER_URL ?? 'http://localhost:4242/demos-ts/'
).href

const headless = true

// Use a fixed window size so that world-to-viewport coordinate conversion produces stable pixel values.
const WINDOW_WIDTH = 1280
const WINDOW_HEIGHT = 800

describe('Test yFiles in Chrome', function () {
  this.timeout(30000)
  const options = new chrome.Options()
  if (headless) {
    options.addArguments('--headless=new')
  }
  options.addArguments(`--window-size=${WINDOW_WIDTH},${WINDOW_HEIGHT}`)
  testBrowser(new Builder().forBrowser('chrome').setChromeOptions(options as any))
})

/**
 * Registers all test suites against the given browser builder.
 * A single driver/page is shared across the interactive tests so that successive
 * tests can operate on a consistent page without the overhead of full browser
 * restarts.
 */
function testBrowser(builder: Builder): void {
  describe('Interactive GraphComponent Tests', function () {
    let driver: WebDriver

    before(async function () {
      this.timeout(30000)
      driver = await builder.build()
      console.log(`navigating to ${APP_URL}`)
      await driver.get(APP_URL)
      await waitForAppLoad(driver)
    })

    after(async function () {
      await driver.quit()
    })

    describe('Graph initialization and node creation', function () {
      it('should initialize with correct counts and create nodes', async function () {
        const initialStats = await getGraphStats(driver)
        expect(initialStats.nodeCount).to.equal(2)
        expect(initialStats.edgeCount).to.equal(0)
        expect(initialStats.bendCount).to.equal(0)

        await driver.findElement(By.id('clear-graph')).click()
        await mouseAction().click({ x: 300, y: 300 }).perform(driver)
        await mouseAction().click({ x: 500, y: 500 }).perform(driver)

        const stats = await getGraphStats(driver)
        expect(stats.nodeCount).to.equal(2)
      })
    })

    describe('Edge creation and bend manipulation', function () {
      it('should create edge with bend and move it to new location', async function () {
        await driver.findElement(By.id('clear-graph')).click()
        await mouseAction().click({ x: 300, y: 300 }).perform(driver)
        await mouseAction().click({ x: 500, y: 500 }).perform(driver)

        const node0Center = await getNodeCenter(driver, 0)
        const node1Center = await getNodeCenter(driver, 1)

        expect(node0Center.x).to.equal(300)
        expect(node0Center.y).to.equal(300)
        expect(node1Center.x).to.equal(500)
        expect(node1Center.y).to.equal(500)

        // Drag from node0 to a waypoint and then to node1 — the intermediate
        // stop creates a bend at the waypoint.
        await mouseAction()
          .drag(node0Center, { x: 500, y: 300 })
          .drag({ x: 500, y: 300 }, node1Center)
          .perform(driver)

        const stats = await getGraphStats(driver)
        expect(stats.edgeCount).to.equal(1)

        const bends = await getBendLocations(driver, 0)
        expect(bends.length).to.equal(1)

        await mouseAction().drag(bends[0], { x: 450, y: 250 }).perform(driver)

        const newBends = await getBendLocations(driver, 0)
        expect(newBends.length).to.equal(1)
        expect(newBends[0].x).to.equal(450)
        expect(newBends[0].y).to.equal(250)
      })
    })

    describe('Node selection and UI interactions', function () {
      it('should handle selection, tooltips, and context menus', async function () {
        await driver.findElement(By.id('clear-graph')).click()
        await mouseAction().click({ x: 300, y: 300 }).perform(driver)
        await mouseAction().click({ x: 500, y: 500 }).perform(driver)

        const node0Center = await getNodeCenter(driver, 0)
        const node1Center = await getNodeCenter(driver, 1)

        await mouseAction().click(node0Center).perform(driver)
        expect(await getNodeSelectionSize(driver)).to.equal(1)

        await mouseAction().click(node1Center, 0, undefined, 'Control').perform(driver)
        expect(await getNodeSelectionSize(driver)).to.equal(2)

        // Hover over node0 and wait for the tooltip to appear
        const node0Page = await worldToPageCoordinates(driver, node0Center)
        await driver
          .actions({ async: true })
          .move({ x: Math.round(node0Page.x), y: Math.round(node0Page.y), origin: Origin.VIEWPORT })
          .perform()

        const tooltip = await driver.wait(until.elementLocated(By.css('.test-tooltip')), 3000)
        const tooltipText = await tooltip.getText()
        expect(tooltipText).to.equal('NODE')

        await mouseAction().click({ x: 10, y: 10 }).perform(driver)

        await mouseAction().contextMenu(node0Center).perform(driver)
        const menuItem = await driver.wait(
          until.elementLocated(By.css('.clear-graph-menu-item')),
          3000
        )
        // Wait until text is populated — the element may appear in the DOM before
        // its content is rendered during the open animation
        await driver.wait(until.elementTextContains(menuItem, 'Clear'), 3000)
        const menuText = await menuItem.getText()
        expect(menuText).to.include('Clear')

        await mouseAction().click({ x: 10, y: 10 }).perform(driver)

        expect(await getNodeSelectionSize(driver)).to.equal(0)

        // Wait for the close animation to finish before asserting the menu is gone
        await driver.wait(
          async () => (await driver.findElements(By.css('.clear-graph-menu-item'))).length === 0,
          3000
        )
      })
    })

    describe('Node movement and resizing', function () {
      it('should move and resize nodes correctly', async function () {
        await driver.findElement(By.id('clear-graph')).click()
        await mouseAction().click({ x: 300, y: 300 }).perform(driver)
        await mouseAction().click({ x: 500, y: 500 }).perform(driver)

        const oldNode1Layout = await getNodeLayout(driver, 1)

        await mouseAction().drag(oldNode1Layout, { x: 150, y: 150 }).perform(driver)

        const movedLayout = await getNodeLayout(driver, 1)
        expect(movedLayout.x).to.equal(150)
        expect(movedLayout.y).to.equal(150)
        expect(movedLayout.width).to.equal(oldNode1Layout.width)
        expect(movedLayout.height).to.equal(oldNode1Layout.height)

        // Select the node to show resize handles, then drag from the top-left
        // handle (offset -5,-5 from center) to resize it
        await mouseAction()
          .click(movedLayout)
          .drag(movedLayout, { x: 100, y: 100 }, 0, { x: -5, y: -5 })
          .perform(driver)

        const resizedLayout = await getNodeLayout(driver, 1)
        expect(resizedLayout.x).to.equal(100)
        expect(resizedLayout.y).to.equal(100)
        expect(resizedLayout.width).to.equal(oldNode1Layout.width + 50)
        expect(resizedLayout.height).to.equal(oldNode1Layout.height + 50)
      })
    })

    describe('Node deletion', function () {
      it('should delete selected node and verify final graph state', async function () {
        await driver.findElement(By.id('clear-graph')).click()
        await mouseAction().click({ x: 300, y: 300 }).perform(driver)
        await mouseAction().click({ x: 500, y: 500 }).perform(driver)

        const node0Center = await getNodeCenter(driver, 0)
        const node1Center = await getNodeCenter(driver, 1)

        await mouseAction()
          .drag(node0Center, { x: 500, y: 300 })
          .drag({ x: 500, y: 300 }, node1Center)
          .perform(driver)

        const statsBefore = await getGraphStats(driver)
        expect(statsBefore.nodeCount).to.equal(2)
        expect(statsBefore.edgeCount).to.equal(1)
        expect(statsBefore.bendCount).to.equal(1)

        await mouseAction().click(node0Center).perform(driver)
        await driver.actions({ async: true }).sendKeys(Key.DELETE).perform()

        // Deleting a node cascades to remove its adjacent edge and that edge's bends
        const statsAfter = await getGraphStats(driver)
        expect(statsAfter.nodeCount).to.equal(1)
        expect(statsAfter.edgeCount).to.equal(0)
        expect(statsAfter.bendCount).to.equal(0)
      })
    })

    describe('Viewport interaction', function () {
      it('should change viewport with mouse wheel', async function () {
        await driver.findElement(By.id('clear-graph')).click()
        await mouseAction().click({ x: 300, y: 300 }).perform(driver)

        const nodeLayout = await getNodeLayout(driver, 0)
        const nodeCenter = {
          x: nodeLayout.x + nodeLayout.width / 2,
          y: nodeLayout.y + nodeLayout.height / 2
        }

        expect(await getZoom(driver)).to.equal(1)

        await disableViewportAnimations(driver)

        const { zoom: zoomBefore } = await getViewport(driver)
        await mouseAction().mouseWheel(0, -100, nodeCenter).perform(driver)
        expect(await getZoom(driver)).to.be.greaterThan(zoomBefore)

        const viewportBefore = await getViewport(driver)
        await mouseAction().mouseWheel(0, 100, nodeCenter, undefined, 'Shift').perform(driver)

        // Shift+scroll pans horizontally without changing zoom
        const viewportAfter = await getViewport(driver)
        expect(viewportAfter.x).to.be.greaterThan(viewportBefore.x)
        expect(viewportAfter.y).to.equal(viewportBefore.y)
        expect(viewportAfter.zoom).to.equal(viewportBefore.zoom)
      })
    })

    describe('Using Test-Ids on Graph Items', function () {
      it('should assign test-ids to each graph element', async function () {
        await driver.findElement(By.id('clear-graph')).click()
        await mouseAction().click({ x: 300, y: 300 }).perform(driver)
        await mouseAction().click({ x: 400, y: 400 }).perform(driver)

        const node0Center = await getNodeCenter(driver, 0)
        const node1Center = await getNodeCenter(driver, 1)

        await mouseAction()
          .drag(node0Center, { x: 500, y: 300 })
          .drag({ x: 500, y: 300 }, node1Center)
          .perform(driver)

        await enableTestIds(driver)

        // updateVisual() is asynchronous — wait for the attributes to appear in the DOM
        await driver.wait(until.elementLocated(By.css('[data-testid="node-index-0"]')), 3000)
        await driver.wait(until.elementLocated(By.css('[data-testid="node-index-1"]')), 3000)
        await driver.wait(until.elementLocated(By.css('[data-testid="edge-index-0"]')), 3000)
      })
    })
  })

  /**
   * Tests for the toolbar buttons. A fresh driver is created per test to keep
   * these isolated from the interactive suite above.
   */
  describe('Test UI elements', function () {
    let driver: WebDriver

    beforeEach(async function () {
      driver = await builder.build()
      console.log(`navigating to ${APP_URL}`)
      await driver.get(APP_URL)
      await waitForAppLoad(driver)
    })

    afterEach(async function () {
      await driver.quit()
    })

    it('test toolbar buttons', async function () {
      await clearGraphScript(driver)
      await mouseAction().click({ x: 300, y: 300 }).perform(driver)
      await mouseAction().click({ x: 500, y: 500 }).perform(driver)

      const initialStats = await getGraphStats(driver)
      expect(initialStats.nodeCount).to.equal(2)
      expect(initialStats.edgeCount).to.equal(0)
      expect(initialStats.bendCount).to.equal(0)

      await disableViewportAnimations(driver)

      const zoomBeforeIn = await getZoom(driver)
      await driver.findElement(By.id('zoom-in-button')).click()
      expect(await getZoom(driver)).to.be.greaterThan(zoomBeforeIn)

      const zoomBeforeOut = await getZoom(driver)
      await driver.findElement(By.id('zoom-out-button')).click()
      expect(await getZoom(driver)).to.be.lessThan(zoomBeforeOut)

      await driver.findElement(By.id('create-edge')).click()
      const intermediateStats = await getGraphStats(driver)
      expect(intermediateStats.nodeCount).to.equal(2)
      expect(intermediateStats.edgeCount).to.equal(1)
      expect(intermediateStats.bendCount).to.equal(0)

      await driver.findElement(By.id('clear-graph')).click()
      const clearedStats = await getGraphStats(driver)
      expect(clearedStats.nodeCount).to.equal(0)
      expect(clearedStats.edgeCount).to.equal(0)
      expect(clearedStats.bendCount).to.equal(0)
    })
  })
}
