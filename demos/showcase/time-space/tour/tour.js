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
export const tour = {
  tips: [
    {
      title: '<h3>Introduction</h3>',
      content:
        '<p>Welcome!</p>' +
        '<p>This demo visualizes how contaminants spread between locations over time.</p>' +
        '<p>Click "Next" to take a quick tour of the interface.</p>'
    },
    {
      title: '<h3>Toolbar</h3>',
      content:
        '<p style="display: flex; align-items: center"><span class="material-symbols-outlined">public</span><span>Switch to the <b>Geospatial View</b> to see events plotted on a map (default).</span></p>' +
        '<p style="display: flex; align-items: center"><span class="material-symbols-outlined">hub</span><span>Switch to the <b>Centric View</b> to focus on a single event and its neighboring events in the past and future.</span></p>' +
        '<p style="display: flex; align-items: center"><span class="material-symbols-outlined">account_tree</span><span>Switch to the <b>Tree View</b> to easily trace the contamination path from its source.</span></p>',
      highlightId: 'toolbar',
      dialogConfig: { relativeToElement: 'south-east' }
    },
    {
      title: '<h3>Timeline</h3>',
      content:
        '<p>The timeline shows when events occurred.</p>' +
        '<p style="display: flex; align-items: center"><span class="material-symbols-outlined" style="color:#6dcae6cc;">insert_chart</span>Drag or resize the blue time window to focus on a specific period.</p>' +
        '<p style="display: flex; align-items: center"><span class="material-symbols-outlined" style="color:grey;">crop_9_16</span>Each bar represents the number of events at that time. ' +
        'Hover or click a bar to highlight them in the graph.</p>' +
        '<p style="display: flex; align-items: center"><span class="material-symbols-outlined" style="color:grey;">play_circle</span>Click the play button to animate the spread of contamination over time.</p>',
      highlightId: 'timeline',
      dialogConfig: { relativeToElement: 'north-west' }
    },
    {
      title: '<h3>Event Properties</h3>',
      content:
        '<p>Curious about an event? Just click on it in the graph, and all its details will appear here.</p>',
      highlightId: 'event-properties',
      dialogConfig: { relativeToElement: 'west' }
    },
    {
      title: '<h3>Network Statistics</h3>',
      content:
        '<p>See a summary of how many events and connections are currently visible out of the total.</p>' +
        '<p>Adjust the time window to see how these numbers change!</p>',
      highlightId: 'graph-statistics',
      dialogConfig: { relativeToElement: 'west' }
    }
  ]
}
