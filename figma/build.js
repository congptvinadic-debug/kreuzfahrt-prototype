// figma_build.js - rebuild pages from dom2figma_extract.py JSON as editable Figma frames.
// Paste into the browser console of an open Figma design file (the `figma` plugin API global is available there),
// then: await kpBuild(['buchung_2_1440.json', ...], { x: 0, y: 6000 })
// Text stays real text (Be Vietnam Pro), icons are SVG vectors, photos are image fills.
window.kpBuild = async (files, { x = 0, y = 0, gap = 200, base = 'https://congptvinadic-debug.github.io/kreuzfahrt-prototype/figma/' } = {}) => {
  const STY = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold' }
  const style = (w, it) => { const s = STY[Math.min(800, Math.max(400, Math.round(w / 100) * 100))]; return it ? (s === 'Regular' ? 'Italic' : s + ' Italic') : s }
  for (const s of new Set([...Object.values(STY), ...Object.values(STY).map((s) => (s === 'Regular' ? 'Italic' : s + ' Italic'))]))
    await figma.loadFontAsync({ family: 'Be Vietnam Pro', style: s })
  const imgCache = {}
  const image = async (url) => {
    if (!(url in imgCache)) {
      imgCache[url] = await fetch(url).then((r) => (r.ok ? r.arrayBuffer() : null)).then((b) => (b ? figma.createImage(new Uint8Array(b)) : null)).catch(() => null)
    }
    return imgCache[url]
  }
  const solid = (c) => ({ type: 'SOLID', color: { r: c[0], g: c[1], b: c[2] }, opacity: c[3] })
  const index = await fetch(base + 'index.json').then((r) => r.json())
  const made = []
  let cx = x
  for (const file of files) {
    const meta = index.find((e) => e.file === file)
    const d = await fetch(base + file).then((r) => r.json())
    const W = meta.w
    const f = figma.createFrame()
    f.name = `${meta.name} / ${{ 1440: 'Desktop 1440', 768: 'Tablet 768', 390: 'Mobile 390' }[W]}`
    f.resize(W, d.H); f.x = cx; f.y = y; f.fills = [solid(d.bg)]; f.clipsContent = true
    for (const n of d.nodes) {
      const [nx, ny, nw, nh] = n.r
      if (nx >= W || nw < 1 || nh < 1) continue
      let node = null
      if (n.k === 'box') {
        node = figma.createRectangle(); node.name = n.img ? 'image' : 'box'
        node.resize(Math.max(1, nw), Math.max(1, nh))
        const fills = []
        if (n.bg) fills.push(solid(n.bg))
        if (n.img) { const im = await image(n.img); if (im) fills.push({ type: 'IMAGE', imageHash: im.hash, scaleMode: n.fit === 'contain' ? 'FIT' : 'FILL' }) }
        node.fills = fills
        if (n.bw && n.bc) { node.strokes = [solid(n.bc)]; node.strokeWeight = n.bw; node.strokeAlign = 'INSIDE' }
        if (n.rad) node.cornerRadius = Math.min(n.rad, nw / 2, nh / 2)
        if (n.op < 1) node.opacity = n.op
      } else if (n.k === 'svg') {
        try { node = figma.createNodeFromSvg(n.svg); node.name = 'icon'; node.resize(Math.max(1, nw), Math.max(1, nh)) } catch (e) { node = null }
      } else if (n.k === 'text') {
        node = figma.createText()
        node.fontName = { family: 'Be Vietnam Pro', style: style(n.fw, n.it) }
        node.fontSize = Math.max(1, n.fs)
        node.characters = n.t
        if (n.c) node.fills = [solid(n.c)]
        if (n.lh) node.lineHeight = { value: n.lh, unit: 'PIXELS' }
        if (n.ls) node.letterSpacing = { value: n.ls, unit: 'PIXELS' }
        if (n.u) node.textDecoration = 'UNDERLINE'
        node.textAlignHorizontal = n.al === 'center' ? 'CENTER' : n.al === 'right' || n.al === 'end' ? 'RIGHT' : 'LEFT'
        if (n.one) { node.textAutoResize = 'WIDTH_AND_HEIGHT' } else { node.resize(nw + 2, nh); node.textAutoResize = 'HEIGHT' }
        node.name = n.t.slice(0, 40)
      }
      if (!node) continue
      f.appendChild(node); node.x = nx; node.y = ny
    }
    made.push(f)
    cx += W + gap
  }
  return made
}
