import express from 'express';
import {
  registerController,
  loginController,
  forgotPasswordController,
  resetPasswordController,
  verifyResetTokenController,
} from '../controller/auth.controller.js';
import {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  resetTokenParamValidation,
} from '../validations/auth.validation.js';

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', registerValidation, registerController);

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and get token
 * @access Public
 */
router.post('/login', loginValidation, loginController);

/**
 * @route POST /api/auth/forgot-password
 * @desc Email a single-use password reset link
 * @access Public
 */
router.post(
  '/forgot-password',
  forgotPasswordValidation,
  forgotPasswordController,
);

/**
 * @route GET /api/auth/reset-password/:token
 * @desc Check whether a reset link is still usable
 * @access Public
 */
router.get(
  '/reset-password/:token',
  resetTokenParamValidation,
  verifyResetTokenController,
);

/**
 * @route POST /api/auth/reset-password
 * @desc Set a new password using a valid reset token
 * @access Public
 */
router.post(
  '/reset-password',
  resetPasswordValidation,
  resetPasswordController,
);

export default router;
