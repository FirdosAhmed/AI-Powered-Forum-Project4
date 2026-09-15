import crypto from 'crypto';
import { safeExecute } from '../../../../db/config.js';
import {
  ForbiddenError,
  NotFoundError,
} from '../../../utils/errors/index.js';

/**
 * Builds a unique 16-character hex hash for /questions/:questionHash routing.
 *
 * @returns {string} A 16-character lowercase hex string.
 */
const generateQuestionHash = () => crypto.randomBytes(8).toString('hex');

/**
 * Maps a joined questions/users row to the API response shape.
 *
 * @param {Object} row - The database row.
 * @returns {Object} The mapped question, including author and answerCount.
 */
const mapQuestion = row => ({
  id: row.question_id,
  questionHash: row.question_hash,
  title: row.title,
  content: row.content,
  answerCount: Number(row.answer_count) || 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  author: {
    id: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
  },
});

/**
 * Maps a joined answers/users row to the API response shape.
 *
 * @param {Object} row - The database row.
 * @returns {Object} The mapped answer, including author details.
 */
const mapAnswer = row => ({
  id: row.answer_id,
  content: row.content,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  author: {
    id: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
  },
});

/**
 * Stores a question embedding row. Uses failed status when no vector is ready.
 *
 * @param {Object} payload - The vector data.
 * @param {number} payload.questionId - The parent question ID.
 * @param {string} payload.sourceText - The text used for embedding.
 * @param {number[]|null} payload.embedding - The embedding vector, if generated.
 * @param {string} payload.status - ready, pending, or failed.
 * @returns {Promise<void>}
 */
const storeQuestionVector = async ({
  questionId,
  sourceText,
  embedding,
  status,
}) => {
  await safeExecute(
    `INSERT INTO question_vectors (question_id, source_text, embedding, status)
     VALUES (?, ?, ?, ?)`,
    [questionId, sourceText, JSON.stringify(embedding || []), status],
  );
};

/**
 * Creates a question and stores a vector row (ready or failed).
 *
 * @param {Object} payload - The question data.
 * @param {string} payload.title - The question title.
 * @param {string} payload.content - The question text.
 * @param {number} payload.userId - The authenticated author's user ID.
 * @returns {Promise<Object>} The created question object.
 */
export const createQuestionWithVectorService = async ({
  title,
  content,
  userId,
}) => {
  const questionHash = generateQuestionHash();

  const result = await safeExecute(
    'INSERT INTO questions (question_hash, user_id, title, content) VALUES (?, ?, ?, ?)',
    [questionHash, userId, title, content],
  );

  const questionId = result.insertId;
  const sourceText = `${title}\n\n${content}`;

  try {
    // Person 2 (T-11) will replace this with vector.service.js + Gemini.
    await storeQuestionVector({
      questionId,
      sourceText,
      embedding: [],
      status: 'pending',
    });
  } catch {
    try {
      await storeQuestionVector({
        questionId,
        sourceText,
        embedding: [],
        status: 'failed',
      });
    } catch {
      // Question is already saved; do not fail the request if vectors are unavailable.
    }
  }

  return {
    id: questionId,
    questionHash,
    title,
    content,
    userId,
  };
};

/**
 * Lists questions with author info and answer counts.
 *
 * @param {Object} filters - The list filters.
 * @param {string} [filters.search] - Optional keyword for title/content LIKE search.
 * @param {number} filters.userId - The authenticated user's ID.
 * @param {boolean} [filters.mine] - When true, return only this user's questions.
 * @returns {Promise<{questions: Object[], total: number}>} The mapped questions and count.
 */
export const getQuestionsService = async ({ search, userId, mine }) => {
  const where = [];
  const params = [];

  if (mine) {
    where.push('q.user_id = ?');
    params.push(userId);
  }

  if (search) {
    where.push('(q.title LIKE ? OR q.content LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await safeExecute(
    `SELECT
       q.question_id,
       q.question_hash,
       q.user_id,
       q.title,
       q.content,
       q.created_at,
       q.updated_at,
       u.first_name,
       u.last_name,
       COUNT(a.answer_id) AS answer_count
     FROM questions q
     INNER JOIN users u ON u.user_id = q.user_id
     LEFT JOIN answers a ON a.question_id = q.question_id
     ${whereSql}
     GROUP BY
       q.question_id,
       q.question_hash,
       q.user_id,
       q.title,
       q.content,
       q.created_at,
       q.updated_at,
       u.first_name,
       u.last_name
     ORDER BY q.created_at DESC
     LIMIT 100`,
    params,
  );

  return {
    questions: rows.map(mapQuestion),
    total: rows.length,
  };
};

/**
 * Returns one question by hash, plus its answers.
 *
 * @param {Object} payload - The lookup data.
 * @param {string} payload.questionHash - The 16-character question hash.
 * @returns {Promise<{question: Object, answers: Object[]}>} The question and its answers.
 * @throws {NotFoundError} If the question does not exist.
 */
export const getSingleQuestionService = async ({ questionHash }) => {
  const questionRows = await safeExecute(
    `SELECT
       q.question_id,
       q.question_hash,
       q.user_id,
       q.title,
       q.content,
       q.created_at,
       q.updated_at,
       u.first_name,
       u.last_name,
       COUNT(a.answer_id) AS answer_count
     FROM questions q
     INNER JOIN users u ON u.user_id = q.user_id
     LEFT JOIN answers a ON a.question_id = q.question_id
     WHERE q.question_hash = ?
     GROUP BY
       q.question_id,
       q.question_hash,
       q.user_id,
       q.title,
       q.content,
       q.created_at,
       q.updated_at,
       u.first_name,
       u.last_name
     LIMIT 1`,
    [questionHash],
  );

  if (!questionRows[0]) {
    throw new NotFoundError('Question not found.');
  }

  const question = mapQuestion(questionRows[0]);

  const answerRows = await safeExecute(
    `SELECT
       a.answer_id,
       a.user_id,
       a.content,
       a.created_at,
       a.updated_at,
       u.first_name,
       u.last_name
     FROM answers a
     INNER JOIN users u ON u.user_id = a.user_id
     WHERE a.question_id = ?
     ORDER BY a.created_at ASC
     LIMIT 100`,
    [question.id],
  );

  return {
    question,
    answers: answerRows.map(mapAnswer),
  };
};

/**
 * Finds a question owner row by hash.
 *
 * @param {string} questionHash - The 16-character question hash.
 * @returns {Promise<Object|null>} The question row with user_id, or null.
 */
const getQuestionOwnerRow = async questionHash => {
  const rows = await safeExecute(
    'SELECT question_id, user_id FROM questions WHERE question_hash = ? LIMIT 1',
    [questionHash],
  );
  return rows[0] || null;
};

/**
 * Ensures the current user owns the question.
 *
 * @param {Object} questionRow - The question row from the database.
 * @param {number} questionRow.user_id - The question author's user ID.
 * @param {number} userId - The authenticated user's ID.
 * @returns {void}
 * @throws {ForbiddenError} If the user does not own the question.
 */
const assertQuestionOwner = (questionRow, userId) => {
  if (questionRow.user_id !== userId) {
    throw new ForbiddenError('You can only modify your own questions.');
  }
};

/**
 * Updates a question owned by the current user.
 *
 * @param {Object} payload - The update data.
 * @param {string} payload.questionHash - The question hash to update.
 * @param {number} payload.userId - The authenticated user's ID.
 * @param {string} payload.title - The updated title.
 * @param {string} payload.content - The updated question text.
 * @returns {Promise<Object>} The updated question object.
 * @throws {NotFoundError} If the question does not exist.
 * @throws {ForbiddenError} If the user does not own the question.
 */
export const updateQuestionService = async ({
  questionHash,
  userId,
  title,
  content,
}) => {
  const question = await getQuestionOwnerRow(questionHash);
  if (!question) {
    throw new NotFoundError('Question not found.');
  }

  assertQuestionOwner(question, userId);

  await safeExecute(
    'UPDATE questions SET title = ?, content = ? WHERE question_hash = ?',
    [title, content, questionHash],
  );

  const { question: updated } = await getSingleQuestionService({
    questionHash,
  });
  return updated;
};

/**
 * Deletes a question owned by the current user.
 *
 * @param {Object} payload - The delete data.
 * @param {string} payload.questionHash - The question hash to delete.
 * @param {number} payload.userId - The authenticated user's ID.
 * @returns {Promise<void>}
 * @throws {NotFoundError} If the question does not exist.
 * @throws {ForbiddenError} If the user does not own the question.
 */
export const deleteQuestionService = async ({ questionHash, userId }) => {
  const question = await getQuestionOwnerRow(questionHash);
  if (!question) {
    throw new NotFoundError('Question not found.');
  }

  assertQuestionOwner(question, userId);

  await safeExecute('DELETE FROM questions WHERE question_hash = ?', [
    questionHash,
  ]);
};
