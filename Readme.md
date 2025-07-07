# Quiz App - AI-Powered Study Question Generator

A sophisticated quiz application that automatically generates multiple-choice questions from your study materials using Google's Gemini AI. Features smart question weighting, topic-based organization, and adaptive learning capabilities.

## 🌟 Features

### 📚 **Multi-Topic Organization**
- Organize study materials into separate topics (Core Concepts, Delivery Framework, Key Technologies, etc.)
- Generate questions specific to each topic
- Track progress per topic with question counts

![Topics Overview](screen_cap/01_Front_Page.png)

### 🤖 **AI-Powered Question Generation**
- Automatically generates diverse multiple-choice questions from PDF and text files
- Uses Google Gemini AI for intelligent question creation
- Appends new questions to existing banks without duplicates
- Generates explanations for each answer

![Question Generation](screen_cap/02_Loading_Topic_Question.png)

### 🧠 **Smart Review System**
- Adaptive question weighting based on your performance
- Prioritizes questions you've answered incorrectly
- Mixed review mode combining all topics
- Option shuffling to prevent pattern memorization

![Quiz Interface](screen_cap/03_Question.png)

### 📊 **Interactive Quiz Experience**
- Clean, responsive UI with progress tracking
- Immediate feedback with correct answer highlighting
- Detailed explanations for better learning
- Performance statistics tracking

![Correct Answer](screen_cap/04_Answer.png)
![Wrong Answer](screen_cap/05_Wrong_Answer.png)

### 📈 **Results & Analytics**
- Comprehensive score breakdown
- Question-by-question review
- Performance tracking across sessions
- Smart weighting adjustments based on results

![Results Screen](screen_cap/06_Reseult.png)

### ⚡ **Rate Limiting & Error Handling**
- Graceful handling of API rate limits
- User-friendly error messages
- Automatic retry mechanisms

![Rate Limit Handling](screen_cap/07_API_rate_limit_exceeded.png)

## 🚀 Getting Started

This section provides instructions for deploying the application using Docker (recommended) or running it locally for development.

### Prerequisites

-   **For Docker:** [Docker](https://www.docker.com/products/docker-desktop/) and [Docker Compose](https://docs.docker.com/compose/install/).
-   **For Local Development:** [Node.js](https://nodejs.org/en/) (v18 or higher).
-   A **Google Account** to authenticate the Gemini CLI.

### 🐳 Docker Deployment (Recommended Method)

This is the easiest and most reliable way to run the application on any server or NAS.

1.  **Clone the Repository**
    ```bash
    git clone <your-repository-url>
    cd quiz-app
    ```

2.  **Create `.env` File**
    Create a `.env` file in the project root and add your Gemini API Key. See the [Configuration](#️-configuration) section above for more details.
    ```bash
    echo "GEMINI_API_KEY=YOUR_API_KEY_HERE" > .env
    ```

3.  **Create Data Directories**
    These folders will be mounted into the container to store your study materials and the generated quizzes.
    ```bash
    mkdir quizzes
    mkdir study_materials
    ```

4.  **Add Your Study Materials**
    Place your study documents (`.txt` or `.pdf`) inside the `study_materials` directory. Create a sub-folder for each topic.
    ```
    study_materials/
    └── history/
        ├── chapter1.pdf
        └── notes.txt
    ```

5.  **Build and Run with Docker Compose**
    This single command builds the Docker image and starts the application in the background.
    ```bash
    docker-compose up -d --build
    ```

6.  **Access the Application**
    Open your web browser and navigate to `http://<your-server-ip>:3001`.

> ### ⚠️ Important: Gemini Regional Restrictions
> The Gemini API and CLI are not available in all regions (e.g., Hong Kong, parts of Europe). If you encounter a **"User location is not supported"** error, you must configure your server/NAS to use a **VPN** that routes its traffic through a supported country (like the US or UK).

### 💻 Local Development Setup

Follow these steps to run the frontend and backend servers separately on your local machine.

1.  **Clone & Install Dependencies**
    ```bash
    git clone <your-repository-url>
    cd quiz-app

    # Install server dependencies
    cd server && npm install

    # Install client dependencies
    cd ../client && npm install
    ```

2.  **Install Gemini CLI Globally**
    The backend uses the Gemini CLI to generate questions.
    ```bash
    npm install -g @google/gemini-cli
    ```

3.  **Start the Backend Server**
    From the `server` directory:
    ```bash
    # The Gemini CLI authenticates with your Google Account, so an API key is not needed.
    cd server
    npm run dev
    ```
    The backend will be running on `http://localhost:3001`.

4.  **Start the Frontend Server (in a new terminal)**
    From the `client` directory:
    ```bash
    cd client
    npm run dev
    ```
    The frontend will be running on `http://localhost:5173`.

5.  **Access the Application**
    Open your browser to `http://localhost:5173`. The Vite development server is pre-configured to proxy API requests to the backend.

## 📁 Project Structure

```
quiz-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.jsx         # Main application component
│   │   └── main.jsx        # Entry point
│   ├── index.html          # HTML template
│   └── package.json
├── server/                 # Express backend
│   ├── index.js            # Main server file
│   └── package.json
├── study_materials/        # Your study content
│   ├── core-concepts/
│   ├── delivery-framework/
│   ├── key-technologies/
│   └── common-patterns/
├── quizzes/               # Generated quiz files
│   ├── core-concepts-quiz.json
│   ├── delivery-framework-quiz.json
│   └── stats.json         # Performance statistics
└── screen_cap/            # Application screenshots
```

## ⚙️ Configuration

The application is configured using environment variables. Create a `.env` file in the root of the project directory. This file can be used by `docker-compose.yml` to pass configuration into the container.

Create a file named `.env` and add the following variables:

```bash
# .env

# Your Google Gemini API Key. While the CLI can use Google Account auth,
# providing a key is recommended for stable performance and higher rate limits.
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# The Gemini model to use for generating questions.
GEMINI_MODEL="gemini-2.5-flash"
```

### Environment Variables

| Variable | Description | Default | Required |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Your API key from [Google AI Studio](https://aistudio.google.com/app/apikey). | `None` | **Yes** |
| `GEMINI_MODEL` | The specific Gemini model to use. Options include `gemini-2.5-pro`, `gemini-2.5-flash`, etc. | `gemini-2.5-flash` | No |
| `NODE_ENV` | Sets the application environment. Automatically set to `production` in Docker. | `production` | No |


## 🔧 API Endpoints

### Topics
- `GET /api/topics` - Get all available topics with question counts
- `POST /api/quizzes/:topicId` - Generate new questions for a topic
- `GET /api/quizzes/:topicId` - Get quiz questions for a topic

### Quizzes
- `GET /api/quizzes/all` - Get mixed review questions from all topics
- `GET /api/quizzes/count` - Get total question count
- `POST /api/quizzes/consolidate` - Merge all quiz files

### Statistics
- `POST /api/stats` - Submit quiz results for analysis

## 🎯 Smart Question Weighting

The application uses an intelligent weighting system:

- **New questions**: Higher weight (more likely to appear)
- **Incorrectly answered**: Increased weight for review
- **Correctly answered**: Decreased weight over time
- **Frequently seen**: Reduced weight to promote variety

Weight calculation:
```javascript
weight = 1 + (incorrect * 2) - (correct * 0.5) + (1 / (seen + 1))
```

## 🛡️ Error Handling

- **Rate Limit Protection**: Automatic detection and user-friendly messages
- **Duplicate Prevention**: SHA-256 hashing prevents duplicate questions
- **File Validation**: Supports .txt and .pdf file formats
- **Graceful Degradation**: Continues operation even with some failed components

## 🔄 Question Generation Process

1. **Content Aggregation**: Reads all files in a topic folder
2. **AI Processing**: Sends content to Gemini AI with specific prompts
3. **Duplicate Detection**: Uses content hashing to prevent duplicates
4. **Question Banking**: Appends new questions to existing collections
5. **Response Formatting**: Ensures consistent JSON structure

## 🎨 UI Features

- **Responsive Design**: Works on desktop and mobile devices
- **Progress Tracking**: Visual progress bars and question counters
- **Immediate Feedback**: Color-coded answer validation
- **Accessibility**: Keyboard navigation and screen reader support
- **Loading States**: Clear indication of processing activities

## 📊 Performance Optimization

- **Lazy Loading**: Questions loaded on demand
- **Efficient Caching**: Reuses generated questions across sessions
- **Minimal API Calls**: Smart batching and caching strategies
- **Memory Management**: Cleanup of temporary files and data

## 🔐 Security Considerations

- **API Key Protection**: Environment variable configuration
- **Input Validation**: Sanitization of user inputs and file content
- **Rate Limiting**: Protection against API abuse
- **Error Sanitization**: No sensitive information in error messages

## 🚧 Troubleshooting

### Common Issues

1. **Rate Limit Exceeded**
   - Wait a few minutes before retrying
   - Consider upgrading your Gemini API plan
   - Use smaller study material files

2. **No Questions Generated**
   - Check if study materials exist in topic folders
   - Verify API key configuration
   - Ensure files are in .txt or .pdf format

3. **Quiz Not Loading**
   - Check browser console for errors
   - Verify server is running on port 3001
   - Confirm topic has generated questions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Google Gemini AI for question generation
- React and Express.js communities
- PDF parsing libraries
- Tailwind CSS for styling

---

## 📧 Support

For support, please open an issue in the GitHub repository or contact the development team.

---
