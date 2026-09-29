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
import type { Tour } from '@yfiles/demo-app/modern/tour'

export const tour: Tour = {
  tips: [
    {
      title: '<h3>Welcome!</h3>',
      content:
        '<p>This demo shows how multiple participants can edit the same graph together.</p>' +
        '<p>Open this page also in another browser window to join the same room. Both windows will connect to the shared graph automatically.</p>'
    },
    {
      title: '<h3>Edit the Graph Together</h3>',
      content:
        '<p>Try editing the graph in either browser window—add, move, resize, or remove nodes and edges, and watch the changes appear instantly for everyone.</p>' +
        '<p>Experiment with the graph items and see how smoothly your actions are synchronized across the room.</p>'
    },
    {
      title: '<h3>Customize Graph Items</h3>',
      content:
        '<p>Try changing the appearance of edges and nodes by right-clicking them to change their color, thickness, or shape.</p>' +
        '<p>These visual changes are shared with all participants, so everyone sees the same graph.</p>'
    },
    {
      title: '<h3>Follow Participants</h3>',
      content:
        '<p>Curious what another participant is exploring? Use the drop-down menu in the toolbar to follow them.</p>' +
        '<p>Your viewport will follow their movements, making it easy to explore the graph together.</p>',
      highlightId: 'follow',
      dialogConfig: { relativeToElement: 'south-east' }
    },
    {
      title: '<h3>Apply a Shared Layout</h3>',
      content:
        '<p>Use the layout button to apply a layout across all participants.</p>' +
        '<p>The graph is automatically arranged for everyone in the shared room.</p>',
      highlightId: 'layout',
      dialogConfig: { relativeToElement: 'south-east' }
    },
    {
      title: '<h3>Automatic Reset</h3>',
      content:
        '<p>The collaboration server resets after a certain amount of time.</p>' +
        '<p>When this happens, the graph is cleared and all changes made during the session are removed.</p>',
      highlightId: 'reset',
      dialogConfig: { relativeToElement: 'south-west' }
    }
  ]
}
