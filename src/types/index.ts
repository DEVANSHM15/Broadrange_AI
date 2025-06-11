
export interface PlanInput {
  subjects: string; // Comma-separated subject names, optionally with priority e.g., "Math (1), Physics (2)"
  dailyStudyHours: number;
  studyDurationDays: number;
  subjectDetails?: string; // Optional: User provides details about topics/chapters
  startDate?: string; // Optional: YYYY-MM-DD format
}

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface ScheduleTask {
  id: string;
  date: string; // YYYY-MM-DD
  task: string;
  completed: boolean;
  youtubeSearchQuery?: string;
  referenceSearchQuery?: string; // Added for general reference material search
  subTasks?: SubTask[]; // Added for breaking down tasks
  quizScore?: number; // Score as a percentage (0-100)
  quizAttempted?: boolean; // True if a quiz for this task has been attempted
  // quizQuestions?: QuizQuestion[]; // We'll store quiz content transiently in modal state for now
}

// Used when loading from local storage or after parsing AI string
export interface ScheduleData {
  scheduleString: string; // The raw JSON string from AI
  tasks: ScheduleTask[];
  planDetails: PlanInput; // The inputs that generated this plan
  status?: 'active' | 'completed'; // Added status
  completionDate?: string; // Added completionDate (ISO string)
  // Optional: add fields for plan overview stats if needed from your HTML
  daysToGoal?: number;
  successProbability?: number;
  totalHours?: number;
}

export interface ParsedRawScheduleItem {
  date: string; // YYYY-MM-DD
  task: string;
  youtubeSearchQuery?: string;
  referenceSearchQuery?: string; // Added
  // subTasks are not expected directly from AI, so not here
}

export interface AISettings {
  plannerBotEnabled: boolean;
  reflectionAiEnabled: boolean;
  adaptiveAiEnabled: boolean;
}

// For mock authentication
export interface UserCredentials {
  name: string;
  email: string;
  password?: string;
}

// What's actually stored in local storage for the list of users
export interface StoredUser extends Required<Omit<UserCredentials, 'password'>> {
  id: string;
  email: string;
  password_unsafe: string;
  studyLevel?: string;
  preferredStudyTime?: string;
  aiSettings?: AISettings;
  securityQuestion?: string; // Added for password recovery
  securityAnswer?: string;   // Added for password recovery
}


// For dashboard display
export interface AgentDisplayData {
  name: string;
  avatar: string;
  role: string;
  specialty?: string;
  confidence: number;
  // activity: string; // Activity string removed from type as per user request
  active?: boolean;
  agentKey: string;
}

export interface InsightDisplayData { // For Analytics Page
  agent: string;
  text: string;
  confidence?: string;
  actionText?: string;
  primaryAction?: boolean;
}

export interface SampleSubject {
  id: string;
  name: string;
  emoji: string;
  difficulty?: string;
  progress?: number;
}

// Quiz Related Types
export interface QuizQuestion {
  id: string; // Unique ID for the question
  questionText: string;
  options: string[]; // Array of answer options
  correctOptionIndex: number; // Index of the correct answer in the options array
}

export type Quiz = QuizQuestion[];

// Input for the AI flow to generate a quiz
export interface GenerateTaskQuizInput {
  taskText: string;
  subjectContext: string; // e.g., "Physics" or "Algebra Chapter 2"
}

// Output from the AI flow (the quiz itself as a JSON string)
export interface GenerateTaskQuizOutput {
  quizJson: string; // A JSON string that parses into Quiz
}
