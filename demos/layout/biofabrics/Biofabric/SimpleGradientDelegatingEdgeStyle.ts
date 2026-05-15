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
  GradientStop,
  type IEdge,
  type IEdgeStyle,
  type IRenderContext,
  LinearGradient,
  type PolylineEdgeStyle,
  SvgVisual,
  type TaggedSvgVisual
} from '@yfiles/yfiles'

/**
 * The GeneralPath that is used to render the GradientDelegatingEdgeStyle.
 */
type SimpleGradientDelegatingEdgeCache = { cssClass?: string | null }

/**
 * The SVG visual that makes up a GradientDelegating Edge
 */
type SimpleGradientDelegatingEdgeVisual = TaggedSvgVisual<
  SVGGElement,
  SimpleGradientDelegatingEdgeCache
>

/**
 * The {@link SimpleGradientDelegatingEdgeStyle} extends the {@link DelegatingEdgeStyle} to visualize an edge
 * with a color gradient.
 */
export class SimpleGradientDelegatingEdgeStyle extends DelegatingEdgeStyle {
  readonly wrappedStyle: IEdgeStyle
  private readonly edgeToColorMapper: (edge: IEdge) => [string | undefined, string | undefined]
  cssClass: string | undefined
  private gradients: Map<string, LinearGradient>

  /**
   * Instantiates a new {@link SimpleGradientDelegatingEdgeStyle}.
   * @param wrappedStyle the {@link IEdgeStyle} around which the {@link SimpleGradientDelegatingEdgeStyle} wraps
   * @param edgeToColorMapper maps a particular {@link IEdge} to source and target color
   * @param gradients maps a string combination of source/target color to a gradient
   */
  constructor(
    wrappedStyle: IEdgeStyle,
    edgeToColorMapper: (edge: IEdge) => [string | undefined, string | undefined],
    gradients: Map<string, LinearGradient>
  ) {
    super()
    this.wrappedStyle = wrappedStyle
    this.edgeToColorMapper = edgeToColorMapper
    this.gradients = gradients
    // get the cssClass from the wrappedStyle
    if ('cssClass' in this.wrappedStyle) {
      this.cssClass = this.wrappedStyle.cssClass as string
    }
  }

  /**
   * Creates a new SVGVisual object.
   * @param context the IRenderContext of the IEdge object
   * @param edge the IEdge to be visualized
   * @protected
   * @returns a newly created SVGVisual
   */
  protected createVisual(
    context: IRenderContext,
    edge: IEdge
  ): SimpleGradientDelegatingEdgeVisual | null {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    if (this.cssClass) {
      rect.classList.value = this.cssClass
    }
    return this.updateVisual(context, SvgVisual.from(rect, { cssClass: this.cssClass }), edge)
  }

  /**
   * Updates a given SVGVisual
   * @param context the IRenderContext of the given SVGVisual
   * @param oldVisual the SVGVisual to be updated
   * @param edge the associated IEdge object
   * @protected
   * @returns an updated SVGVisual
   */
  protected updateVisual(
    context: IRenderContext,
    oldVisual: SimpleGradientDelegatingEdgeVisual,
    edge: IEdge
  ): SimpleGradientDelegatingEdgeVisual | null {
    const source = edge.sourcePort!.location
    const target = edge.targetPort!.location
    const rect = oldVisual.svgElement as SVGRectElement
    const upperPort = source.y < target.y ? source : target
    const lowerPort = source.y < target.y ? target : source
    const width = (this.wrappedStyle as PolylineEdgeStyle).stroke?.thickness ?? 10
    // if cssClass is different, update the class

    if (this.cssClass && oldVisual.tag.cssClass !== this.cssClass) {
      oldVisual.svgElement.classList.value = this.cssClass
      oldVisual.tag.cssClass = this.cssClass
    }

    rect.setAttribute('x', `${upperPort.x - width / 2}`)
    rect.setAttribute('y', `${upperPort.y}`)
    rect.setAttribute('width', `${width}`)
    rect.setAttribute('height', `${lowerPort.y - upperPort.y}`)
    const [sourceColor, targetColor] = this.edgeToColorMapper(edge)
    if (sourceColor && targetColor && sourceColor !== targetColor) {
      let linearGradient = this.gradients.get(
        source.y < target.y ? sourceColor + targetColor : targetColor + sourceColor
      )
      if (!linearGradient) {
        linearGradient = new LinearGradient({
          startPoint: [0, source.y < target.y ? 0 : 1],
          endPoint: [0, source.y < target.y ? 1 : 0],
          gradientStops: [
            new GradientStop({ offset: 0, color: sourceColor }),
            new GradientStop({ offset: 1, color: targetColor })
          ]
        })
        this.gradients.set(
          source.y < target.y ? sourceColor + targetColor : targetColor + sourceColor,
          linearGradient
        )
      }
      linearGradient.applyTo(rect, context)
    } else if (sourceColor) {
      rect.style.fill = sourceColor
    } else if (targetColor) {
      rect.style.fill = targetColor
    }
    return oldVisual
  }

  /**
   * Gets the style of a given IEdge object
   * @param edge the given IEdge object
   * @returns the style around which the SimpleGradientDelegatingEdgeStyle is wrapped
   */
  protected getStyle(edge: IEdge): IEdgeStyle {
    return this.wrappedStyle
  }
}
