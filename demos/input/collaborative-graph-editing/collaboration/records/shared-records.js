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
import { createLocalHistory } from '../core'
import { createFieldLevelRecordMap } from './record-map'

/**
 * Creates the shared node and edge records used by a collaborative graph.
 *
 * The returned root maps are useful when an application needs to inspect or
 * scope additional Yjs behavior, but their values are nested Yjs maps owned by
 * the field-level wrappers. Most consumers should use `nodeRecords` and
 * `edgeRecords` rather than writing to the roots directly.
 */
export function createSharedGraphRecords(doc, options = {}) {
  const nodeRoot = doc.getMap(options.nodeKey ?? 'nodes')
  const edgeRoot = doc.getMap(options.edgeKey ?? 'edges')
  const layoutRoot = doc.getMap(options.layoutKey ?? 'layout-commits')

  return {
    nodeRoot,
    edgeRoot,
    nodeRecords: createFieldLevelRecordMap(doc, nodeRoot),
    edgeRecords: createFieldLevelRecordMap(doc, edgeRoot),
    layoutRoot,
    history: createLocalHistory(doc, [nodeRoot, edgeRoot], options.historyScope ?? 'local-history')
  }
}
