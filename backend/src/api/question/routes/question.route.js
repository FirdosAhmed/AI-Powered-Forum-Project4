import express from 'express';
import { authenticateUser } from '../../../middleware/authentication.js';
import {
  assessAnswerAgainstQuestionController,
  createQuestionController,
  deleteQuestionController,
  getQuestionsController,
  getSingleQuestionController,
  updateQuestionController,
} from '../controller/question.controller.js';
import {
  assessAnswerFitValidation,
  createQuestionValidation,
  getQuestionsValidation,
  questionHashParamValidation,
  updateQuestionValidation,
} from '../validation/question.validation.js';

const router = express.Router();

/**
 * Requires a valid JWT on every question route.
 */
router.use(authenticateUser);

/**
 * Posts a new question.
 *
 * @route POST /api/questions
 * @access Private
 * @param {string} req.body.title - The question title.
 * @param {string} req.body.content - The question text.
 */
router.post('/', createQuestionValidation, createQuestionController);

/**
 * Lists questions, optionally filtered by search or current user.
 *
 * @route GET /api/questions
 * @access Private
 * @param {string} [req.query.search] - Optional keyword search.
 * @param {boolean} [req.query.mine] - When true, only the current user's questions.
 */
router.get('/', getQuestionsValidation, getQuestionsController);

/**
 * Scores how well a draft answer addresses the question.
 *
 * @route POST /api/questions/:questionHash/answer-fit
 * @access Private
 * @param {string} req.params.questionHash - The 16-character question hash.
 * @param {string} req.body.answerText - The unpublished answer draft.
 */
router.post(
  '/:questionHash/answer-fit',
  assessAnswerFitValidation,
  assessAnswerAgainstQuestionController,
);

/**
 * Returns one question by hash, plus its answers.
 *
 * @route GET /api/questions/:questionHash
 * @access Private
 * @param {string} req.params.questionHash - The 16-character question hash.
 */
router.get(
  '/:questionHash',
  questionHashParamValidation,
  getSingleQuestionController,
);

/**
 * Updates a question owned by the current user.
 *
 * @route PUT /api/questions/:questionHash
 * @access Private
 * @param {string} req.params.questionHash - The 16-character question hash.
 * @param {string} req.body.title - The updated title.
 * @param {string} req.body.content - The updated question text.
 */
router.put(
  '/:questionHash',
  updateQuestionValidation,
  updateQuestionController,
);

/**
 * Deletes a question owned by the current user.
 *
 * @route DELETE /api/questions/:questionHash
 * @access Private
 * @param {string} req.params.questionHash - The 16-character question hash.
 */
router.delete(
  '/:questionHash',
  questionHashParamValidation,
  deleteQuestionController,
);

export default router;
