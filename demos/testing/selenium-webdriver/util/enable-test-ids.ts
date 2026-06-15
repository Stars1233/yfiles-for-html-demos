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
import { type WebDriver } from 'selenium-webdriver'
import {
  type GraphComponent,
  type HtmlVisual,
  type IModelItem,
  type SvgVisual
} from '@yfiles/yfiles'

/**
 * Registers an 'updated-visual' listener on the GraphComponent that stamps
 * a `data-testid` attribute onto every rendered graph item's DOM element,
 * then immediately triggers a visual update so the IDs are applied right away.
 *
 * Note: Items that are currently not rendered (outside the viewport) will not be
 * part of the DOM and thus will not receive test IDs.
 */
export async function enableTestIds(
  driver: WebDriver,
  attributeName = 'data-testid',
  nodeIndexPrefix: string | undefined = 'node-index-',
  edgeIndexPrefix: string | undefined = 'edge-index-',
  labelIndexPrefix: string | undefined = 'label-index-',
  portIndexPrefix: string | undefined = 'port-index-'
): Promise<void> {
  await driver.executeScript(
    (
      attributeName: string,
      nodeIndexPrefix: string | undefined,
      edgeIndexPrefix: string | undefined,
      labelIndexPrefix: string | undefined,
      portIndexPrefix: string | undefined
    ) => {
      const gc = (document.getElementById('graphComponent') as any)['data-this'] as GraphComponent

      // Register a persistent listener so IDs are re-applied after every render update.
      // The stamping logic is inlined into the forEach body — no nested helper functions
      // are defined here, avoiding the esbuild __name wrapping issue.
      gc.addEventListener('updated-visual', (_, sender) => {
        for (const [items, prefix] of [
          [sender.graph.nodes, nodeIndexPrefix],
          [sender.graph.edges, edgeIndexPrefix],
          [sender.graph.labels, labelIndexPrefix],
          [sender.graph.ports, portIndexPrefix]
        ] as const) {
          if (!prefix) {
            continue
          }
          items.forEach((item: IModelItem, i: number) => {
            const el = gc.graphModelManager.getMainRenderTreeElement(item)
            if (el) {
              const visual = gc.renderTree.getVisual(el)
              if (visual) {
                const dom = (visual as SvgVisual).svgElement ?? (visual as HtmlVisual).element
                dom?.setAttribute(attributeName, prefix + String(i))
              }
            }
          })
        }
      })

      // Trigger the first stamp immediately.
      gc.updateVisual()
    },
    attributeName,
    nodeIndexPrefix,
    edgeIndexPrefix,
    labelIndexPrefix,
    portIndexPrefix
  )
}
