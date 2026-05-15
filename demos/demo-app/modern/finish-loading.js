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
  CanvasComponent,
  Command,
  GraphComponent,
  GraphOverviewComponent,
  IRectangle,
  IRenderContext,
  ObjectRendererBase,
  HtmlVisual
} from '@yfiles/yfiles'
import { bindYFilesCommand } from './element-utils'
import { registerErrorDialog } from './demo-error'

export function finishLoading() {
  registerErrorDialog()

  // Register commands for the buttons defined in the toolbar.
  const graphComponent = CanvasComponent.getComponent(document.querySelector('#graphComponent'))
  if (graphComponent instanceof GraphComponent) {
    registerDefaultCommands(graphComponent)
  }

  const overviewComponent = CanvasComponent.getComponent(
    document.querySelector('#overviewComponent')
  )
  if (overviewComponent instanceof GraphOverviewComponent) {
    overviewComponent.overviewInputMode.viewportRectangleRenderer =
      new DimmingViewportHtmlRenderer()
  }
  if (
    window.location.hostname === 'live.yworks.com' ||
    window.location.hostname === 'www.yfiles.com'
  ) {
    const githubLinks = document.querySelectorAll('a.github-link')
    for (const link of githubLinks) {
      isAvailableOnGithub(link.href).then((available) => {
        if (!available) {
          link.classList.add('disabled-link')
          link.setAttribute('disabled', 'true')
          link.setAttribute('tabindex', '-1')
          link.ariaDisabled = 'true'
        }
      })
    }
  }

  document.body.classList.add('loaded')
  window['data-demo-status'] = 'OK'
}

async function isAvailableOnGithub(link) {
  if (link === 'preview') {
    return false
  }
  try {
    const resp = await fetch('/demos/github-availability.json', {
      signal: AbortSignal.timeout(10_000)
    })
    if (resp.ok) {
      const availabilityMap = await resp.json()
      const [categoryFolder, demoFolder] = link
        .replace(/.*demos\//, '')
        .split('/')
        .slice(0, 2)
      return availabilityMap[categoryFolder]?.includes(demoFolder)
    }
  } catch {}
  return false
}

function registerDefaultCommands(graphComponent) {
  const newButton = document.querySelector("button[data-command='NEW']")
  newButton?.addEventListener('click', () => {
    graphComponent.graph.clear()
    graphComponent.graph.undoEngine?.clear()
    graphComponent.fitGraphBounds()
  })
  newButton?.setAttribute('title', 'New empty graph')

  bindYFilesCommand(
    "[data-command='FIT_GRAPH_BOUNDS']",
    Command.FIT_GRAPH_BOUNDS,
    graphComponent,
    null,
    'Fit content'
  )
  bindYFilesCommand(
    "[data-command='INCREASE_ZOOM']",
    Command.INCREASE_ZOOM,
    graphComponent,
    null,
    'Increase zoom'
  )
  bindYFilesCommand(
    "[data-command='DECREASE_ZOOM']",
    Command.DECREASE_ZOOM,
    graphComponent,
    null,
    'Decrease zoom'
  )
  bindYFilesCommand(
    "[data-command='ZOOM_ORIGINAL']",
    Command.ZOOM,
    graphComponent,
    1.0,
    'Zoom to original size'
  )

  bindYFilesCommand("[data-command='CUT']", Command.CUT, graphComponent, null, 'Cut')
  bindYFilesCommand("[data-command='COPY']", Command.COPY, graphComponent, null, 'Copy')
  bindYFilesCommand("[data-command='PASTE']", Command.PASTE, graphComponent, null, 'Paste')
  bindYFilesCommand("[data-command='DELETE']", Command.DELETE, graphComponent, null, 'Delete')

  bindYFilesCommand("[data-command='UNDO']", Command.UNDO, graphComponent, null, 'Undo')
  bindYFilesCommand("[data-command='REDO']", Command.REDO, graphComponent, null, 'Redo')

  bindYFilesCommand(
    "[data-command='GROUP_SELECTION']",
    Command.GROUP_SELECTION,
    graphComponent,
    null,
    'Group selected element'
  )
  bindYFilesCommand(
    "[data-command='UNGROUP_SELECTION']",
    Command.UNGROUP_SELECTION,
    graphComponent,
    null,
    'Ungroup selected element'
  )
  bindYFilesCommand(
    "[data-command='ENTER_GROUP']",
    Command.ENTER_GROUP,
    graphComponent,
    null,
    'Enter group'
  )
  bindYFilesCommand(
    "[data-command='EXIT_GROUP']",
    Command.EXIT_GROUP,
    graphComponent,
    null,
    'Exit group'
  )
}

class DimmingViewportHtmlRenderer extends ObjectRendererBase {
  createVisual(context, renderTag) {
    const div = document.createElement('div')
    div.style.transform = context.viewTransform.toCssTransform()
    const viewportRectangle = document.createElement('div')
    viewportRectangle.classList.add('graph-overview-viewport')
    this.update(context, viewportRectangle, renderTag)
    div.append(viewportRectangle)
    return new HtmlVisual(div)
  }

  updateVisual(context, oldVisual, renderTag) {
    if (oldVisual.element instanceof HTMLElement) {
      const viewportRectangle = oldVisual.element.querySelector('.graph-overview-viewport')
      if (viewportRectangle instanceof HTMLElement) {
        oldVisual.element.style.transform = context.viewTransform.toCssTransform()
        this.update(context, viewportRectangle, renderTag)
        return oldVisual
      }
    }
    context.childVisualRemoved(oldVisual)
    return this.createVisual(context, renderTag)
  }

  update(context, viewportRectangle, renderTag) {
    const vpTopLeft = context.worldToViewCoordinates(renderTag.topLeft)
    const vpBottomRight = context.worldToViewCoordinates(renderTag.bottomRight)
    HtmlVisual.setLayout(
      viewportRectangle,
      vpTopLeft.x,
      vpTopLeft.y,
      vpBottomRight.x - vpTopLeft.x,
      vpBottomRight.y - vpTopLeft.y
    )
  }
}
