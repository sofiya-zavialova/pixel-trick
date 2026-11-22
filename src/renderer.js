
const SUBPIXELS = 3
const SAMPLES = 4
const SCALE = SUBPIXELS * SAMPLES

export function calculateCoverage(text, options = {}) {
  const {
    width = 720,
    height = 170,
    shift = 0,
    fontSize = 70,
    fontFamily = 'Arial, sans-serif',
    fontWeight = '600',
    stripeOrder = 'RGB',
  } = options

  const mask = document.createElement('canvas')
  mask.width = width * SCALE
  mask.height = height * SAMPLES

  const ctx = mask.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas context unavailable')

  ctx.fillStyle = '#fff'
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.save()
  ctx.scale(SCALE, SAMPLES)
  ctx.fillText(text || ' ', width / 2 + shift, height / 2)
  ctx.restore()

  const maskData = ctx.getImageData(0, 0, mask.width, mask.height).data
  const coverage = new Float32Array(width * height * 3)
  const order = stripeOrder === 'BGR' ? [2, 1, 0] : [0, 1, 2]

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 3

      for (let sub = 0; sub < SUBPIXELS; sub++) {
        let sum = 0

        for (let sx = 0; sx < SAMPLES; sx++) {
          for (let sy = 0; sy < SAMPLES; sy++) {
            const maskX = x * SCALE + sub * SAMPLES + sx
            const maskY = y * SAMPLES + sy
            const maskIndex = (maskY * mask.width + maskX) * 4
            sum += maskData[maskIndex + 3] / 255
          }
        }

        coverage[pixelIndex + order[sub]] = sum / (SAMPLES * SAMPLES)
      }
    }
  }

  return { coverage, width, height }
}

export function renderText(canvas, text, options = {}) {
  const {
    mode = 'rgb',
    shift = 0,
    fontSize = 70,
    fontFamily = 'Arial, sans-serif',
    fontWeight = '600',
    stripeOrder = 'RGB',
  } = options

  const width = Math.max(1, Math.floor(canvas.clientWidth))
  const height = Math.max(1, Math.floor(canvas.clientHeight))

  canvas.width = width
  canvas.height = height

  const output = canvas.getContext('2d')
  if (!output) return null

  const result = calculateCoverage(text, {
    width,
    height,
    shift,
    fontSize,
    fontFamily,
    fontWeight,
    stripeOrder,
  })

  const image = output.createImageData(width, height)

  for (let pixel = 0; pixel < width * height; pixel++) {
    const sourceIndex = pixel * 3
    const targetIndex = pixel * 4

    const r = result.coverage[sourceIndex]
    const g = result.coverage[sourceIndex + 1]
    const b = result.coverage[sourceIndex + 2]

    if (mode === 'grayscale') {
      const value = Math.round(((r + g + b) / 3) * 255)
      image.data[targetIndex] = value
      image.data[targetIndex + 1] = value
      image.data[targetIndex + 2] = value
    } else {
      image.data[targetIndex] = Math.round(r * 255)
      image.data[targetIndex + 1] = Math.round(g * 255)
      image.data[targetIndex + 2] = Math.round(b * 255)
    }

    image.data[targetIndex + 3] = 255
  }

  output.putImageData(image, 0, 0)
  return result
}

export function renderMicroscope(canvas, text, options = {}) {
  const {
    shift = 0,
    fontSize = 70,
    stripeOrder = 'RGB',
    selectedPixel = null,
  } = options

  const columns = 24
  const rows = 9
  const cellWidth = 24
  const cellHeight = 24
  const stripeWidth = cellWidth / 3

  canvas.width = columns * cellWidth
  canvas.height = rows * cellHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const result = calculateCoverage(text, {
    width: 720,
    height: 170,
    shift,
    fontSize,
    stripeOrder,
  })

  const order = stripeOrder === 'BGR' ? [2, 1, 0] : [0, 1, 2]
  const colors = [
    [255, 45, 65],
    [45, 235, 115],
    [65, 125, 255],
  ]

  let bestX = Math.floor(result.width / 2)
  let bestY = Math.floor(result.height / 2)
  let bestScore = -1

  for (let y = 0; y < result.height; y++) {
    for (let x = 0; x < result.width; x++) {
      const index = (y * result.width + x) * 3
      const values = [
        result.coverage[index],
        result.coverage[index + 1],
        result.coverage[index + 2],
      ]

      const minValue = Math.min(...values)
      const maxValue = Math.max(...values)
      const average = (values[0] + values[1] + values[2]) / 3
      const partialCount = values.filter(value => value > 0.02 && value < 0.98).length

      if (partialCount === 0) continue

      const spread = maxValue - minValue
      const score = spread * 2 + partialCount * 0.12 - Math.abs(average - 0.5) * 0.1

      if (score > bestScore) {
        bestScore = score
        bestX = x
        bestY = y
      }
    }
  }

  const startX = Math.max(
    0,
    Math.min(result.width - columns, bestX - Math.floor(columns / 2))
  )

  const startY = Math.max(
    0,
    Math.min(result.height - rows, bestY - Math.floor(rows / 2))
  )

  const recommendedPixel = {
    col: bestX - startX,
    row: bestY - startY,
  }

  const activePixel = selectedPixel &&
    selectedPixel.col >= 0 &&
    selectedPixel.col < columns &&
    selectedPixel.row >= 0 &&
    selectedPixel.row < rows
      ? selectedPixel
      : recommendedPixel

  ctx.fillStyle = '#090a0d'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const sourceX = startX + col
      const sourceY = startY + row
      const x = col * cellWidth
      const y = row * cellHeight
      const index = (sourceY * result.width + sourceX) * 3

      for (let sub = 0; sub < 3; sub++) {
        const channel = order[sub]
        const intensity = result.coverage[index + channel]
        const [r, g, b] = colors[channel]

        ctx.fillStyle = `rgb(${Math.round(r * intensity)},${Math.round(g * intensity)},${Math.round(b * intensity)})`
        ctx.fillRect(x + sub * stripeWidth, y, stripeWidth, cellHeight)
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 0.7
      ctx.strokeRect(x, y, cellWidth, cellHeight)

      if (activePixel.col === col && activePixel.row === row) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.strokeRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2)
      }
    }
  }

  return {
    ...result,
    startX,
    startY,
    columns,
    rows,
    recommendedPixel,
    selectedPixel: activePixel,
  }
}
