import {
  ColorType,
  type CandlestickSeriesPartialOptions,
  type ChartOptions,
  type DeepPartial,
} from 'lightweight-charts'

/*
 * Theme colours and geometry for the chart (TECHNICAL_SPEC §10.2, D1).
 *
 * The chart draws on a canvas, so CSS doesn't reach it. These functions read
 * the current values of the CSS custom properties, which stay the only place
 * where values are defined: colours come from tokens.css, sizes for each
 * layout from Chart.css. Values are read from the chart's container, so the
 * container's own properties and its breakpoints apply.
 */

const darkQuery = '(prefers-color-scheme: dark)'
/** The layout breakpoint where the chart's geometry changes (Chart.css). */
const wideQuery = '(min-width: 768px)'

/** Opacity of candles and volume while candle data is stale (D10, the artifact's value). */
const STALE_OPACITY = 0.55

/** Space between the candles and the volume bars, in px (Frame 47). */
export const CANDLE_VOLUME_GAP = 9

export interface TagGeometry {
  connector: number
  frameRadius: number
  framePadding: number
  paddingX: number
  paddingY: number
  minWidth: number
}

export interface TagColors {
  line: string
  frame: string
  frameFill: string
  background: string
  text: string
  shadows: CanvasShadow[]
}

export interface CanvasShadow {
  x: number
  y: number
  blur: number
  color: string
}

export interface ChartTheme {
  chart: DeepPartial<ChartOptions>
  /** Candle colours, dimmed while stale. */
  candles: CandlestickSeriesPartialOptions
  /** Volume bar colours for rising and falling candles, dimmed while stale. */
  volumeUp: string
  volumeDown: string
  band: string
  fontFamily: string
  tag: TagColors
  tagGeometry: TagGeometry
}

/** Chart options for the theme, layout and stale state that apply now. */
export function readChartTheme(element: Element, stale: boolean): ChartTheme {
  const style = getComputedStyle(element)
  const value = (name: string) => style.getPropertyValue(name).trim()
  const number = (name: string) => Number.parseFloat(value(name)) || 0

  const text = value('--color-text')
  const muted = value('--color-text-muted')
  const grid = value('--color-grid')
  const up = withOpacity(value('--color-up'), stale ? STALE_OPACITY : 1)
  const down = withOpacity(value('--color-down'), stale ? STALE_OPACITY : 1)
  const fontFamily = value('--font-family')

  return {
    chart: {
      layout: {
        // Transparent, so the panel colour shows through.
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: text,
        fontFamily,
        fontSize: 10,
        // Candles and volume keep the design's fixed proportions: no visible
        // separator and no dragging of the boundary between them.
        panes: { separatorColor: 'transparent', separatorHoverColor: 'transparent', enableResize: false },
      },
      grid: {
        vertLines: { color: grid },
        horzLines: { visible: false }, // the bands take the place of horizontal lines
      },
      rightPriceScale: { borderVisible: false, minimumWidth: number('--chart-axis-width') },
      timeScale: { borderVisible: false },
      crosshair: {
        vertLine: { color: muted, labelBackgroundColor: muted },
        horzLine: { color: muted, labelBackgroundColor: muted },
      },
    },
    candles: {
      upColor: up,
      downColor: down,
      borderUpColor: up,
      borderDownColor: down,
      wickUpColor: up,
      wickDownColor: down,
    },
    volumeUp: up,
    volumeDown: down,
    band: value('--color-band'),
    fontFamily,
    tag: {
      line: text,
      frame: value('--color-frame'),
      frameFill: value('--color-panel'),
      background: value('--tag-bg'),
      text: value('--tag-text'),
      shadows: parseShadows(value('--tag-shadow')),
    },
    tagGeometry: {
      connector: number('--chart-tag-connector'),
      frameRadius: number('--chart-tag-frame-radius'),
      framePadding: number('--chart-tag-frame-padding'),
      paddingX: number('--chart-tag-padding-x'),
      paddingY: number('--chart-tag-padding-y'),
      minWidth: number('--chart-tag-min-width'),
    },
  }
}

/**
 * Calls `listener` when the operating system switches between light and dark,
 * or when the layout crosses the chart's breakpoint. Returns a function that
 * stops listening.
 */
export function onChartLookChange(listener: () => void): () => void {
  const queries = [window.matchMedia(darkQuery), window.matchMedia(wideQuery)]
  queries.forEach((query) => query.addEventListener('change', listener))
  return () => queries.forEach((query) => query.removeEventListener('change', listener))
}

/** "#6ab680" at 55 % → "rgba(106, 182, 128, 0.55)". Other colour forms are returned as they are. */
function withOpacity(color: string, opacity: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color)
  if (!hex || opacity === 1) return color
  const n = Number.parseInt(hex[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`
}

/**
 * Turns the CSS shadow token (for example "0 4px 4px rgba(0, 0, 0, 0.25), …")
 * into canvas shadow layers, so the tag's shadow comes from the same token as
 * the design (D13: the canvas result is an approximation).
 */
function parseShadows(css: string): CanvasShadow[] {
  return css
    .split(/,(?![^(]*\))/) // split on commas that are not inside rgba(…)
    .map((layer) => {
      const color = /(rgba?\([^)]*\)|#[0-9a-f]{3,8})/i.exec(layer)?.[1] ?? 'transparent'
      const [x = 0, y = 0, blur = 0] = layer
        .replace(color, '')
        .trim()
        .split(/\s+/)
        .map((part) => Number.parseFloat(part) || 0)
      return { x, y, blur, color }
    })
}
