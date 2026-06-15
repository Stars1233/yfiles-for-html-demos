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
import { Page } from './page.js'
import {
  getBendLocations,
  getEdge,
  getGraphStats,
  getLayout,
  getNode,
  getViewport
} from '../../util/graph-util.js'
import { enableTestIds } from '../../util/enable-test-ids.js'
import { locateGraphElement } from '../../util/graph-selectors.js'

/**
 * Page Object for the GraphComponent test page
 * Encapsulates all interactions with the graph component and UI elements
 */
class GraphComponentPage extends Page {
  get graphComponentElement() {
    return $('#graphComponent')
  }

  // Graph statistics methods
  async getGraphStats() {
    return await getGraphStats()
  }

  async getNodeCount() {
    return (await getGraphStats()).nodeCount
  }

  async getEdgeCount() {
    return (await getGraphStats()).edgeCount
  }

  async getBendCount() {
    return (await getGraphStats()).bendCount
  }

  async getZoom() {
    return (await getViewport()).zoom
  }

  async getViewport() {
    return await getViewport()
  }

  async getNode(index: number = 0) {
    return await getNode(index)
  }

  async getEdge(index: number = 0) {
    return await getEdge(index)
  }

  async getLayout(node: { _nodeIndex: number }) {
    return await getLayout(node)
  }

  async getBendLocations(edge: { _edgeIndex: number }) {
    return await getBendLocations(edge)
  }

  async locateGraphElement(selector: string) {
    return await locateGraphElement(selector as any)
  }

  async hoverNode(nodeSelector: string) {
    const element = await this.locateGraphElement(nodeSelector)
    await element.moveTo()
    await browser.pause(100)
  }

  async getSelectionSize() {
    return await browser.execute(() => {
      const gc = (document.getElementById('graphComponent') as any)['data-this']
      return gc.selection.nodes.size
    })
  }

  async clearGraphViaAPI() {
    await browser.execute(() => {
      const gc = (document.getElementById('graphComponent') as any)['data-this']
      gc.graph.clear()
    })
  }

  async disableViewportAnimations() {
    await browser.execute(() => {
      const gc = (document.getElementById('graphComponent') as any)['data-this']
      gc.animatedViewportChanges = 'none'
    })
  }

  async enableTestIds() {
    await enableTestIds()
  }

  async countElementsWithTestId(testId: string) {
    const elements = await $$(`[data-testid=${testId}]`)
    return elements.length
  }

  // Open the test page
  public open() {
    const url = new URL(
      'testing/application-under-test/index.html',
      process.env.TEST_SERVER_URL || 'http://localhost:4242/demos-ts/'
    ).href
    return super.open(url)
  }

  // Wait for page to be ready
  async waitForReady() {
    await this.graphComponentElement.waitForExist({ timeout: 5000 })
  }
}

export default new GraphComponentPage()
