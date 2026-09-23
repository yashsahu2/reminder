import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, createPartFromBase64 } from '@google/genai';
import { PrescriptionAnalysisResult, TimeBucket } from '@/types/medication';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are an expert Clinical Pharmacist AI and Multimodal Prescription OCR specialist.
Your task is to analyze the provided prescription image, doctor's handwritten Rx slip, clinic discharge summary, or medicine box/bottle label, and accurately extract all prescribed medications.

CRITICAL EXTRACTION RULES:
1. Transcribe each medication's brand name, generic molecule, dosage/strength, dosage form (tablet, capsule, syrup, injection, drops, inhaler, cream, ointment, other), dosing frequency (e.g., Once daily, 1-0-1, Every 8 hrs), relation to food (before_meal, after_meal, with_meal, anytime), and duration in days.
2. For timings, categorize into an array with one or more of: ["morning", "afternoon", "evening", "night"].
3. Provide defaultTimes matching each timing in "HH:mm" 24-hr format (e.g. morning="08:00", afternoon="13:00", evening="18:00", night="21:00").
4. Extract doctor name, clinic name, date, diagnosis, general instructions, and drug interactions if mentioned.
5. Output strictly valid JSON with no markdown wrapping.

Required JSON Schema:
{
  "doctorName": "Doctor Name or null",
  "clinicName": "Clinic/Hospital Name or null",
  "prescriptionDate": "YYYY-MM-DD or null",
  "diagnosis": "Diagnosis/Indication or null",
  "patientAdvice": ["General patient instructions"],
  "potentialInteractions": ["Key drug-drug or food precautions"],
  "medications": [
    {
      "name": "Medication Name",
      "genericName": "Generic Formulation",
      "dosage": "e.g. 500 mg, 1 tablet, 10 ml",
      "form": "tablet",
      "frequency": "e.g. Twice daily (1-0-1)",
      "timing": ["morning", "night"],
      "defaultTimes": ["08:00", "20:00"],
      "relationToMeal": "after_meal",
      "durationDays": 5,
      "instructions": "Specific direction (e.g. Take with water after breakfast)",
      "warning": "Important precaution if any"
    }
  ]
}`;

function getMockResult(): PrescriptionAnalysisResult {
  return {
    doctorName: 'Dr. Sarah Jenkins, MD',
    clinicName: 'Metro Healthcare Associates',
    prescriptionDate: new Date().toISOString().split('T')[0],
    diagnosis: 'Acute Upper Respiratory Tract Infection',
    patientAdvice: [
      'Hydrate adequately (2.5L water daily)',
      'Complete entire antibacterial course without interruption',
    ],
    potentialInteractions: [
      'Take Azithromycin 1 hour before or 2 hours after meals',
    ],
    medications: [
      {
        name: 'Azithromycin',
        genericName: 'Azee 500',
        dosage: '500 mg',
        form: 'tablet',
        frequency: 'Once daily (1-0-0)',
        timing: ['morning'],
        defaultTimes: ['09:00'],
        relationToMeal: 'after_meal',
        durationDays: 5,
        instructions: 'Take with a full glass of water. Complete full 5-day course.',
        warning: 'Avoid antacids containing aluminum or magnesium within 2 hours.',
      },
      {
        name: 'Levocetirizine + Montelukast',
        genericName: 'Montair LC',
        dosage: '10 mg / 5 mg',
        form: 'tablet',
        frequency: 'Once daily at bedtime (0-0-1)',
        timing: ['night'],
        defaultTimes: ['22:00'],
        relationToMeal: 'after_meal',
        durationDays: 7,
        instructions: 'Take 30 minutes before sleep.',
        warning: 'May cause mild drowsiness; avoid operating machinery.',
      },
      {
        name: 'Ambroxol Hydrochloride Syrup',
        genericName: 'Mucolite Syrup',
        dosage: '10 ml',
        form: 'syrup',
        frequency: 'Thrice daily (1-1-1)',
        timing: ['morning', 'afternoon', 'night'],
        defaultTimes: ['08:30', '13:30', '21:30'],
        relationToMeal: 'after_meal',
        durationDays: 5,
        instructions: 'Measure using calibrated measuring cup provided.',
        warning: 'Rinse mouth with water after ingestion.',
      },
    ],
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'No prescription image provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const requestedModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

    // If no Gemini API key is configured in .env, provide demo reference extraction
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not configured. Returning demo clinical reference extraction.');
      await new Promise((r) => setTimeout(r, 1200));
      return NextResponse.json({ success: true, data: getMockResult(), isMock: true });
    }

    // Parse MIME type and clean Base64 data
    let mimeType = 'image/jpeg';
    let base64Data = imageBase64;
    if (imageBase64.startsWith('data:')) {
      const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    // Initialize official Google Gen AI SDK
    const ai = new GoogleGenAI({ apiKey });

    // Try reliable, available models first
    const candidateModels = [
      requestedModel,
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-3.7-flash',
    ];

    const uniqueModels = Array.from(new Set(candidateModels.filter(Boolean)));
    let responseText = '';
    let lastError: unknown = null;
    let usedModel = '';

    for (const modelCandidate of uniqueModels) {
      try {
        console.log(`Analyzing prescription image with Gemini model: ${modelCandidate}...`);
        const result = await ai.models.generateContent({
          model: modelCandidate,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: 'Analyze this prescription image thoroughly. Extract all prescribed medicines, strengths, doses, timings, food instructions, and doctor notes into strict JSON adhering to the specified schema.',
                },
                createPartFromBase64(base64Data, mimeType),
              ],
            },
          ],
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
          },
        });

        responseText = result.text || '';
        if (responseText) {
          usedModel = modelCandidate;
          console.log(`✅ Successfully extracted prescription data using: ${modelCandidate}`);
          break;
        }
      } catch (err: unknown) {
        lastError = err;
        const errMsg = (err as Error)?.message || '';
        console.warn(`Model ${modelCandidate} failed:`, errMsg);
        // Quick backoff before trying next candidate
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    if (!responseText) {
      console.error('All live Gemini models failed for uploaded prescription:', lastError);
      let errorMsg = 'Failed to analyze prescription image with Google Gemini';
      if (lastError instanceof Error) {
        try {
          const parsed = JSON.parse(lastError.message);
          if (parsed?.error?.message) {
            errorMsg = parsed.error.message;
          } else {
            errorMsg = lastError.message;
          }
        } catch {
          errorMsg = lastError.message;
        }
      }
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    // Strip any markdown code fences if present
    let cleaned = responseText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    let parsedResult: PrescriptionAnalysisResult;
    try {
      parsedResult = JSON.parse(cleaned);

      if (!parsedResult || typeof parsedResult !== 'object') {
        throw new Error('Gemini response is not a valid JSON object');
      }

      const validBuckets = new Set(['morning', 'afternoon', 'evening', 'night']);
      const rawMeds = Array.isArray(parsedResult.medications) ? parsedResult.medications : [];

      parsedResult.medications = rawMeds
        .filter((m) => m && typeof m === 'object' && (m.name || m.genericName))
        .map((m) => {
          const rawTiming = Array.isArray(m.timing) ? m.timing : [];
          const timing = rawTiming.filter((t: string): t is TimeBucket => validBuckets.has(t));
          const safeTiming: TimeBucket[] = timing.length > 0 ? timing : ['morning'];

          // Default time mapping if not provided or empty
          const timeMap: Record<string, string> = {
            morning: '08:00',
            afternoon: '13:00',
            evening: '18:00',
            night: '21:00',
          };
          const fallbackTimes = safeTiming.map((t: string) => timeMap[t] || '08:00');

          return {
            ...m,
            name: String(m.name || m.genericName || 'Prescribed Medicine').trim(),
            genericName: m.genericName ? String(m.genericName).trim() : undefined,
            dosage: String(m.dosage || '1 tablet').trim(),
            form: m.form || 'tablet',
            frequency: m.frequency || 'Daily',
            timing: safeTiming,
            defaultTimes: Array.isArray(m.defaultTimes) && m.defaultTimes.length > 0 ? m.defaultTimes : fallbackTimes,
            relationToMeal: m.relationToMeal || 'after_meal',
            durationDays: typeof m.durationDays === 'number' && m.durationDays > 0 ? m.durationDays : 7,
            instructions: m.instructions ? String(m.instructions).trim() : undefined,
            warning: m.warning ? String(m.warning).trim() : undefined,
          };
        });

      if (!Array.isArray(parsedResult.patientAdvice)) {
        parsedResult.patientAdvice = [];
      }
      if (!Array.isArray(parsedResult.potentialInteractions)) {
        parsedResult.potentialInteractions = [];
      }
    } catch (parseErr) {
      console.error('Failed to parse Gemini output JSON:', responseText, parseErr);
      return NextResponse.json(
        { error: 'Gemini output could not be parsed into clinical schedule structure' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: parsedResult,
      isMock: false,
      modelUsed: usedModel,
    });
  } catch (err: unknown) {
    console.error('Analyze prescription Gemini API exception:', err);
    let userMessage = 'Internal server error';
    if (err instanceof Error) {
      userMessage = err.message;
      try {
        const parsed = JSON.parse(err.message);
        if (parsed?.error?.message) {
          userMessage = parsed.error.message;
        }
      } catch {
        // keep userMessage as err.message
      }
    }
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    );
  }
}
