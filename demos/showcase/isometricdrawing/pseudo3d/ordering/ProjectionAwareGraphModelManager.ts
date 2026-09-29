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
  GraphModelManager,
  IEdge,
  ILabel,
  type IModelItem,
  INode,
  type IRenderTreeElement,
  type IRenderTreeGroup
} from '@yfiles/yfiles'
import { type ProjectionAwareRenderOrder } from './ProjectionAwareRenderOrder'
import type { Pseudo3DContext } from '../core/Pseudo3DContext'

/**
 * GraphModelManager subclass that keeps nodes in a single flat sorted group
 * (when `hierarchicalNestingPolicy` is `NONE`) so the render-order service can
 * order them by terrain depth. Edges stay in the regular edge layer; the edge
 * style clips occluded pieces itself rather than relying on hard layer
 * separation against every node. Edge labels are moved into the flat node
 * group so the render-order service can place them relative to nodes.
 */
export class ProjectionAwareGraphModelManager extends GraphModelManager {
  private projectionRevisionValue = 0
  private activeRenderOrder: ProjectionAwareRenderOrder | null = null

  get projectionRevision(): number {
    return this.projectionRevisionValue
  }

  applyProjection(context: Pseudo3DContext, renderOrder: ProjectionAwareRenderOrder): void {
    const { graphComponent, projectionState } = context
    graphComponent.projection = projectionState.createMatrix()
    this.activeRenderOrder = renderOrder
    renderOrder.update()
    this.projectionRevisionValue++

    const graph = graphComponent.graph

    for (const node of graph.nodes) {
      this.nodeManager.update(node)
    }
    for (const edge of graph.edges) {
      this.edgeManager.update(edge)
    }
    for (const edgeLabel of graph.edgeLabels) {
      this.edgeLabelManager.update(edgeLabel)
    }
    for (const nodeLabel of graph.nodeLabels) {
      this.nodeLabelManager.update(nodeLabel)
    }

    this.resortNodeGroup(renderOrder.order([...graph.nodes, ...graph.edgeLabels]))
    graphComponent.invalidate()
  }

  resortNodeGroup(items: Iterable<INode | ILabel>): void {
    const elements: IRenderTreeElement[] = []

    for (const item of items) {
      const element = this.getMainRenderTreeElement(item)
      if (element) {
        elements.push(element)
      }
    }

    if (elements.length === 0) return

    elements[0].toBack()
    for (let i = 1; i < elements.length; i++) {
      elements[i].above(elements[i - 1])
    }
  }

  override compareRenderOrder(item1: IModelItem, item2: IModelItem): number {
    if (
      this.activeRenderOrder &&
      (item1 instanceof INode || item1 instanceof ILabel) &&
      (item2 instanceof INode || item2 instanceof ILabel)
    ) {
      return this.activeRenderOrder.compare(item1, item2)
    }
    return super.compareRenderOrder(item1, item2)
  }

  protected getLabelRenderTreeGroup(label: ILabel): IRenderTreeGroup {
    if (label.owner instanceof IEdge) {
      return this.nodeGroup
    }
    return super.getLabelRenderTreeGroup(label)
  }
}
