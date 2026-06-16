# Smelt

A browser-based falling-sand / powder physics simulator. Paint materials onto a canvas and watch emergent behavior — sand piles, water flows, fire spreads, lava hardens, plants grow, gunpowder explodes.

Built with **TypeScript**, **Vite**, and the **HTML Canvas API** — no frameworks, no WebGL.

## Features

- 12 visible materials: sand, stone, water, wood, fire, oil, acid, lava, plant, mud, gunpowder (plus hidden smoke and steam)
- Per-frame heat field with diffusion, evaporation, ignition, melting, and explosions
- Density-based liquid displacement and emergent buoyancy (oil floats on water)
- Display-resolution glow pass with screen-blend bloom for fire and lava
- Web Audio sound effects, screen shake, and a material-aware brush cursor
- PNG save/load (grid state encoded into image channels) plus prebuilt scenes
- Keyboard shortcuts: `1`–`9`, `q`, `e`, `0` for materials; `Space` pause; `C` clear; `M` mute

## Getting Started

Requires Node.js 18+.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # produces dist/
npm run preview  # preview the production build locally
```

## Deploying to Vercel

Smelt is a static Vite app, so Vercel handles it with zero configuration.

### One-time setup

1. Push the repo to GitHub (already done if you're reading this on GitHub).
2. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account.
3. Click **Add New… → Project**.
4. **Import** the `smelt` repository.
5. Vercel auto-detects Vite. Confirm these settings (they should already be filled in):
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
6. Click **Deploy**. First build takes ~30–60 seconds.

You'll get a URL like `smelt-<hash>.vercel.app`.

### Continuous deployment

Once linked, Vercel will:

- Deploy every push to `main` to your production URL.
- Create a unique **preview deployment** for every other branch and pull request.

No further action needed — just `git push` and Vercel rebuilds.

### Custom domain (optional)

1. In the Vercel dashboard, open the project → **Settings → Domains**.
2. Add your domain (e.g. `smelt.example.com`).
3. Follow Vercel's DNS instructions (either change nameservers, or add the CNAME/A record it shows).
4. HTTPS is provisioned automatically.

### CLI alternative

If you prefer the terminal:

```bash
npm i -g vercel
vercel           # first run: link the project
vercel --prod    # deploy to production
```

## Project Structure

```
smelt/
├── index.html
├── src/
│   ├── main.ts          # entry, game loop, wiring
│   ├── grid.ts          # cells + meta + temp arrays
│   ├── simulation.ts    # per-frame physics + heat field
│   ├── materials.ts     # material registry
│   ├── renderer.ts      # ImageData renderer + glow pass
│   ├── input.ts         # pointer + brush
│   ├── ui.ts            # HUD, palette, shortcuts
│   ├── audio.ts         # Web Audio SFX
│   ├── feedback.ts      # event bridge for shake/sfx
│   ├── scenes.ts        # PNG save/load + presets
│   ├── types.ts         # material IDs
│   └── style.css
└── package.json
```

## License

MIT
