# MyMedies — Prescription Analyzer & Medicine Regimen Assistant

A clinical, mobile-first prescription analysis and medicine reminder application powered by **Google Gemini Vision** via the official Google Gen AI SDK (`@google/genai`).

Built with **Next.js (TypeScript + Tailwind CSS)** and ready for native mobile deployment via **Capacitor**.

---

## 🏥 Clinical Capabilities

- 📄 **Gemini Clinical Vision OCR**:
  - Direct multimodal prescription OCR via Google Gemini.
  - Deciphers physician handwriting, medical abbreviations, strengths, and regimens.
  - Clinical verification step with drug-interaction precautions before scheduling.
- ⏰ **Daily Regimen Management**:
  - Dosing schedules structured by **Morning** (8:00 AM), **Afternoon** (1:00 PM), **Evening** (7:00 PM), and **Night / Bedtime** (10:00 PM).
  - Straightforward logging: **Mark Taken**, **Snooze**, and **Skip**.
  - High-visibility pharmacological details (Dosage, Meal Instructions, Duration).
- 📦 **Pharmacy Inventory & Refill Tracking**:
  - Real-time stock counters with critical low-inventory notices (when \(\le 3\) doses remain).
  - Prescription document archive to keep historical doctor slips.
- 📊 **Adherence & Regimen Compliance**:
  - 7-day adherence grid and compliance metrics.

---

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Google Gemini API Key
Copy `.env.example` to `.env.local` and add your [Google AI Studio API Key](https://aistudio.google.com/app/apikey):
```env
GEMINI_API_KEY=your_google_ai_studio_key_here
GEMINI_MODEL=gemini-2.5-flash
```
> *Note: If no API key is supplied, the app automatically runs in reference simulation mode with realistic clinical prescriptions so you can test all workflows immediately.*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Use Mobile View in DevTools for the optimal experience.

---

## 📱 Mobile Build with Capacitor

1. Build web bundle:
   ```bash
   npm run build
   ```
2. Sync with native platforms:
   ```bash
   npx cap sync
   ```
3. Open Android project:
   ```bash
   npx cap open android
   ```
