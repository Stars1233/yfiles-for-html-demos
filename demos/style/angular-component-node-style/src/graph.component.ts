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
  afterNextRender,
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  EnvironmentInjector,
  inject,
  OnDestroy,
  viewChild
} from '@angular/core'
import { GraphComponent, GraphEditorInputMode, Size } from '@yfiles/yfiles'
import graphData from './assets/graph-data.json'
import { AngularNodeComponentStyle } from './AngularComponentNodeStyle'
import { NodeComponent } from './node.component'

@Component({
  selector: 'graph-component',
  templateUrl: './graph.component.html',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraphComponentComponent implements OnDestroy {
  private graphComponentRef = viewChild.required<ElementRef>('graphComponentRef')
  private environmentInjector = inject(EnvironmentInjector)
  private applicationRef = inject(ApplicationRef)

  private graphComponent!: GraphComponent

  constructor() {
    afterNextRender(() => {
      // Create the GraphComponent.
      // In zoneless mode, we don't need NgZone to run outside Angular.
      this.graphComponent = new GraphComponent()
      this.graphComponent.inputMode = new GraphEditorInputMode()
      const div = this.graphComponent.htmlElement
      div.style.height = '100%'
      this.graphComponentRef().nativeElement.appendChild(div)

      const width = 300
      const height = 250
      this.graphComponent.graph.nodeDefaults.size = new Size(width, height)

      this.graphComponent.graph.nodeDefaults.style = new AngularNodeComponentStyle(
        // the Angular component used to render a node
        NodeComponent,
        // the inputs the component should receive
        (context, node) => ({
          zoom: context.zoom,
          ...(node.tag || { name: 'New Node', color: 'blue-grey', content: 'No content' })
        }),
        this.applicationRef,
        this.environmentInjector
      )

      for (const { x, y, tag } of graphData) {
        this.graphComponent.graph.createNode({ layout: [x, y, width, height], tag })
      }
      void this.graphComponent.fitGraphBounds()
    })
  }

  ngOnDestroy(): void {
    this.graphComponent?.cleanUp()
  }
}
