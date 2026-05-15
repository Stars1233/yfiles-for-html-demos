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
/**
 * A function with which to check if a given object is a NodeGroup object or not
 * @param n the object to be tested
 * @returns a boolean flag indicating whether the input object is a NodeGroup or not
 */
export function isNodeGroup(n) {
  return (
    n !== null && typeof n === 'object' && 'nodes' in n && 'collapsed' in n && 'highlighted' in n
  )
}

/**
 * A function with which to check if a given object is a EdgeGroup object or not
 * @param n the object to be tested
 * @returns a boolean flag indicating whether the input object is a EdgeGroup or not
 */
export function isEdgeGroup(n) {
  return (
    n !== null && typeof n === 'object' && 'edges' in n && 'collapsed' in n && 'highlighted' in n
  )
}

/**
 * A function with which to check if a given object is a NodeGroupRenderTag object or not
 * @param n the object to be tested
 * @returns a boolean flag indicating whether the input object is a NodeGroupRenderTag or not
 */
export function isNodeGroupRenderTag(n) {
  return n !== null && typeof n === 'object' && 'groupName' in n && 'nodeGroup' in n
}

/**
 * A function with which to check if a given object is a EdgeGroupRenderTag object or not
 * @param n the object to be tested
 * @returns a boolean flag indicating whether the input object is a EdgeGroupRenderTag or not
 */
export function isEdgeGroupRenderTag(n) {
  return n !== null && typeof n === 'object' && 'groupName' in n && 'edgeGroup' in n
}
