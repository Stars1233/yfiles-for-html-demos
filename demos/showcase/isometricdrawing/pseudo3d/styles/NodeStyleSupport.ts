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
  Color,
  GroupNodeStyle,
  INode,
  type INodeStyle,
  type ShapeNodeShapeStringValues,
  ShapeNodeStyle,
  Stroke
} from '@yfiles/yfiles'
import { createShapeGeometryPerimeterProvider } from '../geometry/shape/ShapeGeometryPerimeter'
import { ExtrudedPerimeterStyle } from './ExtrudedPerimeterStyle'

const isFirefox = /Firefox|FxiOS/i.test(navigator.userAgent)

export function createGroupStyle(
  tabFill: string,
  contentFill: string,
  stroke: string,
  outline: string
): INodeStyle {
  return new ExtrudedPerimeterStyle(
    new GroupNodeStyle({
      tabFill,
      tabBackgroundFill: contentFill,
      contentAreaFill: 'rgb(255 255 255)',
      contentAreaPadding: [30, 18, 18, 18],
      stroke: new Stroke({ fill: stroke, thickness: 0.5 }),
      drawShadow: false,
      cornerRadius: 18,
      tabWidth: 156,
      tabHeight: 28,
      tabPadding: 10,
      tabSlope: 0.65,
      groupIcon: 'minus',
      folderIcon: 'plus'
    }),
    createShapeGeometryPerimeterProvider<GroupNodeStyle>({
      applyStroke(nodeStyle, element, context): void {
        nodeStyle.stroke?.applyTo(element, context)
      },
      sideFill: '#ffffff',
      outlineConfig: isFirefox ? undefined : { color: outline, width: 1 }
    })
  )
}

export function getDemoNodeStyle(
  dataItem?: INode | { label: string; color: { r: number; g: number; b: number; a: number } },
  styleCache: Map<string, ExtrudedPerimeterStyle> = new Map()
): ExtrudedPerimeterStyle {
  if (!dataItem) {
    return createExtrudedShapeStyle(undefined, undefined, styleCache)
  }
  const styleData = dataItem instanceof INode ? dataItem.tag : dataItem
  if (!styleData || !styleData.color || !styleData.label) {
    return createExtrudedShapeStyle(undefined, undefined, styleCache)
  }
  const color = new Color(
    styleData.color.r,
    styleData.color.g,
    styleData.color.b,
    styleData.color.a
  )
  switch (styleData.label) {
    case 'Tablet':
      return createExtrudedShapeStyle('squircle', color, styleCache)
    case 'Server':
      return createExtrudedShapeStyle('pill', color, styleCache)
    case 'PC':
      return createExtrudedShapeStyle('squircle', color, styleCache)
    case 'Laptop':
      return createExtrudedShapeStyle('ellipse', color, styleCache)
    case 'Hub':
      return createExtrudedShapeStyle('squircle', color, styleCache)
    case 'Switch':
      return createExtrudedShapeStyle('pill', color, styleCache)
    case 'Firewall':
      return createExtrudedShapeStyle('rectangle', color, styleCache)
    case 'Gateway':
      return createExtrudedShapeStyle('round-rectangle', color, styleCache)
    case 'DB':
      return createExtrudedShapeStyle('pill', color, styleCache)
    default:
      return createExtrudedShapeStyle(undefined, undefined, styleCache)
  }
}

function createExtrudedShapeStyle(
  shape?: ShapeNodeShapeStringValues,
  color?: Color,
  styleCache: Map<string, ExtrudedPerimeterStyle> = new Map()
): ExtrudedPerimeterStyle {
  if (!shape || !color) {
    if (styleCache.has('default')) {
      return styleCache.get('default')!
    } else {
      const defaultStyle = new ExtrudedPerimeterStyle(
        new ShapeNodeStyle({ shape: 'squircle', fill: '#f60', stroke: '0.5px grey' }),
        {
          sideFill: '#ffffff',
          outline: isFirefox ? undefined : { color: 'darkslategrey', width: 1 }
        }
      )
      styleCache.set('default', defaultStyle)
      return defaultStyle
    }
  }

  const key = `${shape}-${color.r}-${color.g}-${color.b}-${color.a}`
  if (styleCache.has(key)) {
    return styleCache.get(key)!
  }
  const shapeNodeStyle = new ShapeNodeStyle({
    shape,
    fill: color,
    stroke: new Stroke({ fill: 'grey', thickness: 0.5 })
  })
  const extrudedStyle = new ExtrudedPerimeterStyle(shapeNodeStyle, {
    sideFill: '#ffffff',
    outline: isFirefox ? undefined : { color: 'darkslategrey', width: 1 }
  })

  styleCache.set(key, extrudedStyle)
  return extrudedStyle
}
