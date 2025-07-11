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
  Arrow,
  Color,
  GraphBuilder,
  GraphComponent,
  GraphEditorInputMode,
  GroupNodeLabelModel,
  HashMap,
  HierarchicalLayout,
  HierarchicalLayoutData,
  IAnimation,
  IGraph,
  ILayoutAlgorithm,
  INode,
  InputModeEventArgs,
  Insets,
  IRenderTreeElement,
  type LayoutData,
  LayoutExecutor,
  LayoutGrid,
  LayoutGridCellDescriptor,
  LayoutGridColumn,
  LayoutGridRow,
  License,
  List,
  MoveInputMode,
  OrganicLayout,
  OrganicLayoutData,
  Point,
  PointerButtons,
  PolylineEdgeStyle,
  ShapeNodeStyle,
  Size
} from '@yfiles/yfiles'

import type { CellId } from './LayoutGridVisualCreator'
import { generateGradientColors, LayoutGridVisualCreator } from './LayoutGridVisualCreator'
import GraphData from './resources/GraphData'
import { createDemoGroupStyle } from '@yfiles/demo-resources/demo-styles'
import { fetchLicense } from '@yfiles/demo-resources/fetch-license'
import { finishLoading } from '@yfiles/demo-resources/demo-page'

/**
 * Holds the GraphComponent.
 */
let graphComponent: GraphComponent

/**
 * Holds the colors for the nodes based on the column to which they belong.
 */
let nodeFills: Color[]

/**
 * The visual creator for the layout grid.
 */
let layoutGridVisualCreator: LayoutGridVisualCreator | null

/**
 * The visual object for the layout grid that will be added to the graphComponent.
 */
let layoutGridVisualObject: IRenderTreeElement

/**
 * The Partition Grid
 */
let layoutGrid: LayoutGrid

/**
 * Holds the number of columns.
 */
let columnCount: number

/**
 * Holds the number of rows.
 */
let rowCount: number

/**
 * Holds the last applied layout algorithm.
 */
let lastAppliedLayoutAlgorithm: ILayoutAlgorithm = new HierarchicalLayout()

/**
 * Maps each row index with the number of nodes that belong to the particular row.
 */
const rows2nodes = new HashMap<number, INode[]>()

/**
 * Maps each column index with the number of nodes that belong to the particular column.
 */
const columns2nodes = new HashMap<number, INode[]>()

/**
 * Holds whether a layout is currently running.
 */
let layoutRunning = false

/**
 * Holds the selected cell id.
 */
let selectedCellId: CellId | null

/**
 * Runs the demo.
 */
async function run(): Promise<void> {
  License.value = await fetchLicense()
  graphComponent = new GraphComponent('graphComponent')
  initializeGraph(graphComponent.graph)

  createSampleGraph(graphComponent.graph)

  initializeColumnAndRowCount(graphComponent.graph)

  nodeFills = generateNodeColors()

  initializeStyleAndTag(graphComponent.graph)

  initializeLayoutGridVisual()

  configureUserInteraction()

  initializeUI()

  await runLayout()
}

/**
 * Initializes some default styles to the graph elements and adds the necessary event listeners.
 */
function initializeGraph(graph: IGraph): void {
  // set the default style for nodes, this style refers to the nodes without grid restrictions
  graph.nodeDefaults.size = new Size(30, 30)
  graph.nodeDefaults.style = new ShapeNodeStyle({
    fill: 'lightgray',
    stroke: null
  })
  graph.nodeDefaults.shareStyleInstance = false

  // set the default styles for group nodes
  graph.groupNodeDefaults.style = createDemoGroupStyle({ colorSetName: 'demo-palette-22' })
  graph.groupNodeDefaults.labels.layoutParameter =
    new GroupNodeLabelModel().createTabBackgroundParameter()

  // set the default style for edges
  graph.edgeDefaults.style = new PolylineEdgeStyle({
    stroke: 'rgb(51, 102, 153)',
    targetArrow: new Arrow({
      type: 'stealth',
      stroke: 'rgb(51, 102, 153)',
      fill: 'rgb(51, 102, 153)',
      lengthScale: 0.5,
      widthScale: 0.5
    })
  })

  // add a node tag changed listener that will update the node style, as soon as a node changes a row/column
  graph.addEventListener('node-tag-changed', (evt) => {
    const node = evt.item
    updateNodeFill(node)
    updateMapping(node, evt.oldValue)
  })
}

/**
 * Creates a sample graph from structured data.
 */
function createSampleGraph(graph: IGraph): void {
  const graphBuilder = new GraphBuilder(graph)
  graphBuilder.createNodesSource({
    data: GraphData.nodes,
    id: 'id',
    parentId: 'group',
    labels: ['label']
  })
  const groupNodeCreator = graphBuilder.createGroupNodesSource(GraphData.groups, 'id').nodeCreator
  groupNodeCreator.createLabelBinding(() => 'Group')
  graphBuilder.createEdgesSource(GraphData.edges, 'source', 'target')

  graphBuilder.buildGraph()
}

/**
 * Determines the number of columns and rows needed for the given graph.
 */
function initializeColumnAndRowCount(graph: IGraph): void {
  // find the desired number of rows/columns
  let maxColumnId = 0
  let maxRowId = 0
  for (const node of graph.nodes) {
    if (!graph.isGroupNode(node)) {
      maxColumnId = Math.max(node.tag.column, maxColumnId)
      maxRowId = Math.max(node.tag.row, maxRowId)
    }
  }
  columnCount = maxColumnId + 1
  rowCount = maxRowId + 1
}

/**
 * Updates node colors based on the column/row to which the nodes belong and
 * replaces node tags with appropriate CellId instances.
 */
function initializeStyleAndTag(graph: IGraph): void {
  for (const node of graph.nodes) {
    if (graph.isGroupNode(node)) {
      continue
    }

    node.tag = {
      columnIndex: node.tag.column,
      rowIndex: node.tag.row
    }

    // check if the given node is assigned to a layout grid cell ...
    if (hasActiveRestrictions(node)) {
      // ... and update the node color appropriately
      updateNodeFill(node)
    }
  }
}

/**
 * Initializes the visual creator for the layout grid and adds it to the background of the graph
 * component.
 */
function initializeLayoutGridVisual(): void {
  // if there exists a layout grid object, remove it
  removeLayoutGridVisual()
  // add the visual object to the canvas
  layoutGridVisualCreator = new LayoutGridVisualCreator(rowCount, columnCount)
  layoutGridVisualObject = graphComponent.renderTree.createElement(
    graphComponent.renderTree.backgroundGroup,
    layoutGridVisualCreator
  )
}

/**
 * Removes the current layout grid visualization.
 */
function removeLayoutGridVisual(): void {
  if (layoutGridVisualCreator) {
    layoutGridVisualCreator = null
    graphComponent.renderTree.remove(layoutGridVisualObject)
  }
}

/**
 * Configures user interaction for this demo.
 */
function configureUserInteraction(): void {
  const inputMode = new GraphEditorInputMode()

  const graph = graphComponent.graph
  // add a drag listener that will determine the column/row indices of the dragged elements based on their last
  // positions
  inputMode.moveSelectedItemsInputMode.addEventListener('drag-finished', onDragFinished)
  inputMode.moveUnselectedItemsInputMode.addEventListener('drag-finished', onDragFinished)

  // update the node style for the newly created node and run a layout
  inputMode.addEventListener('node-created', async (evt) => {
    const node = evt.item
    if (!graph.isGroupNode(node)) {
      // if a node is created, we have to determine the column/row indices based on the position where the node is
      // created
      const cellId = determineCellIndex(node.layout.center)
      node.tag = {
        rowIndex: cellId.rowIndex,
        columnIndex: cellId.columnIndex
      }
    } else {
      graph.addLabel(node, 'Group')
    }
    // finally, run a layout using the last applied layout algorithm
    await runLayout()
  })

  // whenever an edge is created, run a layout using the last applied layout algorithm
  inputMode.createEdgeInputMode.addEventListener('edge-created', async () => {
    await runLayout()
  })

  // whenever a graph element is deleted, run a layout using the last applied layout algorithm
  inputMode.addEventListener('deleted-selection', async () => {
    await runLayout()
  })

  // before a node is removed, remove its tag so that the row2nodes and column2nodes maps are updated
  inputMode.addEventListener('deleting-selection', (evt) => {
    for (const item of evt.selection) {
      if (item instanceof INode) {
        item.tag = {
          rowIndex: -1,
          columnIndex: -1
        }
      }
    }
  })

  // whenever a right-click on a cell occurs (on canvas), determine the row/column that is selected and highlight it
  inputMode.addEventListener('canvas-clicked', (evt) => {
    toggleDeleteButtonsVisibility(true, Point.ORIGIN)
    if (evt.pointerButtons === PointerButtons.MOUSE_RIGHT && layoutGridVisualCreator) {
      toggleDeleteButtonsVisibility(false, evt.location)
    }
  })

  // disable visibility buttons if are already enabled
  inputMode.addEventListener('item-clicked', () => {
    if (!document.querySelector<HTMLInputElement>(`#delete-row`)!.disabled) {
      toggleDeleteButtonsVisibility(true, Point.ORIGIN)
    }
  })

  // update toolbar when selection changes
  inputMode.addEventListener('multi-selection-finished', updateToolbar)

  graphComponent.inputMode = inputMode

  // run the layout whenever a cut or paste action is performed, so that the layout is updated if new nodes are
  // added to the graph
  graphComponent.clipboard.addEventListener('items-pasted', async () => {
    await runLayout()
  })
  graphComponent.clipboard.addEventListener('items-cut', async () => {
    await runLayout()
  })
}

/**
 * Updates the node restrictions when a node movement has finished.
 */
async function onDragFinished(_evt: InputModeEventArgs, moveInputMode: MoveInputMode) {
  const graph = graphComponent.graph
  const affectedItems = moveInputMode.affectedItems.ofType(INode)
  for (const node of affectedItems) {
    if (!graph.isGroupNode(node)) {
      updateNodeRestrictions(node)
    } else {
      // for the group nodes, we only have to update the indices of their content
      const stack = [node]
      while (stack.length > 0) {
        const startNode = stack.pop()!
        for (const child of graph.getChildren(startNode)) {
          updateNodeRestrictions(child)
          stack.push(child)
        }
      }
    }
  }
  await runLayout()
}

/**
 * Updates the partition cell indices for the given node only if it has active restrictions.
 * @param node The node to be examined
 */
function updateNodeRestrictions(node: INode): void {
  if (!hasActiveRestrictions(node)) {
    return
  }
  // some offsets to be used when the rect lies on the border of two columns/rows
  const cellId = determineCellIndex(node.layout.center)
  // remove the node from the columns/rows' mapping before the last movement
  node.tag = {
    rowIndex: cellId.rowIndex,
    columnIndex: cellId.columnIndex
  }
}

/**
 * Updates the style of the given node.
 * @param node The given node
 */
function updateNodeFill(node: INode): void {
  const style = node.style
  if (style instanceof ShapeNodeStyle) {
    let color: Color = Color.LIGHT_SLATE_GRAY
    if (hasActiveRestrictions(node) && nodeFills) {
      // determine the node's fill based on the column and change the opacity depending on the row to which the node
      // belongs
      const nodeFill = nodeFills[node.tag.columnIndex]
      if (nodeFill) {
        color = new Color(
          nodeFill.r,
          nodeFill.g,
          nodeFill.b,
          node.tag.rowIndex % 2 === 0 ? 255 : 0.65 * 255
        )
      }
    }
    style.fill = color
  }
}

/**
 * Arranges the graph with the given layout algorithm. If no argument is given, the last applied
 * layout algorithm will be used.
 * @param algorithm The given layout algorithm
 */
async function runLayout(algorithm?: ILayoutAlgorithm): Promise<void> {
  const layoutAlgorithm = algorithm || lastAppliedLayoutAlgorithm
  if (layoutAlgorithm instanceof OrganicLayout && !canExecuteOrganicLayout()) {
    alert('Group nodes cannot span more multiple grid cells.')
    return
  }
  if (layoutRunning) {
    return
  }
  layoutRunning = true
  // disable the UI
  setUIDisabled(true)

  // create the layout grid
  layoutGrid = createLayoutGrid()

  // set the layout grid to the layoutGridVisualCreator, so it can use the new layout of the rows/columns
  // for its animation
  if (layoutGridVisualCreator) {
    layoutGridVisualCreator.grid = layoutGrid
  }
  // create the layout data containing the grid descriptors
  const layoutData = createLayoutData(layoutAlgorithm)

  // configure the layout algorithm
  configureAlgorithm(layoutAlgorithm)
  try {
    // configure the layout executor and start the layout
    const executor = new CustomLayoutExecutor(graphComponent, layoutAlgorithm)
    executor.animationDuration = '1s'
    executor.layoutData = layoutData
    executor.animateViewport = true
    await executor.start()
  } finally {
    setUIDisabled(false)
    // adjust the bounds of the graph component so that empty rows/columns are also taken under consideration
    adjustGraphComponentBounds()
    layoutRunning = false
    lastAppliedLayoutAlgorithm = layoutAlgorithm
  }
}

/**
 * Configures the given layout algorithm.
 * @param layoutAlgorithm The given layout algorithm
 */
function configureAlgorithm(layoutAlgorithm: ILayoutAlgorithm): void {
  if (layoutAlgorithm instanceof HierarchicalLayout) {
    layoutAlgorithm.nodeDistance = 25
  } else if (layoutAlgorithm instanceof OrganicLayout) {
    layoutAlgorithm.defaultMinimumNodeDistance = 30
    layoutAlgorithm.defaultPreferredEdgeLength = 60
    layoutAlgorithm.deterministic = true
    layoutAlgorithm.edgeLabelPlacement = 'integrated'
  }
}

/**
 * Creates a layout data for the given layout algorithm.
 */
function createLayoutData(layoutAlgorithm: ILayoutAlgorithm): LayoutData | null {
  const layoutGridDescriptors = createLayoutGridDescriptors()
  if (layoutAlgorithm && layoutGridDescriptors) {
    const layoutData =
      layoutAlgorithm instanceof HierarchicalLayout
        ? new HierarchicalLayoutData()
        : new OrganicLayoutData()
    layoutData.layoutGridData.layoutGridCellDescriptors = layoutGridDescriptors
    return layoutData
  }
  return null
}

/**
 * Updates the mapping between the columns/rows and the number of nodes that each column/row
 * contains. It has to be called whenever a node changes a column/row.
 * @param node The given node
 * @param oldTag The given node's old tag
 */
function updateMapping(node: INode, oldTag: CellId): void {
  // remove from old row if there was in one
  if (oldTag != null && oldTag.rowIndex != null && oldTag.rowIndex !== -1) {
    const oldRowNodes = rows2nodes.get(oldTag.rowIndex)
    if (oldRowNodes) {
      oldRowNodes.splice(oldRowNodes.indexOf(node), 1)
    }
  }
  // add to the new row
  const rowIndex = node.tag.rowIndex
  if (rowIndex !== -1) {
    let rowNodes = rows2nodes.get(rowIndex)
    if (!rowNodes) {
      rowNodes = []
      rows2nodes.set(rowIndex, rowNodes)
    }
    if (rowNodes.indexOf(node) < 0) {
      rowNodes.push(node)
    }
  }

  if (oldTag != null && oldTag.columnIndex != null && oldTag.columnIndex !== -1) {
    const oldColumnNodes = columns2nodes.get(oldTag.columnIndex)
    if (oldColumnNodes) {
      oldColumnNodes.splice(oldColumnNodes.indexOf(node), 1)
    }
  }
  // add to the new row
  const columnIndex = node.tag.columnIndex
  if (columnIndex !== -1) {
    let columnNodes = columns2nodes.get(columnIndex)
    if (!columnNodes) {
      columnNodes = []
      columns2nodes.set(columnIndex, columnNodes)
    }
    if (columnNodes.indexOf(node) < 0) {
      columnNodes.push(node)
    }
  }
}

/**
 * Returns an array containing the indices of the rows/columns that contain nodes (non-empty).
 * @param stripeCount the number of rows/columns in the current layout grid
 * @param isRow `true` if we examine the rows, `false` otherwise
 * @returns An array containing the indices of the non-empty rows/columns
 */
function getNonEmptyIndices(stripeCount: number, isRow: boolean): number[] {
  const nonEmptyIndices = []
  const map = isRow ? rows2nodes : columns2nodes
  for (let i = 0; i < stripeCount; i++) {
    const nodes = map.get(i)
    if (nodes && nodes.length > 0) {
      nonEmptyIndices.push(i)
    }
  }
  return nonEmptyIndices
}

/**
 * Determines the cell indices to which the given point belongs.
 * @param point The given point
 * @returns The row/column indices
 */
function determineCellIndex(point: Point): CellId {
  let rowIndex = -1
  let columnIndex = -1

  if (existsLayoutGrid()) {
    const firstRow = layoutGrid.rows.first()!
    const lastRow = layoutGrid.rows.last()!
    const firstColumn = layoutGrid.columns.first()!
    const lastColumn = layoutGrid.columns.last()!

    // find the row to which the rect belongs
    layoutGrid.rows.forEach((rowDescriptor, i) => {
      const minRowY = rowDescriptor.position
      const maxRowY = minRowY + rowDescriptor.height
      const minColumnX = firstColumn.position
      const maxColumnX = lastColumn.position + lastColumn.width
      if (
        point.y >= minRowY &&
        point.y <= maxRowY &&
        point.x >= minColumnX &&
        point.x < maxColumnX
      ) {
        rowIndex = i
        return
      }
    })

    // find the column to which the rect belongs
    layoutGrid.columns.forEach((columnDescriptor, i) => {
      const minColumnX = columnDescriptor.position
      const maxColumnX = minColumnX + columnDescriptor.width
      const minRowY = firstRow.position
      const maxRowY = lastRow.position + lastRow.height
      if (
        point.x >= minColumnX &&
        point.x <= maxColumnX &&
        point.y >= minRowY &&
        point.y < maxRowY
      ) {
        columnIndex = i
        return
      }
    })
  }
  return {
    rowIndex,
    columnIndex
  }
}

/**
 * Adjusts the bounds of the graph component so that possible empty rows/columns on the top/bottom
 * or left/right are also included in the graphComponent's bounds. This is necessary since method
 * {@link GraphComponent.fitGraphBounds} considers only the content rectangle of the graph
 * component which is defined from the positions of graph elements (nodes, edges, bends, etc.) but,
 * not from visual objects, like the layout grid visual. This means that possible empty rows on
 * the top/bottom or columns on the left/right have to be manually included in the graphComponent's
 * bounds using special insets.
 */
function adjustGraphComponentBounds(): void {
  if (existsLayoutGrid()) {
    const nonEmptyRows = getNonEmptyIndices(layoutGrid.rows.size, true)
    // empty rows on the top
    const emptyTop = nonEmptyRows[0]
    // empty rows on the bottom
    const emptyBottom = layoutGrid.rows.size - nonEmptyRows[nonEmptyRows.length - 1] - 1
    const nonEmptyColumns = getNonEmptyIndices(layoutGrid.columns.size, false)
    // empty columns on the left
    const emptyLeft = nonEmptyColumns[0]
    // empty columns on the right
    const emptyRight = layoutGrid.columns.size - nonEmptyColumns[nonEmptyColumns.length - 1] - 1

    const firstRow = layoutGrid.rows.first()!
    const lastRow = layoutGrid.rows.last()!
    const firstColumn = layoutGrid.columns.first()!
    const lastColumn = layoutGrid.columns.last()!

    if (emptyLeft && emptyTop && emptyRight && emptyBottom) {
      const insets = new Insets(
        emptyTop * firstRow.height,
        emptyRight * lastColumn.width,
        emptyBottom * lastRow.height,
        emptyLeft * firstColumn.width
      )
      void graphComponent.fitGraphBounds(insets)
    }
  }
}

/**
 * Returns a partition cell for the given node if it has valid row/column indices or
 * `null` otherwise.
 * @param node The given node to create the cell id for
 * @returns A partition cell for the given node if it has valid row/column indices
 * or `null` otherwise
 */
function createNodeCellId(node: INode): LayoutGridCellDescriptor | null {
  if (hasActiveRestrictions(node)) {
    return layoutGrid.createCellDescriptor(node.tag.rowIndex, node.tag.columnIndex)
  }
  return null
}

/**
 * Returns a partition cell for the given group node if any of its descendants has a valid
 * partition cell id or
 * `null` otherwise.
 * @param node The group node to create the cell id for
 * @returns A partition cell id for the given group node if any of its descendants
 * has a valid partition cell id or `null` otherwise
 */
function getGroupNodeCellId(node: INode): LayoutGridCellDescriptor | null {
  const graph = graphComponent.graph

  // collect the LayoutGridRow and LayoutGridColumn of the descendants of the node
  const rowSet = new List<LayoutGridRow>()
  const columnSet = new List<LayoutGridColumn>()

  for (const child of graph.getChildren(node)) {
    // get the cell id of the child
    const childCellId = !graph.isGroupNode(child)
      ? createNodeCellId(child)
      : getGroupNodeCellId(child)
    // if there is a cell id, add all row and column descriptors to our row/columnSets
    if (childCellId) {
      for (const cellEntry of childCellId.cells) {
        rowSet.add(cellEntry.row)
        columnSet.add(cellEntry.column)
      }
    }
  }

  if (rowSet.size !== 0 && columnSet.size !== 0) {
    // at least one row and one column is specified by the children and should be spanned by this group node
    return layoutGrid.createCellSpanDescriptor(rowSet, columnSet)
  }
  // otherwise the group node doesn't span any partition cells
  return null
}

/**
 * Returns whether a given node has valid row/column indices.
 * @param node The given node
 * @returns `true` if the given node has valid row/column indices,
 *   `false` otherwise
 */
function hasActiveRestrictions(node: INode): boolean {
  return node.tag && node.tag.rowIndex >= 0 && node.tag.columnIndex >= 0
}

/**
 * Returns whether a layout grid currently exists.
 */
function existsLayoutGrid(): boolean | LayoutGrid {
  return layoutGrid && layoutGrid.rows.size > 0 && layoutGrid.columns.size > 0
}

/**
 * Returns the layout grid for each layout run.
 * @returns The newly created layout grid
 */
function createLayoutGrid(): LayoutGrid {
  const grid = new LayoutGrid(rowCount, columnCount)

  const minimumColumnWidth = getFloatValue('columnWidth')
  const leftInset = getFloatValue('leftInset')
  const rightInset = getFloatValue('rightInset')
  const fixedColumnOrder = document.querySelector<HTMLInputElement>(`#fix-column-order`)!.checked

  for (const columnDescriptor of grid.columns) {
    columnDescriptor.minimumWidth = minimumColumnWidth || 0
    columnDescriptor.leftPadding = leftInset || 0
    columnDescriptor.rightPadding = rightInset || 0
    columnDescriptor.indexFixed = fixedColumnOrder
  }

  const minimumRowHeight = getFloatValue('rowHeight')
  const topInset = getFloatValue('topInset')
  const bottomInset = getFloatValue('bottomInset')

  for (const rowDescriptor of grid.rows) {
    rowDescriptor.minimumHeight = minimumRowHeight || 0
    rowDescriptor.topPadding = topInset || 0
    rowDescriptor.bottomPadding = bottomInset || 0
  }
  return grid
}

/**
 * Returns the numeric value of the HTMLInputElement with the specified ID.
 */
function getFloatValue(id: string): number {
  return parseFloat(document.querySelector<HTMLInputElement>(`#${id}`)!.value)
}

/**
 * Returns the layout grid descriptors for each layout run or null if no layout grid exists
 */
function createLayoutGridDescriptors(): ((node: INode) => LayoutGridCellDescriptor | null) | null {
  if (rowCount > 0 && columnCount > 0) {
    const graph = graphComponent.graph
    return (node: INode) => {
      if (!graph.isGroupNode(node)) {
        return createNodeCellId(node)
      }
      // we have a group node
      const stretchGroups =
        document.querySelector<HTMLInputElement>(`#stretch-group-nodes`)!.checked
      if (!stretchGroups || graph.getChildren(node).size === 0) {
        // the group nodes shall not be stretched or the group node has no children, so we return null
        // this means the group node will be adjusted to contain its children but has no specific assignment to cells
        return null
      }
      // the group nodes has children whose partition cells shall be spanned so a spanning PartitionCellId is
      // created that contains all rows/column of its child nodes.
      return getGroupNodeCellId(node)
    }
  }
  return null
}

/**
 * Wires up the UI.
 */
function initializeUI(): void {
  const runHierarchicalLayoutButton = document.querySelector<HTMLButtonElement>(
    "button[data-command='HierarchicalLayout']"
  )!
  runHierarchicalLayoutButton.addEventListener('click', async () => {
    if (canExecuteAnyLayout()) {
      await runLayout(new HierarchicalLayout())
    }
  })

  const runOrganicLayoutButton = document.querySelector<HTMLButtonElement>(
    "button[data-command='OrganicLayout']"
  )!
  runOrganicLayoutButton.addEventListener('click', async () => {
    if (canExecuteOrganicLayout()) {
      await runLayout(new OrganicLayout())
    }
  })

  const addRestrictionsButton = document.querySelector<HTMLButtonElement>(
    "button[data-command='GenerateGridRestrictions']"
  )!
  addRestrictionsButton.addEventListener('click', async () => {
    if (canAddRestrictions()) {
      await addRestrictions()
    }
  })

  const removeRestrictionsButton = document.querySelector<HTMLButtonElement>(
    "button[data-command='RemoveRestrictions']"
  )!
  removeRestrictionsButton.addEventListener('click', async () => {
    if (canRemoveRestrictions()) {
      await removeRestrictions()
    }
  })

  document.querySelector<HTMLButtonElement>('#add-row')!.addEventListener('click', async () => {
    rowCount++
    // if the grid does not exist until now, create at least one column
    if (columnCount === 0) {
      columnCount = 1
    }
    nodeFills = generateNodeColors()
    updateGrid()
    // run the last applied layout algorithm
    await runLayout()
  })
  document.querySelector<HTMLButtonElement>('#add-column')!.addEventListener('click', async () => {
    columnCount++
    // if the grid does not exist until now, create at least one row
    if (rowCount === 0) {
      rowCount = 1
    }
    nodeFills = generateNodeColors()
    updateGrid()
    // run the last applied layout algorithm
    await runLayout()
  })
  document.querySelector<HTMLButtonElement>('#delete-row')!.addEventListener('click', async () => {
    if (selectedCellId && selectedCellId.rowIndex !== -1) {
      removeRow(selectedCellId.rowIndex)
      await updateGridAfterRemove()
    }
  })

  document
    .querySelector<HTMLButtonElement>('#delete-column')!
    .addEventListener('click', async () => {
      if (selectedCellId && selectedCellId.columnIndex !== -1) {
        removeColumn(selectedCellId.columnIndex)
        await updateGridAfterRemove()
      }
    })

  document
    .querySelector<HTMLButtonElement>('#delete-empty-rows-columns')!
    .addEventListener('click', async () => {
      if (existsLayoutGrid()) {
        for (let i = 0; i < rowCount; i++) {
          const nodes = rows2nodes.get(i)
          if (!nodes || nodes.length === 0) {
            removeRow(i)
            i = 0
          }
        }
        for (let i = 0; i < columnCount; i++) {
          const nodes = columns2nodes.get(i)
          if (!nodes || nodes.length === 0) {
            removeColumn(i)
            i = 0
          }
        }
        await updateGridAfterRemove()
      }
    })

  document.querySelector('#apply-configuration')!.addEventListener('click', async () => {
    updateGrid()
    await runLayout()
  })

  // for each input, add a change listener to validate that the input is within the desired limits [0, 200]
  const inputFields = document.getElementsByClassName('option-input')
  for (const inputField of inputFields) {
    inputField.addEventListener('change', (event) => isValidInput(event, 200), false)
  }

  updateToolbar()
}

/**
 * Removes the selected row from the grid.
 * @param selectedIndex The selected row's index
 */
function removeRow(selectedIndex: number): void {
  for (let i = selectedIndex; i < layoutGrid.rows.size; i++) {
    const nodes = rows2nodes.get(i)
    if (nodes && nodes.length > 0) {
      for (const node of nodes.slice(0)) {
        const columnIndex = i === selectedIndex ? -1 : node.tag.columnIndex
        const rowIndex = i === selectedIndex ? -1 : node.tag.rowIndex - 1
        node.tag = {
          columnIndex,
          rowIndex
        }
      }
    }
  }
  rowCount--
  // if this is the last row to be removed, reset the column number too
  if (rowCount === 0) {
    columnCount = 0
  }
}

/**
 * Removes the selected column from the grid.
 * @param selectedIndex The selected row's index
 */
function removeColumn(selectedIndex: number): void {
  for (let i = selectedIndex; i < layoutGrid.columns.size; i++) {
    const nodes = columns2nodes.get(i)
    if (nodes && nodes.length > 0) {
      for (const node of nodes.slice(0)) {
        const columnIndex = i === selectedIndex ? -1 : node.tag.columnIndex - 1
        const rowIndex = i === selectedIndex ? -1 : node.tag.rowIndex
        node.tag = {
          columnIndex,
          rowIndex
        }
      }
    }
  }
  columnCount--
  // if this is the last column to be removed, reset the row number too
  if (columnCount === 0) {
    rowCount = 0
  }
}

/**
 * Updates the grid and the layout after a delete operation has been performed.
 */
async function updateGridAfterRemove(): Promise<void> {
  updateGrid()
  await runLayout()
  toggleDeleteButtonsVisibility(true, Point.ORIGIN)
}

/**
 * Adds or removes the layout grid visual.
 */
function updateGrid() {
  if (rowCount > 0 || columnCount > 0) {
    if (rowCount === 0) {
      rowCount = 1
    }
    if (columnCount === 0) {
      columnCount = 1
    }
    // update the layout grid visual
    initializeLayoutGridVisual()
  } else {
    removeLayoutGridVisual()
  }
}

/**
 * Checks whether the input provided by the user is valid, i.e., not larger than the desired value.
 * @param input The user's input
 * @param maxValue The maximum expected value
 * @returns `true` if the input provided by the user is valid, i.e., not larger
 * than the desired value, `false` otherwise
 */
function isValidInput(input: Event, maxValue: number): boolean {
  const target = input.target as HTMLInputElement
  const value = parseInt(target.value)
  if (value > maxValue) {
    alert(`Values cannot be larger than ${maxValue}`)
    target.value = maxValue.toString()
    return false
  }
  if (value < 0) {
    alert('Values must be non-negative')
    target.value = '0'
    return false
  }
  return true
}

/**
 * Checks whether a layout algorithm can be executed. A layout algorithm cannot be executed
 * when the graph is empty or a layout algorithm is running.
 */
function canExecuteAnyLayout(): boolean {
  // don't allow layouts for empty graphs
  return graphComponent.graph.nodes.some()
}

/**
 * Determines whether the organic layout can be executed.
 */
function canExecuteOrganicLayout(): boolean {
  if (!canExecuteAnyLayout()) {
    return false
  }

  // the __Organic__ layout doesn't support stretching a group node if it contains child nodes assigned
  // to different rows or columns. In this case the __Organic__ layout button will be disabled.
  const graph = graphComponent.graph
  for (const node of graph.nodes) {
    if (graph.isGroupNode(node)) {
      const cellId = getFirstChildActiveRestriction(node)
      for (const descendant of graph.groupingSupport.getDescendants(node)) {
        if (
          hasActiveRestrictions(descendant) &&
          (cellId.rowIndex !== descendant.tag.rowIndex ||
            cellId.columnIndex !== descendant.tag.columnIndex)
        ) {
          // change the last applied layout algorithm to the hierarchical layout
          lastAppliedLayoutAlgorithm = new HierarchicalLayout()
          return false
        }
      }
    }
  }
  return true
}

/**
 * Returns the cell id of the first child node that is not a group node.
 * @param groupNode The group node
 * @returns The cell id indices
 */
function getFirstChildActiveRestriction(groupNode: INode): CellId {
  const graph = graphComponent.graph

  for (const descendant of graph.getChildren(groupNode)) {
    if (!graph.isGroupNode(descendant) && hasActiveRestrictions(descendant)) {
      return { rowIndex: descendant.tag.rowIndex, columnIndex: descendant.tag.columnIndex }
    }
  }
  return {
    rowIndex: -1,
    columnIndex: -1
  }
}

/**
 * Determines whether the restrictions can be removed, i.e., if there
 * exists at least one selected node (that is not a group node) with active grid restrictions.
 */
function canRemoveRestrictions(): boolean {
  const graph = graphComponent.graph
  for (const node of graphComponent.selection.nodes) {
    if (!graph.isGroupNode(node) && hasActiveRestrictions(node)) {
      return true
    }
  }
  return false
}

/**
 * Removes the current restrictions.
 */
async function removeRestrictions(): Promise<void> {
  const graph = graphComponent.graph
  for (const node of graphComponent.selection.nodes) {
    if (!graph.isGroupNode(node)) {
      node.tag = {
        columnIndex: -1,
        rowIndex: -1
      }
    }
  }
  updateToolbar()
  // run the last applied layout algorithm
  await runLayout()
}

/**
 * Determines whether new restrictions can be added, i.e., if there
 * exists at least one selected node (that is not a group node) and has no active grid
 * restrictions.
 */
function canAddRestrictions(): boolean {
  const graph = graphComponent.graph
  for (const node of graphComponent.selection.nodes) {
    if (!graph.isGroupNode(node) && !hasActiveRestrictions(node)) {
      return true
    }
  }
  return false
}

/**
 * Adds new restrictions, i.e., each node with no active restrictions will be assigned to
 * the cell that belongs based on its current position.
 */
async function addRestrictions(): Promise<void> {
  // if there exists no grid, we cannot add placement restrictions
  if (!existsLayoutGrid()) {
    return
  }

  // add the restrictions for the selected nodes
  const graph = graphComponent.graph
  for (const node of graphComponent.selection.nodes) {
    if (!graph.isGroupNode(node)) {
      // if the node has no restrictions, find the cell to which it belongs.
      const cellId = determineCellIndex(node.layout.center)
      const columnIndex = cellId.columnIndex
      const rowIndex = cellId.rowIndex
      node.tag = {
        columnIndex,
        rowIndex
      }
    }
  }
  updateToolbar()
  // run the last applied layout algorithm
  await runLayout()
}

/**
 * Generates an array of gradient colors between from orange to red.
 */
function generateNodeColors(): Color[] {
  return generateGradientColors(Color.ORANGE, Color.RED, columnCount)
}

/**
 * Enables/Disables some toolbar elements and the input mode of the graph component.
 * @param disabled `true` if the UI should be disabled, `false` otherwise.
 */
function setUIDisabled(disabled: boolean): void {
  document.querySelector<HTMLInputElement>(`#add-row`)!.disabled = disabled
  document.querySelector<HTMLInputElement>(`#add-column`)!.disabled = disabled
  document.querySelector<HTMLInputElement>(`#delete-empty-rows-columns`)!.disabled = disabled
}

/**
 * Enables/disables the delete column/row buttons and updates the layout grid visual
 * @param disabled `true` if the buttons should be disabled, `false` otherwise.
 * @param location The location of the last mouse event
 */
function toggleDeleteButtonsVisibility(disabled: boolean, location: Point): void {
  document.querySelector<HTMLInputElement>(`#delete-row`)!.disabled = disabled
  document.querySelector<HTMLInputElement>(`#delete-column`)!.disabled = disabled

  if (layoutGridVisualCreator) {
    const cellId = disabled ? null : determineCellIndex(location)
    selectedCellId = cellId
    layoutGridVisualCreator.selectedCellId = cellId
    graphComponent.invalidate()
  }
}

function updateToolbar() {
  document.querySelector<HTMLButtonElement>(
    "button[data-command='GenerateGridRestrictions']"
  )!.disabled = !canAddRestrictions()
  document.querySelector<HTMLButtonElement>("button[data-command='RemoveRestrictions']")!.disabled =
    !canRemoveRestrictions()
}

/**
 * A class for implementing a layout executor that runs two parallel animations, i.e., animate the
 * graph itself as well as the layout grid visualization.
 */
class CustomLayoutExecutor extends LayoutExecutor {
  createLayoutAnimation(): any {
    const graphMorphAnimation = super.createLayoutAnimation()
    if (layoutGridVisualCreator) {
      // we want to animate the graph itself as well as the partition
      // grid visualization, so we use a parallel animation:
      return IAnimation.createParallelAnimation([graphMorphAnimation, layoutGridVisualCreator])
    }
    return graphMorphAnimation
  }
}

run().then(finishLoading)
