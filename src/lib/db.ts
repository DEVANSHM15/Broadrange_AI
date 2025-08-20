
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import path from 'path';
import fs from 'fs/promises'; // For ensuring directory exists

// Define the path for the database file
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'mydb.sqlite');

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  // Ensure the data directory exists
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create database directory:', error);
    throw error; // Re-throw if directory creation fails
  }

  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  // Run migrations/initial setup
  await db.exec(`
    PRAGMA foreign_keys = ON; -- Enable foreign key constraints

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      studyLevel TEXT,
      preferredStudyTime TEXT,
      aiSettings_json TEXT,
      securityQuestion TEXT,
      securityAnswer_hash TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_plans (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      scheduleString TEXT, -- Can be NULL if tasks are always parsed and stored separately
      subjects TEXT NOT NULL,
      dailyStudyHours REAL NOT NULL,
      studyDurationDays INTEGER NOT NULL,
      subjectDetails TEXT,
      startDate TEXT,
      status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'archived'
      completionDate TEXT,
      lastReminderSent TEXT, -- Date 'YYYY-MM-DD' of the last reminder sent
      reflection_json TEXT, -- To store the cached AI reflection
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS schedule_tasks (
      id TEXT PRIMARY KEY,
      planId TEXT NOT NULL,
      date TEXT NOT NULL,
      task TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      youtubeSearchQuery TEXT,
      referenceSearchQuery TEXT,
      quizScore INTEGER,
      quizAttempted BOOLEAN DEFAULT FALSE,
      notes TEXT,
      FOREIGN KEY (planId) REFERENCES study_plans (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sub_tasks (
        id TEXT PRIMARY KEY,
        taskId TEXT NOT NULL,
        text TEXT NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        FOREIGN KEY (taskId) REFERENCES schedule_tasks (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        userId INTEGER NOT NULL,
        title TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chatId TEXT NOT NULL,
        role TEXT NOT NULL, -- 'user' or 'bot'
        content TEXT NOT NULL,
        isHtml BOOLEAN DEFAULT FALSE,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE
    );
  `);
  
  // Schema migration checks
  try {
    const scheduleTasksInfo = await db.all("PRAGMA table_info(schedule_tasks);");
    const notesColumnExists = scheduleTasksInfo.some(col => col.name === 'notes');
    if (!notesColumnExists) {
      console.log("Attempting to add 'notes' column to 'schedule_tasks' table.");
      await db.exec("ALTER TABLE schedule_tasks ADD COLUMN notes TEXT;");
      console.log("'notes' column added successfully to 'schedule_tasks'.");
    }

    const studyPlansInfo = await db.all("PRAGMA table_info(study_plans);");
    const reminderColumnExists = studyPlansInfo.some(col => col.name === 'lastReminderSent');
    if (!reminderColumnExists) {
        console.log("Attempting to add 'lastReminderSent' column to 'study_plans' table.");
        await db.exec("ALTER TABLE study_plans ADD COLUMN lastReminderSent TEXT;");
        console.log("'lastReminderSent' column added successfully.");
    }
    
    const reflectionColumnExists = studyPlansInfo.some(col => col.name === 'reflection_json');
    if (!reflectionColumnExists) {
      console.log("Attempting to add 'reflection_json' column to 'study_plans' table.");
      await db.exec("ALTER TABLE study_plans ADD COLUMN reflection_json TEXT;");
      console.log("'reflection_json' column added successfully.");
    }

  } catch (migrationError) {
    console.error("Error during database schema migration check:", migrationError);
  }
  
  dbInstance = db;
  return db;
}
