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
  DelegatingLabelStyle,
  ILabelStyle,
  INode,
  LabelStyle,
  LabelStyleBase,
  SvgVisual
} from '@yfiles/yfiles'
import { ItemState } from '../EventTimelineTypes'

/**
 * The LevelOfDetailLabelStyle class extends the DelegatingLabelStyle to visualize edge and node
 * labels differently depending on i) the amount of white space between them and ii) the user-set
 * zoom level. If there is not enough space to visualize the label in question, it is collapsed to
 * a simple line (indicating that a label indeed exists, but cannot be fully shown).
 */
export class LevelOfDetailLabelStyle extends DelegatingLabelStyle {
  lineLabelStyle
  textLabelStyle
  orientation
  hideLowDetail
  cssPrefix = 'event-timeline'

  /**
   * Instantiates a new LevelOfDetailLabelStyle object.
   * @param orientation the orientation (horizontal or vertical) of the label
   * @param config the EventTimeline config
   */
  constructor(orientation, config) {
    super()
    this.orientation = orientation
    this.hideLowDetail = config.hideLowDetailLabel
    this.textLabelStyle =
      orientation === 'vertical'
        ? new LabelStyle({
            maximumSize: [Infinity, config.edgeLabelHeight + 6],
            verticalTextAlignment: 'center',
            horizontalTextAlignment: 'center',
            textSize: config.edgeLabelHeight,
            textFill: 'var(--yfiles-event-timeline-edge-label-text-color, #ffffff)',
            backgroundFill: 'var(--yfiles-event-timeline-edge-label-background-color, #202739)',
            shape: 'pill',
            padding: 2,
            cssClass: `${this.cssPrefix}-edge-label`
          })
        : new LabelStyle({
            maximumSize: [Infinity, config.nodeLabelHeight + 6],
            textSize: config.nodeLabelHeight,
            textFill: 'var(--yfiles-event-timeline-node-label-text-color, #ffffff)',
            shape: 'pill',
            backgroundFill: 'var(--yfiles-event-timeline-node-label-background-color, #000)',
            padding: 2,
            verticalTextAlignment: 'center',
            horizontalTextAlignment: 'center',
            cssClass: `${this.cssPrefix}-node-label`
          })

    this.lineLabelStyle = new LineLabelStyle(
      `${this.cssPrefix}-${orientation === 'vertical' ? 'edge-label' : 'node-label'}-collapsed`,
      config
    )
  }

  /**
   * Gets the ILabelStyle of the given ILabel object
   * @param label the ILabel object whose style is to be returned
   * @protected
   * @returns either the label's TextLabelStyle (uncollapsed) or LineLabelStyle (collapsed)
   */
  getStyle(label) {
    const state = label.owner.lookup(ItemState)
    const visible = state?.visible ?? true
    const color = state?.nodeColor ?? state?.edgeColorA ?? '#000'
    if (this.orientation === 'horizontal') {
      this.textLabelStyle.backgroundFill = color
    }
    return visible
      ? this.textLabelStyle
      : this.hideLowDetail
        ? ILabelStyle.VOID_LABEL_STYLE
        : this.lineLabelStyle
  }

  /**
   * Gets the preferred size of the given ILabel object.
   * @param label the ILabel object whose preferred size is to be determined
   * @protected
   * @returns the preferred size of the given ILabel object
   */
  getPreferredSize(label) {
    return this.textLabelStyle.renderer.getPreferredSize(label, this.textLabelStyle)
  }

  /**
   * Creates a new Visual for a given label
   * @param context the IRenderContext of the given label
   * @param label the ILabel object to be visualized
   * @protected
   * @returns a newly created Visual
   */
  createVisual(context, label) {
    const visual = super.createVisual(context, label)
    return visual !== null ? this.updateVisual(context, visual, label) : null
  }

  /**
   * Updates a given SVGVisual of a particular label
   * @param context the IRenderContext of the given SVGVisual
   * @param oldVisual the old SVGVisual to be updated
   * @param label the associated ILabel object
   * @protected
   * @returns an updated SVGVisual
   */
  updateVisual(context, oldVisual, label) {
    const visual = super.updateVisual(context, oldVisual, label)
    if (label.owner instanceof INode) {
      if (label.owner.lookup(ItemState)?.highlightedAdjacent) {
        visual.svgElement.classList.add('highlighted-adjacent')
      } else {
        visual.svgElement.classList.remove('highlighted-adjacent')
      }
    }
    return visual
  }
}

/**
 * Checks whether a given object is of type LineLabelCache or not.
 * @param obj the (unknown) object to be tested
 * @returns a boolean indicating whether the given object is a LineLabelCache or not
 */
function isLineLabelCache(obj) {
  return (
    obj !== undefined &&
    obj !== null &&
    typeof obj === 'object' &&
    'rect' in obj &&
    obj['rect'] instanceof SVGRectElement
  )
}

/**
 * Checks whether a given TaggedSVGVisual is a LineLabelVisual or not.
 * @param visual the TaggedSVGVisual to be checked.
 * @returns a boolean indicating whether the given TaggedSVGVisual is a LineLabelVisual or not.
 */
function isLineLabelVisual(visual) {
  return visual.tag !== undefined && isLineLabelCache(visual.tag)
}

/**
 * The LineLabelStyle class extends LabelStyleBase to visualize a given label as a simple, and small
 * rectangle when there is not enough space to visualize the entire label.
 */
class LineLabelStyle extends LabelStyleBase {
  cssClass
  config

  /**
   * Instantiates a new LineLabelStyle.
   * @param cssClass the CSS class to be attached to the SVG element
   * @param config the constants that govern the aesthetics of the timeline
   */
  constructor(cssClass, config) {
    super()
    this.cssClass = cssClass
    this.config = config
  }

  /**
   * Creates a new LineLabelVisual
   * @param context the IRenderContext of a given ILabel object
   * @param label the ILabel object to be visualized
   * @protected
   * @returns a newly created LineLabelVisual
   */
  createVisual(context, label) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    const { width, height } = label.layout
    const state = label.lookup(ItemState) ?? label.owner.lookup(ItemState)

    rect.y.baseVal.value = height / 2 - this.config.collapsedLabelHeight / 2
    rect.width.baseVal.value = width
    rect.height.baseVal.value = this.config.collapsedLabelHeight
    rect.rx.baseVal.value = this.config.collapsedLabelHeight
    rect.ry.baseVal.value = this.config.collapsedLabelHeight
    rect.setAttribute(
      'fill',
      state?.nodeColor || state?.edgeColorA || 'var(--yfiles-event-timeline-edge-color, #dfdee3)'
    )

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    this.applyCssClasses(group, this.cssClass)
    group.appendChild(rect)

    const visual = SvgVisual.from(group, { rect: rect, layout: label.layout })
    return this.updateVisual(context, visual, label)
  }

  /**
   * Updates a given LineLabelVisual
   * @param context the IRenderContext of the given LineLabelVisual
   * @param oldVisual the LineLabelVisual to be updated
   * @param label the associated ILabel object
   * @protected
   * @returns an updated LineLabelVisual
   */
  updateVisual(context, oldVisual, label) {
    let visual
    //check if old visual is from the other style, as delegated by the DelegatingLabelStyle
    if (isLineLabelVisual(oldVisual)) {
      LabelStyleBase.createLayoutTransform(context, label.layout, true).applyTo(
        oldVisual.svgElement
      )
      this.applyCssClasses(oldVisual.svgElement, this.cssClass)
      visual = oldVisual
    } else {
      visual = this.createVisual(context, label)
    }

    return visual
  }

  /**
   * Gets the preferred size of a given label (should never be called)
   * @param _label the given ILabel object
   * @protected
   */
  getPreferredSize(_label) {
    throw new Error('Method should not be called.')
  }

  /**
   * Utility function to apply one or more CSS class names to an element.
   * Handles space-separated class strings and filters out empty tokens.
   *
   * @param element The DOM element to apply classes to
   * @param classNames A space-separated string of CSS class names
   */
  applyCssClasses(element, classNames) {
    classNames
      .split(/\s+/)
      .filter(Boolean)
      .forEach((className) => element.classList.add(className))
  }
}
