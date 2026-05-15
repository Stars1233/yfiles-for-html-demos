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
import { INode, Point, PopoverDescriptor, PopoverBehavior } from '@yfiles/yfiles'
import './DeviceDetailsComponent'

// the currently opened device details component
let deviceDetailsComponent = null

/**
 * Enables an HTML panel on top of the GraphComponent's content that displays detailed information
 * about a node (device).
 */
export function initializeDeviceDetailsPopup(graphComponent, graphInputMode, getDevice) {
  // On item click, update the popup with the device's data
  graphInputMode.addEventListener('item-clicked', (evt) => {
    if (evt.item instanceof INode) {
      const node = evt.item
      const detailsComponent = document.createElement('device-details-component')
      detailsComponent.graphComponent = graphComponent
      detailsComponent.device = getDevice(node)
      deviceDetailsComponent = detailsComponent
      const descriptor = new PopoverDescriptor({
        behavior: PopoverBehavior.AUTO,
        content: detailsComponent,
        anchor: new Point(node.layout.x + node.layout.width / 2, node.layout.y),
        offset: new Point(0, -10),
        ratios: new Point(0.5, 1)
      })
      descriptor.addEventListener('closed', () => {
        deviceDetailsComponent = null
      })
      void graphInputMode.popoverManager.open(descriptor)
    }
  })
}

/**
 * Triggers an update of the bar chart in the device details panel.
 */
export function updateBarChart() {
  deviceDetailsComponent?.updateBarChart()
}
