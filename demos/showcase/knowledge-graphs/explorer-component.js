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
import { GraphComponent, GraphViewerInputMode, WebGLGraphModelManager } from '@yfiles/yfiles'

/**
 * Creates and configures a GraphComponent to display the neighborhood or the ontology view.
 */
export function createExplorerComponent() {
  const explorerComponent = new GraphComponent('#explorer-graphComponent')
  explorerComponent.graphModelManager = new WebGLGraphModelManager()
  explorerComponent.minimumZoom = 0.01
  explorerComponent.maximumZoom = 4
  explorerComponent.inputMode = new GraphViewerInputMode({ selectableItems: 'none' })

  document.addEventListener('keydown', (e) => {
    const component = document.querySelector('#explorer-graphComponent')
    if (e.key === 'Escape' && component.classList.contains('open')) {
      toggleComponentPanel(false)
    }
  })

  document.querySelector('#explorer-close')?.addEventListener('click', () => {
    toggleComponentPanel(false)
  })

  document.querySelector('.toolbar').addEventListener('click', () => {
    toggleComponentPanel(false)
  })

  document.querySelector('#explorer-backdrop').addEventListener('click', () => {
    toggleComponentPanel(false)
  })

  return explorerComponent
}

/**
 * Shows or hides the explorer panel.
 * @param visible - True to open the panel, false to close it.
 */
export function toggleComponentPanel(visible) {
  const componentPanel = document.querySelector('#explorer-panel')
  const backdrop = document.querySelector('#explorer-backdrop')
  if (visible) {
    componentPanel.classList.add('open')
    backdrop.style.display = 'block'
  } else {
    componentPanel.classList.remove('open')
    backdrop.style.display = 'none'
  }
}
