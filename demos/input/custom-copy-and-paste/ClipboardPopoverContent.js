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
import { Command } from '@yfiles/yfiles'

import { applyStyle } from './apply-style'

const template = document.createElement('template')
template.innerHTML = `
<style>
.contextual-toolbar {
  display: block;
  box-sizing: border-box;
  user-select: none;
  background-color: #f7f7f7;
  box-shadow:
    0 2px 10px 0 rgba(0, 0, 0, 0.16),
    0 2px 5px 0 rgba(0, 0, 0, 0.26);
}

.contextual-toolbar:focus {
  outline: 0;
}

.contextual-toolbar > button {
  height: 42px;
  width: 42px;
  user-select: none;
  vertical-align: middle;
  color: #666666;
  background-color: transparent;
  border: none;
}

.contextual-toolbar > button:hover {
background-color: #dedede;
cursor: pointer;
}
</style>
<div id="clipboard-popover" class="contextual-toolbar">
  <button id="copy-button" data-command="COPY" title="Copy">content_copy</button>
  <button id="paste-style-button" title="Paste the copied style (Ctrl + Alt + V)" class="icon" disabled="">
    format_paint
  </button>
</div>
`

export class ClipboardPopoverComponent extends HTMLElement {
  graphComponent
  pasteOptions

  /**
   * Lifecycle callback that is invoked when the element is inserted into the DOM.
   */
  connectedCallback() {
    this.appendChild(template.content.cloneNode(true))
    this.registerListeners()
  }

  /**
   * Lifecycle callback that is invoked when the element is removed from the DOM.
   */
  disconnectedCallback() {
    this.innerHTML = ''
  }

  /**
   * Wire up the functions of the contextual toolbar.
   */
  registerListeners() {
    // add a click listener that executes the command
    const copyButton = this.querySelector('#copy-button')
    copyButton.addEventListener('click', () => {
      if (this.graphComponent.canExecuteCommand(Command.COPY)) {
        this.graphComponent.executeCommand(Command.COPY)
        this.disconnectedCallback()
      }
    })

    const pasteStyleButton = this.querySelector('#paste-style-button')
    pasteStyleButton.disabled = this.graphComponent.clipboard.isEmpty
    this.graphComponent.clipboard.addEventListener('items-copied', () => {
      pasteStyleButton.disabled = false
    })
    this.graphComponent.clipboard.addEventListener('items-cut', () => {
      pasteStyleButton.disabled = false
    })
    pasteStyleButton.addEventListener('click', () => {
      applyStyle(this.graphComponent, this.pasteOptions)
      this.disconnectedCallback()
    })
  }
}

customElements.define('clipboard-popover-component', ClipboardPopoverComponent)
