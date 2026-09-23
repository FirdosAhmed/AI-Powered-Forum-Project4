import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../../contexts/AuthContext';
import { questionService } from '../../services/question/question.service';
import { answerService } from '../../services/answer/answer.service';
import styles from './QuestionDetail.module.css';

const MIN_ANSWER_LENGTH = 20;

export default function QuestionDetail() {
  const { questionHash } = useParams();
  const { user } = useAuth();

  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [answerText, setAnswerText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [isCheckingFit, setIsCheckingFit] = useState(false);
  const [fitResult, setFitResult] = useState(null);
  const [fitError, setFitError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchQuestion() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await questionService.getSingleQuestion(questionHash);
        if (!cancelled) {
          setQuestion(data.question);
          setAnswers(data.answers || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || 'Failed to load question.'
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchQuestion();
    return () => {
      cancelled = true;
    };
  }, [questionHash]);

  const isOwnQuestion = question && user && question.author.id === user.id;

  async function handleCheckFit() {
    if (answerText.length < MIN_ANSWER_LENGTH) return;
    setIsCheckingFit(true);
    setFitResult(null);
    setFitError(null);
    try {
      const data = await questionService.assessAnswerFit(questionHash, answerText);
      setFitResult(data.data);
    } catch (err) {
      setFitError(
        err.message || 'Failed to load question.'
      );
    } finally {
      setIsCheckingFit(false);
    }
  }

  async function handlePostAnswer(e) {
    e.preventDefault();
    if (answerText.length < MIN_ANSWER_LENGTH) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const data = await answerService.postAnswer(question.id, answerText);
      setAnswers(prev => [data.answer, ...prev]);
      setAnswerText('');
      setFitResult(null);
    } catch (err) {
      setSubmitError(
        err.response?.data?.message || 'Failed to post answer. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton} />
        <div className={`${styles.skeleton} ${styles.skeletonShort}`} />
        <div className={styles.skeleton} />
        <div className={`${styles.skeleton} ${styles.skeletonShort}`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBanner}>{error}</div>
      </div>
    );
  }

  const fitLevelClass =
    fitResult?.level === 'strong'
      ? styles.fitStrong
      : fitResult?.level === 'partial'
        ? styles.fitPartial
        : fitResult?.level === 'weak'
          ? styles.fitWeak
          : '';

  return (
    <div className={styles.page}>
      {/* Question Card */}
      <div className={styles.questionCard}>
        <h1 className={styles.questionTitle}>{question.title}</h1>
        <p className={styles.questionMeta}>
          Asked by {question.author.firstName} {question.author.lastName} &middot;{' '}
          {new Date(question.createdAt).toLocaleDateString()}
        </p>
        <div className={styles.questionBody}>
          <ReactMarkdown>{question.content}</ReactMarkdown>
        </div>
      </div>

      {/* Answers Section */}
      <section className={styles.answersSection}>
        <h2 className={styles.sectionHeading}>
          {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
        </h2>

        {answers.length === 0 ? (
          <p className={styles.emptyNote}>No answers yet — be the first to answer!</p>
        ) : (
          <ul className={styles.answerList}>
            {answers.map(answer => (
              <li key={answer.id} className={styles.answerCard}>
                <div className={styles.answerBody}>
                  <ReactMarkdown>{answer.content}</ReactMarkdown>
                </div>
                <p className={styles.answerMeta}>
                  {answer.author.firstName} {answer.author.lastName} &middot;{' '}
                  {new Date(answer.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Post Answer Form */}
      {isOwnQuestion ? (
        <p className={styles.ownQuestionNote}>You cannot answer your own question.</p>
      ) : (
        <section className={styles.postAnswerSection}>
          <h2 className={styles.sectionHeading}>Your Answer</h2>
          <form onSubmit={handlePostAnswer} className={styles.answerForm}>
            <textarea
              className={styles.answerTextarea}
              value={answerText}
              onChange={e => {
                setAnswerText(e.target.value);
                setFitResult(null);
              }}
              placeholder='Write your answer here (min 20 characters)...'
              rows={6}
              disabled={isSubmitting}
            />

            {fitResult && (
              <div className={`${styles.fitPanel} ${fitLevelClass}`}>
                <strong>AI Answer Fit: {fitResult.level}</strong>
                <p>{fitResult.note}</p>
              </div>
            )}

            {fitError && <p className={styles.errorText}>{fitError}</p>}
            {submitError && <p className={styles.errorText}>{submitError}</p>}

            <div className={styles.formActions}>
              <button
                type='button'
                onClick={handleCheckFit}
                disabled={
                  answerText.length < MIN_ANSWER_LENGTH ||
                  isCheckingFit ||
                  isSubmitting
                }
                className={`${styles.btn} ${styles.btnSecondary}`}
              >
                {isCheckingFit ? 'Checking...' : 'Check Answer Fit'}
              </button>
              <button
                type='submit'
                disabled={
                  answerText.length < MIN_ANSWER_LENGTH ||
                  isSubmitting ||
                  isCheckingFit
                }
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                {isSubmitting ? 'Posting...' : 'Post Answer'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
