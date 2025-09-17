<div align="center">

# Presently

Teal-branded attendance calculator that extracts subjects from screenshots, computes per-subject and overall attendance, and advises how many classes you can miss or need to attend – including an optional 10% medical relief (65%) scenario.

</div>

## Features

- Extracts attendance from two screenshot styles:
  - App table: `Code | TH | PH | AH | %` with explicit support for `CL`
  - Portal table: `Description … Total Present Absent …`
- Robust parsing and cleanups:
  - Legend-aware name mapping (codes → full names)
  - Special handling for `CL` (Class In Charge)
  - Two-line row handling and token normalization (e.g., `C L` → `CL`)
- UI/UX
  - Sticky table headers, search, sorting (incl. Advice), compact density toggle
  - CSV export, Status/Advice per row, subject details modal
  - Extra “65% medical relief” advisory (non-primary)
  - Live date/time header with 12-hour format and icons
- Persistence
  - Remembers minimum %, extraction mode (Local/AI), compact view, and subject renames in localStorage

## Quick Start

Prerequisites: Node 18+ and npm

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Usage

- Manual Input tab
  - Fields start empty; enter Attended and Total, set Minimum % (default 75), click Calculate.
- Upload Image tab
  - Add a clear screenshot of the attendance page.
  - Toggle “Show OCR text” to see recognized lines if something doesn’t parse.
  - Parsing supports app and portal tables; try zooming into the table for portals.
  - Renaming: click a subject row → rename inside the details modal. Renames persist.

## OCR Tips

- Prefer bright, high-contrast screenshots.
- Include the full table row; avoid heavy cropping that truncates numbers.
- For portal pages, zoom the table in the browser before capturing.

## AI Extraction (optional)

- The UI supports an AI mode via `/api/extract` if you attach a backend (not included here).
- When AI is unavailable, the app automatically falls back to on-device OCR.

## Build and Preview

```bash
npm run build
npm run preview
```

## Deploy on Vercel (via GitHub)

1) Push this project to a GitHub repo (see commands below).

2) In Vercel:
   - New Project → Import your GitHub repo
   - Framework preset: Vite + React + TypeScript
   - Build command: `npm run build`
   - Output directory: `dist`
   - Click Deploy

## Initialize Git and Push to GitHub

Replace REPO_NAME and OWNER with your choices if using HTTPS.

```bash
git init
git add .
git commit -m "feat: Presently initial release (OCR parsing, CL handling, portal support, teal brand)"
git branch -M main
# Option A: GitHub CLI (recommended)
# gh repo create presently --public -y
# git remote add origin https://github.com/<YOUR_GITHUB>/presently.git

# Option B: HTTPS (replace with your repo URL)
git remote add origin https://github.com/OWNER/REPO_NAME.git
git push -u origin main
```

## Tech Stack

- React + TypeScript + Vite
- Chakra UI for design system
- Tesseract.js for on-device OCR

## License

MIT

"# presently" 
