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
  type IInputModeContext,
  type INode,
  type INodeStyle,
  type IRenderContext,
  Matrix,
  NodeStyleBase,
  type Point,
  Rect,
  ShapeNodeShape,
  ShapeNodeStyle,
  SimpleNode,
  SvgVisual,
  SvgVisualGroup,
  type TaggedSvgVisual
} from '@yfiles/yfiles'

export type IconNamesProvider = (node: INode) => string[] | null
type RenderCache = { icon: string; size: number }

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * This class extends `NodeStyleBase` and enables the addition of decorations such as badges
 * while preserving the base style of the node.
 */
export class NodeStyleDecorator extends NodeStyleBase<SvgVisualGroup> {
  private readonly baseStyle: INodeStyle
  private readonly iconNamesProvider: IconNamesProvider
  private readonly badgeSize = 16
  // Scale factor for the glyph inside the badge
  private readonly iconScale = 0.72

  readonly contourStyle = new ShapeNodeStyle({
    shape: ShapeNodeShape.ELLIPSE,
    stroke: 'white',
    fill: 'none'
  })

  constructor(baseStyle: INodeStyle | null, iconNamesProvider: IconNamesProvider) {
    super()
    this.iconNamesProvider = iconNamesProvider
    this.baseStyle = baseStyle || new ShapeNodeStyle()
  }

  createVisual(context: IRenderContext, node: INode): SvgVisualGroup {
    const iconNames = this.iconNamesProvider(node)
    // Without badges, the base style will do
    if (!iconNames || iconNames.length === 0) {
      return this.baseStyle.renderer
        .getVisualCreator(node, this.baseStyle)
        .createVisual(context) as SvgVisualGroup
    }

    // Create a group for the different visuals
    const group = new SvgVisualGroup()

    // Base visualization
    const baseVisual = this.baseStyle.renderer
      .getVisualCreator(node, this.baseStyle)
      .createVisual(context) as SvgVisual
    group.add(baseVisual)

    // Contour — keep enlarge consistent with updateVisual
    const contourNode = new SimpleNode({
      layout: Rect.from(node.layout).getEnlarged(10),
      style: this.contourStyle
    })
    const contourVisual = contourNode.style.renderer
      .getVisualCreator(contourNode, contourNode.style)
      .createVisual(context) as SvgVisual
    group.add(contourVisual)

    // Badges container translated to node position
    const badgeGroup = new SvgVisualGroup()
    badgeGroup.transform = new Matrix(1, 0, 0, 1, node.layout.x, node.layout.y)

    // Create the decoration
    for (let i = 0; i < iconNames.length; i++) {
      const iconName = iconNames[i]
      const layout = this.getDecorationLayout(i, node.layout.width)

      const decorationVisual = this.createMaterialBadgeVisual(iconName, this.badgeSize)
      const g = decorationVisual.svgElement as SVGGElement
      // Position the badge within the node (badgeGroup is already translated to node.layout.x/y)
      g.setAttribute('transform', `translate(${layout.x}, ${layout.y})`)

      badgeGroup.add(decorationVisual)
    }

    group.add(badgeGroup)
    return group
  }

  updateVisual(
    context: IRenderContext,
    oldVisual: SvgVisualGroup,
    node: INode
  ): SvgVisualGroup | null {
    const badges = this.iconNamesProvider(node)
    if (!badges || badges.length === 0) {
      return this.baseStyle.renderer
        .getVisualCreator(node, this.baseStyle)
        .updateVisual(context, oldVisual) as SvgVisualGroup
    }

    const baseVisual = oldVisual.children.get(0)
    this.baseStyle.renderer.getVisualCreator(node, this.baseStyle).updateVisual(context, baseVisual)

    // Update contour (enlarge=10 to match createVisual)
    const contourVisual = oldVisual.children.get(1) as SvgVisual
    const contourNode = new SimpleNode({
      layout: Rect.from(node.layout).getEnlarged(10),
      style: this.contourStyle
    })
    contourNode.style.renderer
      .getVisualCreator(contourNode, contourNode.style)
      .updateVisual(context, contourVisual)

    // Update badges
    const badgeGroup = oldVisual.children.get(2) as SvgVisualGroup
    // Keep group translated to current node position
    badgeGroup.transform = new Matrix(1, 0, 0, 1, node.layout.x, node.layout.y)

    const currentIcons = this.iconNamesProvider(node) ?? []

    // if current icons is empty now, clear visuals if any existed
    if (currentIcons.length === 0) {
      while (badgeGroup.children.size > 0) {
        badgeGroup.children.remove(badgeGroup.children.get(0))
      }
      return oldVisual
    }

    // Determine whether to rebuild visuals by checking per-visual tag
    let needsRebuild = badgeGroup.children.size !== currentIcons.length
    if (!needsRebuild) {
      for (let i = 0; i < currentIcons.length; i++) {
        const renderCache = (
          badgeGroup.children.get(i) as TaggedSvgVisual<SVGGElement, RenderCache>
        ).tag
        if (renderCache.icon !== currentIcons[i] || renderCache.size !== this.badgeSize) {
          needsRebuild = true
          break
        }
      }
    }

    if (needsRebuild) {
      while (badgeGroup.children.size > 0) {
        badgeGroup.children.remove(badgeGroup.children.get(0))
      }

      for (let i = 0; i < currentIcons.length; i++) {
        const iconName = currentIcons[i]
        const layout = this.getDecorationLayout(i, node.layout.width)

        const visual = this.createMaterialBadgeVisual(iconName, this.badgeSize)
        const g = visual.svgElement as SVGGElement
        g.setAttribute('transform', `translate(${layout.x}, ${layout.y})`)

        badgeGroup.add(visual)
      }
    } else {
      // Only reposition existing visuals (e.g., node resized/moved)
      for (let i = 0; i < badgeGroup.children.size; i++) {
        const layout = this.getDecorationLayout(i, node.layout.width)
        const visual = badgeGroup.children.get(i) as SvgVisual
        const g = visual.svgElement as SVGGElement
        g.setAttribute('transform', `translate(${layout.x}, ${layout.y})`)
      }
    }

    return oldVisual
  }

  private createMaterialBadgeVisual(
    iconName: string,
    size: number
  ): TaggedSvgVisual<SVGGElement, RenderCache> {
    const g = document.createElementNS(SVG_NS, 'g')

    const r = size * 0.5
    const circle = document.createElementNS(SVG_NS, 'circle')
    circle.setAttribute('cx', String(r))
    circle.setAttribute('cy', String(r))
    circle.setAttribute('r', String(r))
    circle.setAttribute('fill', 'orange')
    circle.setAttribute('stroke', 'white')
    g.appendChild(circle)

    const text = document.createElementNS(SVG_NS, 'text')
    text.textContent = iconName // ligature name, e.g., 'warning'
    text.setAttribute('x', String(r))
    text.setAttribute('y', String(r))
    text.setAttribute('text-anchor', 'middle')
    text.setAttribute('dominant-baseline', 'central')
    // Slightly reduce the font size so it remains fully contained in the badge circle
    const glyphSize = Math.round(size * this.iconScale)
    // Ensure the font is applied inside SVG
    text.setAttribute(
      'style',
      "fill: white; font-family: 'Material Symbols Outlined', sans-serif; font-size: " +
        glyphSize +
        "px; font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' " +
        glyphSize
    )
    g.appendChild(text)

    return SvgVisual.from(g, { icon: iconName, size })
  }

  getDecorationLayout(index: number, nodeSize: number): Rect {
    const n2 = nodeSize * 0.5
    const r = n2 + 10
    const x = r * Math.sin(Math.PI - index * Math.PI * 0.2)
    const y = r * Math.cos(Math.PI - index * Math.PI * 0.2)
    const s2 = this.badgeSize * 0.5
    return new Rect(x - s2 + n2, y - s2 + n2, this.badgeSize, this.badgeSize)
  }

  isVisible(context: IRenderContext, rectangle: Rect, node: INode): boolean {
    const baseVisible = this.baseStyle.renderer
      .getVisibilityTestable(node, this.baseStyle)
      .isVisible(context, rectangle)
    if (baseVisible) {
      return true
    }
    const badges = this.iconNamesProvider(node)
    if (!badges || badges.length === 0) {
      return false
    }
    for (let i = 0; i < badges.length; i++) {
      if (rectangle.intersects(this.getDecorationLayout(i, node.layout.width))) {
        return true
      }
    }
    return false
  }

  isHit(context: IInputModeContext, location: Point, node: INode): boolean {
    return this.baseStyle.renderer.getHitTestable(node, this.baseStyle).isHit(context, location)
  }

  isInBox(context: IInputModeContext, rectangle: Rect, node: INode): boolean {
    // return only box containment test of baseStyle,
    // we don't want the decoration to be marquee-selectable
    return this.baseStyle.renderer
      .getMarqueeTestable(node, this.baseStyle)
      .isInBox(context, rectangle)
  }

  getIntersection(node: INode, inner: Point, outer: Point): Point | null {
    return this.baseStyle.renderer
      .getShapeGeometry(node, this.baseStyle)
      .getIntersection(inner, outer)
  }

  isInside(node: INode, location: Point): boolean {
    // return only inside test of baseStyle
    return this.baseStyle.renderer.getShapeGeometry(node, this.baseStyle).isInside(location)
  }
}
