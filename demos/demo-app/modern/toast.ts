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
import { TimeSpan, type TimeSpanConvertible } from '@yfiles/yfiles'

export function initializeToast(): void {
  const toast = document.querySelector<HTMLElement>('.toast')
  if (!toast) return
  toast.classList.toggle('hidden', true)

  const content = document.createElement('div')
  content.classList.add('toast-content')
  toast.appendChild(content)

  const closeButton = document.createElement('button')
  closeButton.classList.add('toast-close')
  closeButton.classList.add('material-symbols-outlined')
  closeButton.textContent = 'close'
  closeButton.addEventListener('click', () => {
    toast.classList.toggle('hidden', true)
  })
  toast.appendChild(closeButton)
}

/**
 * Shows a toast message with the given content and duration.
 * Only one toast message can be displayed at a time.
 * @param content The content of the toast message, either a string or HTML markup.
 * @param duration The duration in milliseconds for which the toast message should be displayed.
 */
export function showToast(content: string, duration: TimeSpanConvertible): void {
  const toast = document.querySelector<HTMLDivElement>('.toast')
  if (!toast) return

  const toastContent = document.querySelector<HTMLDivElement>('.toast-content')
  if (!toastContent) return

  toast.classList.toggle('hidden', false)
  toastContent.innerHTML = content

  setTimeout(() => {
    toast.classList.toggle('hidden', true)
  }, TimeSpan.from(duration).totalMilliseconds)
}
