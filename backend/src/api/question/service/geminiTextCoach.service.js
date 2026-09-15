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
