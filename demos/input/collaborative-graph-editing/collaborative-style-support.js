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
import { CssFill, PolylineEdgeStyle, ShapeNodeShape, ShapeNodeStyle } from '@yfiles/yfiles'

function isRecord(value) {
  return value !== null && typeof value === 'object'
}

/** Serializes the small subset of node styles used by the collaboration demo. */
export function serializeNodeStyle(style) {
  if (!(style instanceof ShapeNodeStyle) || !(style.fill instanceof CssFill)) return undefined
  return {
    type: 'ShapeNodeStyle',
    color: style.fill.value,
    shape: ShapeNodeShape.getName(style.shape)
  }
}

/** Restores serialized node properties on a clone of the supplied base style. */
export function deserializeDemoNodeStyle(value, baseStyle) {
  if (
    !isRecord(value) ||
    value.type !== 'ShapeNodeStyle' ||
    typeof value.color !== 'string' ||
    typeof value.shape !== 'string'
  ) {
    return undefined
  }

  try {
    if (!(baseStyle instanceof ShapeNodeStyle)) return undefined
    const style = baseStyle.clone()
    style.fill = value.color
    style.shape = ShapeNodeShape.from(value.shape)
    return style
  } catch {
    return undefined
  }
}

/** Creates a node style deserializer that uses the supplied default style as its base. */
export function createDemoNodeStyleDeserializer(baseStyle) {
  return (value) => deserializeDemoNodeStyle(value, baseStyle)
}

/** Serializes the small subset of edge styles used by the collaboration demo. */
export function serializeEdgeStyle(style) {
  if (!(style instanceof PolylineEdgeStyle) || !(style.stroke?.fill instanceof CssFill)) {
    return undefined
  }
  return {
    type: 'PolylineEdgeStyle',
    color: style.stroke.fill.value,
    thickness: style.stroke.thickness
  }
}

/** Restores serialized edge properties on a clone of the supplied base style. */
export function deserializeDemoEdgeStyle(value, baseStyle) {
  if (
    !isRecord(value) ||
    value.type !== 'PolylineEdgeStyle' ||
    typeof value.color !== 'string' ||
    typeof value.thickness !== 'number' ||
    !Number.isFinite(value.thickness) ||
    value.thickness <= 0
  ) {
    return undefined
  }

  if (!(baseStyle instanceof PolylineEdgeStyle)) return undefined
  const style = baseStyle.clone()
  style.stroke = `${value.thickness}px ${value.color}`
  return style
}

/** Creates an edge style deserializer that uses the supplied default style as its base. */
export function createDemoEdgeStyleDeserializer(baseStyle) {
  return (value) => deserializeDemoEdgeStyle(value, baseStyle)
}
