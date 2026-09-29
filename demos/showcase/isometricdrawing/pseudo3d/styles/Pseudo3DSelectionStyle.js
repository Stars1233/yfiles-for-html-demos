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
import {
  GeneralPath,
  IHighlightRenderer,
  ISelectionRenderer,
  NodeStyleBase,
  SvgVisual
} from '@yfiles/yfiles'
import { getShapeOutlinePolyline } from '../geometry/shape/outline'
import { getNodeElevation, getNodeHeight } from '../core/nodeElevation'
import { ExtrudedPerimeterStyle } from './ExtrudedPerimeterStyle'
import { getProjectedHeightTranslation } from '../core/Pseudo3DProjection'

/**
 * Selection indicator for pseudo-3D nodes that hugs the node's lifted top face.
 */
export class Pseudo3DSelectionStyle extends NodeStyleBase {
  projectionState

  stroke = '#01baff'

  strokeWidth = 3

  surface

  constructor(projectionState, stroke = '#01baff', strokeWidth = 3, surface = 'top') {
    super()
    this.strokeWidth = strokeWidth
    this.stroke = stroke
    this.projectionState = projectionState
    this.surface = surface
  }

  createSelectionRenderer() {
    return ISelectionRenderer.create({
      getBoundsProvider: (node) => this.renderer.getBoundsProvider(node, this),
      getHitTestable: (node) => this.renderer.getHitTestable(node, this),
      getVisibilityTestable: (node) => this.renderer.getVisibilityTestable(node, this),
      getVisualCreator: (node) => this.renderer.getVisualCreator(node, this)
    })
  }

  createHighlightRenderer() {
    return IHighlightRenderer.create({
      getBoundsProvider: (node) => this.renderer.getBoundsProvider(node, this),
      getHitTestable: (node) => this.renderer.getHitTestable(node, this),
      getVisibilityTestable: (node) => this.renderer.getVisibilityTestable(node, this),
      getVisualCreator: (node) => this.renderer.getVisualCreator(node, this)
    })
  }

  createVisual(context, node) {
    const pathData = this.buildPathData(context, node)
    if (!pathData) {
      return null
    }

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    this.applyPathAttributes(path, pathData)
    group.appendChild(path)

    return SvgVisual.from(group, { cache: this.createCache(context, node), path })
  }

  updateVisual(context, oldVisual, node) {
    const nextCache = this.createCache(context, node)
    const currentCache = oldVisual.tag.cache

    if (this.cacheEquals(currentCache, nextCache)) {
      return oldVisual
    }

    const pathData = this.buildPathData(context, node)
    if (!pathData) {
      return null
    }

    this.applyPathAttributes(oldVisual.tag.path, pathData)
    oldVisual.tag.cache = nextCache
    return oldVisual
  }

  getBounds(context, node) {
    return this.buildProjectedOutline(context, node)?.getBounds() ?? node.layout.toRect()
  }

  isVisible(context, rectangle, node) {
    return this.getBounds(context, node).intersects(rectangle)
  }

  isHit(_context, _location, _node) {
    return false
  }

  buildPathData(context, node) {
    return this.buildProjectedOutline(context, node)?.createSvgPathData() ?? null
  }

  buildProjectedOutline(context, node) {
    const wrappedStyle =
      node.style instanceof ExtrudedPerimeterStyle ? node.style.getWrappedNodeStyle() : node.style
    const outline = getShapeOutlinePolyline(node, wrappedStyle)
    if (outline.length === 0) {
      return null
    }

    const surfaceTranslation = this.getSurfaceTranslation(context, node)
    const path = new GeneralPath()

    path.moveTo(outline[0].add(surfaceTranslation))
    for (let index = 1; index < outline.length; index++) {
      path.lineTo(outline[index].add(surfaceTranslation))
    }
    path.close()

    return path
  }

  getSurfaceTranslation(context, node) {
    const surfaceZ =
      getNodeElevation(context, node) + (this.surface === 'top' ? getNodeHeight(node) : 0)
    return getProjectedHeightTranslation(
      this.getProjection(context),
      surfaceZ,
      this.projectionState.inclination
    )
  }

  applyPathAttributes(path, pathData) {
    path.setAttribute('d', pathData)
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', this.stroke)
    path.setAttribute('stroke-width', String(this.strokeWidth))
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
  }

  createCache(context, node) {
    return {
      layout: node.layout.toRect(),
      elevation: getNodeElevation(context, node),
      height: getNodeHeight(node),
      projection: this.getProjection(context).clone(),
      wrappedStyle: node.style
    }
  }

  getProjection(context) {
    return hasProjection(context) ? context.projection : this.projectionState.createMatrix()
  }

  cacheEquals(left, right) {
    return (
      left.layout.equals(right.layout) &&
      left.elevation === right.elevation &&
      left.height === right.height &&
      left.wrappedStyle === right.wrappedStyle &&
      left.projection.hasSameValue(right.projection)
    )
  }
}

function hasProjection(context) {
  return 'projection' in context
}
