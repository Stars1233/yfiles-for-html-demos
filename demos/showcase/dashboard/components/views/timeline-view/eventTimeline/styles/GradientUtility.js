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
import { GradientStop, LinearGradient } from '@yfiles/yfiles'

/**
 * Utility function to get or create a gradient from a source and target color.
 * Gradients are cached in a map keyed by color pair to avoid recreating identical gradients.
 *
 * @param gradients The gradient cache map
 * @param sourceColor The start color of the gradient
 * @param targetColor The end color of the gradient
 * @param sourceY The Y-coordinate of the source (used to determine gradient direction)
 * @param targetY The Y-coordinate of the target (used to determine gradient direction)
 * @returns The LinearGradient object
 */
export function getOrCreateGradient(gradients, sourceColor, targetColor, sourceY, targetY) {
  const isSourceAboveTarget = sourceY < targetY
  const gradientKey = isSourceAboveTarget ? sourceColor + targetColor : targetColor + sourceColor

  let linearGradient = gradients.get(gradientKey)
  if (!linearGradient) {
    linearGradient = new LinearGradient({
      startPoint: [0, isSourceAboveTarget ? 0 : 1],
      endPoint: [0, isSourceAboveTarget ? 1 : 0],
      gradientStops: [
        new GradientStop({ offset: 0, color: sourceColor }),
        new GradientStop({ offset: 1, color: targetColor })
      ]
    })
    gradients.set(gradientKey, linearGradient)
  }

  return linearGradient
}
