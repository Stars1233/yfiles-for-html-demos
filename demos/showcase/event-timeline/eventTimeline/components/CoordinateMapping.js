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
/**
 * CoordinateMapping object which organizes the various functions and parameters that map
 * temporal units to spatial ones (and vice versa).
 */
export class CoordinateMapping {
  t0Ms = 0
  yUnits = 0
  stretchX = 1
  stretchY = 1
  timeUnitMs = 1000
  unitHeight = 100

  /**
   * Maps a given time to a corresponding x-coordinate.
   * @param time The time.
   * @param stretch The stretch factor.
   * @returns The corresponding x-coordinate.
   */
  timeToX(time, stretch = this.stretchX) {
    const dtUnits = (time.getTime() - this.t0Ms) / this.timeUnitMs
    return dtUnits * stretch
  }

  /**
   * Maps a given x-coordinate to a corresponding time.
   * @param worldPosX The x-coordinate.
   * @param stretch The stretch factor.
   * @returns The corresponding time.
   */
  xToTime(worldPosX, stretch = this.stretchX) {
    const dtUnits = worldPosX / stretch
    const timeMs = this.t0Ms + dtUnits * this.timeUnitMs
    return new Date(timeMs)
  }

  /**
   * Transforms a given world y-coordinate into its corresponding logical y-units.
   * @param worldPosY The world y-coordinate to be mapped.
   * @param stretch The stretch factor.
   * @returns The corresponding logical y-units.
   */
  mapPositionToYUnits(worldPosY, stretch = this.stretchY) {
    return worldPosY / (this.unitHeight * stretch)
  }

  /**
   * Transforms logical y-units to world coordinates.
   * @param units The logical y-units.
   * @param stretch The stretch factor.
   * @returns The corresponding world y-coordinate.
   */
  mapYUnitsToPosition(units, stretch = this.stretchY) {
    return units * this.unitHeight * stretch
  }
}
