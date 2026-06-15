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
import { GraphComponent, HtmlVisual, IEnumerable, IModelItem, SvgVisual } from '@yfiles/yfiles'

type EnableTestIdsArgs = {
  attributeName: string
  nodeIndexPrefix: string | undefined
  edgeIndexPrefix: string | undefined
  labelIndexPrefix: string | undefined
  portIndexPrefix: string | undefined
}

/**
 * Enables the assignment of test IDs to graphical elements such as nodes, edges, labels, and ports
 * within a GraphComponent's visualization. This method attaches unique attributes to DOM elements
 * for testability.
 * Note that items that are currently not rendered will not be part of the DOM and thus will not have test IDs.
 *
 * @param graphComponent - The graph component to enable test IDs for. This can either be a Locator or a JSHandle to the GraphComponent instance.
 * @param attributeName - The name of the attribute to which the test IDs will be assigned, defaults to 'data-testid'.
 * @param nodeIndexPrefix - The prefix to assign to test IDs for graph nodes, defaults to 'node-index-'.
 * @param edgeIndexPrefix - The prefix to assign to test IDs for graph edges, defaults to 'edge-index-'.
 * @param labelIndexPrefix - The prefix to assign to test IDs for graph labels, defaults to 'label-index-'.
 * @param portIndexPrefix - The prefix to assign to test IDs for graph ports, defaults to 'port-index-'.
 * @return A promise that resolves when the operation to enable test IDs is complete.
 */
export async function enableTestIds(
  graphComponent: Locator | JSHandle<GraphComponent>,
  attributeName = 'data-testid',
  nodeIndexPrefix: string | undefined = 'node-index-',
  edgeIndexPrefix: string | undefined = 'edge-index-',
  labelIndexPrefix: string | undefined = 'label-index-',
  portIndexPrefix: string | undefined = 'port-index-'
): Promise<void> {
  const args: EnableTestIdsArgs = {
    attributeName,
    nodeIndexPrefix,
    edgeIndexPrefix,
    labelIndexPrefix,
    portIndexPrefix
  }

  const handle: JSHandle<GraphComponent> =
    typeof (graphComponent as Locator).scrollIntoViewIfNeeded === 'function'
      ? await (graphComponent as Locator).evaluateHandle(
          (element) => (element as any)['data-this'] as GraphComponent
        )
      : (graphComponent as JSHandle<GraphComponent>)

  return handle.evaluate((graphComponent, args) => {
    const { attributeName, nodeIndexPrefix, edgeIndexPrefix, labelIndexPrefix, portIndexPrefix } =
      args

    const attachId = (modelItem: IModelItem, prefix: string, index: number) => {
      const renderTreeElement = graphComponent.graphModelManager.getMainRenderTreeElement(modelItem)
      if (renderTreeElement) {
        const visual = graphComponent.renderTree.getVisual(renderTreeElement)
        if (visual) {
          const element =
            (visual as SvgVisual).svgElement ?? (visual as HtmlVisual).element ?? undefined
          element?.setAttribute(attributeName, prefix + String(index))
        }
      }
    }

    graphComponent.addEventListener('updated-visual', (_, sender) => {
      const attachIds = (items: IEnumerable<IModelItem>, prefix?: string) => {
        if (prefix) {
          items.forEach((item, i) => attachId(item, prefix, i))
        }
      }

      attachIds(sender.graph.nodes, nodeIndexPrefix)
      attachIds(sender.graph.edges, edgeIndexPrefix)
      attachIds(sender.graph.labels, labelIndexPrefix)
      attachIds(sender.graph.ports, portIndexPrefix)
    })

    graphComponent.updateVisual()
  }, args)
}
