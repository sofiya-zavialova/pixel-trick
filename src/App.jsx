
import { useEffect, useRef, useState } from 'react'
import { renderText, renderMicroscope } from './renderer'
import './App.css'

const breakdownStages = [
  {
    label: '01 / SHAPE',
    name: 'GLYPH MASK',
    description: 'The letter becomes a coverage mask. Bright areas show where the glyph covers the pixel grid.',
  },
  {
    label: '02 / RED',
    name: 'RED CHANNEL',
    description: 'The renderer calculates the coverage of the red subpixel independently.',
  },
  {
    label: '03 / GREEN',
    name: 'GREEN CHANNEL',
    description: 'The green subpixel receives its own coverage value at every pixel position.',
  },
  {
    label: '04 / BLUE',
    name: 'BLUE CHANNEL',
    description: 'The blue subpixel is sampled separately, creating a different edge profile.',
  },
  {
    label: '05 / COMPOSITE',
    name: 'FINAL RGB OUTPUT',
    description: 'The three independently calculated channels combine to produce the final image.',
  },
]

function PixelBreakdown({ text, shift, stripeOrder }) {
  const canvasRef = useRef(null)
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const width = 720
    const height = 170
    const samples = 4
    const scale = 12

    canvas.width = width
    canvas.height = height

    const mask = document.createElement('canvas')
    mask.width = width * scale
    mask.height = height * samples

    const maskContext = mask.getContext('2d', { willReadFrequently: true })
    const outputContext = canvas.getContext('2d')

    if (!maskContext || !outputContext) return

    maskContext.fillStyle = '#fff'
    maskContext.font = '600 70px Arial, sans-serif'
    maskContext.textAlign = 'center'
    maskContext.textBaseline = 'middle'

    maskContext.save()
    maskContext.scale(scale, samples)
    maskContext.fillText(text || ' ', width / 2 + shift, height / 2)
    maskContext.restore()

    const maskData = maskContext.getImageData(
      0,
      0,
      mask.width,
      mask.height
    ).data

    const image = outputContext.createImageData(width, height)
    const order = stripeOrder === 'BGR' ? [2, 1, 0] : [0, 1, 2]
    const colors = [
      [255, 45, 65],
      [45, 235, 115],
      [65, 125, 255],
    ]

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const values = [0, 0, 0]

        for (let sub = 0; sub < 3; sub++) {
          let sum = 0

          for (let sx = 0; sx < samples; sx++) {
            for (let sy = 0; sy < samples; sy++) {
              const maskX = x * scale + sub * samples + sx
              const maskY = y * samples + sy
              const maskIndex = (maskY * mask.width + maskX) * 4
              sum += maskData[maskIndex + 3] / 255
            }
          }

          values[order[sub]] = sum / (samples * samples)
        }

        const target = (y * width + x) * 4
        let r = 0
        let g = 0
        let b = 0

        if (stage === 0) {
          const gray = Math.round(
            ((values[0] + values[1] + values[2]) / 3) * 255
          )
          r = gray
          g = gray
          b = gray
        } else if (stage >= 1 && stage <= 3) {
          const channel = stage - 1
          r = Math.round(colors[channel][0] * values[channel])
          g = Math.round(colors[channel][1] * values[channel])
          b = Math.round(colors[channel][2] * values[channel])
        } else {
          r = Math.round(values[0] * 255)
          g = Math.round(values[1] * 255)
          b = Math.round(values[2] * 255)
        }

        image.data[target] = r
        image.data[target + 1] = g
        image.data[target + 2] = b
        image.data[target + 3] = 255
      }
    }

    outputContext.putImageData(image, 0, 0)
  }, [text, shift, stripeOrder, stage])

  const buttonStyle = (active, disabled = false) => ({
    flex: '1 1 110px',
    minHeight: '42px',
    padding: '10px 8px',
    border: active
      ? '1px solid #4ce5ed'
      : '1px solid #263b40',
    background: active
      ? 'rgba(76, 229, 237, 0.12)'
      : 'transparent',
    color: active ? '#4ce5ed' : '#82969b',
    fontSize: '10px',
    letterSpacing: '0.7px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'monospace',
    opacity: disabled ? 0.45 : 1,
  })

  return (
    <section
      style={{
        margin: '70px 0',
        padding: 'clamp(20px, 4vw, 42px)',
        background: 'rgba(8, 17, 21, 0.92)',
        border: '1px solid rgba(65, 220, 230, 0.25)',
        position: 'relative',
      }}
    >
      <div
        style={{
          color: '#4ce5ed',
          fontSize: '10px',
          letterSpacing: '2px',
          marginBottom: '16px',
          fontFamily: 'monospace',
        }}
      >
        MODULE_04 / RENDERING PROCESS
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '20px',
          flexWrap: 'wrap',
          marginBottom: '28px',
        }}
      >
        <div>
          <h2
            style={{
              color: '#edf7f8',
              fontSize: 'clamp(27px, 4vw, 42px)',
              margin: 0,
              letterSpacing: '-1.5px',
            }}
          >
            From shape to light.
          </h2>
          <p
            style={{
              color: '#8da3a9',
              fontSize: '13px',
              lineHeight: 1.7,
              marginBottom: 0,
            }}
          >
            Follow the rendering process one channel at a time.
          </p>
        </div>

        <div
          style={{
            color: '#4ce5ed',
            fontSize: '10px',
            letterSpacing: '1px',
            fontFamily: 'monospace',
          }}
        >
          INPUT: "{text || ' '}"
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '20px',
        }}
      >
        {breakdownStages.map((item, index) => (
          <button
            key={item.label}
            onClick={() => setStage(index)}
            style={buttonStyle(stage === index)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        style={{
          border: '1px solid #24373b',
          background: '#000',
          padding: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#789197',
            fontSize: '10px',
            letterSpacing: '1px',
            fontFamily: 'monospace',
            marginBottom: '12px',
          }}
        >
          <span>{breakdownStages[stage].name}</span>
          <span>FRAME 0{stage + 1} / 05</span>
        </div>

        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
          }}
        />
      </div>

      <div
        style={{
          minHeight: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          flexWrap: 'wrap',
          marginTop: '20px',
        }}
      >
        <p
          style={{
            color: '#a5b8bc',
            fontSize: '13px',
            lineHeight: 1.7,
            maxWidth: '520px',
            margin: 0,
          }}
        >
          {breakdownStages[stage].description}
        </p>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setStage(current => Math.max(0, current - 1))}
            disabled={stage === 0}
            style={buttonStyle(false, stage === 0)}
          >
            ← BACK
          </button>

          <button
            onClick={() => setStage(current => Math.min(4, current + 1))}
            disabled={stage === 4}
            style={{
              ...buttonStyle(stage !== 4, stage === 4),
              background: stage === 4 ? 'transparent' : '#4ce5ed',
              color: stage === 4 ? '#405055' : '#071215',
              fontWeight: 700,
            }}
          >
            NEXT STEP →
          </button>
        </div>
      </div>
    </section>
  )
}

function App() {
  const [sampleText, setSampleText] = useState('Amazing')
  const [mode, setMode] = useState('rgb')
  const [shift, setShift] = useState(0)
  const [stripeOrder, setStripeOrder] = useState('RGB')
  const [selectedPixel, setSelectedPixel] = useState(null)
  const [pixelMap, setPixelMap] = useState(null)

  const grayscaleCanvas = useRef(null)
  const rgbCanvas = useRef(null)
  const microscopeCanvas = useRef(null)

  useEffect(() => {
    setSelectedPixel(null)
  }, [sampleText, shift, stripeOrder])

  useEffect(() => {
    const updateCanvases = () => {
      if (!grayscaleCanvas.current || !rgbCanvas.current || !microscopeCanvas.current) return

      const text = sampleText || ' '

      renderText(grayscaleCanvas.current, text, {
        mode: 'grayscale',
        shift,
        fontSize: 70,
        stripeOrder,
      })

      renderText(rgbCanvas.current, text, {
        mode,
        shift,
        fontSize: 70,
        stripeOrder,
      })

      const map = renderMicroscope(microscopeCanvas.current, text, {
        shift,
        fontSize: 70,
        stripeOrder,
        selectedPixel,
      })

      setPixelMap(map)

      if (
        map &&
        (!selectedPixel ||
          selectedPixel.col !== map.selectedPixel.col ||
          selectedPixel.row !== map.selectedPixel.row)
      ) {
        setSelectedPixel(map.selectedPixel)
      }
    }

    updateCanvases()
    window.addEventListener('resize', updateCanvases)

    return () => window.removeEventListener('resize', updateCanvases)
  }, [sampleText, mode, shift, stripeOrder, selectedPixel])

  const handleMicroscopeClick = (event) => {
    const canvas = microscopeCanvas.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const col = Math.floor((event.clientX - rect.left) / rect.width * 24)
    const row = Math.floor((event.clientY - rect.top) / rect.height * 9)

    if (col >= 0 && col < 24 && row >= 0 && row < 9) {
      setSelectedPixel({ col, row })
    }
  }

  const selectedValues = (() => {
    if (!pixelMap || !selectedPixel) return { r: 0, g: 0, b: 0 }

    const sourceX = pixelMap.startX + selectedPixel.col
    const sourceY = pixelMap.startY + selectedPixel.row
    const index = (sourceY * pixelMap.width + sourceX) * 3

    return {
      r: pixelMap.coverage[index],
      g: pixelMap.coverage[index + 1],
      b: pixelMap.coverage[index + 2],
    }
  })()

  const percent = (value) => `${Math.round(value * 100)}%`

  return (
    <main className="app">
      <div className="scanline" />

      <nav className="navbar">
        <a className="brand" href="#">
          <span className="brand-mark">PX</span>
          <span>PIXEL<span className="brand-muted">TRICK</span></span>
        </a>

        <div className="nav-center">
          <span className="nav-indicator" />
          SYSTEM ONLINE
        </div>

        <div className="nav-right">
          <span className="live-dot" />
          INTERACTIVE LAB
          <span className="version">BUILD_01</span>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-grid" />

        <div className="hero-content">
          <div className="eyebrow"><span>SYS.001</span> DISPLAY TECHNOLOGY / RESEARCH</div>

          <div className="hero-status">
            <span className="live-dot" />
            EXPERIMENTAL ENVIRONMENT ACTIVE
          </div>

          <h1>
            LOOK CLOSER.
            <br />
            <span>SEE THE PIXEL.</span>
          </h1>

          <p className="intro">
            Your screen is hiding a secret in plain sight.
            Explore how tiny RGB light components shape the text you read every day.
          </p>

          <div className="hero-actions">
            <a className="explore" href="#lab">
              <span>INITIALIZE EXPERIMENT</span>
              <span>↘</span>
            </a>
            <span className="hero-code">PIXEL_RENDERING_PROTOCOL / 001</span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="visual-crosshair">+</div>
          <div className="visual-label visual-label-top">FIG. 001 / RGB ARRAY</div>
          <div className="rgb-orb">
            <span className="orb-red" />
            <span className="orb-green" />
            <span className="orb-blue" />
            <div className="orb-center">PX</div>
          </div>
          <div className="visual-coordinates">X: 128.04<br />Y: 064.12<br />Z: 003.00</div>
          <div className="visual-label visual-label-bottom">SUBPIXEL STRUCTURE / DETECTED</div>
        </div>

        <div className="hero-bottom">
          <span>RESEARCH LOG / 001</span>
          <span>RGB SUBPIXEL ANALYSIS</span>
          <span>SCROLL TO EXPLORE ↓</span>
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="section-topline">
          <span className="section-index">01</span>
          <span>MECHANISM OVERVIEW</span>
          <span className="section-line" />
          <span>3 STAGES</span>
        </div>

        <div className="how-heading">
          <div>
            <div className="eyebrow">UNDER THE SURFACE</div>
            <h2>HOW THE SCREEN<br /><span>BUILDS A LETTER.</span></h2>
          </div>
          <p>
            A closer look at the hidden structure behind the pixels
            that make up the text on your display.
          </p>
        </div>

        <div className="how-grid">
          <article className="how-card">
            <div className="how-number">01 / PIXEL STRUCTURE</div>
            <div className="diagram pixel-diagram">
              <span className="diagram-stripe red-stripe" />
              <span className="diagram-stripe green-stripe" />
              <span className="diagram-stripe blue-stripe" />
              <div className="diagram-caption">R / G / B</div>
            </div>
            <h3>Three light sources.</h3>
            <p>
              A typical RGB LCD pixel contains three colour components:
              red, green and blue. Together, they produce the pixel's colour.
            </p>
            <div className="card-index">FIG. 001</div>
          </article>

          <article className="how-card">
            <div className="how-number">02 / COVERAGE DATA</div>
            <div className="diagram coverage-diagram">
              <span className="diagram-stripe red-stripe" />
              <span className="diagram-stripe green-stripe" />
              <span className="diagram-stripe blue-stripe" />
              <div className="coverage-beam" />
              <div className="diagram-caption">0.35 / 0.68 / 1.00</div>
            </div>
            <h3>Different coverage.</h3>
            <p>
              A letter's edge can cover each colour component by a different
              amount. The renderer calculates coverage independently.
            </p>
            <div className="card-index">FIG. 002</div>
          </article>

          <article className="how-card">
            <div className="how-number">03 / VISUAL OUTPUT</div>
            <div className="diagram result-diagram">
              <span className="result-light red-light" />
              <span className="result-light green-light" />
              <span className="result-light blue-light" />
              <div className="diagram-caption">OUTPUT / GENERATED</div>
            </div>
            <h3>A smoother edge.</h3>
            <p>
              The channel values combine into the displayed pixel.
              This can make text edges appear smoother on compatible displays.
            </p>
            <div className="card-index">FIG. 003</div>
          </article>
        </div>

        <div className="how-footnote">
          <span>!</span>
          This is a software simulation of subpixel coverage. It does not increase the physical resolution of a display.
        </div>
      </section>

      <section className="lab" id="lab">
        <div className="section-topline">
          <span className="section-index">02</span>
          <span>LIVE EXPERIMENT</span>
          <span className="section-line" />
          <span>INTERACTIVE MODULE</span>
        </div>

        <div className="section-heading">
          <div>
            <div className="eyebrow">RENDERING LAB / TERMINAL 001</div>
            <h2>Control the pixels.</h2>
            <p className="section-description">
              Modify the input. Observe the output. Inspect the smallest details.
            </p>
          </div>
          <div className="experiment-tag">
            <span className="live-dot" />
            EXPERIMENT ACTIVE
          </div>
        </div>

        <div className="controls">
          <label htmlFor="sample">INPUT STRING</label>
          <div className="input-wrap">
            <span className="input-prefix">&gt;_</span>
            <input
              id="sample"
              value={sampleText}
              maxLength={18}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="Enter text..."
            />
            <span className="input-count">{sampleText.length}/18</span>
          </div>
        </div>

        <div className="comparison">
          <div className="preview-card">
            <div className="preview-top">
              <span className="status-dot grey" />
              <span>OUTPUT_01 / GRAYSCALE</span>
              <span className="method">STANDARD</span>
            </div>
            <canvas ref={grayscaleCanvas} className="preview-canvas" />
            <p>ONE AVERAGE COVERAGE VALUE PER PIXEL</p>
          </div>

          <div className="preview-card rgb-card">
            <div className="preview-top">
              <span className="status-dot rgb-dot" />
              <span>OUTPUT_02 / SUBPIXEL {stripeOrder}</span>
              <span className="method">{mode === 'rgb' ? 'RGB MODE' : 'GRAYSCALE'}</span>
            </div>
            <canvas ref={rgbCanvas} className="preview-canvas" />
            <p>THREE INDEPENDENTLY CALCULATED CHANNELS</p>
          </div>
        </div>

        <div className="microscope">
          <div className="microscope-heading">
            <div>
              <div className="eyebrow">MODULE_03 / PIXEL INSPECTOR</div>
              <h3>Microscope<span>.</span></h3>
              <p>SELECT A CELL TO READ ITS CHANNEL COVERAGE.</p>
            </div>
            <div className="zoom-label">PIXEL GRID / 24×9</div>
          </div>

          <canvas
            ref={microscopeCanvas}
            className="microscope-canvas"
            aria-label="Magnified subpixel coverage grid. Click a pixel to inspect it."
            onClick={handleMicroscopeClick}
          />

          <div className="channel-legend">
            <span><i className="red" /> RED</span>
            <span><i className="green" /> GREEN</span>
            <span><i className="blue" /> BLUE</span>
          </div>

          <div className="pixel-inspector">
            <div className="inspector-title">
              <span>SELECTED PIXEL / DATA READOUT</span>
              <span>
                X: {selectedPixel ? selectedPixel.col + 1 : '—'} / Y: {selectedPixel ? selectedPixel.row + 1 : '—'}
              </span>
            </div>

            <div className="channel-values">
              <div className="channel-value red-value">
                <span className="value-name">RED CHANNEL</span>
                <strong>{percent(selectedValues.r)}</strong>
                <div className="value-track"><span style={{ width: percent(selectedValues.r) }} /></div>
              </div>

              <div className="channel-value green-value">
                <span className="value-name">GREEN CHANNEL</span>
                <strong>{percent(selectedValues.g)}</strong>
                <div className="value-track"><span style={{ width: percent(selectedValues.g) }} /></div>
              </div>

              <div className="channel-value blue-value">
                <span className="value-name">BLUE CHANNEL</span>
                <strong>{percent(selectedValues.b)}</strong>
                <div className="value-track"><span style={{ width: percent(selectedValues.b) }} /></div>
              </div>
            </div>
          </div>

          <p className="microscope-note">
            EACH CELL = ONE PIXEL. EACH VERTICAL SECTION = ONE SUBPIXEL.
            BRIGHTNESS REPRESENTS CALCULATED GLYPH COVERAGE.
          </p>
        </div>

        <div className="experiment-controls">
          <div className="control-group">
            <div className="control-info">
              <label htmlFor="shift">HORIZONTAL OFFSET</label>
              <span>{shift.toFixed(2)} PX</span>
            </div>
            <input
              id="shift"
              className="slider"
              type="range"
              min="-1"
              max="1"
              step="0.05"
              value={shift}
              onChange={(e) => setShift(Number(e.target.value))}
            />
            <div className="range-labels"><span>-1 PX</span><span>0 PX</span><span>+1 PX</span></div>
          </div>

          <div className="control-group">
            <div className="control-info"><label>SUBPIXEL ORDER</label></div>
            <div className="mode-buttons">
              <button className={stripeOrder === 'RGB' ? 'active' : ''} onClick={() => setStripeOrder('RGB')}>
                RGB ORDER
              </button>
              <button className={stripeOrder === 'BGR' ? 'active' : ''} onClick={() => setStripeOrder('BGR')}>
                BGR ORDER
              </button>
            </div>
          </div>

          <div className="control-group">
            <div className="control-info"><label>RENDERING MODE</label></div>
            <div className="mode-buttons">
              <button className={mode === 'rgb' ? 'active' : ''} onClick={() => setMode('rgb')}>
                SUBPIXEL RENDERING
              </button>
              <button className={mode === 'grayscale' ? 'active' : ''} onClick={() => setMode('grayscale')}>
                GRAYSCALE
              </button>
            </div>
          </div>

          <p className="hint">
            &gt; CHANGE THE INPUT / SWITCH THE SUBPIXEL ORDER / MOVE BY FRACTIONS OF A PIXEL.
          </p>
        </div>
      </section>

      <PixelBreakdown
        text={sampleText}
        shift={shift}
        stripeOrder={stripeOrder}
      />

<section className="why-section">
  <div className="section-topline">
    <span className="section-index">03</span>
    <span>REAL-WORLD APPLICATION</span>
    <span className="section-line" />
    <span>WHY IT MATTERS</span>
  </div>

  <div className="why-heading">
    <div>
      <div className="eyebrow">BEYOND THE PIXEL</div>
      <h2>SMALL DETAILS.<br />
        <span>BIG DIFFERENCE.</span>
      </h2>
    </div>
    <p>
      Subpixel rendering is one of the hidden techniques
      that can make digital text look smoother and more refined.
    </p>
  </div>

  <div className="why-grid">
    <article className="why-card">
      <span className="why-number">01 / READABILITY</span>
      <h3>Sharper-looking text.</h3>
      <p>
        By adjusting red, green and blue coverage separately,
        software can create smoother-looking letter edges
        on compatible displays.
      </p>
    </article>

    <article className="why-card">
      <span className="why-number">02 / DISPLAY ORDER</span>
      <h3>RGB is not always RGB.</h3>
      <p>
        Some LCD panels arrange their colour components
        in RGB order, others in BGR. The rendering method
        needs to account for that layout.
      </p>
    </article>

    <article className="why-card">
      <span className="why-number">03 / LIMITATIONS</span>
      <h3>It depends on the screen.</h3>
      <p>
        Subpixel rendering is not universal. Display type,
        pixel orientation and viewing conditions can affect
        the result. It does not add physical pixels.
      </p>
    </article>
  </div>

  <div className="how-footnote">
    <span>!</span>
    This interactive experiment models RGB LCD subpixel coverage.
    Actual display technologies may behave differently.
  </div>
</section>


      <footer>
        <div className="footer-brand">
          <span className="brand-mark">PX</span>
          PIXEL<span>TRICK</span>
        </div>
        <p>LOOK CLOSER. SEE THE PIXEL.</p>
        <span className="footer-version">DISPLAY TECHNOLOGY / RESEARCH LOG 001</span>
      </footer>
    </main>
  )
}

export default App
