/**
 * ForgotPassword: asks for an email address and requests a reset link.
 */
import { useState } from 'react';

import { motion as Motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { authService } from '../../services/auth/auth.service';
import styles from '../Auth/Auth.module.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!normalizedEmail) {
      setError('Email is required.');
      return;
    }

    if (!emailPattern.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      await authService.forgotPassword(normalizedEmail);
      setSent(true);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.auth}>
      <section className={styles.auth__formSection}>
        <div className={styles.auth__formContainer}>
          <Motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.auth__formHeader}>
              <h2 className={styles.auth__formTitle}>Reset your password</h2>
              <p className={styles.auth__formSubtitle}>
                {sent
                  ? 'Check your inbox and follow the link to choose a new password.'
                  : 'Enter the email address on your account and we will send you a reset link.'}
              </p>
            </div>

            {sent ? (
              <div className={styles.auth__success}>
                If an account exists for that email, a reset link is on its
                way. The link expires in 30 minutes.
              </div>
            ) : (
              <form className={styles.auth__form} onSubmit={handleSubmit}>
                <div className={styles.auth__inputGroup}>
                  <label htmlFor='email' className={styles.auth__label}>
                    Email Address
                  </label>
                  <input
                    id='email'
                    type='email'
                    placeholder='Enter your email address'
                    className={styles.auth__input}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                {error && <div className={styles.auth__error}>{error}</div>}

                <div className={styles.auth__buttonContainer}>
                  <button
                    type='submit'
                    className={`${styles.auth__button} ${styles['auth__button--primary']}`}
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send reset link'}
                    {!loading && (
                      <ArrowRight
                        size={16}
                        className={styles.auth__buttonIcon}
                      />
                    )}
                  </button>
                </div>
              </form>
            )}

            <footer className={styles.auth__formFooter}>
              <p className={styles.auth__formFooterText}>
                Remembered your password?
                <Link to='/auth' className={styles.auth__formFooterLink}>
                  Back to sign in
                </Link>
              </p>
            </footer>
          </Motion.div>
        </div>
      </section>
    </div>
  );
}
