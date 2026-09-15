import { apiClient } from '../core/api.client.js';

/**
 * Reads a human-readable message from an API error.
 *
 * @param {unknown} error - The caught request error.
 * @param {string} fallback - Message used when the server sends none.
 * @returns {Error}
 */
const toServiceError = (error, fallback) => {
  const message =
    error.response?.data?.msg || error.response?.data?.message || fallback;
  return new Error(message);
};

/**
 * Creates a new question.
 *
 * @param {Object} payload - The question form data.
 * @param {string} payload.title - The question title.
 * @param {string} payload.content - The question body.
 * @returns {Promise<Object>} The created question from the API.
 */
export async function createQuestion({ title, content }) {
  try {
    const response = await apiClient.post('/api/questions', { title, content });
    return response.data.data;
  } catch (error) {
    throw toServiceError(error, 'Failed to post question.');
  }
}

/**
 * Lists questions, optionally filtered by keyword or current user.
 *
 * @param {Object} [options] - List filters.
 * @param {string} [options.search] - Keyword search.
 * @param {boolean} [options.mine] - When true, only the current user's questions.
 * @returns {Promise<Object[]>} The question list.
 */
export async function getQuestions({ search, mine } = {}) {
  try {
    const params = {};
    if (search) params.q = search;
    if (mine) params.mine = true;
    const response = await apiClient.get('/api/questions', { params });
    return response.data.data;
  } catch (error) {
    throw toServiceError(error, 'Failed to load questions.');
  }
}

/**
 * Fetches one question and its answers by hash.
 *
 * @param {string} questionHash - The 16-character question hash.
 * @returns {Promise<Object>} The question payload.
 */
export async function getSingleQuestion(questionHash) {
  try {
    const response = await apiClient.get(`/api/questions/${questionHash}`);
    return response.data;
  } catch (error) {
    throw toServiceError(error, 'Failed to load question.');
  }
}

/**
 * Updates a question owned by the current user.
 *
 * @param {Object} payload - The update data.
 * @param {string} payload.questionHash - The question hash.
 * @param {string} payload.title - The updated title.
 * @param {string} payload.content - The updated body.
 * @returns {Promise<Object>} The updated question.
 */
export async function updateQuestion({ questionHash, title, content }) {
  try {
    const response = await apiClient.put(`/api/questions/${questionHash}`, {
      title,
      content,
    });
    return response.data.question;
  } catch (error) {
    throw toServiceError(error, 'Failed to update question.');
  }
}

/**
 * Deletes a question owned by the current user.
 *
 * @param {string} questionHash - The question hash.
 * @returns {Promise<void>}
 */
export async function deleteQuestion(questionHash) {
  try {
    await apiClient.delete(`/api/questions/${questionHash}`);
  } catch (error) {
    throw toServiceError(error, 'Failed to delete question.');
  }
}

/**
 * Evaluates how well a draft answer addresses a question.
 *
 * @param {string} questionHash - The 16-character question hash.
 * @param {string} answerText - The draft answer to score.
 * @returns {Promise<{level: string, note: string}>} Fit level and note.
 */
export async function assessAnswerFit(questionHash, answerText) {
  try {
    const response = await apiClient.post(
      `/api/questions/${questionHash}/answer-fit`,
      { answerText },
      { timeout: 30000 },
    );
    return response.data.data;
  } catch (error) {
    throw toServiceError(error, 'Failed to check answer fit.');
  }
}

export const questionService = {
  createQuestion,
  getQuestions,
  getSingleQuestion,
  updateQuestion,
  deleteQuestion,
  assessAnswerFit,
};
