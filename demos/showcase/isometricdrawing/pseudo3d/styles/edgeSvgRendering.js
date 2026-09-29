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
import { GeneralPath, SvgVisual } from '@yfiles/yfiles'

export function applyEdgePathAttributes(path, pathData, color, width, lineCap = 'round') {
  path.setAttribute('d', pathData)
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', color)
  path.setAttribute('stroke-width', String(width))
  path.setAttribute('stroke-linecap', lineCap)
  // Climb segments share one path so their junctions use joins rather than caps.
  // Keep those junctions round independently of the endpoint cap setting.
  path.setAttribute('stroke-linejoin', 'round')
}

export function buildSubpathCapPath(segments, lineCap, includeOuterCaps) {
  const path = new GeneralPath()
  let previousEnd = null
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index]
    const startsSubpath = !previousEnd || previousEnd.distanceTo(segment.start) > 0.01
    const endsSubpath =
      index === segments.length - 1 || segment.end.distanceTo(segments[index + 1].start) > 0.01

    const isOuterStart = index === 0 && startsSubpath
    const isOuterEnd = index === segments.length - 1 && endsSubpath
    if (
      (startsSubpath && isOuterStart === includeOuterCaps) ||
      (endsSubpath && isOuterEnd === includeOuterCaps)
    ) {
      const point = startsSubpath ? segment.start : segment.end
      path.moveTo(point)
      path.lineTo(point)
    }
    previousEnd = segment.end
  }
  return path.createSvgPathData()
}

export function syncArrowVisuals(arrows, sourceArrowVisual, targetArrowVisual) {
  arrows.replaceChildren()

  for (const arrowVisual of [sourceArrowVisual, targetArrowVisual]) {
    const svgElement = getSvgElement(arrowVisual)
    if (svgElement) {
      arrows.appendChild(svgElement)
    }
  }
}

function getSvgElement(visual) {
  if (!visual || !(visual instanceof SvgVisual)) {
    return null
  }

  return visual.svgElement
}
