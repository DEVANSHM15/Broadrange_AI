# CodeXStudy

We are building an intelligent AI-powered study planner that helps students organize and optimize their learning. The system provides personalized schedule generation, adaptive re-planning, and automated quiz creation using Genkit (Gemini). By leveraging agentic AI, the platform continuously adapts to each student’s progress, making study planning more efficient, engaging, and effective.

## 🚀 Getting Started

To run this application on your local machine, follow these steps:

### 1. Install Dependencies
Open your terminal and install the required npm packages.
```bash
npm install
```

### 2. Set Up Environment Variables
Create a file named `.env` in the root directory of the project and add your API keys. It should look like this:
```env
GEMINI_API_KEY=your_gemini_api_key_here
SENDGRID_API_KEY=your_sendgrid_api_key_here
```

### 3. Run the Development Servers
You need to run two separate processes in two different terminals.

**Terminal 1: Start the Next.js Web App**
```bash
npm run dev
```

**Terminal 2: Start the Genkit AI Service**
```bash
npm run genkit:dev
```

Once both are running, you can access the application at `http://localhost:3000` in your browser.
