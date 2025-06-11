
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserCredentials, StoredUser, AISettings, PlanInput } from '@/types';
import { useRouter } from 'next/navigation';

const LOCAL_STORAGE_USERS_KEY = "studyMindAiUsers_v2"; // Updated app name
const LOCAL_STORAGE_CURRENT_USER_KEY = "studyMindAiCurrentUserEmail_v2";

// Updated RegisterData to include security question/answer
export interface RegisterData extends Required<UserCredentials> {
  studyLevel?: string;
  preferredStudyTime?: string;
  aiSettings?: AISettings;
  securityQuestion?: string;
  securityAnswer?: string;
}

interface AuthContextType {
  currentUser: StoredUser | null; // Store more complete user data
  login: (email: string, password_unsafe: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  updateUser: (updatedData: Partial<StoredUser>) => Promise<boolean>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const getStoredUsers = useCallback((): StoredUser[] => {
    if (typeof window !== 'undefined') {
      const usersJson = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      if (!usersJson) {
        return [];
      }
      try {
        const parsedUsers = JSON.parse(usersJson);
        return Array.isArray(parsedUsers) ? parsedUsers : [];
      } catch (error) {
        console.error("Error parsing stored users from localStorage:", error);
        return [];
      }
    }
    return [];
  }, []);

  const saveStoredUsers = useCallback((users: StoredUser[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true); // Start loading

    const loadUser = () => {
      if (typeof window !== 'undefined') {
        try {
          const storedUserEmail = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
          if (storedUserEmail) {
            const users = getStoredUsers();
            const user = users.find(u => u.email === storedUserEmail);
            if (isMounted) {
              setCurrentUser(user || null);
            }
          } else {
            if (isMounted) {
              setCurrentUser(null);
            }
          }
        } catch (e) {
          console.error("Error reading current user from localStorage:", e);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_KEY);
          }
          if (isMounted) {
            setCurrentUser(null);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      } else {
        // For SSR or environments without window
        if (isMounted) {
            setCurrentUser(null);
            setIsLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [getStoredUsers]);


  const login = useCallback(async (email: string, password_unsafe: string): Promise<boolean> => {
    try {
        const users = getStoredUsers();
        const user = users.find(
          (u) => u.email === email && u.password_unsafe === password_unsafe
        );
        if (user) {
          setCurrentUser(user);
          if (typeof window !== 'undefined') {
            localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, user.email);
          }
          return true;
        }
        return false;
    } catch (error) {
        console.error("Error during login process in AuthContext:", error);
        return false; // Ensure it returns false on any internal error
    }
  }, [getStoredUsers, setCurrentUser]);

  const register = useCallback(async (data: RegisterData): Promise<boolean> => {
    const users = getStoredUsers();
    if (users.some((u) => u.email === data.email)) {
      return false;
    }
    const newUser: StoredUser = {
      id: data.email, // Using email as ID for simplicity in this mock setup
      email: data.email,
      name: data.name,
      password_unsafe: data.password as string, // Ensure password is provided
      studyLevel: data.studyLevel,
      preferredStudyTime: data.preferredStudyTime,
      aiSettings: data.aiSettings,
      securityQuestion: data.securityQuestion, // Save security question
      securityAnswer: data.securityAnswer,     // Save security answer
    };
    users.push(newUser);
    saveStoredUsers(users);
    setCurrentUser(newUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, newUser.email);
    }

    // Simulate sending a welcome email
    console.log(`%c[AuthContext Simulation] Welcome email would be sent to: ${newUser.name} (${newUser.email})`, "color: #007bff; font-weight: bold;");
    console.log(`%cEmail Subject: Welcome to Broadrange AI, ${newUser.name}!`, "color: #007bff;");
    console.log(`%cEmail Body: Hi ${newUser.name},\n\nThank you for registering with Broadrange AI. We're excited to help you achieve your study goals!\n\nBest regards,\nThe Broadrange AI Team`, "color: #007bff;");

    return true;
  }, [getStoredUsers, saveStoredUsers, setCurrentUser]);

  const updateUser = useCallback(async (updatedData: Partial<StoredUser>): Promise<boolean> => {
    if (!currentUser) return false;
    const users = getStoredUsers();
    const userIndex = users.findIndex(u => u.email === currentUser.email);

    if (userIndex === -1) {
      return false;
    }

    const updatedUser: StoredUser = {
      ...users[userIndex],
      ...updatedData,
      email: users[userIndex].email, // Ensure email and id are not overwritten if not in updatedData
      id: users[userIndex].id,
    };

    users[userIndex] = updatedUser;
    saveStoredUsers(users);
    setCurrentUser(updatedUser);
    return true;
  }, [currentUser, getStoredUsers, saveStoredUsers, setCurrentUser]);


  const logout = useCallback(() => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_KEY);
      sessionStorage.removeItem("registrationStep1Data");
      sessionStorage.removeItem("registrationStep2Data");
      sessionStorage.removeItem("registrationStep3Data");
    }
    router.push('/login');
  }, [router, setCurrentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, login, register, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
