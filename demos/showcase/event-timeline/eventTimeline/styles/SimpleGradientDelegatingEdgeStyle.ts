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
  DelegatingEdgeStyle,
  type IEdge,
  type IEdgeStyle,
  type INode,
  type IRenderContext,
  type LinearGradient,
  type PolylineEdgeStyle,
  SvgVisual,
  type TaggedSvgVisual
} from '@yfiles/yfiles'
import { ItemState } from '../EventTimelineTypes'
import { getOrCreateGradient } from './GradientUtility'

type ElementAttrCache = { x?: string; y?: string; width?: string; height?: string }

type SimpleGradientEdgeCache = {
  rect: SVGRectElement
  rectCache: ElementAttrCache
  svgClass?: string
}

type SimpleGradientEdgeVisual = TaggedSvgVisual<SVGRectElement, SimpleGradientEdgeCache>

export class SimpleGradientDelegatingEdgeStyle extends DelegatingEdgeStyle {
  readonly wrappedStyle: IEdgeStyle
  private readonly nodeToColorMapper: (node: INode) => string
  private readonly useItemStateColors: boolean
  private readonly gradients: Map<string, LinearGradient>

  /**
   * Instantiates a new SimpleGradientDelegatingEdgeStyle.
   * @param wrappedStyle the IEdgeStyle around which the SimpleGradientDelegatingEdgeStyle wraps
   * @param nodeToColorMapper maps a particular INode to a particular color
   * @param gradientMap the general map of gradients in the drawing
   * @param useItemStateColors whether to prefer colors stored in ItemState over the mapper
   */
  constructor(
    wrappedStyle: IEdgeStyle,
    nodeToColorMapper: (node: INode) => string,
    gradientMap: Map<string, LinearGradient> = new Map(),
    useItemStateColors: boolean = true
  ) {
    super()
    this.wrappedStyle = wrappedStyle
    this.nodeToColorMapper = nodeToColorMapper
    this.gradients = gradientMap
    this.useItemStateColors = useItemStateColors
  }

  /**
   * Creates a new SVGVisual object.
   * @param context the IRenderContext of the IEdge object
   * @param edge the IEdge to be visualized
   * @protected
   * @returns a newly created SVGVisual
   */
  protected createVisual(context: IRenderContext, edge: IEdge): SvgVisual | null {
    const source = edge.sourcePort!.location
    const target = edge.targetPort!.location

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    const state = edge.lookup(ItemState)

    const sourceColor =
      this.useItemStateColors && state?.edgeColorA
        ? state.edgeColorA
        : this.nodeToColorMapper(edge.sourceNode!)
    const targetColor =
      this.useItemStateColors && state?.edgeColorB
        ? state.edgeColorB
        : this.nodeToColorMapper(edge.targetNode!)

    if (sourceColor !== targetColor) {
      const linearGradient = getOrCreateGradient(
        this.gradients,
        sourceColor,
        targetColor,
        source.y,
        target.y
      )
      linearGradient.applyTo(rect, context)
    } else {
      rect.setAttribute('fill', sourceColor || 'var(--yfiles-event-timeline-edge-color, #dfdee3)')
    }

    rect.setAttribute('stroke', 'none')

    const visual = SvgVisual.from(rect, { rect, rectCache: {} }) as SimpleGradientEdgeVisual

    return this.updateVisual(context, visual, edge)
  }

  /**
   * Updates a given SVGVisual
   * @param _context the IRenderContext of the given SVGVisual
   * @param oldVisual the SVGVisual to be updated
   * @param edge the associated IEdge object
   * @protected
   * @returns an updated SVGVisual
   */
  protected updateVisual(
    _context: IRenderContext,
    oldVisual: SvgVisual,
    edge: IEdge
  ): SvgVisual | null {
    const source = edge.sourcePort!.location
    const target = edge.targetPort!.location
    const rect = oldVisual.svgElement as SVGRectElement
    const tag = (oldVisual as SimpleGradientEdgeVisual).tag

    const upperPort = source.y < target.y ? source : target
    const lowerPort = source.y < target.y ? target : source
    const width = (this.wrappedStyle as PolylineEdgeStyle).stroke?.thickness ?? 10

    this.setAttrIfChanged(rect, tag.rectCache, 'x', `${upperPort.x - width / 2}`)
    this.setAttrIfChanged(rect, tag.rectCache, 'y', `${upperPort.y}`)
    this.setAttrIfChanged(rect, tag.rectCache, 'width', `${width}`)
    this.setAttrIfChanged(rect, tag.rectCache, 'height', `${lowerPort.y - upperPort.y}`)

    return oldVisual
  }

  /**
   * Gets the style of a given IEdge object
   * @param _edge the given IEdge object
   * @protected
   * @returns the style around which the SimpleGradientDelegatingEdgeStyle is wrapped
   */
  protected getStyle(_edge: IEdge): IEdgeStyle {
    return this.wrappedStyle
  }

  private setAttrIfChanged(
    element: SVGElement,
    cache: ElementAttrCache,
    name: keyof ElementAttrCache,
    value: string
  ): void {
    if (cache[name] !== value) {
      element.setAttribute(name, value)
      cache[name] = value
    }
  }
}
