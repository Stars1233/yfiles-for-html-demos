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
import { createDemoNodeStyle, createDemoShapeNodeStyle } from '@yfiles/demo-app/demo-styles'
import { Size } from '@yfiles/yfiles'

/**
 * Stores name, color set, and shape for all node types
 */
export const NODE_TYPE_INFOS = {
  employee: { name: 'Employee', colorSet: 'demo-blue' },
  organization: { name: 'Organization', colorSet: 'demo-green', shape: 'round-rectangle' },
  department: { name: 'Department', colorSet: 'demo-purple', shape: 'pill' },
  project: { name: 'Project', colorSet: 'demo-orange', shape: 'diamond' },
  contract: { name: 'Contract', colorSet: 'demo-red', shape: 'hexagon' },
  location: { name: 'Location', colorSet: 'demo-lightblue', shape: 'ellipse' }
}

export const LEGEND_NODE_SIZE = new Size(40, 30)

/**
 * Returns a node style for the given node type
 */
export function createNodeStyleForType(type) {
  const typeInfo = NODE_TYPE_INFOS[type]
  return typeInfo.shape
    ? createDemoShapeNodeStyle(typeInfo.shape, typeInfo.colorSet)
    : createDemoNodeStyle(typeInfo.colorSet)
}
