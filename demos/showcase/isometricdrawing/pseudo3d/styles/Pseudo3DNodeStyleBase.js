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
  BaseClass,
  GeneralPath,
  IClickListener,
  IHitTestable,
  NodeStyleBase,
  Point,
  Rect,
  SvgVisual
} from '@yfiles/yfiles'
import { getProjectionState } from '../core/pseudo3dLookup'
import {
  getProjectedHeightTranslation,
  getProjectionKey,
  getVisualTranslation
} from '../core/Pseudo3DProjection'
import { appendExtrusionFacePath, createExtrusionFacePathData } from '../geometry/segmentGeometry'
import {
  appendTranslatedPath,
  createRectanglePath,
  getProjectedNodeBounds,
  getProjectedTranslationVector,
  getProjectionMatrix,
  withProjection
} from '../geometry/nodeProjectionGeometry'
import { applySideFill, createNodeSvgElements, syncDepthFaceCount } from './nodeSvgRendering'
import { getNodeElevation, getNodeHeight, translateInputLocation } from '../core/nodeElevation'

class RenderDataCache {
  layout

  height

  elevation

  projectionKey

  constructor(layout, height, elevation, projection) {
    // Zoom and panning are applied by yFiles' view transform. Only the
    // world-space projection affects pseudo-3D geometry.
    this.projectionKey = getProjectionKey(projection)
    this.elevation = elevation
    this.height = height
    this.layout = layout
  }

  hasSameGeometry(other) {
    return (
      this.layout.equals(other.layout) &&
      this.height === other.height &&
      this.elevation === other.elevation
    )
  }

  hasSameProjection(other) {
    return this.projectionKey === other.projectionKey
  }

  equals(other) {
    return this.hasSameGeometry(other) && this.hasSameProjection(other)
  }
}

// The node base style owns the SVG/filter lifecycle while perimeter providers
// only answer geometry questions for the wrapped node style.
/**
 * Base class for pseudo-3D node rendering.
 *
 * It owns the SVG visual lifecycle and delegates perimeter-specific geometry
 * questions to a provider. That keeps shape extraction separate from the code
 * that updates SVG groups, filter state, hit testing, and comparator helpers.
 */
export class Pseudo3DNodeStyleBase extends NodeStyleBase {
  wrappedNodeStyle

  projectionStateValue = null

  visibleAreaCache = new WeakMap()

  constructor(wrappedNodeStyle) {
    super()
    this.wrappedNodeStyle = wrappedNodeStyle
  }

  createVisual(context, node) {
    this.ensureProjectionState(context)
    const wrappedVisual = this.wrappedNodeStyle.renderer
      .getVisualCreator(node, this.wrappedNodeStyle)
      .createVisual(context)

    if (!(wrappedVisual instanceof SvgVisual)) {
      return null
    }

    const cache = new RenderDataCache(
      node.layout.toRect(),
      getNodeHeight(node),
      getNodeElevation(context, node),
      context.projection.clone()
    )

    const extrusionGeometry = this.getExtrusionGeometry(context, node)
    const geometry = this.hasVisibleExtrusion(node) ? extrusionGeometry : null
    const topFaceTranslation = this.getTranslationVector(context, cache.height)
    const elevationTranslation = this.getTranslationVector(context, cache.elevation)

    const rootGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const outlineElements = createNodeSvgElements(Boolean(extrusionGeometry?.outlineConfig))

    outlineElements.topFaceGroup.appendChild(wrappedVisual.svgElement)
    outlineElements.contentGroup.append(outlineElements.depthGroup, outlineElements.topFaceGroup)
    if (outlineElements.outlineFilter) {
      rootGroup.appendChild(outlineElements.outlineFilter.defs)
    }
    rootGroup.appendChild(outlineElements.contentGroup)

    const renderData = {
      cache,
      contentGroup: outlineElements.contentGroup,
      topFaceGroup: outlineElements.topFaceGroup,
      topFaceVisual: wrappedVisual,
      depthGroup: outlineElements.depthGroup,
      depthFaceElements: [],
      outlineFilter: outlineElements.outlineFilter
    }

    this.updateNodeVisualState(renderData, context, node, geometry)
    SvgVisual.setTranslate(renderData.topFaceGroup, topFaceTranslation.x, topFaceTranslation.y)
    SvgVisual.setTranslate(rootGroup, elevationTranslation.x, elevationTranslation.y)

    return SvgVisual.from(rootGroup, renderData)
  }

  updateVisual(context, oldVisual, node) {
    this.ensureProjectionState(context)
    const renderData = oldVisual.tag
    const newCache = new RenderDataCache(
      node.layout.toRect(),
      getNodeHeight(node),
      getNodeElevation(context, node),
      context.projection.clone()
    )

    if (renderData.cache.equals(newCache)) {
      return oldVisual
    }

    if (!renderData.cache.hasSameGeometry(newCache)) {
      const updatedWrappedVisual = this.wrappedNodeStyle.renderer
        .getVisualCreator(node, this.wrappedNodeStyle)
        .updateVisual(context, renderData.topFaceVisual)

      if (!(updatedWrappedVisual instanceof SvgVisual)) {
        return this.createVisual(context, node)
      }

      if (updatedWrappedVisual !== renderData.topFaceVisual) {
        renderData.topFaceGroup.replaceChildren(updatedWrappedVisual.svgElement)
        renderData.topFaceVisual = updatedWrappedVisual
      }
    }

    renderData.cache = newCache
    this.updateNodeVisualState(renderData, context, node)

    const topFaceTranslation = this.getTranslationVector(context, newCache.height)
    const elevationTranslation = this.getTranslationVector(context, newCache.elevation)
    SvgVisual.setTranslate(renderData.topFaceGroup, topFaceTranslation.x, topFaceTranslation.y)
    SvgVisual.setTranslate(oldVisual.svgElement, elevationTranslation.x, elevationTranslation.y)

    return oldVisual
  }

  lookup(node, type) {
    const result = this.wrappedNodeStyle.renderer
      .getContext(node, this.wrappedNodeStyle)
      .lookup(type)

    if (type === IClickListener && result instanceof IClickListener) {
      return new (class extends BaseClass(IClickListener) {
        getHitTestable() {
          return IHitTestable.create((context, location) => {
            const newLocation = translateInputLocation(context, node, location)

            return result.getHitTestable().isHit(context, newLocation)
          })
        }
        onClicked(context, location) {
          result.onClicked(context, location)
        }
      })()
    }

    return result
  }

  getBounds(context, node) {
    this.ensureProjectionState(context)
    if (this.projectionState.isOrbiting) {
      return getProjectedNodeBounds(context, node, this.projectionState)
    }

    return this.getVisibleAreaCache(context, node).bounds
  }

  isHit(context, location, node) {
    this.ensureProjectionState(context)
    if (this.projectionState.isOrbiting) {
      return false
    }

    return (
      this.getVisibleAreaCache(context, node).path?.areaOrPathContains(
        location,
        context.hitTestRadius
      ) ?? node.layout.toRect().contains(location, context.hitTestRadius)
    )
  }

  isVisible(context, rectangle, node) {
    this.ensureProjectionState(context)
    return rectangle.intersects(this.getVisibleAreaCache(context, node).bounds)
  }

  get projectionState() {
    if (!this.projectionStateValue) {
      throw new Error('Pseudo3DProjectionState is not available from the graph lookup')
    }
    return this.projectionStateValue
  }

  ensureProjectionState(context) {
    if (this.projectionStateValue) {
      return
    }

    this.projectionStateValue = getProjectionState(context)
  }

  updateNodeVisualState(
    renderData,
    context,
    node,
    geometry = this.hasVisibleExtrusion(node) ? this.getExtrusionGeometry(context, node) : null
  ) {
    // Rebuild wall faces from perimeter geometry, but keep the top-face visual
    // instance when the wrapped style itself can update incrementally.
    const topFaceTranslation = this.getTranslationVector(context, renderData.cache.height)
    const segments = geometry?.segments ?? []

    syncDepthFaceCount(renderData.depthGroup, renderData.depthFaceElements, segments.length)

    for (const [index, segment] of segments.entries()) {
      const face = renderData.depthFaceElements[index]
      face.setAttribute('d', createExtrusionFacePathData(segment, topFaceTranslation, Point.ORIGIN))
      this.applyExtrusionStroke(face, context)
      face.style.strokeLinejoin = 'round'
      applySideFill(face, geometry?.sideFill, context)
      face.style.display = ''
    }

    renderData.outlineFilter?.update(renderData.contentGroup, geometry?.outlineConfig)
  }

  getTranslationVector(context, length) {
    return getProjectedHeightTranslation(
      context.projection,
      length,
      this.projectionState.inclination
    )
  }

  /**
   * Hit testing and bounds use a synthetic visible-area path that combines the
   * lifted top face with all currently visible side faces.
   */
  getVisibleAreaCache(context, node) {
    this.ensureProjectionState(context)
    const projection = getProjectionMatrix(context, this.projectionState)
    const { x, y, width, height: layoutHeight } = node.layout
    const height = getNodeHeight(node)
    const elevation = getNodeElevation(context, node)
    const cached = this.visibleAreaCache.get(node)

    if (
      cached &&
      cached.x === x &&
      cached.y === y &&
      cached.width === width &&
      cached.layoutHeight === layoutHeight &&
      cached.height === height &&
      cached.elevation === elevation &&
      cached.inclination === this.projectionState.inclination &&
      cached.projection.hasSameValue(projection)
    ) {
      return cached
    }

    const visibleArea = new GeneralPath()
    const geometryContext = withProjection(context, projection)
    const elevationTranslation = getProjectedTranslationVector(
      projection,
      elevation,
      this.projectionState.inclination
    )
    const topFaceTranslation = elevationTranslation.add(
      getProjectedTranslationVector(projection, height, this.projectionState.inclination)
    )

    appendTranslatedPath(visibleArea, this.getOutline(node), topFaceTranslation)

    const geometry = this.hasVisibleExtrusion(node)
      ? this.getExtrusionGeometry(geometryContext, node)
      : null
    if (geometry) {
      for (const segment of geometry.segments) {
        appendExtrusionFacePath(visibleArea, segment, topFaceTranslation, elevationTranslation)
      }
    }

    const path = visibleArea.isVisible ? visibleArea : null
    const value = {
      x,
      y,
      width,
      layoutHeight,
      height,
      elevation,
      inclination: this.projectionState.inclination,
      projection: projection.clone(),
      path,
      bounds: path?.getBounds() ?? new Rect(x, y, width, layoutHeight)
    }
    this.visibleAreaCache.set(node, value)
    return value
  }

  getOutline(node) {
    return (
      this.wrappedNodeStyle.renderer.getShapeGeometry(node, this.wrappedNodeStyle).getOutline() ??
      createRectanglePath(node.layout.toRect())
    )
  }

  hasVisibleExtrusion(node) {
    return (
      getNodeHeight(node) > 0 &&
      Math.abs(getVisualTranslation(getNodeHeight(node), this.projectionState.inclination)) >=
        MIN_VISIBLE_EXTRUSION_TRANSLATION
    )
  }
}

const MIN_VISIBLE_EXTRUSION_TRANSLATION = 0.5
