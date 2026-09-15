/**
 * QuestionCard: shared list card for Dashboard and My Questions.
 */
import styles from './QuestionCard.module.css';

/**
 * Formats a timestamp for question cards.
 *
 * @param {string|Date} value - The createdAt value from the API.
 * @returns {string} A short locale date string.
 */
const formatDate = value => {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Renders one question as a clickable card.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.question - The question payload from the API.
 * @param {() => void} props.onClick - Called when the card is activated.
 * @returns {JSX.Element}
 */
export default function QuestionCard({ question, onClick }) {
  const answerCount = question.answerCount ?? 0;

  return (
    <button type='button' className={styles.card} onClick={onClick}>
      <h4 className={styles.card__title}>{question.title}</h4>
      {question.content ? (
        <p className={styles.card__content}>{question.content}</p>
      ) : null}
      <p className={styles.card__meta}>
        {question.author?.firstName} {question.author?.lastName}
        {' · '}
        {answerCount} {answerCount === 1 ? 'answer' : 'answers'}
        {' · '}
        {formatDate(question.createdAt)}
      </p>
    </button>
  );
}
