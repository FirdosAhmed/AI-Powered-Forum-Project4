/**
 * QuestionDetail: thread view matching the forum question-detail mock.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  Bold,
  Code,
  Italic,
  Link2,
  MessageSquare,
  Pencil,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  assessAnswerFit,
  deleteQuestion,
  getQuestions,
  getSingleQuestion,
  updateQuestion,
} from '../../services/question/question.service.js';
import {
  deleteAnswer,
  postAnswer,
  updateAnswer,
} from '../../services/answer/answer.service.js';
import ui from '../../styles/pageStates.module.css';
import styles from './QuestionDetail.module.css';

const ANSWER_MIN = 20;
const AVATAR_COLORS = ['#0f766e', '#c2410c', '#1d4ed8', '#7c3aed', '#b45309'];

/**
 * Formats a posted-on date like the design mock (M/D/YYYY).
 *
 * @param {string|Date} value - A createdAt value.
 * @returns {string} A numeric locale date.
 */
const formatPostedDate = value => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US');
};

/**
 * Builds initials from an author object.
 *
 * @param {Object} [author] - The author payload.
 * @returns {string} One or two uppercase letters.
 */
const getInitials = author => {
  const first = author?.firstName?.trim()?.[0] ?? '';
  const last = author?.lastName?.trim()?.[0] ?? '';
  return `${first}${last}`.toUpperCase() || '?';
};

/**
 * Picks a stable avatar color from the author name.
 *
 * @param {Object} [author] - The author payload.
 * @returns {string} A hex color.
 */
const getAvatarColor = author => {
  const key = `${author?.firstName ?? ''}${author?.lastName ?? ''}`;
  let hash = 0;
  for (const char of key) {
    hash = (hash + char.charCodeAt(0)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash];
};

export default function QuestionDetail() {
  const { questionHash } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [related, setRelated] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingFit, setIsCheckingFit] = useState(false);
  const [fitResult, setFitResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editAnswerId, setEditAnswerId] = useState(null);
  const [editAnswerContent, setEditAnswerContent] = useState('');
  const [actionError, setActionError] = useState(null);

  /**
   * Loads the question, answers, and related topics.
   *
   * @returns {Promise<void>}
   */
  const loadQuestion = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSingleQuestion(questionHash);
      setQuestion(data.question);
      setAnswers(Array.isArray(data.answers) ? data.answers : []);

      try {
        const all = await getQuestions();
        setRelated(
          (Array.isArray(all) ? all : [])
            .filter(item => item.questionHash !== questionHash)
            .slice(0, 4),
        );
      } catch {
        setRelated([]);
      }
    } catch (err) {
      setError(err.message);
      setQuestion(null);
      setAnswers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestion();
  }, [questionHash]);

  const trimmedReply = reply.trim();
  const isAuthor =
    user?.id != null &&
    question?.author?.id != null &&
    Number(user.id) === Number(question.author.id);

  const isAnswerOwner = answer =>
    user?.id != null &&
    answer?.author?.id != null &&
    Number(user.id) === Number(answer.author.id);

  /**
   * Wraps the selected textarea text with markdown markers.
   *
   * @param {string} before - Opening markdown.
   * @param {string} [after] - Closing markdown.
   * @returns {void}
   */
  const applyMarkdown = (before, after = before) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? reply.length;
    const end = el?.selectionEnd ?? reply.length;
    const selected = reply.slice(start, end) || 'text';
    const next =
      reply.slice(0, start) + before + selected + after + reply.slice(end);
    setReply(next);
    setFitResult(null);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const startEditQuestion = () => {
    setActionError(null);
    setEditTitle(question.title);
    setEditContent(question.content);
    setIsEditingQuestion(true);
  };

  const handleSaveQuestion = async () => {
    setActionError(null);
    if (editTitle.trim().length < 5 || editContent.trim().length < 10) {
      setActionError('Title needs 5+ characters and details need 10+.');
      return;
    }
    try {
      const updated = await updateQuestion({
        questionHash,
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      setQuestion(updated);
      setIsEditingQuestion(false);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!window.confirm('Delete this question? Answers will be removed too.')) {
      return;
    }
    setActionError(null);
    try {
      await deleteQuestion(questionHash);
      navigate('/dashboard');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleSaveAnswer = async answerId => {
    setActionError(null);
    if (editAnswerContent.trim().length < 3) {
      setActionError('Answer must be at least 3 characters.');
      return;
    }
    try {
      const updated = await updateAnswer({
        answerId,
        content: editAnswerContent.trim(),
      });
      setAnswers(current =>
        current.map(item => (item.id === answerId ? updated : item)),
      );
      setEditAnswerId(null);
      setEditAnswerContent('');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDeleteAnswer = async answerId => {
    if (!window.confirm('Delete this answer?')) {
      return;
    }
    setActionError(null);
    try {
      await deleteAnswer(answerId);
      setAnswers(current => current.filter(item => item.id !== answerId));
      if (editAnswerId === answerId) {
        setEditAnswerId(null);
      }
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleCheckFit = async () => {
    setReplyError(null);
    setFitResult(null);

    if (trimmedReply.length < ANSWER_MIN) {
      setReplyError(`Answer must be at least ${ANSWER_MIN} characters.`);
      return;
    }

    setIsCheckingFit(true);
    try {
      const result = await assessAnswerFit(questionHash, trimmedReply);
      setFitResult(result);
    } catch (err) {
      setReplyError(err.message);
    } finally {
      setIsCheckingFit(false);
    }
  };

  const handleReply = async event => {
    event.preventDefault();
    setReplyError(null);

    if (trimmedReply.length < ANSWER_MIN) {
      setReplyError(`Answer must be at least ${ANSWER_MIN} characters.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await postAnswer({
        questionId: question.id,
        content: trimmedReply,
      });
      if (created) {
        setAnswers(current => [...current, created]);
      } else {
        await loadQuestion();
      }
      setReply('');
      setFitResult(null);
    } catch (err) {
      setReplyError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <p
        className={`${ui.pageStates__message} ${ui['pageStates__message--loading']}`}
      >
        Loading question…
      </p>
    );
  }

  if (error) {
    return (
      <p
        className={`${ui.pageStates__message} ${ui['pageStates__message--error']}`}
        role='alert'
      >
        {error}
      </p>
    );
  }

  if (!question) {
    return (
      <p
        className={`${ui.pageStates__message} ${ui['pageStates__message--empty']}`}
      >
        Question not found.
      </p>
    );
  }

  const fitLevel = fitResult?.level?.toLowerCase();
  const answerCount = answers.length;
  const authorName = [question.author?.firstName, question.author?.lastName]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.detail}>
      <button
        type='button'
        className={styles.detail__back}
        onClick={() => navigate('/dashboard')}
      >
        <ArrowLeft size={16} />
        Back to feed
      </button>

      <div className={styles.detail__grid}>
        <div className={styles.detail__main}>
          <article className={styles.detail__question}>
            <div className={styles.detail__authorRow}>
              <div
                className={styles.detail__avatar}
                style={{ backgroundColor: getAvatarColor(question.author) }}
                aria-hidden
              >
                {getInitials(question.author)}
              </div>
              <div>
                <p className={styles.detail__authorName}>{authorName}</p>
                <p className={styles.detail__posted}>
                  Posted {formatPostedDate(question.createdAt)}
                </p>
              </div>
            </div>

            {actionError ? (
              <p className={styles.detail__error} role='alert'>
                {actionError}
              </p>
            ) : null}

            {isEditingQuestion ? (
              <div className={styles.detail__editBox}>
                <input
                  className={styles.detail__editTitle}
                  value={editTitle}
                  onChange={event => setEditTitle(event.target.value)}
                  aria-label='Question title'
                />
                <textarea
                  className={styles.detail__editBody}
                  value={editContent}
                  onChange={event => setEditContent(event.target.value)}
                  rows={6}
                  aria-label='Question details'
                />
                <div className={styles.detail__editActions}>
                  <button
                    type='button'
                    className={styles.detail__pill}
                    onClick={() => setIsEditingQuestion(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type='button'
                    className={styles.detail__submit}
                    onClick={handleSaveQuestion}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className={styles.detail__title}>{question.title}</h1>
                <div className={styles.detail__markdown}>
                  <ReactMarkdown>{question.content ?? ''}</ReactMarkdown>
                </div>
              </>
            )}

            <div className={styles.detail__pills}>
              <button
                type='button'
                className={styles.detail__pill}
                onClick={handleShare}
              >
                <Share2 size={14} />
                {copied ? 'Copied' : 'Share'}
              </button>
              <span className={styles.detail__pill}>
                <MessageSquare size={14} />
                {answerCount} {answerCount === 1 ? 'Answer' : 'Answers'}
              </span>
              {isAuthor ? (
                <>
                  <button
                    type='button'
                    className={styles.detail__pill}
                    onClick={startEditQuestion}
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    type='button'
                    className={styles.detail__pillDanger}
                    onClick={handleDeleteQuestion}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </>
              ) : null}
            </div>
          </article>

          <section>
            <h2 className={styles.detail__sectionTitle}>
              Community Answers ({answerCount})
            </h2>

            {answerCount === 0 ? (
              isAuthor ? (
                <p className={styles.detail__ownQuestion}>
                  You asked this question, so you cannot post an answer here.
                </p>
              ) : (
                <div className={styles.detail__empty}>
                  <MessageSquare size={28} />
                  <p className={styles.detail__emptyTitle}>
                    Be the first to help!
                  </p>
                  <p className={styles.detail__emptyCopy}>
                    This question is waiting for an expert like you. Share your
                    knowledge and earn reputation points.
                  </p>
                </div>
              )
            ) : (
              <ul className={styles.detail__list}>
                {answers.map(answer => (
                  <li key={answer.id} className={styles.detail__answer}>
                    <div className={styles.detail__authorRow}>
                      <div
                        className={styles.detail__avatar}
                        style={{
                          backgroundColor: getAvatarColor(answer.author),
                        }}
                        aria-hidden
                      >
                        {getInitials(answer.author)}
                      </div>
                      <div>
                        <p className={styles.detail__authorName}>
                          {answer.author?.firstName} {answer.author?.lastName}
                        </p>
                        <p className={styles.detail__posted}>
                          Posted {formatPostedDate(answer.createdAt)}
                        </p>
                      </div>
                    </div>
                    {editAnswerId === answer.id ? (
                      <div className={styles.detail__editBox}>
                        <textarea
                          className={styles.detail__editBody}
                          value={editAnswerContent}
                          onChange={event =>
                            setEditAnswerContent(event.target.value)
                          }
                          rows={5}
                          aria-label='Edit answer'
                        />
                        <div className={styles.detail__editActions}>
                          <button
                            type='button'
                            className={styles.detail__pill}
                            onClick={() => setEditAnswerId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type='button'
                            className={styles.detail__submit}
                            onClick={() => handleSaveAnswer(answer.id)}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.detail__markdown}>
                        <ReactMarkdown>{answer.content ?? ''}</ReactMarkdown>
                      </div>
                    )}
                    {isAnswerOwner(answer) ? (
                      <div className={styles.detail__pills}>
                        <button
                          type='button'
                          className={styles.detail__pill}
                          onClick={() => {
                            setActionError(null);
                            setEditAnswerId(answer.id);
                            setEditAnswerContent(answer.content);
                          }}
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button
                          type='button'
                          className={styles.detail__pillDanger}
                          onClick={() => handleDeleteAnswer(answer.id)}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!isAuthor && (
            <form className={styles.detail__form} onSubmit={handleReply}>
              <h2 className={styles.detail__formTitle}>Contribute an answer</h2>

              {replyError ? (
                <p className={styles.detail__error} role='alert'>
                  {replyError}
                </p>
              ) : null}

              <div className={styles.detail__editor}>
                <div className={styles.detail__toolbar}>
                  <div className={styles.detail__toolbarGroup}>
                    <button
                      type='button'
                      className={styles.detail__tool}
                      onClick={() => applyMarkdown('**')}
                      title='Bold'
                    >
                      <Bold size={15} />
                    </button>
                    <button
                      type='button'
                      className={styles.detail__tool}
                      onClick={() => applyMarkdown('*')}
                      title='Italic'
                    >
                      <Italic size={15} />
                    </button>
                    <span className={styles.detail__toolDivider} />
                    <button
                      type='button'
                      className={styles.detail__tool}
                      onClick={() => applyMarkdown('`')}
                      title='Code'
                    >
                      <Code size={15} />
                    </button>
                    <button
                      type='button'
                      className={styles.detail__tool}
                      onClick={() => applyMarkdown('[', '](url)')}
                      title='Link'
                    >
                      <Link2 size={15} />
                    </button>
                  </div>
                  <span className={styles.detail__charCount}>
                    {reply.length} characters
                  </span>
                </div>
                <textarea
                  id='answer-content'
                  ref={textareaRef}
                  className={styles.detail__textarea}
                  value={reply}
                  onChange={event => {
                    setReply(event.target.value);
                    setFitResult(null);
                  }}
                  rows={8}
                  disabled={isSubmitting || isCheckingFit}
                  placeholder='Type your answer here… You can use Markdown to format your code!'
                />
              </div>

              {fitResult ? (
                <div
                  className={`${styles.detail__fit} ${
                    styles[`detail__fit--${fitLevel}`] ?? ''
                  }`}
                >
                  <p className={styles.detail__fitLevel}>
                    Answer fit: {fitResult.level}
                  </p>
                  {fitResult.note ? <p>{fitResult.note}</p> : null}
                </div>
              ) : null}

              <div className={styles.detail__formFooter}>
                <div className={styles.detail__fitRow}>
                  <button
                    type='button'
                    className={styles.detail__fitButton}
                    onClick={handleCheckFit}
                    disabled={isSubmitting || isCheckingFit}
                  >
                    <Sparkles size={14} />
                    {isCheckingFit ? 'Checking…' : 'Check draft fit'}
                  </button>
                  <p className={styles.detail__fitHint}>
                    Relevance only. Not grading correctness. You need at least{' '}
                    {ANSWER_MIN} characters.
                  </p>
                </div>
                <button
                  type='submit'
                  className={styles.detail__submit}
                  disabled={isSubmitting || isCheckingFit}
                >
                  {isSubmitting ? 'Posting…' : 'Post Your Answer'}
                </button>
              </div>
            </form>
          )}
        </div>

        <aside className={styles.detail__related}>
          <h2 className={styles.detail__relatedTitle}>Related Questions</h2>
          {related.length === 0 ? (
            <p className={styles.detail__relatedEmpty}>
              No related questions yet.
            </p>
          ) : (
            <ul className={styles.detail__relatedList}>
              {related.map(item => (
                <li key={item.id}>
                  <Link
                    to={`/questions/${item.questionHash}`}
                    className={styles.detail__relatedCard}
                  >
                    <p className={styles.detail__relatedQuestion}>
                      {item.title}
                    </p>
                    <p className={styles.detail__relatedMeta}>
                      <span>{item.answerCount ?? 0} answers</span>
                      <span>{formatPostedDate(item.createdAt)}</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
