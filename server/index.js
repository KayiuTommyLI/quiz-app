require('dotenv').config();
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const cors = require('cors');
const pdf = require('pdf-parse');
const crypto = require('crypto');

const app = express();
const port = 3001;

const quizzesDir = path.join(__dirname, '..', 'quizzes');
const statsFilePath = path.join(__dirname, '..', 'quizzes', 'stats.json');

if (!fs.existsSync(quizzesDir)) fs.mkdirSync(quizzesDir);

app.use(cors());
app.use(express.json());

const createQuestionId = (questionText) => {
  return crypto.createHash('sha256').update(questionText).digest('hex');
};

app.post('/api/quizzes', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).send('Server configuration error: Missing API Key.');
  }
  const materialsDir = path.join(__dirname, '..', 'study_materials');
  let combinedContent = '';
  try {
    const files = fs.readdirSync(materialsDir);
    for (const file of files) {
      const filePath = path.join(materialsDir, file);
      if (file.endsWith('.txt')) combinedContent += fs.readFileSync(filePath, 'utf-8') + '\n\n';
      else if (file.endsWith('.pdf')) {
        const data = await pdf(fs.readFileSync(filePath));
        combinedContent += data.text + '\n\n';
      }
    }
  } catch (err) {
    return res.status(500).send('Failed to read study materials.');
  }
  if (combinedContent.trim() === '') {
    return res.status(400).send('No study materials (.txt or .pdf) found.');
  }

  const promptInstructions = `Based on the following text, generate 10 multiple choice questions and answers in a valid JSON array format. Each object should have "question", "options", "answer", and "explanation" keys. Here is the text:\n\n---\n\n`;
  const fullInput = promptInstructions + combinedContent;
  const tempFilePath = path.join(os.tmpdir(), `gemini-prompt-${Date.now()}.txt`);
  fs.writeFileSync(tempFilePath, fullInput, 'utf-8');
  const command = `gemini --model gemini-2.0-flash < "${tempFilePath}"`;
  
  exec(command, { maxBuffer: 1024 * 1024 * 10, env: process.env }, (error, stdout, stderr) => {
    fs.unlinkSync(tempFilePath);
    if (error) return res.status(500).send(`Failed to execute Gemini CLI. Error: ${stderr}`);
    
    try {
      const jsonResponse = stdout.substring(stdout.indexOf('['), stdout.lastIndexOf(']') + 1);
      const questions = JSON.parse(jsonResponse);
      const filename = `quiz_${new Date().toISOString().replace(/:/g, '-')}.json`;
      fs.writeFileSync(path.join(quizzesDir, filename), JSON.stringify(questions, null, 2));
      res.status(201).json({ message: 'Quiz saved successfully!', filename });
    } catch (e) {
      res.status(500).send('Failed to parse or save the quiz from Gemini response.');
    }
  });
});

app.get('/api/quizzes/all', (req, res) => {
  try {
    let allQuestions = [];
    let stats = {};

    if (fs.existsSync(statsFilePath)) {
      stats = JSON.parse(fs.readFileSync(statsFilePath, 'utf8'));
    }

    const files = fs.readdirSync(quizzesDir);
    const quizFiles = files.filter(file => file.endsWith('.json') && file !== 'stats.json');

    quizFiles.forEach(file => {
      const content = fs.readFileSync(path.join(quizzesDir, file), 'utf8');
      const questions = JSON.parse(content);
      allQuestions.push(...questions);
    });

    let questionPool = allQuestions.map(q => {
      const id = createQuestionId(q.question);
      const qStats = stats[id] || { correct: 0, incorrect: 0, seen: 0 };
      const weight = 1 + (qStats.incorrect * 2) - (qStats.correct * 0.5) + (1 / (qStats.seen + 1));
      return { ...q, weight: Math.max(0.1, weight) };
    });

    const quizQuestions = [];
    const quizSize = Math.min(10, questionPool.length);

    for (let i = 0; i < quizSize; i++) {
      const totalWeight = questionPool.reduce((sum, q) => sum + q.weight, 0);
      let randomWeight = Math.random() * totalWeight;
      
      for (let j = 0; j < questionPool.length; j++) {
        randomWeight -= questionPool[j].weight;
        if (randomWeight <= 0) {
          quizQuestions.push(questionPool[j]);
          questionPool.splice(j, 1);
          break;
        }
      }
    }

    res.json(quizQuestions);
  } catch (err) {
    console.error('Error in /api/quizzes/all:', err);
    res.status(500).send('Error loading or processing quizzes.');
  }
});

app.get('/api/quizzes/count', (req, res) => {
    try {
        let allQuestions = [];
        const files = fs.readdirSync(quizzesDir).filter(file => file.endsWith('.json') && file !== 'stats.json');
        files.forEach(file => {
            const content = fs.readFileSync(path.join(quizzesDir, file), 'utf8');
            allQuestions.push(...JSON.parse(content));
        });
        const uniqueQuestions = new Set(allQuestions.map(q => q.question));
        res.json({ count: uniqueQuestions.size });
    } catch(err) {
        res.status(500).json({ count: 0 });
    }
});


app.post('/api/quizzes/consolidate', (req, res) => {
  try {
    const files = fs.readdirSync(quizzesDir);
    const quizFiles = files.filter(file => file.endsWith('.json') && file !== 'stats.json' && file !== 'master-quiz-bank.json');
    let stats = fs.existsSync(statsFilePath) ? JSON.parse(fs.readFileSync(statsFilePath, 'utf8')) : {};
    
    let allQuestions = [];
    // If a master bank already exists, start with it
    const masterBankPath = path.join(quizzesDir, 'master-quiz-bank.json');
    if (fs.existsSync(masterBankPath)) {
        allQuestions.push(...JSON.parse(fs.readFileSync(masterBankPath, 'utf8')));
    }

    // Add questions from any new, non-master quiz files
    quizFiles.forEach(file => {
      const content = fs.readFileSync(path.join(quizzesDir, file), 'utf8');
      allQuestions.push(...JSON.parse(content));
    });

    const uniqueQuestionsMap = new Map();
    allQuestions.forEach(q => {
      const id = createQuestionId(q.question);
      if (!uniqueQuestionsMap.has(id)) {
        uniqueQuestionsMap.set(id, q);
      }
    });
    
    const finalQuestions = Array.from(uniqueQuestionsMap.values());
    const duplicatesRemoved = allQuestions.length - finalQuestions.length;

    // Write the new consolidated master file
    fs.writeFileSync(masterBankPath, JSON.stringify(finalQuestions, null, 2));

    // Delete the old individual quiz files
    quizFiles.forEach(file => {
      fs.unlinkSync(path.join(quizzesDir, file));
    });

    res.status(200).json({
      message: `Consolidation complete! ${duplicatesRemoved} duplicate questions removed.`,
    });
  } catch (err) {
    console.error('Error during consolidation:', err);
    res.status(500).send('Error consolidating question bank.');
  }
});

app.post('/api/stats', (req, res) => {
    const results = req.body.results;
    if (!results) return res.status(400).send('No results provided.');
    
    let stats = {};
    if (fs.existsSync(statsFilePath)) {
        stats = JSON.parse(fs.readFileSync(statsFilePath, 'utf8'));
    }

    results.forEach(result => {
        const id = createQuestionId(result.question);
        if (!stats[id]) stats[id] = { correct: 0, incorrect: 0, seen: 0 };
        stats[id].seen++;
        if (result.wasCorrect) stats[id].correct++;
        else stats[id].incorrect++;
    });

    fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2));
    res.status(200).send('Stats updated successfully.');
});


app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
