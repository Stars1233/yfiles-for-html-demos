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
import {
  Graph,
  GraphComponent,
  IEnumerable,
  IGraph,
  Matrix,
  Point,
  Rect,
  Size,
  SvgExport
} from '@yfiles/yfiles'
import { openInWindow } from './open-in-window'

/**
 * Helper class for printing the contents of a graph component.
 * Printing is done in multiple steps. First, the graph is exported to one or
 * more SVG elements, these elements are then added to a new document in a
 * new window, and finally, this window is printed using the browser's print
 * feature.
 */
export class PrintingSupport {
  /**
   * The margins around the whole printed content in page coordinates.
   */
  margin = 5
  /**
   * The scale factor to apply to the printed content.
   */
  scale = 1.0
  /**
   * Whether to print multiple pages if the content does not fit on a single page.
   */
  tiledPrinting = false
  /**
   * Whether to skip empty pages.
   */
  skipEmptyTiles = false
  /**
   * Whether to scale the content to fit the page size.
   */
  fitToTile = false
  /**
   * The width of a single tile (page) in px.
   */
  tileWidth = 794
  /**
   * The height of a single tile (page) in px.
   */
  tileHeight = 1123
  /**
   * The URL of the print document that's created and then opened.
   */
  targetUrl: string | null = null
  /**
   * The URL of the print document that's created and then opened.
   * The projection for the print content. When exporting a GraphComponent with a projection,
   * this should be set to the same value.
   */
  projection = Matrix.IDENTITY
  /**
   * The styles set to the {@link SvgExport.cssStyleSheet} property.
   * */
  cssStyleSheet = ''

  /**
   * Prints the detail of the given graph that is specified by either a
   * rectangle in world coordinates or a collection of world coordinate points which
   * define a bounding box in view coordinates.
   * If no `region` is specified, the complete graph is printed.
   */
  async printGraph(
    graph: IGraph,
    region?: Rect | Point[],
    renderCompletionCallback?: () => Promise<void | void[]>,
    customHtmlUrl: string | null = null
  ): Promise<void> {
    this.targetUrl = customHtmlUrl
    // Create a new graph component for exporting the original SVG content
    const exportComponent = new GraphComponent()
    // ... and assign it the same graph.
    exportComponent.graph = graph
    await this.print(
      exportComponent,
      region,
      renderCompletionCallback ? renderCompletionCallback : () => Promise.resolve()
    )
    // Dispose of the component and remove its references to the graph
    exportComponent.cleanUp()
    exportComponent.graph = new Graph()
  }

  /**
   * Prints the detail of the given GraphComponent's graph that is specified by either a
   * rectangle in world coordinates or a collection of world coordinate points which
   * define a bounding box in view coordinates.
   * If no `region` is specified, the complete graph is printed.
   */
  async print(
    graphComponent: GraphComponent,
    region?: Rect | Point[],
    renderCompletionCallback?: () => Promise<void | void[]>
  ): Promise<void> {
    let targetRect: Rect
    if (Array.isArray(region)) {
      targetRect = this.getBoundsFromPoints(region)
    } else if (region instanceof Rect) {
      const { topLeft, topRight, bottomLeft, bottomRight } = region
      targetRect = this.getBoundsFromPoints([topLeft, topRight, bottomLeft, bottomRight])
    } else {
      targetRect = this.getBoundsFromPoints(
        graphComponent.renderTree
          .getElements(graphComponent.renderTree.rootGroup)
          .map((co) =>
            co.renderer.getBoundsProvider(co.tag).getBounds(graphComponent.canvasContext)
          )
          .filter((bounds) => bounds.isFinite)
          .flatMap((bounds) =>
            IEnumerable.from([
              bounds.topLeft,
              bounds.topRight,
              bounds.bottomLeft,
              bounds.bottomRight
            ])
          )
      )
    }

    let rows: number
    let columns: number
    let tiles: Point[][][]
    const invertedProjection = this.projection.clone()
    invertedProjection.invert()

    if ((this.tiledPrinting && this.fitToTile) || !this.tiledPrinting) {
      // no tiles - just one row and column
      rows = 1
      columns = 1
      tiles = [[this.getPointsForTile(targetRect, invertedProjection)]]
    } else {
      // get the size of the printed tiles
      const tileSize = new Size(this.tileWidth, this.tileHeight)
      const tileSizeScaled = new Size(tileSize.width / this.scale, tileSize.height / this.scale)

      // calculate number of rows and columns
      rows = Math.ceil((targetRect.height * this.scale) / tileSize.height)
      columns = Math.ceil((targetRect.width * this.scale) / tileSize.width)

      // calculate tile bounds
      tiles = []
      for (let i = 0; i < rows; i++) {
        const column: Point[][] = []
        for (let k = 0; k < columns; k++) {
          column.push(
            this.getPointsForTile(
              new Rect(
                targetRect.x + tileSizeScaled.width * k,
                targetRect.y + tileSizeScaled.height * i,
                tileSizeScaled.width,
                tileSizeScaled.height
              ),
              invertedProjection
            )
          )
        }
        tiles.push(column)
      }
      // calculate bounds of last row/column
      const lastX = targetRect.x + tileSizeScaled.width * (columns - 1)
      const lastY = targetRect.y + tileSizeScaled.height * (rows - 1)
      const lastWidth = targetRect.width - tileSizeScaled.width * (columns - 1)
      const lastHeight = targetRect.height - tileSizeScaled.height * (rows - 1)
      // set bounds of last row
      for (let k = 0; k < columns - 1; k++) {
        tiles[rows - 1][k] = this.getPointsForTile(
          new Rect(
            targetRect.x + tileSizeScaled.width * k,
            lastY,
            tileSizeScaled.width,
            lastHeight
          ),
          invertedProjection
        )
      }
      // set bounds of last column
      for (let i = 0; i < rows - 1; i++) {
        tiles[i][columns - 1] = this.getPointsForTile(
          new Rect(
            lastX,
            targetRect.y + tileSizeScaled.height * i,
            lastWidth,
            tileSizeScaled.height
          ),
          invertedProjection
        )
      }
      // set bounds of bottom right tile
      tiles[rows - 1][columns - 1] = this.getPointsForTile(
        new Rect(lastX, lastY, lastWidth, lastHeight),
        invertedProjection
      )
    }

    const pageBreakStyle = 'display: block; page-break-after: always;'
    const fitToTileStyle =
      'display: flex; justify-content: center; align-items: center; height: 100vh;'
    let resultingHTML = ''
    // loop through all rows and columns
    for (let i = 0; i < rows; i++) {
      for (let k = 0; k < columns; k++) {
        const lastRow = i === rows - 1
        const lastColumn = k === columns - 1

        const exporter = new SvgExport({
          worldBounds: Rect.EMPTY, // dummy rectangle that's overwritten by worldPoints below
          worldPoints: tiles[i][k],
          scale: this.scale,
          copyDefsElements: true,
          encodeImagesBase64: true,
          inlineSvgImages: true,
          projection: this.projection,
          cssStyleSheet: this.cssStyleSheet
        })
        this.configureMargin(exporter, i === 0, lastRow, k === 0, lastColumn)

        // if fit to page option is selected, recalculate scale based on the tile size
        if (this.tiledPrinting && this.fitToTile) {
          const yScale = exporter.calculateScaleForHeight(this.tileHeight - 2 * this.margin)
          const xScale = exporter.calculateScaleForWidth(this.tileWidth - 2 * this.margin)
          exporter.scale = Math.min(xScale, yScale)
        }

        // export the svg to an XML string
        const svgElement = await exporter.exportSvgAsync(
          graphComponent,
          renderCompletionCallback ? renderCompletionCallback : () => Promise.resolve()
        )

        // skip current iteration if skip empty tiles option
        // is selected and current svg element is empty
        if (this.skipEmptyTiles && this.isEmpty(svgElement)) {
          continue
        }

        if (!lastRow || !lastColumn) {
          resultingHTML += `<div style='${pageBreakStyle}'>`
        } else {
          // if fit to page option is selected, center the svg content
          resultingHTML +=
            this.tiledPrinting && this.fitToTile ? `<div style='${fitToTileStyle}'>` : '<div>'
        }
        resultingHTML += SvgExport.exportSvgString(svgElement)
        resultingHTML += '</div>'
      }
    }

    // display exported svg in new window
    if (this.targetUrl) {
      const printWindow = window.open(this.targetUrl)

      if (printWindow) {
        // automatically close window after print dialog is closed
        printWindow.onafterprint = () => {
          printWindow.close()
        }
        window.addEventListener(
          'message',
          (event) => {
            if (event.data?.message === 'print document loaded') {
              printWindow.postMessage({ message: 'print', content: resultingHTML })
            }
          },
          false
        )
      } else {
        alert('Could not open print preview window - maybe it was blocked?')
      }
    } else {
      const newWindow = openInWindow(resultingHTML, 'Printing preview')
      // automatically close window after print dialog is closed
      newWindow.onafterprint = () => {
        newWindow.close()
      }
      setTimeout(() => {
        newWindow.print()
      }, 0)
    }
  }

  // Returns the corners of the tile, projected back to world coordinates
  private getPointsForTile(bounds: Rect, invertedProjection: Matrix): Point[] {
    return [
      invertedProjection.transform(bounds.topLeft),
      invertedProjection.transform(bounds.topRight),
      invertedProjection.transform(bounds.bottomRight),
      invertedProjection.transform(bounds.bottomLeft)
    ]
  }

  // Returns the projected bounding box for the given points
  private getBoundsFromPoints(points: Iterable<Point>) {
    let bounds = Rect.EMPTY
    for (const p of points) {
      bounds = bounds.add(this.projection.transform(p))
    }
    return bounds
  }

  private configureMargin(
    exporter: SvgExport,
    firstRow: boolean,
    lastRow: boolean,
    firstColumn: boolean,
    lastColumn: boolean
  ): void {
    if (!this.tiledPrinting) {
      // set margin if we don't print tiles
      exporter.margins = this.margin
    } else {
      // for tile printing, set margin only for border tiles
      const top = firstRow ? this.margin : 0
      const bottom = lastRow ? this.margin : 0
      const right = lastColumn ? this.margin : 0
      const left = firstColumn ? this.margin : 0

      exporter.margins = [top, right, bottom, left]
    }
  }

  /**
   * Checks whether the current svg element will produce an empty page
   */
  private isEmpty(svg: SVGSVGElement): boolean {
    return !svg.children[1].children[0].children[0].hasChildNodes()
  }
}
