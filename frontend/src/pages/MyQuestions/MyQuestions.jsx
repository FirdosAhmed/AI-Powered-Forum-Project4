/**
 * MyQuestions: questions authored by the signed-in user.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import QuestionCard from '../../components/QuestionCard/QuestionCard.jsx';
import { getQuestions } from '../../services/question/question.service.js';
import ui from '../../styles/pageStates.module.css';
import styles from './MyQuestions.module.css';

export default function MyQuestions() {
  const navigate = useNavigate();
  const [myQuestions, setMyQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMyQuestions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getQuestions({ mine: true });
        setMyQuestions(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
        setMyQuestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMyQuestions();
  }, []);

  return (
    <div className={styles.myQuestions}>
      <div className={styles.myQuestions__header}>
        <h3 className={styles.myQuestions__heading}>My Questions</h3>
        <Link to='/questions/ask' className={styles.myQuestions__ask}>
          Ask a question
        </Link>
      </div>

      {isLoading ? (
        <p
          className={`${ui.pageStates__message} ${ui['pageStates__message--loading']}`}
        >
          Loading your questions…
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

      {!isLoading && !error && myQuestions.length === 0 ? (
        <div
          className={`${ui.pageStates__message} ${ui['pageStates__message--empty']}`}
        >
          <p>You haven&apos;t asked any questions yet.</p>
          <p>
            <Link to='/questions/ask'>Ask your first question</Link>
          </p>
        </div>
      ) : null}

      {!isLoading && !error && myQuestions.length > 0 ? (
        <ul className={styles.myQuestions__list}>
          {myQuestions.map(question => (
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
