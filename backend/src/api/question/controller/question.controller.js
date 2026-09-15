import { StatusCodes } from 'http-status-codes';
import {
  createQuestionWithVectorService,
  deleteQuestionService,
  getQuestionsService,
  getSingleQuestionService,
  updateQuestionService,
} from '../service/question.service.js';
import { assessAnswerAgainstQuestionService } from '../service/geminiTextCoach.service.js';

/**
 * Posts a new question for the authenticated user.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {string} req.body.title - The question title.
 * @param {string} req.body.content - The question text.
 * @param {number} req.user.id - The authenticated user's ID.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const createQuestionController = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    const question = await createQuestionWithVectorService({
      title,
      content,
      userId: req.user.id,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Question posted successfully.',
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists questions, with optional search and "mine" filters.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {string} [req.query.search] - Optional keyword search.
 * @param {string} [req.query.q] - Optional alias for search.
 * @param {boolean} [req.query.mine] - When true, only this user's questions.
 * @param {number} req.user.id - The authenticated user's ID.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const getQuestionsController = async (req, res, next) => {
  try {
    const search = req.query.search || req.query.q;
    const mine = req.query.mine === true || req.query.mine === 'true';

    const { questions, total } = await getQuestionsService({
      search,
      userId: req.user.id,
      mine,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Questions fetched successfully.',
      data: questions,
      meta: {
        limit: 100,
        total,
        sortBy: 'newest',
        sortOrder: 'desc',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns one question by hash, plus its answers.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {string} req.params.questionHash - The 16-character question hash.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const getSingleQuestionController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const { question, answers } = await getSingleQuestionService({
      questionHash,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Question fetched successfully',
      question,
      answers,
      answersMeta: {
        limit: 100,
        total: answers.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates a question owned by the current user.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {string} req.params.questionHash - The 16-character question hash.
 * @param {string} req.body.title - The updated title.
 * @param {string} req.body.content - The updated question text.
 * @param {number} req.user.id - The authenticated user's ID.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const updateQuestionController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const { title, content } = req.body;

    const question = await updateQuestionService({
      questionHash,
      userId: req.user.id,
      title,
      content,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Question updated successfully.',
      question,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes a question owned by the current user.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {string} req.params.questionHash - The 16-character question hash.
 * @param {number} req.user.id - The authenticated user's ID.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const deleteQuestionController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;

    await deleteQuestionService({
      questionHash,
      userId: req.user.id,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Question deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Scores how well a draft answer addresses the question.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {string} req.params.questionHash - The 16-character question hash.
 * @param {string} req.body.answerText - The unpublished answer draft.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const assessAnswerAgainstQuestionController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const { answerText } = req.body;

    const data = await assessAnswerAgainstQuestionService({
      questionHash,
      answerDraft: answerText,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Answer fit assessed',
      data,
    });
  } catch (error) {
    next(error);
  }
};
