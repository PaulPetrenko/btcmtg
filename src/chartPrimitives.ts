import type {
  IPanePrimitive,
  IPanePrimitivePaneView,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  PaneAttachedParameter,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from 'lightweight-charts'
import { CANDLE_VOLUME_GAP, type ChartTheme } from './chartTheme'
import { formatPrice } from './format'

/*
 * Custom drawings on the chart's own canvas, through the library's public
 * "primitives" API (Lightweight Charts 5). The library calls them on every
 * redraw, so they always use the chart's current coordinates: live updates,
 * scrolling, zooming, resizing and price-scale changes need no extra wiring.
 * They draw only; they don't handle the mouse, so chart interactions and the
 * crosshair are unaffected.
 */

/** The canvas target the library passes to renderers. */
type Target = Parameters<IPrimitivePaneRenderer['draw']>[0]

const TAG_FONT_SIZE = 10
const TAG_LINE_HEIGHT = 13

/**
 * Last-price tag (Frame 47): a short connector from the plot into the price
 * axis, then a pill inside a thin frame, showing the last close.
 * Hidden when the last close is outside the visible price range (D11).
 */
export class LastPriceTag implements ISeriesPrimitive<Time> {
  private series: ISeriesApi<SeriesType, Time> | null = null
  private requestUpdate: (() => void) | null = null
  private price: number | null = null
  private look: ChartTheme
  private readonly views: readonly IPrimitivePaneView[]

  constructor(look: ChartTheme) {
    this.look = look
    const renderer: IPrimitivePaneRenderer = { draw: (target) => this.draw(target) }
    this.views = [{ renderer: () => renderer }]
  }

  attached({ series, requestUpdate }: SeriesAttachedParameter<Time, SeriesType>): void {
    this.series = series
    this.requestUpdate = requestUpdate
  }

  detached(): void {
    this.series = null
    this.requestUpdate = null
  }

  /** The last candle's close, or null when there are no candles. */
  setPrice(price: number | null): void {
    if (price === this.price) return
    this.price = price
    this.requestUpdate?.()
  }

  setLook(look: ChartTheme): void {
    this.look = look
    this.requestUpdate?.()
  }

  priceAxisPaneViews(): readonly IPrimitivePaneView[] {
    return this.views
  }

  private draw(target: Target): void {
    if (this.price === null || !this.series) return
    const coordinate = this.series.priceToCoordinate(this.price)
    if (coordinate === null) return
    const { tag, tagGeometry: g, fontFamily } = this.look

    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      // Whole pixels, so the tag doesn't shimmer as the price changes.
      const y = Math.round(coordinate)
      if (y < 0 || y > mediaSize.height) return // outside the visible range: hidden (D11)

      ctx.font = `${TAG_FONT_SIZE}px ${fontFamily}`
      const text = formatPrice(this.price!)
      const textWidth = tabularWidth(ctx, text)
      const pillWidth = Math.max(g.minWidth, Math.ceil(textWidth) + 2 * g.paddingX)
      const pillHeight = TAG_LINE_HEIGHT + 2 * g.paddingY
      const frameWidth = pillWidth + 2 * g.framePadding + 2
      const frameHeight = pillHeight + 2 * g.framePadding + 2
      const frameX = g.connector
      const frameY = y - Math.round(frameHeight / 2)

      // Connector from the plot edge to the frame.
      ctx.fillStyle = tag.line
      ctx.fillRect(0, y, g.connector, 1)

      // Frame: panel-coloured fill with a 1 px border.
      ctx.beginPath()
      ctx.roundRect(frameX + 0.5, frameY + 0.5, frameWidth - 1, frameHeight - 1, g.frameRadius)
      ctx.fillStyle = tag.frameFill
      ctx.fill()
      ctx.lineWidth = 1
      ctx.strokeStyle = tag.frame
      ctx.stroke()

      // Pill with its shadow layers. Canvas shadows ignore the canvas scale,
      // so they are scaled by the pixel ratio by hand.
      const pillX = frameX + 1 + g.framePadding
      const pillY = frameY + 1 + g.framePadding
      const ratio = window.devicePixelRatio || 1
      ctx.beginPath()
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2)
      ctx.fillStyle = tag.background
      for (const shadow of tag.shadows) {
        ctx.save()
        ctx.shadowColor = shadow.color
        ctx.shadowBlur = shadow.blur * ratio
        ctx.shadowOffsetX = shadow.x * ratio
        ctx.shadowOffsetY = shadow.y * ratio
        ctx.fill()
        ctx.restore()
      }
      ctx.fill()

      // Price, right-aligned inside the pill.
      ctx.fillStyle = tag.text
      ctx.textBaseline = 'middle'
      drawTabular(ctx, text, pillX + pillWidth - g.paddingX, pillY + pillHeight / 2)
    })
  }
}

/**
 * Three background bands in the candle pane (Frame 47, D9 option A): the
 * candle area is divided into fifths and the 1st, 3rd and 5th are filled.
 * They are fixed to the pane, not to prices.
 */
export class PriceBands implements IPanePrimitive<Time> {
  private requestUpdate: (() => void) | null = null
  private color: string
  private readonly views: readonly IPanePrimitivePaneView[]

  constructor(color: string) {
    this.color = color
    const renderer: IPrimitivePaneRenderer = { draw: () => {}, drawBackground: (target) => this.draw(target) }
    this.views = [{ zOrder: () => 'bottom', renderer: () => renderer }]
  }

  attached({ requestUpdate }: PaneAttachedParameter<Time>): void {
    this.requestUpdate = requestUpdate
  }

  detached(): void {
    this.requestUpdate = null
  }

  setColor(color: string): void {
    this.color = color
    this.requestUpdate?.()
  }

  paneViews(): readonly IPanePrimitivePaneView[] {
    return this.views
  }

  private draw(target: Target): void {
    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      // The candle area ends where the gap above the volume begins.
      const row = (mediaSize.height - CANDLE_VOLUME_GAP) / 5
      ctx.fillStyle = this.color
      for (const index of [0, 2, 4]) {
        const top = Math.round(index * row)
        ctx.fillRect(0, top, mediaSize.width, Math.round((index + 1) * row) - top)
      }
    })
  }
}

/*
 * Canvas text can't use tabular digits, and Inter's digits have different
 * widths. To keep the pill's width and the digits' positions steady while the
 * price changes, every digit is drawn centred in a cell as wide as "0".
 */

function tabularWidth(ctx: CanvasRenderingContext2D, text: string): number {
  const digit = ctx.measureText('0').width
  let width = 0
  for (const char of text) width += /\d/.test(char) ? digit : ctx.measureText(char).width
  return width
}

/** Draws `text` with tabular digits, its right edge at `right`. */
function drawTabular(ctx: CanvasRenderingContext2D, text: string, right: number, y: number): void {
  const digit = ctx.measureText('0').width
  let x = right - tabularWidth(ctx, text)
  ctx.textAlign = 'center'
  for (const char of text) {
    const width = /\d/.test(char) ? digit : ctx.measureText(char).width
    ctx.fillText(char, x + width / 2, y)
    x += width
  }
}
