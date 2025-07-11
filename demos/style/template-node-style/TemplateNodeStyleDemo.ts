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
import { basicSetup, EditorView } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { lintGutter } from '@codemirror/lint'

import {
  Arrow,
  ArrowType,
  GraphBuilder,
  GraphComponent,
  GraphMLIOHandler,
  GraphViewerInputMode,
  IGraph,
  License,
  PolylineEdgeStyle,
  Rect,
  Size
} from '@yfiles/yfiles'

import { StringTemplateNodeStyle } from '@yfiles/demo-utils/template-styles/StringTemplateNodeStyle'

import SampleData from './resources/SampleData'

import { fetchLicense } from '@yfiles/demo-resources/fetch-license'
import { finishLoading } from '@yfiles/demo-resources/demo-ui/finish-loading'
import { openGraphML, saveGraphML } from '@yfiles/demo-utils/graphml-support'
import { registerTemplateStyleSerialization } from '@yfiles/demo-utils/template-styles/MarkupExtensions'
import { StateEffect, type StateEffectType, StateField } from '@codemirror/state'
import { xml } from '@codemirror/lang-xml'
import { getXmlLinter, getJsonLinter } from '@yfiles/demo-resources/codeMirrorLinters'

const xmlLinter = getXmlLinter()
const jsonLinter = getJsonLinter()

let templateEditor: EditorView
let setTemplateEditorEditable: StateEffectType<boolean>

let tagEditor: EditorView
let setTagEditorEditable: StateEffectType<boolean>

async function run(): Promise<void> {
  License.value = await fetchLicense()

  const graphComponent = new GraphComponent('graphComponent')
  graphComponent.inputMode = new GraphViewerInputMode()

  initializeEditors(graphComponent)
  initializeStyles(graphComponent.graph)
  initializeConverters()

  resetSampleGraph(graphComponent)

  initializeUI(graphComponent)
}

/**
 * Initializes the template and tag editors and registers selection listeners that update the
 * editors on selection changes.
 */
function initializeEditors(graphComponent: GraphComponent): void {
  setTemplateEditorEditable = StateEffect.define<boolean>()
  const templateEditorEditable = StateField.define<boolean>({
    create: () => true,
    update: (value, transaction) => {
      for (let e of transaction.effects) {
        if (e.is(setTemplateEditorEditable)) {
          value = e.value
        }
      }
      return value
    }
  })
  templateEditor = new EditorView({
    parent: document.querySelector('#templateEditorContainer')!,
    extensions: [
      basicSetup,
      xml(),
      lintGutter(),
      xmlLinter,
      templateEditorEditable,
      EditorView.editable.from(templateEditorEditable)
    ]
  })

  setTagEditorEditable = StateEffect.define<boolean>()
  const tagEditorEditable = StateField.define<boolean>({
    create: () => true,
    update: (value, transaction) => {
      for (let e of transaction.effects) {
        if (e.is(setTagEditorEditable)) {
          value = e.value
        }
      }
      return value
    }
  })
  tagEditor = new EditorView({
    parent: document.querySelector('#tagEditorContainer')!,
    extensions: [
      basicSetup,
      javascript(),
      jsonLinter,
      lintGutter(),
      tagEditorEditable,
      EditorView.editable.from(tagEditorEditable)
    ]
  })

  // disable standard selection and focus visualization
  graphComponent.selectionIndicatorManager.enabled = false
  graphComponent.focusIndicatorManager.enabled = false

  graphComponent.selection.addEventListener('item-added', (_, graphComponent) => {
    const selectedNode = graphComponent.nodes.at(0)
    if (selectedNode) {
      if (selectedNode.style instanceof StringTemplateNodeStyle) {
        templateEditor.dispatch({
          effects: setTemplateEditorEditable.of(true),
          changes: {
            from: 0,
            to: templateEditor.state.doc.length,
            insert: selectedNode.style.svgContent || ''
          }
        })
      } else {
        templateEditor.dispatch({
          effects: setTemplateEditorEditable.of(false),
          changes: {
            from: 0,
            to: templateEditor.state.doc.length,
            insert: 'Style is not an instance of TemplateNodeStyle.'
          }
        })
      }

      tagEditor.dispatch({
        effects: setTagEditorEditable.of(true),
        changes: {
          from: 0,
          to: tagEditor.state.doc.length,
          insert: selectedNode.tag ? JSON.stringify(selectedNode.tag, null, 2) : '{}'
        }
      })
      document.querySelector<HTMLButtonElement>(`#apply-template-button`)!.disabled = false
      document.querySelector<HTMLButtonElement>(`#apply-tag-button`)!.disabled = false
    }
  })

  graphComponent.selection.addEventListener('item-removed', (_, graphComponent) => {
    templateEditor.dispatch({
      effects: setTemplateEditorEditable.of(false),
      changes: {
        from: 0,
        to: templateEditor.state.doc.length,
        insert: 'Select a node to edit its template.'
      }
    })
    tagEditor.dispatch({
      effects: setTagEditorEditable.of(false),
      changes: {
        from: 0,
        to: tagEditor.state.doc.length,
        insert: 'Select a node to edit its tag.'
      }
    })
    document.querySelector<HTMLButtonElement>(`#apply-template-button`)!.disabled = true
    document.querySelector<HTMLButtonElement>(`#apply-tag-button`)!.disabled = true
  })
}

/**
 * Initializes the default styles for the graph. By default org-chart nodes are used.
 */
function initializeStyles(graph: IGraph): void {
  graph.nodeDefaults.style = new StringTemplateNodeStyle(`<g>
  <rect fill="#C0C0C0" width="{TemplateBinding width}" height="{TemplateBinding height}" x="2" y="2"/>
  <rect fill="url('#bottomGradient')" stroke="#C0C0C0" width="{TemplateBinding width}" height="{TemplateBinding height}"/>
  <rect width="{TemplateBinding width}" height="2" fill="{Binding status, Converter=demoConverters.statusColorConverter}"/>
  <use xlink:href="{Binding icon, Converter=demoConverters.addHashConverter}" transform="scale(0.85) translate(15 10)"/>
  <use xlink:href="{Binding status, Converter=demoConverters.addHashConverter}"/>
  <use xlink:href="{Binding status, Converter=demoConverters.addHashConverter, Parameter=_icon}" transform="translate(26 84)"/>
  <g style="font-size: 9px; font-family: Roboto,sans-serif; fill: #444">
    <text transform="translate(90 25)" style="font-size: 16px; fill: #336699" data-content="{Binding name}"/>
    <text transform="translate(90 45)" style="text-transform: uppercase" data-content="{Binding position}"/>
    <text transform="translate(90 72)" data-content="{Binding email}"/>
    <text transform="translate(90 88)" data-content="{Binding phone}"/>
    <text transform="translate(170 88)" data-content="{Binding fax}"/>
  </g>
   <rect fill='transparent'
      stroke="{TemplateBinding itemSelected, Converter=demoConverters.selectedStrokeConverter}"
      stroke-width="3"
      x="1.5"
      y="1.5"
      width="{TemplateBinding width, Converter=demoConverters.addConverter, Parameter=-3}"
      height="{TemplateBinding height, Converter=demoConverters.addConverter, Parameter=-3}"
      />
  <defs>
    <linearGradient id="bottomGradient" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="{Binding status, Converter=demoConverters.statusColorConverter}" stop-opacity="1"/>
      <stop offset="5%" stop-color="white" stop-opacity="1" />
    </linearGradient>
  </defs>
</g>`)
  graph.nodeDefaults.size = new Size(290, 100)
  graph.nodeDefaults.shareStyleInstance = false

  graph.edgeDefaults.style = new PolylineEdgeStyle({
    stroke: '2px rgb(170, 170, 170)',
    targetArrow: new Arrow(ArrowType.NONE)
  })
}

/**
 * Initializes the converters for the bindings of the template node styles.
 */
function initializeConverters(): void {
  const colors = {
    present: '#76b041',
    busy: '#ab2346',
    travel: '#a367dc',
    unavailable: '#c1c1c1'
  }

  StringTemplateNodeStyle.CONVERTERS.demoConverters = {
    // converter function for the background color of nodes
    statusColorConverter: (value: keyof typeof colors) => colors[value] || 'white',

    // converter function for the border color nodes
    selectedStrokeConverter: (value: any) => {
      if (typeof value === 'boolean') {
        return value ? '#ff6c00' : 'rgba(0,0,0,0)'
      }
      return '#FFF'
    },

    // converter function that adds a hash to a given string and - if present - appends the parameter to it
    addHashConverter: (value: any, parameter: any) => {
      if (typeof value === 'string') {
        if (typeof parameter === 'string') {
          return `#${value}${parameter}`
        }
        return `#${value}`
      }
      return value
    },

    // converter function that adds the numbers given as value and parameter
    addConverter: (value: string, parameter: any) => {
      if (typeof parameter === 'string') {
        return String(Number(value) + Number(parameter))
      }
      return value
    }
  }
}

/**
 * Creates a sample graph for this demo.
 */
function createSampleGraph(graph: IGraph): void {
  const defaultNodeSize = graph.nodeDefaults.size
  const builder = new GraphBuilder(graph)
  builder.createNodesSource({
    data: SampleData.nodes,
    id: 'id',
    layout: (data) =>
      new Rect(data.layout.x, data.layout.y, defaultNodeSize.width, defaultNodeSize.height)
  })
  builder.createEdgesSource({
    data: SampleData.edges,
    sourceId: 'src',
    targetId: 'tgt',
    bends: 'bends'
  })

  builder.buildGraph()
}

/**
 * Resets the graph in the given graph view to the demo's sample graph, centers the graph in
 * the visible area, and selects the graph's last node.
 */
function resetSampleGraph(graphComponent: GraphComponent): void {
  const graph = graphComponent.graph
  graph.clear()

  createSampleGraph(graph)

  graphComponent.selection.add(graph.nodes.last()!)

  graphComponent.fitGraphBounds(30)
}

/**
 * Replaces the styles of the currently selected nodes with new instances that use the template
 * from the template editor.
 */
function applyTemplate(graphComponent: GraphComponent): void {
  const selectedNodes = graphComponent.selection.nodes
  if (selectedNodes.size === 0) {
    // if there are no selected nodes, there is no need to do anything
    return
  }

  const templateText = templateEditor.state.doc.toString()
  try {
    const style = new StringTemplateNodeStyle(templateText)
    // check if style is valid
    style.renderer
      .getVisualCreator(selectedNodes.first()!, style)
      .createVisual(graphComponent.createRenderContext())

    for (const node of selectedNodes) {
      graphComponent.graph.setStyle(node, style)
    }

    document.querySelector<HTMLElement>(`#template-text-area-error`)!.classList.remove('open-error')
  } catch (err) {
    const errorArea = document.querySelector<HTMLElement>(`#template-text-area-error`)!
    const errorString = (err as Error).toString().replace(templateText, '...template...')
    errorArea.setAttribute('title', errorString)
    errorArea.classList.add('open-error')
  }
}

/**
 * Replaces the tags of the currently selected nodes with new instances that correspond to the
 * data in the tag editor.
 */
function applyTag(graphComponent: GraphComponent): void {
  const selectedNodes = graphComponent.selection.nodes
  if (selectedNodes.size === 0) {
    // if there are no selected nodes, there is no need to do anything
    return
  }

  const tagText = tagEditor.state.doc.toString()
  try {
    const tag = JSON.parse(tagText)

    for (const node of selectedNodes) {
      node.tag = tag
    }

    document.querySelector<HTMLElement>(`#tag-text-area-error`)!.classList.remove('open-error')
  } catch (err) {
    const errorArea = document.querySelector<HTMLElement>(`#tag-text-area-error`)!
    errorArea.setAttribute('title', (err as Error).toString())
    errorArea.classList.add('open-error')
  }

  // Unlike replacing a node's style, replacing a node's tag does not automatically repaint
  // the graph view. Thus a repaint needs to be triggered manually here.
  graphComponent.invalidate()
}

/**
 * Binds actions to the demo's UI controls.
 */
function initializeUI(graphComponent: GraphComponent): void {
  const graphMLIOHandler = new GraphMLIOHandler()
  registerTemplateStyleSerialization(graphMLIOHandler)

  document
    .querySelector('#apply-template-button')!
    .addEventListener('click', () => applyTemplate(graphComponent))

  document
    .querySelector('#apply-tag-button')!
    .addEventListener('click', () => applyTag(graphComponent))

  document
    .querySelector('#reload')!
    .addEventListener('click', () => resetSampleGraph(graphComponent))
  document
    .querySelector<HTMLInputElement>('#open-file-button')!
    .addEventListener('click', async () => {
      await openGraphML(graphComponent, graphMLIOHandler)
    })
  document.querySelector<HTMLInputElement>('#save-button')!.addEventListener('click', async () => {
    await saveGraphML(graphComponent, 'stringTemplateNodeStyle.graphml', graphMLIOHandler)
  })
}

run().then(finishLoading)
