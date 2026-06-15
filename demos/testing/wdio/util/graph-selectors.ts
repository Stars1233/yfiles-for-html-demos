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
import type { GraphComponent, SvgVisual, HtmlVisual } from '@yfiles/yfiles'

const GraphItemPrefix = {
  node: 'node',
  edge: 'edge',
  label: 'label',
  port: 'port',
} as const;

type GraphItemPrefix =
  typeof GraphItemPrefix[keyof typeof GraphItemPrefix];

type GraphElementByIndexSelector = `${GraphItemPrefix}_${number}`

/**
 * Locates a graph element (node, edge, label, or port) by its index and returns
 * the DOM element associated with it.
 *
 * In wdio, we don't have custom selector engines like Playwright, so this function
 * provides a way to locate graph elements using browser.execute() and then find the
 * corresponding DOM element.
 *
 * Usage:
 * ```
 * const nodeElement = await locateGraphElement('node_0')
 * await nodeElement.click()
 * ```
 *
 * This works for visible elements only. You can use 'node', 'edge', 'label', or 'port'
 * to locate graph elements by index. This uses the ".at()" method to access elements by index,
 * which means you can also use negative indices to access elements from the end of the collection.
 */
export async function locateGraphElement(selector: GraphElementByIndexSelector) {
  const elementId = await browser.execute((selector: GraphElementByIndexSelector) => {
    const graphComponent = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent
    if (graphComponent) {
      const match = /(\w+)_(-?\d+)/.exec(selector)
      if (match) {
        const [_, type, index] = match
        if (['node', 'edge', 'label', 'port'].includes(type)) {
          const collectionName = type + 's'
          const item = (graphComponent.graph as any)[collectionName]?.at(Number.parseInt(index))
          if (item) {
            const renderTreeElement =
              graphComponent.graphModelManager.getMainRenderTreeElement(item)!
            const visual = graphComponent.renderTree.getVisual(renderTreeElement)
            const element = (visual as SvgVisual).svgElement ?? (visual as HtmlVisual).element
            if (element) {
              // Add a unique temporary ID to locate the element
              const uniqueId = `wdio-graph-element-${Date.now()}-${Math.random()}`
              element.setAttribute('data-wdio-graph-element', uniqueId)
              return uniqueId
            }
          }
        }
      }
    }
    return null
  }, selector)

  if (!elementId) {
    throw new Error(`Could not locate graph element with selector: ${selector}`)
  }

  return $(`[data-wdio-graph-element="${elementId}"]`)
}
