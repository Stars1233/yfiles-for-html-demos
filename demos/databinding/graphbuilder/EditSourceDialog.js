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
import { xml } from '@codemirror/lang-xml'
import { javascript } from '@codemirror/lang-javascript'
import { lintGutter } from '@codemirror/lint'
import { getXmlLinter } from '../../resources/codeMirrorLinters'
const xmlLinter = getXmlLinter()
/**
 * Abstract base class for a node-/edge-source editing dialog
 */
export class SourceDialog {
  dialogContainerModal
  dialogContainer
  acceptCallback
  constructor(acceptCallback) {
    this.acceptCallback = acceptCallback
    this.dialogContainerModal = document.querySelector('#editSourceDialogModal')
    this.dialogContainer = document.querySelector('#editSourceDialog')
  }
  /**
   * Sets the dialog's div to visible and adds the children necessary for all sub classes
   * Specialized controls are created in the initialize methods of the sub classes
   */
  async show() {
    // CodeMirror requires the textArea to be in the DOM and visible already when instantiating
    this.dialogContainerModal.style.removeProperty('display')
    return new Promise((resolve) => {
      setTimeout(() => {
        this.initialize()
        const buttonsContainer = document.createElement('div')
        buttonsContainer.classList.add('buttonsContainer')
        const cancelButton = document.createElement('button')
        cancelButton.textContent = 'Cancel'
        cancelButton.addEventListener('click', () => this.cancel())
        buttonsContainer.appendChild(cancelButton)
        const acceptButton = document.createElement('button')
        acceptButton.textContent = 'Accept and Update'
        acceptButton.addEventListener('click', () => this.accept())
        buttonsContainer.appendChild(acceptButton)
        this.dialogContainer.appendChild(buttonsContainer)
        resolve()
      })
    })
  }
  /**
   * Disposes the dialog and calls the provided accept callback
   */
  accept() {
    this.dispose()
    this.acceptCallback()
  }
  cancel() {
    this.dispose()
  }
  /**
   * Removes the dialog container's children and sets it to display none
   */
  dispose() {
    while (this.dialogContainer.lastChild != null) {
      this.dialogContainer.removeChild(this.dialogContainer.lastChild)
    }
    this.dialogContainerModal.style.setProperty('display', 'none')
  }
  /**
   * creates a simple HTMLHeadingElement
   * @param text the text used in the heading
   */
  createHeading(text) {
    const heading = document.createElement('h2')
    heading.textContent = text
    this.dialogContainer.appendChild(heading)
    return heading
  }
  /**
   * creates a simple HTMLInputElement adorned with heading and documentation
   * @param labelText the heading text for the input
   * @param doc the documentation text. Can be longer as it is rendered as a HTML paragraph
   */
  createInputField(labelText, doc) {
    const label = this.createDescription(labelText, doc)
    const input = document.createElement('input')
    input.setAttribute('type', 'text')
    label.appendChild(input)
    return input
  }
  /**
   * creates an CodeMirror text/code input field component adorned with heading and documentation
   * @param labelText the heading label
   * @param doc the documentation text. Can be longer as it is rendered as a HTML paragraph
   * @param mode the language syntax configuration object for CodeMirror
   */
  createEditorField(labelText, doc, mode) {
    const container = this.createDescription(labelText, doc)
    const extensions = [basicSetup]
    if (mode == 'js') {
      extensions.push(javascript())
    } else {
      extensions.push(xml(), xmlLinter, lintGutter())
    }
    return new EditorView({
      parent: container,
      extensions: extensions
    })
  }
  /**
   * Creates a HTMLDivElement containing a heading and a documentation paragraph
   * @param labelText the heading text
   * @param doc the documentation text. Can be longer as it is rendered as a HTML paragraph
   */
  createDescription(labelText, doc) {
    const container = document.createElement('div')
    const label = document.createElement('h3')
    label.textContent = labelText
    container.appendChild(label)
    const docParagraph = document.createElement('p')
    docParagraph.textContent = doc
    container.appendChild(docParagraph)
    this.dialogContainer.appendChild(container)
    return container
  }
}
/**
 * Editing dialog for nodes sources
 */
export class NodesSourceDialog extends SourceDialog {
  nodesSourceConnector
  dataEditor
  templateEditor
  idBindingInput
  nameInput
  constructor(nodesSourceConnector, acceptCallback) {
    super(acceptCallback)
    this.nodesSourceConnector = nodesSourceConnector
  }
  /**
   * creates specialized controls and initializes them with values from the {@link NodesSourceDefinition}s
   */
  initialize() {
    this.createHeading('Edit Nodes Source')
    this.nameInput = this.createInputField('Name', 'The name of the nodes source.')
    this.dataEditor = this.createEditorField(
      'Data',
      'The nodes business data in JSON format. Either an array of node objects or an object with strings as keys and node objects as values.',
      'js'
    )
    this.idBindingInput = this.createInputField(
      'ID Binding',
      'The Node ID Binding is an optional property to specify a property path that returns a ' +
        "node's ID. If present, the node ID has to be used in the source and target node bindings. " +
        'The ID binding can be a string or function definition.'
    )
    this.templateEditor = this.createEditorField(
      'Template',
      'Defines the SVG template that is used to visualize a node. This may contain dynamic' +
        ' bindings as demonstrated in the samples that allow visualizing arbitrary properties of the node' +
        ' business data, such as the name or id properties.',
      'xml'
    )
    this.nameInput.value = this.nodesSourceConnector.sourceDefinition.name
    this.dataEditor.dispatch({
      changes: {
        from: 0,
        to: this.dataEditor.state.doc.length,
        insert: this.nodesSourceConnector.sourceDefinition.data || ''
      }
    })
    this.idBindingInput.value = this.nodesSourceConnector.sourceDefinition.idBinding
    this.templateEditor.dispatch({
      changes: {
        from: 0,
        to: this.templateEditor.state.doc.length,
        insert: this.nodesSourceConnector.sourceDefinition.template
      }
    })
  }
  /**
   * Applies edited values to the {@link NodesSourceDefinition} and recreates bindings
   */
  accept() {
    this.nodesSourceConnector.sourceDefinition.name = this.nameInput.value
    this.nodesSourceConnector.sourceDefinition.idBinding = this.idBindingInput.value
    this.nodesSourceConnector.sourceDefinition.template = this.templateEditor.state.doc.toString()
    this.nodesSourceConnector.sourceDefinition.data = this.dataEditor.state.doc.toString()
    try {
      this.nodesSourceConnector.applyDefinition()
      super.accept()
    } catch (e) {
      alert(e)
    }
  }
}
/**
 * Editing dialog for edges sources
 */
export class EdgesSourceDialog extends SourceDialog {
  edgesSourceConnector
  dataEditor
  sourceBindingInput
  targetBindingInput
  labelBindingInput
  nameInput
  constructor(edgesSourceConnector, acceptCallback) {
    super(acceptCallback)
    this.edgesSourceConnector = edgesSourceConnector
  }
  strokeBindingInput
  /**
   * creates specialized controls and initializes them with values from the {@link EdgesSourceDefinition}s
   */
  initialize() {
    this.createHeading('Edit Edges Source')
    this.nameInput = this.createInputField('Name', 'The name of the edges source.')
    this.dataEditor = this.createEditorField(
      'Data',
      'The edges business data in JSON format. Either an array of edge objects or an object with strings as keys and edge objects as values.',
      'js'
    )
    this.sourceBindingInput = this.createInputField(
      'Source Binding',
      'The Source Binding is required to identify the source node of the edge. This can either ' +
        "be the path to the property specifying the node's id, or a function that returns the node id."
    )
    this.targetBindingInput = this.createInputField(
      'Target Binding',
      'The Target Binding is required to identify the target node of the edge. This can either ' +
        "be the path to the property specifying the node's id, or a function that returns the node id."
    )
    this.labelBindingInput = this.createInputField(
      'Label Binding',
      'Optional binding for the edge label. May be a string or a function.'
    )
    this.strokeBindingInput = this.createInputField(
      'Stroke Binding',
      'The binding for the edge stroke color. Note that this field resolves the edge property that defines the stroke style.'
    )
    this.nameInput.value = this.edgesSourceConnector.sourceDefinition.name
    this.dataEditor.dispatch({
      changes: {
        from: 0,
        to: this.dataEditor.state.doc.length,
        insert: this.edgesSourceConnector.sourceDefinition.data
      }
    })
    this.sourceBindingInput.value = this.edgesSourceConnector.sourceDefinition.sourceBinding
    this.targetBindingInput.value = this.edgesSourceConnector.sourceDefinition.targetBinding
    this.labelBindingInput.value = this.edgesSourceConnector.sourceDefinition.labelBinding
    this.strokeBindingInput.value = this.edgesSourceConnector.sourceDefinition.strokeBinding
  }
  /**
   * Applies edited values to the {@link EdgesSourceDefinition} and recreates bindings
   */
  accept() {
    this.edgesSourceConnector.sourceDefinition.name = this.nameInput.value
    this.edgesSourceConnector.sourceDefinition.data = this.dataEditor.state.doc.toString()
    this.edgesSourceConnector.sourceDefinition.sourceBinding = this.sourceBindingInput.value
    this.edgesSourceConnector.sourceDefinition.targetBinding = this.targetBindingInput.value
    this.edgesSourceConnector.sourceDefinition.labelBinding = this.labelBindingInput.value
    this.edgesSourceConnector.sourceDefinition.strokeBinding = this.strokeBindingInput.value
    try {
      this.edgesSourceConnector.applyDefinition()
      super.accept()
    } catch (e) {
      alert(e)
    }
  }
}
