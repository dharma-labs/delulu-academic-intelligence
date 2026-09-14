# Delulu 4.1.0 — The DU Student Companion Update 🎓

**Delulu by Dharmendra** · Instagram [@d4.5dx](https://instagram.com/d4.5dx) · [kumarsbm005@gmail.com](mailto:kumarsbm005@gmail.com)

Delulu just got a massive Delhi University upgrade. This release turns Delulu from a generic academic tracker into an app that actually understands how DU works — NEP credit rules, 66.67% attendance math, IA/ESE splits, real course codes pulled from official DU date sheets, and a full file manager for your notes, PDFs and screenshots.

---

## 🗂️ Files Manager (new)

Keep everything for your degree in one place — like a mini OS inside the app.

- **Upload anything**: lecture screenshots, PDFs, assignments, past-year papers
- **Create folders** — one click builds a folder for every one of your subjects
- **Rename, move, download again, delete** — full file management, just like your laptop
- **Open files right inside Delulu** — images in a lightbox, PDFs in a built-in viewer
- Everything stays **on your device** (IndexedDB) — private, offline, no uploads to any server

## 📊 Report System — rebuilt & fixed

The Academic Report had a nasty bug (an infinite render loop) that crashed the page — gone. The report now:

- Downloads as a clean, printable **HTML report** of your SGPA, CGPA, attendance, syllabus progress, grades and CA scores
- Works in the **desktop app** (the old pop-up method was silently blocked there — rewritten from scratch)
- Footer carries your credit: *Delulu by Dharmendra*

## 🎯 Real DU engine (correct, not guessed)

- **Grades**: proper UGC 10-point scale — O=10, A+=9, A=8, B+=7, B=6, C=5, D=4, F=0
- **CGPA → Percentage**: `CGPA × 9.5` (the formula DU adopted from UGC, 2018-19 onwards)
- **Attendance**: DU FYUGP minimum is **66.67%**, not 75% — Delulu now calculates "how many more classes can you miss" correctly
- **NEP exit points**: Certificate (44 credits) → Diploma (88) → 3-year Degree (132) → Honours (176), with a live calculator on your dashboard
- **IA/ESE split**: see your Internal Assessment vs End-Semester breakdown per paper, with editable 25/75 splits for non-standard papers
- **Verified course codes**: 36 papers across B.A. (Hons) English, B.Com (Hons) and B.Sc (Hons) Computer Science carry UPC codes verified against official DU date sheets (exam.du.ac.in) — the rest are honestly marked unverified

## 🧭 DU-native features

- **85 DU colleges** built in — pick yours with fuzzy search
- **DU academic calendar** — key dates for 2026-27 inside your Calendar view
- **"Carryover Paper"** framing for backlogs — dignity-first, no red alarm bells
- **Three-state attendance** — On Track / Below Threshold / Needs Attention. Calm colours, no panic.
- **GE/DSE advisor** — browse your discipline options without fake "difficulty ratings"
- **Semester filters** across Dashboard, Marks and Analytics

## 🧰 More tools

- **Re-evaluation tracker** — file, track and record re-eval requests with status pipeline
- **CUET score tracker** — store your subject scores and percentiles
- **PYQ bank** — browse papers by programme/semester with links to the DU exam portal
- **Society & ECA tracker** — your cultural/sports/academic memberships
- **Hindi ↔ English toggle** and opt-in-only leaderboard

---

## 📥 Downloads (Windows)

| File | Best for |
|---|---|
| `Delulu-4.1.0-x64.exe` | Install it — desktop shortcut, Start Menu, uninstaller |
| `Delulu-Portable-4.1.0.exe` | No install — run it from anywhere, even a USB stick |

> Windows may show a SmartScreen note because the app isn't code-signed yet — click **More info → Run anyway**. Your data never leaves your device.

## 🛣️ What's next

Fee & scholarship data per college · leaderboard ranking (opt-in) · metro timetable · more programmes' verified UPC codes · macOS & Linux builds.

---

Made with ❤️ for Delhi University students.
**Delulu by Dharmendra** · [@d4.5dx](https://instagram.com/d4.5dx) · [kumarsbm005@gmail.com](mailto:kumarsbm005@gmail.com)
