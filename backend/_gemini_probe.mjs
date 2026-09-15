import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

const model = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash-lite';
const apiKey = process.env.GEMINI_API_KEY?.trim();

console.log('model', model);
console.log('keyPrefix', apiKey?.slice(0, 3));
console.log('keyLength', apiKey?.length);

const ai = new GoogleGenAI({ apiKey });

const run = async (label, params) => {
  try {
    const response = await ai.models.generateContent(params);
    console.log(label, 'ok', String(response.text ?? '').slice(0, 180));
  } catch (error) {
    console.log(label, 'FAIL');
    console.log('  name', error?.name);
    console.log('  status', error?.status ?? error?.statusCode);
    console.log('  message', error?.message);
  }
};

await run('json-mime', {
  model,
  contents: 'Return JSON {"level":"weak","note":"test"} only.',
  config: { temperature: 0.2, responseMimeType: 'application/json' },
});

await run('plain', {
  model,
  contents: 'Say hi in one word.',
});
