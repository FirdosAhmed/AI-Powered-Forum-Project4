<<<<<<< HEAD
import { GoogleGenAI } from '@google/genai';
import { safeExecute } from '../../../../db/config.js';
import {
  NotFoundError,
  ServiceUnavailableError,
} from '../../../utils/errors/index.js';

const GEMINI_TEXT_MODEL =
  process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash-lite';
const FIT_LEVELS = new Set(['strong', 'partial', 'weak']);

let geminiClient;

/**
 * Returns a Gemini client, creating it on first use.
 *
 * @returns {GoogleGenAI} The shared Gemini client.
 * @throws {ServiceUnavailableError} If GEMINI_API_KEY is missing.
 */
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ServiceUnavailableError(
      'Answer fit is unavailable. GEMINI_API_KEY is not configured.',
    );
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }

  return geminiClient;
};

/**
 * Builds the rubric prompt for scoring a draft against a question.
 *
 * @param {Object} payload - The prompt inputs.
 * @param {string} payload.questionTitle - The question title.
 * @param {string} payload.questionContent - The question body.
 * @param {string} payload.answerDraft - The unpublished answer draft.
 * @returns {string} The full prompt sent to Gemini.
 */
const buildAnswerFitPrompt = ({
  questionTitle,
  questionContent,
  answerDraft,
}) => `You are a programming-forum coach.
Judge how well DRAFT addresses QUESTION.
Do not write a full solution. Do not invent APIs.
Ignore minor typos unless they hide meaning.
This is relevance only, not grading correctness.

Levels:
- strong: answers the asked problem with enough steps or code
- partial: on-topic but missing the core issue or a key step
- weak: off-topic, too vague, or does not answer the question

Return ONLY JSON with this shape:
{"level":"strong"|"partial"|"weak","note":"1-3 sentences"}

QUESTION TITLE:
${questionTitle}

QUESTION BODY:
${questionContent}

DRAFT ANSWER:
${answerDraft}`;

/**
 * Parses JSON from a model string, including fenced markdown.
 *
 * @param {string} rawText - The raw model output.
 * @returns {Object} The parsed object.
 * @throws {ServiceUnavailableError} If the output is not valid JSON.
 */
const parseJsonFromModelText = rawText => {
  const trimmed = String(rawText ?? '').trim();
  if (!trimmed) {
    throw new ServiceUnavailableError('Answer fit could not be assessed.');
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = (fenced?.[1] ?? trimmed).trim();

  try {
    return JSON.parse(jsonText);
  } catch {
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(jsonText.slice(firstBrace, lastBrace + 1));
    }
    throw new ServiceUnavailableError('Answer fit could not be assessed.');
  }
};

/**
 * Normalizes Gemini output into { level, note }.
 *
 * @param {string} rawText - The raw model output.
 * @returns {{level: string, note: string}} The fit result.
 * @throws {ServiceUnavailableError} If level is missing or invalid.
 */
const parseFitResult = rawText => {
  let parsed;
  try {
    parsed = parseJsonFromModelText(rawText);
  } catch (error) {
    if (error instanceof ServiceUnavailableError) {
      throw error;
    }
    throw new ServiceUnavailableError('Answer fit could not be assessed.');
  }

  const level = String(parsed?.level ?? '').toLowerCase();
  if (!FIT_LEVELS.has(level)) {
    throw new ServiceUnavailableError('Answer fit could not be assessed.');
  }

  return {
    level,
    note: String(parsed?.note ?? '').trim(),
  };
};

/**
 * Asks Gemini how well a draft answer addresses a question.
 *
 * @param {Object} payload - The texts to compare.
 * @param {string} payload.questionTitle - The question title.
 * @param {string} payload.questionContent - The question body.
 * @param {string} payload.answerDraft - The unpublished answer draft.
 * @returns {Promise<{level: string, note: string}>} Fit level and coach note.
 * @throws {ServiceUnavailableError} If Gemini is not configured or fails.
 */
export const assessAnswerFit = async ({
  questionTitle,
  questionContent,
  answerDraft,
}) => {
  const client = getGeminiClient();

  let response;
  try {
    response = await client.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: buildAnswerFitPrompt({
        questionTitle,
        questionContent,
        answerDraft,
      }),
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });
  } catch {
    throw new ServiceUnavailableError(
      'Answer fit is unavailable. Please try again later.',
    );
  }

  return parseFitResult(response?.text);
};

/**
 * Loads a question by hash, then scores a draft against it with Gemini.
 *
 * @param {Object} payload - The assessment data.
 * @param {string} payload.questionHash - The 16-character question hash.
 * @param {string} payload.answerDraft - The unpublished answer draft.
 * @returns {Promise<{level: string, note: string}>} Fit level and coach note.
 * @throws {NotFoundError} If the question does not exist.
 * @throws {ServiceUnavailableError} If Gemini is not configured or fails.
 */
export const assessAnswerAgainstQuestionService = async ({
  questionHash,
  answerDraft,
}) => {
  const rows = await safeExecute(
    'SELECT title, content FROM questions WHERE question_hash = ? LIMIT 1',
    [questionHash],
  );

  if (!rows[0]) {
    throw new NotFoundError('Question not found.');
  }

  return assessAnswerFit({
    questionTitle: rows[0].title,
    questionContent: rows[0].content,
    answerDraft,
  });
};
=======
import { GoogleGenAI } from '@google/genai';
import { safeExecute } from "../../../../db/config.js";
import { ServiceUnavailableError } from '../../../utils/errors/index.js';

const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.7-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const RECOMMEND_THRESHOLD = Number(process.env.RECOMMEND_THRESHOLD) || 0.75;
const RECOMMEND_K = Number(process.env.RECOMMEND_K) || 5;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Utility to collapse consecutive whitespace characters into a single space
 * and trim leading/trailing whitespace for consistent text formatting.
 * @param {string} value - The input text to normalize.
 * @returns {string} The normalized text with collapsed whitespace and trimmed ends.
 */
function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Strip optional markdown fence and parse JSON object from model text.
 * @param {string} raw
 * @returns {object|null}
 */
function parseJsonObjectFromGeminiText(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let t = raw.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }
  try {
    const v = JSON.parse(t);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

async function fetchGeminiJsonTextResponse(userPrompt) {
  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: userPrompt,
  });
  const text = response?.text;
  return typeof text === 'string' ? text : '';
}

/**
 * Short coaching tips for a question draft (forum / coursework context).
 * @param {{ title: string, content: string }} param
 * @returns {Promise<{ tips: string[] }>}
 */
export const generateQuestionDraftCoachService = async ({ title, content }) => {
  const userPrompt = `You help learners write clearer technical forum posts.
QUESTION TITLE:
${title}

QUESTION BODY (markdown allowed):
${content}

Reply with ONLY valid JSON (no markdown fences), exactly this shape:
{"tips":["...", "..."]}

Rules:
- tips: array of 3 to 5 short strings (each under 120 characters).
- Focus on: missing context (error message, expected vs actual), reproducibility, a sharper title idea if needed, tone for peers.
- Do not claim the question is "correct" or grade homework; give constructive checklist-style tips only.`;

  try {
    const raw = await fetchGeminiJsonTextResponse(userPrompt);
    const parsed = parseJsonObjectFromGeminiText(raw);
    let tips = Array.isArray(parsed?.tips)
      ? parsed.tips
          .filter((t) => typeof t === 'string' && t.trim())
          .map((t) => t.trim())
      : [];
    tips = tips.slice(0, 5);
    if (tips.length === 0) {
      tips = [
        'Add any error messages or exact behavior you see.',
        'Say what you already tried and what you expected instead.',
      ];
    }
    return { tips };
  } catch (error) {
    throw new ServiceUnavailableError('Failed to generate draft coaching tips');
  }
};

/**
 * Assesses whether an answer draft addresses the question context.
 * @param {{ questionTitle: string, questionContent: string, answerText: string }} param
 * @returns {Promise<{ level: string, note: string }>}
 */
export const assessAnswerAgainstQuestionService = async ({
  questionTitle,
  questionContent,
  answerText,
}) => {
  const userPrompt = `You review whether a forum ANSWER draft addresses the QUESTION (relevance and completeness of engagement - not whether the answer is strictly correct).

QUESTION TITLE:
${questionTitle}

QUESTION BODY:
${questionContent}

ANSWER DRAFT:
${answerText}

Reply with ONLY valid JSON (no markdown fences), exactly this shape:
{
  "level":"strong"|"partial"|"weak",
  "note":"one short sentence"
}

Rules:
- level: "strong" if the draft clearly engages with the question; "partial" if somewhat related but missing key parts of the ask; "weak" if mostly off-topic or too vague.
- note: one sentence, plain language, no markdown, under 200 characters. Frame as fit/relevance, not grading.`;

  try {
    const raw = await fetchGeminiJsonTextResponse(userPrompt);
    const parsed = parseJsonObjectFromGeminiText(raw);
    const levelRaw = parsed?.level;
    const noteRaw = parsed?.note;

    const level =
      levelRaw === 'strong' || levelRaw === 'partial' || levelRaw === 'weak'
        ? levelRaw
        : 'partial';

    const note =
      typeof noteRaw === 'string' && noteRaw.trim()
        ? noteRaw.trim().slice(0, 200)
        : 'Ensure your answer directly addresses the specific context described in the question.';

    return { level, note };
  } catch (error) {
    throw new ServiceUnavailableError('Failed to assess answer relevance');
  }
};
>>>>>>> 082f6a41642ed05b58e273ac81f25e6429bb692d
