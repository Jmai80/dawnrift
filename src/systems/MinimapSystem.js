export class MinimapSystem {
  constructor({ size = 160, viewRadius = 130 } = {}) {
    this.size = size;
    this.scale = (size / 2 - 16) / viewRadius;
    this.maxR = size / 2 - 14;
    this.markers = [];

    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    Object.assign(c.style, {
      position: 'fixed', top: '16px', right: '16px',
      width: size + 'px', height: size + 'px',
      borderRadius: '50%', border: '2px solid #b89b5e',
      boxShadow: '0 0 0 2px rgba(0,0,0,0.4)', zIndex: 5, display: 'none'
    });
    document.body.appendChild(c);
    this.canvas = c;
    this.ctx = c.getContext('2d');
  }

  setMarkers(m) { this.markers = m; }
  show() { this.canvas.style.display = 'block'; }
  hide() { this.canvas.style.display = 'none'; }

  // Ritar ett schacktorn sett uppifrån: en liten fyrkantig kropp med fyra
  // rektangulära tinnar (krenelering) i hörnen. cx,cy = mittpunkt på kartan.
  _drawRook(ctx, x, y, color, scale = 1) {
    const body = 6 * scale;   // kroppens sida
    const pip = 2.4 * scale;  // tinnens sida
    ctx.fillStyle = color;
    // kropp (mittruta)
    ctx.fillRect(x - body / 2, y - body / 2, body, body);
    // fyra tinnar i hörnen, som sticker ut något
    const off = body / 2;
    const corners = [[-off, -off], [off, -off], [-off, off], [off, off]];
    for (const [ox, oy] of corners) {
      ctx.fillRect(x + ox - pip / 2, y + oy - pip / 2, pip, pip);
    }
  }

  // Spelarcentrerad, norr alltid uppåt
  draw(px, pz, rotY) {
    const ctx = this.ctx, s = this.size, cx = s / 2, cy = s / 2;
    ctx.clearRect(0, 0, s, s);

    ctx.fillStyle = 'rgba(20,15,10,0.6)';
    ctx.beginPath(); ctx.arc(cx, cy, s / 2 - 1, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, s / 2 - 2, 0, Math.PI * 2); ctx.clip();

    for (const m of this.markers) {
      let dx = (m.x - px) * this.scale;
      let dy = (m.z - pz) * this.scale; // norr (-z) → upp
      const d = Math.hypot(dx, dy);
      let clamped = false;
      if (d > this.maxR) { dx = dx / d * this.maxR; dy = dy / d * this.maxR; clamped = true; }
      const mx = cx + dx, my = cy + dy;
      if (m.shape === 'rook') {
        // Schacktorn sett uppifrån: en fyrkantig kropp med fyra rektangulära
        // tinnar (krenelering) i hörnen – fyra pluppar runt en mittruta.
        this._drawRook(ctx, mx, my, m.color, clamped ? 0.8 : 1);
      } else {
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.arc(mx, my, clamped ? 3 : 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Spelarpil (framåt = (-sin, -cos))
    const fx = -Math.sin(rotY), fz = -Math.cos(rotY);
    const px2 = -fz, py2 = fx;
    ctx.fillStyle = '#ffe8a0';
    ctx.beginPath();
    ctx.moveTo(cx + fx * 7, cy + fz * 7);
    ctx.lineTo(cx - fx * 4 + px2 * 4, cy - fz * 4 + py2 * 4);
    ctx.lineTo(cx - fx * 4 - px2 * 4, cy - fz * 4 - py2 * 4);
    ctx.closePath();
    ctx.fill();

    // Väderstreck
    ctx.fillStyle = '#b89b5e';
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, 11);
    ctx.fillText('S', cx, s - 11);
    ctx.fillText('Ö', s - 10, cy);
    ctx.fillText('V', 10, cy);
  }
}