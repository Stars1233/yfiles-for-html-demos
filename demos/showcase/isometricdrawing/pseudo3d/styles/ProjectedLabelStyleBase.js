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
import { LabelStyleBase, SvgVisual } from '@yfiles/yfiles'
import { getProjectionState } from '../core/pseudo3dLookup'
import { getProjectionKey } from '../core/Pseudo3DProjection'
import { hasProjection } from '../geometry/nodeProjectionGeometry'
import { hasSameOrientedLayout } from '../geometry/segmentGeometry'
import {
  createProjectedLabelGroup,
  getProjectedLabelTranslation,
  updateWrappedLabelVisual
} from './projectedLabelRendering'

/** Shared lifecycle for label styles whose visual is translated by a world-space Z value. */
export class ProjectedLabelStyleBase extends LabelStyleBase {
  wrappedLabelStyle

  constructor(wrappedLabelStyle) {
    super()
    this.wrappedLabelStyle = wrappedLabelStyle
  }

  createVisual(context, label) {
    const owner = this.getOwner(label)
    if (!owner) {
      return null
    }

    const wrappedVisual = this.wrappedLabelStyle.renderer
      .getVisualCreator(label, this.wrappedLabelStyle)
      .createVisual(context)
    if (!(wrappedVisual instanceof SvgVisual)) {
      return null
    }

    const cache = this.createCache(context, label, owner)
    const group = createProjectedLabelGroup(
      wrappedVisual,
      getProjectedLabelTranslation(
        context.projection,
        cache.z,
        getProjectionState(context).inclination
      )
    )
    return SvgVisual.from(group, { cache, wrappedVisual })
  }

  updateVisual(context, oldVisual, label) {
    const owner = this.getOwner(label)
    if (!owner) {
      return null
    }

    const cache = this.createCache(context, label, owner)
    const renderData = oldVisual.tag
    if (sameCache(renderData.cache, cache)) {
      return oldVisual
    }

    if (
      !updateWrappedLabelVisual(
        context,
        label,
        this.wrappedLabelStyle,
        oldVisual.svgElement,
        renderData
      )
    ) {
      return this.createVisual(context, label)
    }

    renderData.cache = cache
    const translation = getProjectedLabelTranslation(
      context.projection,
      cache.z,
      getProjectionState(context).inclination
    )
    SvgVisual.setTranslate(oldVisual.svgElement, translation.x, translation.y)
    return oldVisual
  }

  getBounds(context, label) {
    const owner = this.getOwner(label)
    return owner
      ? label.layout.bounds.getTranslated(this.getTranslation(context, label, owner))
      : label.layout.bounds
  }

  isVisible(context, rectangle, label) {
    return rectangle.intersects(this.getBounds(context, label))
  }

  lookup(label, type) {
    return this.wrappedLabelStyle.renderer.getContext(label, this.wrappedLabelStyle).lookup(type)
  }

  getPreferredSize(label) {
    return this.wrappedLabelStyle.renderer.getPreferredSize(label, this.wrappedLabelStyle)
  }

  createCache(context, label, owner) {
    const projectionState = getProjectionState(context)
    const projection = hasProjection(context) ? context.projection : projectionState.createMatrix()
    return {
      layout: label.layout,
      text: label.text,
      z: this.getZ(context, owner, label),
      projectionKey: getProjectionKey(projection)
    }
  }

  getTranslation(context, label, owner) {
    const projectionState = getProjectionState(context)
    const projection = hasProjection(context) ? context.projection : projectionState.createMatrix()
    return getProjectedLabelTranslation(
      projection,
      this.getZ(context, owner, label),
      projectionState.inclination
    )
  }
}

function sameCache(left, right) {
  return (
    hasSameOrientedLayout(left.layout, right.layout) &&
    left.text === right.text &&
    left.z === right.z &&
    left.projectionKey === right.projectionKey
  )
}
