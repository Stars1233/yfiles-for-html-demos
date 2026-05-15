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
  type ApplicationRef,
  type ComponentRef,
  createComponent,
  type EnvironmentInjector
} from '@angular/core'
import { NodeComponent } from './node.component'
import {
  type INode,
  type IRenderContext,
  NodeStyleBase,
  SvgVisual,
  type Visual
} from '@yfiles/yfiles'
import { type Person } from '../person'

export class NodeComponentStyle extends NodeStyleBase {
  private activeCompRefs = new Set<ComponentRef<NodeComponent>>()

  constructor(
    private appRef: ApplicationRef,
    private envInj: EnvironmentInjector
  ) {
    super()
  }

  /**
   * Runs change detection on all active node components so that
   * mutated tag data is reflected in the visuals.
   */
  detectChanges() {
    for (const compRef of this.activeCompRefs) {
      compRef.changeDetectorRef.detectChanges()
    }
  }

  createVisual(renderContext: IRenderContext, node: INode) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('transform', 'translate(' + node.layout.x + ' ' + node.layout.y + ')')

    // Create a new NodeComponent as a child of the new SVG g element.
    const compRef = createComponent(NodeComponent, {
      hostElement: g,
      environmentInjector: this.envInj
    })

    // Use setInput to assign properties - this triggers change detection
    // correctly with zoneless change detection.
    compRef.setInput('item', node.tag as Person)
    compRef.setInput('zoom', renderContext.zoom)

    // Attach the component to the Angular component tree so that change detection will work
    this.appRef.attachView(compRef.hostView)
    this.activeCompRefs.add(compRef)
    ;(g as any)['data-compRef'] = compRef

    const svgVisual = new SvgVisual(g)
    renderContext.setDisposeCallback(
      svgVisual,
      (_context: IRenderContext, _visual: Visual, _dispose: boolean) => {
        // need to clean up after the visual is actually removed
        this.appRef.detachView(compRef.hostView)
        this.activeCompRefs.delete(compRef)
        compRef.destroy()
        return null
      }
    )
    return svgVisual
  }

  updateVisual(renderContext: IRenderContext, oldVisual: SvgVisual, node: INode) {
    if (oldVisual && oldVisual.svgElement) {
      const g = oldVisual.svgElement
      g.setAttribute('transform', 'translate(' + node.layout.x + ' ' + node.layout.y + ')')
      // Use setInput to update properties - this triggers change detection
      // correctly with zoneless change detection.
      const compRef = (g as any)['data-compRef']
      compRef.setInput('item', node.tag as Person)
      compRef.setInput('zoom', renderContext.zoom)
      // Since the Person object reference might be the same, but its properties changed,
      // we need to trigger change detection for this component manually in zoneless mode.
      compRef.changeDetectorRef.detectChanges()
      return oldVisual
    }
    return this.createVisual(renderContext, node)
  }
}
