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
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

export function createNodeOutlineFilter() {
  const defs = createSvgElement('defs')
  const filter = createSvgElement('filter')
  const morphology = createSvgElement('feMorphology')
  const mask = createSvgElement('feComposite')
  const flood = createSvgElement('feFlood')
  const color = createSvgElement('feComposite')
  const merge = createSvgElement('feMerge')
  const mergeOutline = createSvgElement('feMergeNode')
  const mergeSource = createSvgElement('feMergeNode')
  const filterId = `pseudo3d-outline-${Math.random().toString(36).slice(2)}`

  filter.setAttribute('id', filterId)
  filter.setAttribute('x', '-50%')
  filter.setAttribute('y', '-50%')
  filter.setAttribute('width', '200%')
  filter.setAttribute('height', '200%')
  filter.setAttribute('color-interpolation-filters', 'sRGB')

  morphology.setAttribute('in', 'SourceAlpha')
  morphology.setAttribute('operator', 'dilate')
  morphology.setAttribute('result', 'outline-expanded')
  mask.setAttribute('in', 'outline-expanded')
  mask.setAttribute('in2', 'SourceAlpha')
  mask.setAttribute('operator', 'out')
  mask.setAttribute('result', 'outline-mask')
  flood.setAttribute('flood-opacity', '1')
  flood.setAttribute('result', 'outline-fill')
  color.setAttribute('in', 'outline-fill')
  color.setAttribute('in2', 'outline-mask')
  color.setAttribute('operator', 'in')
  color.setAttribute('result', 'outline-colored')
  mergeOutline.setAttribute('in', 'outline-colored')
  mergeSource.setAttribute('in', 'SourceGraphic')

  merge.append(mergeOutline, mergeSource)
  filter.append(morphology, mask, flood, color, merge)
  defs.appendChild(filter)

  return {
    defs,
    update(contentGroup, config) {
      if (!config) {
        contentGroup.removeAttribute('filter')
        return
      }

      morphology.setAttribute('radius', String(Math.max(0, config.width ?? 1)))
      flood.setAttribute('flood-color', config.color ?? '#000000')
      contentGroup.setAttribute('filter', `url(#${filterId})`)
    }
  }
}

function createSvgElement(tagName) {
  return document.createElementNS(SVG_NAMESPACE, tagName)
}
