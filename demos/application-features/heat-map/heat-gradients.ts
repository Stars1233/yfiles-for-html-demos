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
import { GradientStop } from '@yfiles/yfiles'

export const gradients = [
  {
    label: 'Default rainbow',
    value: [
      new GradientStop('#0000ff0a', 0),
      new GradientStop('#00ffffc8', 0.25),
      new GradientStop('#00ff00', 0.5),
      new GradientStop('#ffff00', 0.75),
      new GradientStop('#ff0000', 1.0)
    ]
  },
  {
    label: 'Red - yellow - blue',
    value: [
      new GradientStop('#4575b488', 0),
      new GradientStop('#ffffbf', 0.5),
      new GradientStop('#d73027', 1)
    ]
  },
  {
    label: 'Yellow - orange - purple',
    value: [
      new GradientStop('#30123baa', 0),
      new GradientStop('#ff6d00', 0.5),
      new GradientStop('#fff200', 1)
    ]
  },
  {
    label: 'Red - orange - yellow',
    value: [
      new GradientStop('#ffff00', 0),
      new GradientStop('#ffa500', 0.5),
      new GradientStop('#ff0000', 0.9),
      new GradientStop('#8b0000', 1)
    ]
  },
  {
    label: 'Yellow - green - blue',
    value: [
      new GradientStop('#00204a00', 0),
      new GradientStop('#3b6ea0', 0.5),
      new GradientStop('#f6f3a4', 1)
    ]
  },
  {
    label: 'Shades of blue',
    value: [
      new GradientStop('#f7fbff', 0),
      new GradientStop('#6baed6', 0.5),
      new GradientStop('#08306b', 1)
    ]
  },
  {
    label: 'Shades of red',
    value: [
      new GradientStop('#fff5f0', 0),
      new GradientStop('#fc9272', 0.5),
      new GradientStop('#99000d', 1)
    ]
  },
  {
    label: 'Transparent - red',
    value: [new GradientStop('#c80000', 0), new GradientStop('#c8000000', 0.8)]
  },
  {
    label: 'Orange - purple - blue',
    value: [
      new GradientStop('#0d0887aa', 0),
      new GradientStop('#7e03a8', 0.5),
      new GradientStop('#fca636', 1)
    ]
  }
]
