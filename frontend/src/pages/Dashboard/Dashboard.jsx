/**
 * Dashboard: default home after login; question list and keyword search.
 * Data: `getQuestions` from question.service.js.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import QuestionCard from '../../components/QuestionCard/QuestionCard.jsx';
import { getQuestions } from '../../services/question/question.service.js';
import ui from '../../styles/pageStates.module.css';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const firstName = user?.firstName?.trim();
  const welcomeLine = firstName
    ? `Good to see you, ${firstName}.`
    : 'Welcome to the forum.';

  /**
   * Loads questions from the API.
   *
   * @param {string} [search] - Optional keyword filter.
   * @returns {Promise<void>}
   */
  const loadQuestions = async (search = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getQuestions({ search: search.trim() || undefined });
      setQuestions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const handleSearch = event => {
    event.preventDefault();
    loadQuestions(searchQuery);
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboard__header}>
        <h3 className={styles.dashboard__welcome}>{welcomeLine}</h3>
        <Link to='/questions/ask' className={styles.dashboard__ask}>
          Ask a question
        </Link>
      </div>

      <form className={styles.dashboard__search} onSubmit={handleSearch}>
        <input
          className={styles.dashboard__searchInput}
          type='search'
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
          placeholder='Search questions by keyword'
          aria-label='Search questions'
        />
        <button className={styles.dashboard__searchButton} type='submit'>
          Search
        </button>
      </form>

      {isLoading ? (
        <p
          className={`${ui.pageStates__message} ${ui['pageStates__message--loading']}`}
        >
          Loading questions…
        </p>
      ) : null}

      {!isLoading && error ? (
        <p
          className={`${ui.pageStates__message} ${ui['pageStates__message--error']}`}
          role='alert'
        >
          {error}
        </p>
      ) : null}

      {!isLoading && !error && questions.length === 0 ? (
        <div
          className={`${ui.pageStates__message} ${ui['pageStates__message--empty']}`}
        >
          <p>No questions found.</p>
          <p>
            <Link to='/questions/ask'>Ask the first question</Link>
          </p>
        </div>
      ) : null}

      {!isLoading && !error && questions.length > 0 ? (
        <ul className={styles.dashboard__list}>
          {questions.map(question => (
            <li key={question.id}>
              <QuestionCard
                question={question}
                onClick={() =>
                  navigate(`/questions/${question.questionHash}`)
                }
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
