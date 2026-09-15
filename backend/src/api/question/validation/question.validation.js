<<<<<<< HEAD
import { body, param, query } from 'express-validator';
import { validationErrorHandler } from '../../../middleware/validation-handler.js';

/**
 * Validates the request body when posting a new question.
 *
 * @param {string} title - The question title from the request body (5-255 characters).
 * @param {string} content - The question text from the request body (min 10 characters).
 * @returns {Array} Middleware that rejects invalid input with 400.
 */
export const createQuestionValidation = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isString()
    .withMessage('Title must be a string')
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters')
    .trim(),
  body('content')
    .notEmpty()
    .withMessage('Question content is required')
    .isString()
    .withMessage('Question content must be a string')
    .isLength({ min: 10 })
    .withMessage('Question content must be at least 10 characters long')
    .trim(),
  validationErrorHandler,
];

/**
 * Validates optional query params when listing questions.
 *
 * @param {string} [search] - Optional keyword to match against title or content.
 * @param {string} [q] - Optional alias for search (frontend uses ?q=).
 * @param {boolean} [mine] - When true, return only the current user's questions.
 * @returns {Array} Middleware that rejects invalid input with 400.
 */
export const getQuestionsValidation = [
  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a string')
    .isLength({ min: 1, max: 255 })
    .withMessage('Search must be between 1 and 255 characters')
    .trim(),
  query('q')
    .optional()
    .isString()
    .withMessage('Search query must be a string')
    .isLength({ min: 1, max: 255 })
    .withMessage('Search query must be between 1 and 255 characters')
    .trim(),
  query('mine')
    .optional()
    .isBoolean()
    .withMessage('Mine must be a boolean')
    .toBoolean(),
  validationErrorHandler,
];

/**
 * Validates the 16-character hex hash in the route param.
 *
 * @param {string} questionHash - The question hash from the route param.
 * @returns {Array} Middleware that rejects an invalid hash with 400.
 */
export const questionHashParamValidation = [
  param('questionHash')
    .matches(/^[a-f0-9]{16}$/)
    .withMessage('Question hash must be a 16-character lowercase hex string'),
  validationErrorHandler,
];

/**
 * Validates the hash and body when updating a question.
 *
 * @param {string} questionHash - The question hash from the route param.
 * @param {string} title - The updated title (5-255 characters).
 * @param {string} content - The updated question text (min 10 characters).
 * @returns {Array} Middleware that rejects invalid input with 400.
 */
export const updateQuestionValidation = [
  param('questionHash')
    .matches(/^[a-f0-9]{16}$/)
    .withMessage('Question hash must be a 16-character lowercase hex string'),
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isString()
    .withMessage('Title must be a string')
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters')
    .trim(),
  body('content')
    .notEmpty()
    .withMessage('Question content is required')
    .isString()
    .withMessage('Question content must be a string')
    .isLength({ min: 10 })
    .withMessage('Question content must be at least 10 characters long')
    .trim(),
  validationErrorHandler,
];

/**
 * Validates the hash and draft when checking answer fit.
 *
 * @param {string} questionHash - The question hash from the route param.
 * @param {string} answerText - The unpublished answer draft (min 20 characters).
 * @returns {Array} Middleware that rejects invalid input with 400.
 */
export const assessAnswerFitValidation = [
  param('questionHash')
    .matches(/^[a-f0-9]{16}$/)
    .withMessage('Question hash must be a 16-character lowercase hex string'),
  body('answerText')
    .notEmpty()
    .withMessage('Answer text is required')
    .isString()
    .withMessage('Answer text must be a string')
    .isLength({ min: 20 })
    .withMessage('Answer text must be at least 20 characters long')
    .trim(),
  validationErrorHandler,
];
=======
import { body, param, query } from "express-validator";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";

export const createQuestionValidation = [
  body("title")
    .notEmpty()
    .withMessage("Question title is required")
    .isString()
    .withMessage("Question title must be a string")
    .isLength({ min: 5, max: 255 })
    .withMessage("Question title must be between 5 and 255 characters")
    .trim(),
  body("content")
    .notEmpty()
    .withMessage("Question content is required")
    .isString()
    .withMessage("Question content must be a string")
    .isLength({ min: 10 })
    .withMessage("Question content must be at least 10 characters")
    .trim(),
  validationErrorHandler,
];

export const getQuestionsValidation = [
  query("search")
    .optional()
    .isString()
    .withMessage("Search must be a string")
    .trim(),
  query("mine")
    .optional()
    .isBoolean()
    .withMessage("Mine must be a boolean")
    .toBoolean(),
  validationErrorHandler,
];

export const getSingleQuestionValidation = [
  param("questionHash")
    .isString()
    .withMessage("Question hash is required and must be a string")
    .matches(/^[a-f0-9]{32}$/)
    .withMessage(
      "Question hash must be a 16-character lowercase hexadecimal string",
    ),
  validationErrorHandler,
];

export const searchQuestionsSemanticValidation = [
  query("query")
    .notEmpty()
    .withMessage("Query parameter is required for semantic search")
    .isString()
    .withMessage("Query parameter must be a string")
    .isLength({ min: 5 })
    .withMessage("Query parameter must be at least 5 characters long")
    .trim(),
  query("k")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("k must be an integer between 1 and 20")
    .toInt(),
  query("threshold")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("threshold must be a float between 0 and 1")
    .toFloat(),
  validationErrorHandler,
];
>>>>>>> 082f6a41642ed05b58e273ac81f25e6429bb692d
