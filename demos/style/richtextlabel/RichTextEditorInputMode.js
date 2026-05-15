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
import { MarkupLabelStyle, TextEditorInputMode } from '@yfiles/yfiles'
import Quill from 'quill'

// Quill snow theme
import 'quill/dist/quill.snow.css'

/**
 * A custom {@link TextEditorInputMode} which utilizes Quill to provide a WYSIWYG text editor that
 * allows to easily create labels with the {@link MarkupLabelStyle}.
 */
export class RichTextEditorInputMode extends TextEditorInputMode {
  quill
  affectedLabel = null

  /**
   * Wire up Quill with the {@link TextEditorInputMode.editorText}.
   * @yjs:keep = root
   */
  get editorText() {
    return this.quill.getSemanticHTML()
  }

  /**
   * Wire up Quill with the {@link TextEditorInputMode.editorText}.
   * @yjs:keep = root
   */
  set editorText(value) {
    this.quill.setContents([])
    this.quill.root.innerHTML = value
  }

  /**
   * Creates a new instance of the {@link RichTextEditorInputMode} which utilizes Quill to provide a WYSIWYG text editor that
   * allows to easily create labels with the {@link MarkupLabelStyle}.
   * @yjs:keep = theme,handlers
   */
  constructor(parentInputMode) {
    const container = RichTextEditorInputMode.initializeQuillContainer()
    super(container)

    // track the currently edited label
    this.registerAffectedLabelListener(parentInputMode)

    // initialize Quill in the editor container
    this.quill = new Quill(container.firstElementChild, {
      theme: 'snow',
      modules: {
        keyboard: {
          bindings: {
            'list autofill': null, // disable the automatic list binding (the asterisk/space shortcut)
            cancelEdit: {
              key: 'Escape',
              handler: () => {
                this.cancel()
              }
            },
            stopEdit: {
              key: 'Enter',
              shortKey: true,
              handler: () => {
                this.tryStop()
              }
            }
          }
        },
        toolbar: {
          container: [
            [{ header: [1, 2, 3, 4, 5, false] }],
            [{ color: [] }],
            ['bold', 'italic', 'underline', 'strike'],
            ['clean']
          ]
        }
      }
    })

    // remove rich text attributes that are not supported
    const clipboard = this.quill.clipboard
    clipboard.addMatcher(Node.ELEMENT_NODE, (_, delta) => {
      delta.ops = delta.ops.map((op) => {
        if (op.insert && typeof op.attributes === 'object') {
          // remove background color
          if ('background' in op.attributes) {
            delete op.attributes.background
          }
          // remove code-block formatting
          if (op.attributes['code-block']) {
            delete op.attributes['code-block']
          }
          if (Object.keys(op.attributes).length === 0) {
            delete op.attributes
          }
        }
        return op
      })
      return delta
    })

    // edits should not be discarded when the editor is closed due to focus lost
    this.autoCommitOnFocusLost = true
  }

  /**
   * Select the content in the Quill editor when the editor is opened.
   */
  installTextBox() {
    super.installTextBox()

    this.quill.focus()

    // start with an empty undo/redo queue
    this.quill.history.clear()

    // capture the value of this.selectContent to use it in the timeout shortly after
    const selectContent = this.selectContent

    // position the cursor correctly, or preselect existing content
    setTimeout(() => {
      if (this.affectedLabel !== null && selectContent) {
        // editing an existing label, select content
        this.quill.setSelection(0, Number.POSITIVE_INFINITY)
      } else {
        // just position the cursor at the end but do not select anything to prevent dropping the first character on
        // instant typing
        this.quill.setSelection(Number.POSITIVE_INFINITY, 0)
      }
    }, 0)
  }

  /**
   * Removes the text box.
   * This method is overwritten to clear the mode's affected label, because it is called for both
   * {@link #onStopEditing} and {@link #onCancelEditing}.
   */
  uninstallTextBox() {
    super.uninstallTextBox()
    this.affectedLabel = null
  }

  /**
   * Initializes an {@link HTMLDivElement} in which Quill can be
   */
  static initializeQuillContainer() {
    const container = document.createElement('div')
    container.style.backgroundColor = 'white'
    container.style.position = 'absolute'
    container.style.maxWidth = '95%'
    container.style.zIndex = '100'
    container.tabIndex = -1

    const quillHostElement = document.createElement('div')
    // Quill only works on iOS when use-select is defined
    quillHostElement.style.setProperty('-webkit-user-select', 'text')
    quillHostElement.style.setProperty('user-select', 'text')
    container.appendChild(quillHostElement)

    return container
  }

  /**
   * Registers a listener that sets the currently edited label.
   */
  registerAffectedLabelListener(parentMode) {
    parentMode.editLabelInputMode.addEventListener('query-label-adding', (args) => {
      // this will set a null label, because at this point there is not label yet
      // but this is fine, because in this case we want to place the cursor after the first typed character
      this.affectedLabel = args.label
    })
    parentMode.editLabelInputMode.addEventListener('query-label-editing', (args) => {
      if (args.label) {
        this.affectedLabel = args.label
      }
    })
  }
}
