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
 * Posts an answer to a question.
 *
 * @param {Object} payload - The answer data.
 * @param {number} payload.questionId - The parent question ID.
 * @param {string} payload.content - The answer text.
 * @returns {Promise<Object>} The created answer.
 */
export async function postAnswer({ questionId, content }) {
  try {
    const response = await apiClient.post('/api/answers', {
      questionId,
      content,
    });
    return response.data.answer;
  } catch (error) {
    throw toServiceError(error, 'Failed to post answer.');
  }
}

/**
 * Updates an answer owned by the current user.
 *
 * @param {Object} payload - The update data.
 * @param {number} payload.answerId - The answer ID.
 * @param {string} payload.content - The updated answer text.
 * @returns {Promise<Object>} The updated answer.
 */
export async function updateAnswer({ answerId, content }) {
  try {
    const response = await apiClient.put(`/api/answers/${answerId}`, {
      content,
    });
    return response.data.answer;
  } catch (error) {
    throw toServiceError(error, 'Failed to update answer.');
  }
}

/**
 * Deletes an answer owned by the current user.
 *
 * @param {number} answerId - The answer ID.
 * @returns {Promise<void>}
 */
export async function deleteAnswer(answerId) {
  try {
    await apiClient.delete(`/api/answers/${answerId}`);
  } catch (error) {
    throw toServiceError(error, 'Failed to delete answer.');
  }
}

export const answerService = {
  postAnswer,
  updateAnswer,
  deleteAnswer,
};
