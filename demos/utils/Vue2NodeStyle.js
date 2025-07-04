/****************************************************************************
 ** @license
 ** This demo file is part of yFiles for HTML.
 ** Copyright (c) by yWorks GmbH, Vor dem Kreuzberg 28,
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
/* eslint-disable no-prototype-builtins */
import {
  Font,
  FontStyle,
  GraphComponent,
  INode,
  IRenderContext,
  NodeStyleBase,
  Size,
  SvgDefsManager,
  SvgVisual,
  TextDecorations,
  TextRenderSupport,
  TextWrapping
} from '@yfiles/yfiles'
/**
 * Initializes custom components that can be used in the template. Those components can either be used directly or
 * originate from a style created by 'Node Template Designer', currently used in the data explorer for neo4j
 * (https://www.yworks.com/neo4j-explorer/).
 */
initializeDesignerVueComponents()
/**
 * A context object that helps to enhance performance. There are some properties that are provided for binding
 * but do not necessarily have to be used. We will only check those properties if they were changed.
 */
class ObservedContext {
  node
  graphComponent
  defsSupport
  contextZoom
  observed = {}
  constructor(node, renderContext) {
    this.node = node
    this.graphComponent = renderContext.canvasComponent
    this.defsSupport = renderContext.svgDefsManager
    this.contextZoom = renderContext.zoom
    this.reset()
  }
  update(renderContext) {
    this.defsSupport = renderContext.svgDefsManager
    this.contextZoom = renderContext.zoom
  }
  /**
   * Resets the context object to an empty object if none of the properties is used.
   */
  reset() {
    const oldState = this.observed
    this.observed = {}
    if (
      oldState &&
      ['tag', 'layout', 'zoom', 'selected', 'highlighted', 'focused'].some((name) =>
        oldState.hasOwnProperty(name)
      )
    ) {
      return oldState
    }
    return null
  }
  /**
   * Checks the current state for changes and returns the differences to the old state.
   */
  checkModification(oldState) {
    const delta = {}
    let change = false
    if (oldState.hasOwnProperty('layout')) {
      const layout = this.node.layout
      const newValue = {
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height
      }
      const oldLayout = oldState.layout
      if (
        newValue.x !== oldLayout.x ||
        newValue.y !== oldLayout.y ||
        newValue.width !== oldLayout.width ||
        newValue.height !== oldLayout.height
      ) {
        delta.layout = newValue
        change = true
      }
    }
    if (oldState.hasOwnProperty('zoom')) {
      const newValue = this.contextZoom
      if (newValue !== oldState.zoom) {
        delta.zoom = newValue
        change = true
      }
    }
    if (oldState.hasOwnProperty('tag')) {
      const newValue = this.node.tag
      if (newValue !== oldState.tag) {
        delta.tag = newValue
        change = true
      }
    }
    if (oldState.hasOwnProperty('selected')) {
      const newValue = this.graphComponent.selection.nodes.includes(this.node)
      if (newValue !== oldState.selected) {
        delta.selected = newValue
        change = true
      }
    }
    if (oldState.hasOwnProperty('highlighted')) {
      const newValue = this.graphComponent.highlights.includes(this.node)
      if (newValue !== oldState.highlighted) {
        delta.highlighted = newValue
        change = true
      }
    }
    if (oldState.hasOwnProperty('focused')) {
      const newValue = this.graphComponent.focusIndicatorManager.focusedItem === this.node
      if (newValue !== oldState.focused) {
        delta.focused = newValue
        change = true
      }
    }
    return {
      change,
      delta
    }
  }
  /**
   * Returns the layout.
   */
  get layout() {
    if (this.observed.hasOwnProperty('layout')) {
      return this.observed.layout
    }
    const layout = this.node.layout
    const val = {
      x: layout.x,
      y: layout.y,
      height: layout.height,
      width: layout.width
    }
    return (this.observed.layout = val)
  }
  /**
   * Returns the zoom level.
   */
  get zoom() {
    if (this.observed.hasOwnProperty('zoom')) {
      return this.observed.zoom
    }
    return (this.observed.zoom = this.contextZoom)
  }
  /**
   * Returns the tag.
   */
  get tag() {
    if (this.observed.hasOwnProperty('tag')) {
      return this.observed.tag
    }
    return (this.observed.tag = this.node.tag)
  }
  /**
   * Returns the selected state.
   */
  get selected() {
    if (this.observed.hasOwnProperty('selected')) {
      return this.observed.selected
    }
    return (this.observed.selected = this.graphComponent.selection.nodes.includes(this.node))
  }
  /**
   * Returns the highlighted state.
   */
  get highlighted() {
    if (this.observed.hasOwnProperty('highlighted')) {
      return this.observed.highlighted
    }
    return (this.observed.highlighted = this.graphComponent.highlights.includes(this.node))
  }
  /**
   * Returns the focused state.
   */
  get focused() {
    if (this.observed.hasOwnProperty('focused')) {
      return this.observed.focused
    }
    return (this.observed.focused =
      this.graphComponent.focusIndicatorManager.focusedItem === this.node)
  }
  /**
   * Generates an id for use in SVG defs elements that is unique for the current rendering context.
   */
  generateDefsId() {
    return this.defsSupport.generateUniqueDefsId()
  }
}
/**
 * A node style which uses a Vue component to display a node.
 */
export class Vue2NodeStyle extends NodeStyleBase {
  _template = ''
  _styleTag = null
  constructorFunction
  constructor(template) {
    super()
    this.template = template
  }
  get styleTag() {
    return this._styleTag
  }
  set styleTag(val) {
    this._styleTag = val
  }
  /**
   * Returns the Vue template.
   */
  get template() {
    return this._template
  }
  /**
   * Sets the Vue template.
   */
  set template(value) {
    if (value === this._template) {
      return
    }
    this._template = value
    this.constructorFunction = Vue.extend({
      template: value,
      data() {
        return {
          yFilesContext: null,
          idMap: {},
          urlMap: {}
        }
      },
      methods: {
        localId(id) {
          let localId = this.idMap[id]
          if (typeof localId === 'undefined') {
            localId = this.yFilesContext.observedContext.generateDefsId()
            this.idMap[id] = localId
          }
          return localId
        },
        localUrl(id) {
          let localUrl = this.urlMap[id]
          if (typeof localUrl === 'undefined') {
            const localId = this.localId(id)
            localUrl = `url(#${localId})`
            this.urlMap[id] = localUrl
          }
          return localUrl
        }
      },
      computed: {
        layout() {
          const yFilesContext = this.yFilesContext
          if (yFilesContext.hasOwnProperty('layout')) {
            return yFilesContext.layout
          }
          const layout = yFilesContext.observedContext.layout
          return {
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y
          }
        },
        tag() {
          const yFilesContext = this.yFilesContext
          if (yFilesContext.hasOwnProperty('tag')) {
            return yFilesContext.tag || {}
          }
          return yFilesContext.observedContext.tag || {}
        },
        selected() {
          const yFilesContext = this.yFilesContext
          if (yFilesContext.hasOwnProperty('selected')) {
            return yFilesContext.selected
          }
          return yFilesContext.observedContext.selected
        },
        zoom() {
          const yFilesContext = this.yFilesContext
          if (yFilesContext.hasOwnProperty('zoom')) {
            return yFilesContext.zoom
          }
          return yFilesContext.observedContext.zoom
        },
        focused() {
          const yFilesContext = this.yFilesContext
          if (yFilesContext.hasOwnProperty('focused')) {
            return yFilesContext.focused
          }
          return yFilesContext.observedContext.focused
        },
        highlighted() {
          const yFilesContext = this.yFilesContext
          if (yFilesContext.hasOwnProperty('highlighted')) {
            return yFilesContext.highlighted
          }
          return yFilesContext.observedContext.highlighted
        },
        fill() {
          return this.tag.fill
        },
        scale() {
          return this.tag.scale
        }
      }
    })
  }
  /**
   * Creates a visual that uses a Vue component to display a node.
   * @see Overrides {@link LabelStyleBase.createVisual}
   */
  createVisual(context, node) {
    // eslint-disable-next-line new-cap
    const component = new this.constructorFunction()
    this.prepareVueComponent(component, context, node)
    // mount the component without passing in a DOM element
    component.$mount()
    const svgElement = component.$el
    if (!(svgElement instanceof SVGElement)) {
      throw 'Vue2NodeStyle: Invalid template!'
    }
    const yFilesContext = component.yFilesContext
    const observedContext = yFilesContext.observedContext
    if (observedContext) {
      const changes = observedContext.reset()
      if (changes) {
        observedContext.changes = changes
      }
    }
    // set the location
    this.updateLocation(node, svgElement)
    svgElement['data-vueComponent'] = component
    // return an SvgVisual that uses the DOM element of the component
    const svgVisual = new SvgVisual(svgElement)
    context.setDisposeCallback(svgVisual, (context, visual) => {
      // clean up vue component instance after the visual is disposed
      const svgElement = visual.svgElement
      svgElement['data-vueComponent'].$destroy()
      return null
    })
    return svgVisual
  }
  /**
   * Updates the visual by returning the old visual, as Vue handles updating the component.
   * @see Overrides {@link LabelStyleBase.updateVisual}
   */
  updateVisual(context, oldVisual, node) {
    if (oldVisual.svgElement) {
      const component = oldVisual.svgElement['data-vueComponent']
      if (component) {
        const yfilesContext = component.yFilesContext
        const observedContext = yfilesContext.observedContext
        observedContext.update(context)
        if (observedContext && observedContext.changes && !observedContext.updatePending) {
          const { change } = observedContext.checkModification(observedContext.changes)
          if (change) {
            observedContext.updatePending = true
            this.updateVueComponent(component, yfilesContext, node)
            component.$nextTick(() => {
              if (observedContext.updatePending) {
                observedContext.updatePending = false
                const changes = observedContext.reset()
                if (changes) {
                  observedContext.changes = changes
                } else {
                  delete observedContext.changes
                }
              }
            })
          }
        }
        this.updateLocation(node, oldVisual.svgElement)
        return oldVisual
      }
    }
    return this.createVisual(context, node)
  }
  /**
   * Prepares the Vue component for rendering.
   */
  prepareVueComponent(component, context, node) {
    const yFilesContext = {}
    const ctx = new ObservedContext(node, context)
    // Values added using Object.defineProperty() are immutable and not enumerable and thus are not observed by Vue.
    Object.defineProperty(yFilesContext, 'observedContext', {
      configurable: false,
      enumerable: false,
      value: ctx
    })
    component.yFilesContext = yFilesContext
  }
  /**
   * Updates the Vue component for rendering.
   */
  updateVueComponent(component, context, node) {
    const yFilesContext = {}
    const ctx = component.yFilesContext.observedContext
    // Values added using Object.defineProperty() are immutable and not enumerable and thus are not observed by Vue.
    Object.defineProperty(yFilesContext, 'observedContext', {
      configurable: false,
      enumerable: false,
      value: ctx
    })
    component.yFilesContext = yFilesContext
    component.$forceUpdate()
  }
  /**
   * Updates the location of the given visual.
   */
  updateLocation(node, svgElement) {
    if (svgElement.transform) {
      SvgVisual.setTranslate(svgElement, node.layout.x, node.layout.y)
    }
  }
}
function hasText(el) {
  return el && el.querySelector && el.querySelector('text')
}
/**
 * Initializes the Vue components that are used in the 'Node Template Designer'.
 * @yjs:keep = visible,Node
 */
function initializeDesignerVueComponents() {
  Vue.config.warnHandler = (err, vm, info) => {
    throw new Error(`${err}\n${info}`)
  }
  function addText(
    value,
    w,
    h,
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    textDecoration,
    lineSpacing,
    wrapping,
    textElement
  ) {
    if (
      !textElement ||
      textElement.nodeType !== Node.ELEMENT_NODE ||
      textElement.nodeName !== 'text'
    ) {
      return null
    }
    const text = String(value)
    // create the font which determines the visual text properties
    const fontSettings = {}
    if (typeof fontFamily !== 'undefined') {
      fontSettings.fontFamily = fontFamily
    }
    if (typeof fontSize !== 'undefined') {
      fontSettings.fontSize = Number(fontSize)
    }
    if (typeof fontStyle !== 'undefined') {
      fontSettings.fontStyle = Number(fontStyle)
    }
    if (typeof fontWeight !== 'undefined') {
      fontSettings.fontWeight = String(fontWeight)
    }
    if (typeof textDecoration !== 'undefined') {
      fontSettings.textDecoration = Number(textDecoration)
    }
    if (typeof lineSpacing !== 'undefined') {
      fontSettings.lineSpacing = Number(lineSpacing)
    }
    const font = new Font(fontSettings)
    let textWrapping = TextWrapping.WRAP_CHARACTER_ELLIPSIS
    if (typeof wrapping !== 'undefined' && wrapping !== null) {
      switch (Number(wrapping)) {
        case TextWrapping.NONE:
        case TextWrapping.TRIM_CHARACTER_ELLIPSIS:
        case TextWrapping.TRIM_CHARACTER:
        case TextWrapping.TRIM_WORD:
        case TextWrapping.TRIM_WORD_ELLIPSIS:
        case TextWrapping.WRAP_CHARACTER_ELLIPSIS:
        case TextWrapping.WRAP_CHARACTER:
        case TextWrapping.WRAP_WORD:
        case TextWrapping.WRAP_WORD_ELLIPSIS:
          textWrapping = Number(wrapping)
          break
        default:
          // in case of faulty input
          textWrapping = TextWrapping.NONE
      }
    }
    if (typeof w === 'undefined' || w === null) {
      w = Number.POSITIVE_INFINITY
    }
    if (typeof h === 'undefined' || h === null) {
      h = Number.POSITIVE_INFINITY
    }
    // do the text wrapping
    // This sample uses the strategy WRAP_CHARACTER_ELLIPSIS. You can use any other setting.
    TextRenderSupport.addText(textElement, text, font, new Size(Number(w), Number(h)), textWrapping)
    return textElement
  }
  function updateText(
    value,
    w,
    h,
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    textDecoration,
    lineSpacing,
    wrapping,
    textElement
  ) {
    while (textElement?.lastChild) {
      textElement.removeChild(textElement.lastChild)
    }
    addText(
      value,
      w,
      h,
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle,
      textDecoration,
      lineSpacing,
      wrapping,
      textElement
    )
  }
  let clipId = 0
  Vue.component('svg-text', {
    template: `
      <g v-if="visible" :transform="$transform">
      <g v-if="clipped" :transform="'translate('+x+' '+y+')'">
        <text dy="1em" :transform="'translate('+$dx+' 0)'" :text-anchor="$textAnchor"
          :clip-path="'url(#'+refId+')'" :fill="fill" :opacity="opacity">{{ content }}
        </text>
        <clipPath :id="refId">
          <rect :width="width" :height="height" :x="-$dx"></rect>
        </clipPath>
      </g>
      <g v-else :transform="'translate('+x+' '+y+')'">
        <text dy="1em" :transform="'translate('+$dx+' 0)'" :text-anchor="$textAnchor" :fill="fill"
          :opacity="opacity">{{ content }}
        </text>
      </g>
      </g>`,
    data() {
      return { refId: `svg-text-${clipId++}` }
    },
    mounted() {
      if (!hasText(this.$el)) {
        return
      }
      addText(
        this.content,
        this.width,
        this.height,
        this.fontFamily,
        this.fontSize,
        this.fontWeight,
        this.fontStyle,
        this.textDecoration,
        this.lineSpacing,
        this.wrapping,
        this.$el.querySelector('text')
      )
    },
    watch: {
      width() {
        if (!hasText(this.$el)) {
          return
        }
        updateText(
          this.content,
          this.width,
          this.height,
          this.fontFamily,
          this.fontSize,
          this.fontWeight,
          this.fontStyle,
          this.textDecoration,
          this.lineSpacing,
          this.wrapping,
          this.$el.querySelector('text')
        )
      },
      height() {
        if (!hasText(this.$el)) {
          return
        }
        updateText(
          this.content,
          this.width,
          this.height,
          this.fontFamily,
          this.fontSize,
          this.fontWeight,
          this.fontStyle,
          this.textDecoration,
          this.lineSpacing,
          this.wrapping,
          this.$el.querySelector('text')
        )
      },
      content() {
        if (!hasText(this.$el)) {
          return
        }
        updateText(
          this.content,
          this.width,
          this.height,
          this.fontFamily,
          this.fontSize,
          this.fontWeight,
          this.fontStyle,
          this.textDecoration,
          this.lineSpacing,
          this.wrapping,
          this.$el.querySelector('text')
        )
      }
    },
    props: {
      x: {
        type: [String, Number],
        required: false,
        default: undefined
      },
      y: {
        type: [String, Number],
        required: false,
        default: undefined
      },
      width: {
        type: [String, Number],
        required: false,
        default: undefined
      },
      height: {
        type: [String, Number],
        required: false,
        default: undefined
      },
      clipped: {
        type: Boolean,
        required: false,
        default: false
      },
      align: {
        type: String,
        required: false,
        default: 'start'
      },
      fill: {
        type: String,
        required: false,
        default: undefined
      },
      content: {
        type: [String, Number, Boolean],
        required: false,
        default: undefined
      },
      opacity: {
        type: [String, Number],
        default: undefined,
        required: false
      },
      visible: {
        type: [String, Boolean],
        default: true,
        required: false
      },
      wrapping: {
        type: [String, Number],
        default: TextWrapping.WRAP_CHARACTER_ELLIPSIS,
        required: false
      },
      transform: {
        type: String,
        default: '',
        required: false
      },
      fontFamily: {
        type: String,
        default: undefined,
        required: false
      },
      fontSize: {
        type: [String, Number],
        default: undefined,
        required: false
      },
      fontWeight: {
        type: [String, Number],
        default: undefined,
        required: false
      },
      fontStyle: {
        type: [String, Number],
        default: undefined,
        required: false
      },
      textDecoration: {
        type: [String, Number],
        default: undefined,
        required: false
      },
      lineSpacing: {
        type: [String, Number],
        default: 0.5,
        required: false
      }
    },
    computed: {
      $dx() {
        return this.align === 'end'
          ? Number(this.width)
          : this.align === 'middle'
            ? Number(this.width) * 0.5
            : 0
      },
      $textAnchor() {
        return this.align === 'end' || this.align === 'middle' ? this.align : false
      },
      $transform() {
        return this.transform || ''
      }
    }
  })
  Vue.component('svg-rect', {
    template:
      '<rect :transform="$transform" :x="x" :y="y" :width="width" :height="height" :rx="cornerRadius" :fill="fill" :stroke="stroke" :stroke-width="strokeWidth" :stroke-dasharray="strokeDasharray" :opacity="opacity" v-if="visible"></rect>',
    props: {
      x: {
        type: [String, Number],
        default: 0,
        required: false
      },
      y: {
        type: [String, Number],
        default: 0,
        required: false
      },
      width: {
        type: [String, Number],
        default: 50,
        required: false
      },
      height: {
        type: [String, Number],
        default: 50,
        required: false
      },
      cornerRadius: {
        type: [String, Number],
        default: 0,
        required: false
      },
      fill: {
        type: String,
        required: false,
        default: 'orange'
      },
      stroke: {
        type: String,
        required: false,
        default: 'orange'
      },
      strokeWidth: {
        type: [String, Number],
        default: 1,
        required: false
      },
      strokeDasharray: {
        type: String,
        default: '',
        required: false
      },
      opacity: {
        type: [String, Number],
        default: 1,
        required: false
      },
      visible: {
        type: [String, Boolean],
        default: true,
        required: false
      },
      transform: {
        type: String,
        default: '',
        required: false
      }
    },
    computed: {
      $transform() {
        return this.transform || false
      }
    }
  })
  Vue.component('svg-ellipse', {
    template:
      '<ellipse :transform="$transform" :cx="$cx" :cy="$cy" :rx="$rx" :ry="$ry" :fill="fill" :stroke="stroke" :stroke-width="strokeWidth" :stroke-dasharray="strokeDasharray" :opacity="opacity" v-if="visible"></ellipse>',
    props: {
      x: {
        type: [String, Number],
        default: 0,
        required: false
      },
      y: {
        type: [String, Number],
        default: 0,
        required: false
      },
      width: {
        type: [String, Number],
        default: 50,
        required: false
      },
      height: {
        type: [String, Number],
        default: 50,
        required: false
      },
      fill: {
        type: String,
        required: false,
        default: 'orange'
      },
      stroke: {
        type: String,
        required: false,
        default: 'orange'
      },
      strokeWidth: {
        type: [String, Number],
        default: 1,
        required: false
      },
      strokeDasharray: {
        type: String,
        default: '',
        required: false
      },
      opacity: {
        type: [String, Number],
        default: 1,
        required: false
      },
      visible: {
        type: [String, Boolean],
        default: true,
        required: false
      },
      transform: {
        type: String,
        default: '',
        required: false
      }
    },
    computed: {
      $cx() {
        return Number(this.x) + Number(this.width) * 0.5
      },
      $cy() {
        return Number(this.y) + Number(this.height) * 0.5
      },
      $rx() {
        return Number(this.width) * 0.5
      },
      $ry() {
        return Number(this.height) * 0.5
      },
      $transform() {
        return this.transform || false
      }
    }
  })
  Vue.component('svg-image', {
    template:
      '<image :transform="$transform" :x="x" :y="y" :width="width" :height="height" v-bind="{\'xlink:href\':src}" :opacity="opacity" v-if="visible"></image>',
    props: {
      x: {
        type: [String, Number],
        default: undefined,
        required: false
      },
      y: {
        type: [String, Number],
        default: undefined,
        required: false
      },
      width: {
        type: [String, Number],
        default: undefined,
        required: false
      },
      height: {
        type: [String, Number],
        default: undefined,
        required: false
      },
      src: {
        type: String,
        default: undefined,
        required: false
      },
      opacity: {
        type: [String, Number],
        default: undefined,
        required: false
      },
      visible: {
        type: [String, Boolean],
        default: true,
        required: false
      },
      transform: {
        type: String,
        default: '',
        required: false
      }
    },
    computed: {
      $transform() {
        return this.transform || false
      }
    }
  })
}
