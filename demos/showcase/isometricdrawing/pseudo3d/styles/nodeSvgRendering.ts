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
import { Fill, type IRenderContext } from '@yfiles/yfiles'
import { createNodeOutlineFilter, type NodeOutlineFilter } from './nodeOutlineFilter'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const DEFAULT_SIDE_FILL = 'rgba(255, 255, 255, 0.16)'

export type NodeSvgElements = {
  outlineFilter: NodeOutlineFilter | null
  contentGroup: SVGGElement
  depthGroup: SVGGElement
  topFaceGroup: SVGGElement
}

export function createNodeSvgElements(includeOutline: boolean): NodeSvgElements {
  const contentGroup = createSvgElement('g')
  const depthGroup = createSvgElement('g')
  const topFaceGroup = createSvgElement('g')
  return {
    outlineFilter: includeOutline ? createNodeOutlineFilter() : null,
    contentGroup,
    depthGroup,
    topFaceGroup
  }
}

export function syncDepthFaceCount(
  depthGroup: SVGGElement,
  depthFaceElements: SVGPathElement[],
  segmentCount: number
): void {
  while (depthFaceElements.length > segmentCount) {
    depthFaceElements.pop()?.remove()
  }
  while (depthFaceElements.length < segmentCount) {
    const face = createSvgElement('path')
    depthGroup.appendChild(face)
    depthFaceElements.push(face)
  }
}

export function applySideFill(
  element: SVGElement,
  baseFill: string | undefined,
  context: IRenderContext
): void {
  Fill.setFill(baseFill ?? DEFAULT_SIDE_FILL, element, context)
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tagName: K
): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NAMESPACE, tagName)
}
