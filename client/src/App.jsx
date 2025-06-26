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
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [currentView, setCurrentView] = useState('topics'); // 'topics', 'menu', 'quiz', 'score'
  
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

  // Add this effect to load topics
  useEffect(() => {
    if (currentView === 'topics') {
      setIsLoading(true);
      fetch('http://localhost:3001/api/topics')
        .then(res => res.json())
        .then(data => setTopics(data || []))
        .catch(err => console.error('Failed to load topics:', err))
        .finally(() => setIsLoading(false));
    }
  }, [currentView]);

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
    if (!isAnswered) return selectedAnswer === option ? 'bg-indigo-500 text-white' : 'bg-white hover:bg-gray-50';
    if (option === questions[currentQuestionIndex].answer) return 'bg-green-100 border-green-500 text-green-800 font-semibold';
    if (option === selectedAnswer) return 'bg-red-100 border-red-500 text-red-800';
    return 'bg-white';
  };
  
  const ProgressBar = ({ current, total }) => (
    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6"><div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(current / total) * 100}%` }}></div></div>
  );
  
  console.log('Current view:', view); // Add this in your component

  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic);
    setCurrentView('menu');
  };

  const handleStartAllTopicsReview = async () => {
    setIsLoading(true);
    setStatusMessage('Building your smart review from all topics...');
    try {
      const response = await fetch('http://localhost:3001/api/quizzes/all');
      if (!response.ok) throw new Error('Could not load the quiz.');
      const questionsData = await response.json();
      if (questionsData.length === 0) {
        setStatusMessage("No questions found. Please generate quizzes first.");
        setIsLoading(false);
        return;
      }
      setQuestions(questionsData);
      setQuizResults([]);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setScore(0);
      setSelectedTopic(null); // Clear topic selection for mixed review
      setView('quiz');
    } catch (err) {
      setStatusMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTopicQuiz = async () => {
    if (!selectedTopic) return;
    
    setIsLoading(true);
    setStatusMessage(`Generating questions for ${selectedTopic.name}...`);
    try {
      const response = await fetch(`http://localhost:3001/api/quizzes/${selectedTopic.id}`, { 
        method: 'POST' 
      });
      const data = await response.json();
      
      if (response.status === 429) {
        setStatusMessage('API rate limit exceeded. Please wait a few minutes before trying again.');
        return;
      }
      
      if (!response.ok) throw new Error(data.message || 'Failed to generate quiz.');
      
      alert(`Generated ${data.questions} questions for ${selectedTopic.name}!`);
      setCurrentView('topics'); // Go back to topics to refresh counts
    } catch (err) {
      setStatusMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTopicQuiz = async () => {
    if (!selectedTopic) return;
    
    setIsLoading(true);
    setStatusMessage(`Loading ${selectedTopic.name} quiz...`);
    try {
      const response = await fetch(`http://localhost:3001/api/quizzes/${selectedTopic.id}`);
      if (!response.ok) throw new Error('Could not load the quiz.');
      
      const questionsData = await response.json();
      console.log('Received questions:', questionsData); // Debug log
      
      if (!questionsData || questionsData.length === 0) {
        setStatusMessage("No questions found. Please generate a quiz first.");
        setIsLoading(false);
        return;
      }
      
      // Set all the quiz state
      setQuestions(questionsData);
      setQuizResults([]);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setScore(0);
      
      // Clear the status message
      setStatusMessage('');
      
      // IMPORTANT: Change the view to 'quiz', not 'quiz'
      setView('quiz'); // Make sure this matches your view logic
      setCurrentView('quiz');
    } catch (err) {
      console.error('Error loading quiz:', err);
      setStatusMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Update your topics view to properly set the selected topic before generating
  if (currentView === 'topics') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">Study Topics</h1>
        <p className="text-lg text-gray-600 mb-8 max-w-md text-center">
          Choose a topic to focus your study session, or review all topics together.
        </p>
        
        <div className="w-full max-w-2xl space-y-4">
          {/* All Topics Review Button */}
          <button
            onClick={handleStartAllTopicsReview}
            disabled={isLoading}
            className="w-full p-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105"
          >
            <div className="text-xl mb-2">🎯 Mixed Review - All Topics</div>
            <div className="text-sm opacity-90">Smart review from your entire question bank</div>
          </button>
          
          {/* Topic Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topics.map((topic) => (
              <div key={topic.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{topic.name}</h3>
                <p className="text-gray-600 mb-4">
                  {topic.questionCount} questions available
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleTopicSelect(topic)}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Study This Topic
                  </button>
                  {topic.questionCount === 0 && (
                    <button
                      onClick={() => {
                        // FIX: Set the selected topic BEFORE calling generate
                        setSelectedTopic(topic);
                        handleGenerateTopicQuiz();
                      }}
                      disabled={isLoading}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Generate Questions
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {statusMessage && <p className="mt-4 text-red-500">{statusMessage}</p>}
      </div>
    );
  }

  if (currentView === 'menu') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <button
          onClick={() => setCurrentView('topics')}
          className="absolute top-4 left-4 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          ← Back to Topics
        </button>
        
        <h1 className="text-5xl font-bold text-gray-800 mb-4">
          {selectedTopic ? selectedTopic.name : 'Study Session'}
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-md text-center">
          {selectedTopic 
            ? `Focus on ${selectedTopic.name} with ${selectedTopic.questionCount} available questions.`
            : 'Mixed review from all your topics.'
          }
        </p>
        
        <div className="w-full max-w-sm space-y-4">
          {selectedTopic ? (
            <>
              <button
                onClick={handleStartTopicQuiz}
                disabled={isLoading || selectedTopic.questionCount === 0}
                className="w-full px-8 py-4 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-transform transform hover:scale-105 disabled:bg-gray-400"
              >
                Start Topic Review (10 Questions)
              </button>
              <button
                onClick={handleGenerateTopicQuiz}
                disabled={isLoading}
                className="w-full px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-transform transform hover:scale-105"
              >
                Generate More Questions
              </button>
            </>
          ) : (
            <button
              onClick={handleStartAllTopicsReview}
              disabled={isLoading}
              className="w-full px-8 py-4 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-transform transform hover:scale-105"
            >
              Start Mixed Review
            </button>
          )}
        </div>
        
        {statusMessage && <p className="mt-4 text-red-500">{statusMessage}</p>}
      </div>
    );
  }
  
  if (view === 'quiz' && (!questions || questions.length === 0)) {
    return <div className="p-8">Loading quiz questions...</div>;
  }

  if (view === 'quiz') {
    const currentQuestion = questions[currentQuestionIndex];
    
    if (!currentQuestion) {
      return <div>Loading...</div>;
    }
    
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <ProgressBar current={currentQuestionIndex + 1} total={questions.length} />
            
            <div className="mb-6">
              <span className="text-sm font-medium text-gray-500">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {currentQuestion.question}
            </h2>
            
            <div className="space-y-3 mb-8">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => !isAnswered && setSelectedAnswer(option)}
                  disabled={isAnswered}
                  className={`w-full p-4 text-left border-2 rounded-lg transition-all duration-200 ${getOptionClass(option)}`}
                >
                  <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
                </button>
              ))}
            </div>
            
            {/* Add explanation section after answer is submitted */}
            {isAnswered && currentQuestion.explanation && (
              <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Explanation:</h3>
                <p className="text-blue-700">{currentQuestion.explanation}</p>
              </div>
            )}
            
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentView(selectedTopic ? 'menu' : 'topics')}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                {selectedTopic ? 'Back to Topic Menu' : 'Back to Topics'}
              </button>
              
              <div className="space-x-4">
                {!isAnswered ? (
                  <button
                    onClick={handleSubmit}
                    disabled={selectedAnswer === null}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'View Results'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'score') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Quiz Complete!</h1>
            <div className="text-6xl font-bold text-indigo-600 mb-4">
              {score}/{questions.length}
            </div>
            <p className="text-xl text-gray-600 mb-8">
              You scored {Math.round((score / questions.length) * 100)}%
            </p>
            
            <div className="space-y-4 mb-8">
              <h3 className="text-lg font-semibold text-gray-700">Review:</h3>
              {quizResults.map((result, index) => (
                <div key={index} className={`p-3 rounded-lg ${result.wasCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                  <span className={`font-medium ${result.wasCorrect ? 'text-green-800' : 'text-red-800'}`}>
                    Q{index + 1}: {result.wasCorrect ? '✓' : '✗'}
                  </span>
                  <p className="text-sm text-gray-600 mt-1">{result.question}</p>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setCurrentView('topics')}
              className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Back to Topics
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Render quiz or score components based on the view state */}
    </div>
  );
};

export default App;
