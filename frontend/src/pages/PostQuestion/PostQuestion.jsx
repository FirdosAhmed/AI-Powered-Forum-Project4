/**
 * PostQuestion: form to ask a new question, then POST /api/questions.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createQuestion } from '../../services/question/question.service.js';
import styles from './PostQuestion.module.css';

const TITLE_MIN = 5;
const TITLE_MAX = 255;
const CONTENT_MIN = 10;

export default function PostQuestion() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (trimmedTitle.length < TITLE_MIN) {
      setError(`Title must be at least ${TITLE_MIN} characters.`);
      return;
    }

    if (trimmedTitle.length > TITLE_MAX) {
      setError(`Title must be at most ${TITLE_MAX} characters.`);
      return;
    }

    if (trimmedContent.length < CONTENT_MIN) {
      setError(`Question details must be at least ${CONTENT_MIN} characters.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await createQuestion({
        title: trimmedTitle,
        content: trimmedContent,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.postQuestion}>
      <form className={styles.postQuestion__form} onSubmit={handleSubmit}>
        {error ? (
          <p className={styles.postQuestion__error} role='alert'>
            {error}
          </p>
        ) : null}

        <div className={styles.postQuestion__field}>
          <label className={styles.postQuestion__label} htmlFor='question-title'>
            Title
          </label>
          <input
            id='question-title'
            className={styles.postQuestion__input}
            type='text'
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder='e.g. How do I join answers to users in MySQL?'
            maxLength={TITLE_MAX}
            disabled={isSubmitting}
          />
          <p className={styles.postQuestion__hint}>
            {title.trim().length}/{TITLE_MAX} — at least {TITLE_MIN} characters
          </p>
        </div>

        <div className={styles.postQuestion__field}>
          <label
            className={styles.postQuestion__label}
            htmlFor='question-content'
          >
            Details
          </label>
          <textarea
            id='question-content'
            className={styles.postQuestion__textarea}
            value={content}
            onChange={event => setContent(event.target.value)}
            placeholder='Describe the problem, what you tried, and any error messages.'
            rows={10}
            disabled={isSubmitting}
          />
          <p className={styles.postQuestion__hint}>
            {content.trim().length} characters — at least {CONTENT_MIN}
          </p>
        </div>

        <div className={styles.postQuestion__actions}>
          <button
            type='submit'
            className={styles.postQuestion__submit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Posting…' : 'Post question'}
          </button>
        </div>
      </form>
    </div>
  );
}
