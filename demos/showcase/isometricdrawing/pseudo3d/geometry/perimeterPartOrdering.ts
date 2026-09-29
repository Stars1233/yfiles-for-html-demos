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
import type { Pseudo3DPerimeter, Pseudo3DProjectionAnchor } from '../core/types'

export function getVisiblePerimeterParts<TPart>(
  perimeter: Pseudo3DPerimeter<TPart>,
  rotation: number
): TPart[] {
  const anchorWindow = getVisibleAnchorWindow(rotation)
  const orderedParts = [...perimeter.orderedParts]
  const startIndex = orderedParts.indexOf(perimeter.anchors[anchorWindow[0]])
  const endIndex = orderedParts.indexOf(perimeter.anchors[anchorWindow[anchorWindow.length - 1]])
  if (startIndex < 0 || endIndex < 0) return []

  const visibleParts: TPart[] = []
  let index = startIndex
  while (true) {
    visibleParts.push(orderedParts[index])
    if (index === endIndex) return visibleParts
    index = (index + 1) % orderedParts.length
  }
}

export function normalizeVisiblePartsOrder<TPart>(
  visibleParts: readonly TPart[],
  orderedParts: readonly TPart[]
): TPart[] {
  if (visibleParts.length <= 1) return [...visibleParts]

  const visibleSet = new Set(visibleParts)
  const startIndex = orderedParts.findIndex((part, index) => {
    if (!visibleSet.has(part)) return false
    const previousPart = orderedParts[(index - 1 + orderedParts.length) % orderedParts.length]
    return !visibleSet.has(previousPart)
  })
  if (startIndex < 0) return [...visibleParts]

  const normalized: TPart[] = []
  let index = startIndex
  while (visibleSet.has(orderedParts[index])) {
    normalized.push(orderedParts[index])
    index = (index + 1) % orderedParts.length
    if (index === startIndex) break
  }
  return normalized.length === visibleParts.length ? normalized : [...visibleParts]
}

function getVisibleAnchorWindow(rotation: number): Pseudo3DProjectionAnchor[] {
  const normalizedRotation = ((rotation % 360) + 360) % 360
  if (normalizedRotation === 0) return ['bottomLeft', 'bottomRight']
  if (normalizedRotation > 0 && normalizedRotation < 90) {
    return ['bottomLeft', 'bottomRight', 'topRight']
  }
  if (normalizedRotation === 90) return ['bottomRight', 'topRight']
  if (normalizedRotation > 90 && normalizedRotation < 180) {
    return ['bottomRight', 'topRight', 'topLeft']
  }
  if (normalizedRotation === 180) return ['topRight', 'topLeft']
  if (normalizedRotation > 180 && normalizedRotation < 270) {
    return ['topRight', 'topLeft', 'bottomLeft']
  }
  if (normalizedRotation === 270) return ['topLeft', 'bottomLeft']
  return ['topLeft', 'bottomLeft', 'bottomRight']
}
