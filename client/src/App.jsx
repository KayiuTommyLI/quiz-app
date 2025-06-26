import React, { useState, useEffect } from 'react';

const App = () => {
  const [view, setView] = useState('menu'); // 'menu', 'quiz', 'score'
  const [questions, setQuestions] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [totalQuestionsInBank, setTotalQuestionsInBank] = useState(0);
  
  // Effect to fetch total question count for the menu
  useEffect(() => {
    if (view === 'menu') {
      setIsLoading(true);
      setStatusMessage('');
      fetch('http://localhost:3001/api/quizzes/count')
        .then(res => res.json())
        .then(data => setTotalQuestionsInBank(data.count || 0))
        .catch(() => setTotalQuestionsInBank(0))
        .finally(() => setIsLoading(false));
    }
  }, [view]);

  // Effect to post quiz results when the user reaches the score screen
  useEffect(() => {
    if (view === 'score' && quizResults.length > 0) {
      fetch('http://localhost:3001/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: quizResults }),
      }).catch(err => console.error("Failed to submit stats:", err));
      setQuizResults([]);
    }
  }, [view]);

  const handleGenerateNewQuiz = async () => {
    setIsLoading(true);
    setStatusMessage('Generating new questions...');
    try {
      const response = await fetch('http://localhost:3001/api/quizzes', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to generate quiz.');
      alert('New quiz generated and added to your question bank!');
      setView('menu');
    } catch (err) {
      setStatusMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSmartReview = async () => {
    setIsLoading(true);
    setStatusMessage('Building your smart review...');
    try {
      const response = await fetch('http://localhost:3001/api/quizzes/all');
      if (!response.ok) throw new Error('Could not load the quiz.');
      const questionsData = await response.json();
      if (questionsData.length === 0) {
        setStatusMessage("No questions found. Please generate a quiz first.");
        setIsLoading(false);
        return;
      }
      setQuestions(questionsData);
      setQuizResults([]);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setScore(0);
      setView('quiz');
    } catch (err) {
      setStatusMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // ** FIX: Added finally block to reset loading state **
  const handleConsolidate = async () => {
    if (!window.confirm("This will merge all quiz files into one and delete the originals. This action cannot be undone. Are you sure?")) {
        return;
    }
    setIsLoading(true);
    setStatusMessage('Consolidating...');
    try {
      const response = await fetch('http://localhost:3001/api/quizzes/consolidate', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to consolidate.');
      alert(data.message);
      setView('menu');
    } catch(err) {
      setStatusMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (selectedAnswer !== null) {
      const wasCorrect = selectedAnswer === questions[currentQuestionIndex].answer;
      setIsAnswered(true);
      if (wasCorrect) setScore(score + 1);
      setQuizResults([...quizResults, { question: questions[currentQuestionIndex].question, wasCorrect }]);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setView('score');
    }
  };
  
  const getOptionClass = (option) => {
    if (!isAnswered) return selectedAnswer === option ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-300' : 'bg-white hover:bg-gray-50';
    if (option === questions[currentQuestionIndex].answer) return 'bg-green-100 border-green-500 text-green-800 font-semibold';
    if (option === selectedAnswer) return 'bg-red-100 border-red-500 text-red-800';
    return 'bg-white';
  };
  
  const ProgressBar = ({ current, total }) => (
    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6"><div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(current / total) * 100}%` }}></div></div>
  );
  
  if (view === 'menu') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">Interview Prep Quiz</h1>
        <p className="text-lg text-gray-600 mb-8 max-w-md text-center">
          Your question bank has <span className="font-bold text-indigo-600">{totalQuestionsInBank}</span> unique questions.
        </p>
        <div className="w-full max-w-sm">
          <button
            onClick={handleStartSmartReview}
            disabled={isLoading || totalQuestionsInBank === 0}
            className="w-full mb-4 px-8 py-4 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Start Smart Review (10 Questions)
          </button>
          <button
            onClick={handleGenerateNewQuiz}
            disabled={isLoading}
            className="w-full mb-4 px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-transform transform hover:scale-105 disabled:bg-indigo-300 disabled:cursor-wait"
          >
            {isLoading && statusMessage.includes('Generating') ? 'Generating...' : 'Generate 10 New Questions'}
          </button>
          <button
            onClick={handleConsolidate}
            disabled={isLoading}
            className="w-full mt-2 px-8 py-2 bg-gray-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75 disabled:bg-gray-400"
          >
             {isLoading && statusMessage.includes('Consolidating') ? 'Consolidating...' : 'Consolidate & Clean Bank'}
          </button>
        </div>
        {statusMessage && <p className="mt-4 text-red-500">{statusMessage}</p>}
      </div>
    );
  }
  
  // Quiz and Score views remain the same
  if (view === 'quiz') { /* ... */ }
  if (view === 'score') { /* ... */ }
};

export default App;
