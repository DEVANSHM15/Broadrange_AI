
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { StoredUser, AISettings } from '@/types';
import { useRouter } from 'next/navigation';

const LOCAL_STORAGE_FULL_USER_KEY = "studyMindAiFullCurrentUser_v2";
const LOCAL_STORAGE_CURRENT_USER_EMAIL_KEY = "studyMindAiCurrentUserEmail_v2";

export interface RegisterData {
  name: string;
  email: string;
  password_unsafe: string;
  studyLevel?: string;
  preferredStudyTime?: string;
  aiSettings?: AISettings;
  securityQuestion?: string;
  securityAnswer?: string;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  user?: StoredUser; // Optional: return user data on successful login/register
}

interface AuthContextType {
  currentUser: StoredUser | null;
  login: (email: string, password_unsafe: string) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  logout: () => void;
  updateUser: (updatedData: Partial<Omit<StoredUser, 'id' | 'email' | 'password_unsafe'>>) => Promise<boolean>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadUserFromStorage = () => {
      if (typeof window !== 'undefined') {
        try {
          const storedUserJson = localStorage.getItem(LOCAL_STORAGE_FULL_USER_KEY);
          if (storedUserJson) {
            const user = JSON.parse(storedUserJson) as StoredUser;
            if (isMounted) {
              setCurrentUser(user);
            }
          } else {
            if (isMounted) setCurrentUser(null);
          }
        } catch (e) {
          console.error("Error reading current user from localStorage:", e);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(LOCAL_STORAGE_FULL_USER_KEY);
            localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_EMAIL_KEY);
          }
          if (isMounted) setCurrentUser(null);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } else {
         if (isMounted) {
            setCurrentUser(null);
            setIsLoading(false);
        }
      }
    };
    loadUserFromStorage();
    return () => { isMounted = false; };
  }, []);

  const login = useCallback(async (email: string, password_unsafe: string): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password_unsafe }),
      });

      const responseData = await response.json();

      if (response.ok) {
        const userData: StoredUser = responseData;
        setCurrentUser(userData);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_FULL_USER_KEY, JSON.stringify(userData));
          localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_EMAIL_KEY, userData.email);
        }
        setIsLoading(false);
        return { success: true, user: userData };
      } else {
        setCurrentUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(LOCAL_STORAGE_FULL_USER_KEY);
          localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_EMAIL_KEY);
        }
        setIsLoading(false);
        return { success: false, message: responseData.error || "Login failed" };
      }
    } catch (error) {
      console.error("Login API error:", error);
      setCurrentUser(null);
       if (typeof window !== 'undefined') {
          localStorage.removeItem(LOCAL_STORAGE_FULL_USER_KEY);
          localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_EMAIL_KEY);
        }
      setIsLoading(false);
      return { success: false, message: "A network error occurred during login." };
    }
  }, [setCurrentUser, setIsLoading]);

  const register = useCallback(async (data: RegisterData): Promise<AuthResponse> => {
    setIsLoading(true);
    let errorMessage = "An unknown error occurred during registration.";
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (response.status === 201) {
        const newUser: StoredUser = responseData;
        const clientSideUser: StoredUser = {
          ...newUser,
          password_unsafe: data.password_unsafe,
          securityAnswer: data.securityAnswer,
        };

        setCurrentUser(clientSideUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_FULL_USER_KEY, JSON.stringify(clientSideUser));
          localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_EMAIL_KEY, clientSideUser.email);
        }
        setIsLoading(false);
        return { success: true, user: clientSideUser };
      } else {
        if (responseData && responseData.error) {
          errorMessage = responseData.error;
        } else {
          errorMessage = response.statusText || "Failed to register due to a server error.";
        }
        setIsLoading(false);
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      console.error("Register API call error:", error);
      errorMessage = "A network error occurred. Please try again.";
      setIsLoading(false);
      return { success: false, message: errorMessage };
    }
  }, [setCurrentUser, setIsLoading]);

  const updateUser = useCallback(async (updatedData: Partial<Omit<StoredUser, 'id' | 'email' | 'password_unsafe' | 'securityAnswer_hash' >>): Promise<boolean> => {
    if (!currentUser) return false;
    
    const newClientUser: StoredUser = {
      ...currentUser,
      ...updatedData,
      aiSettings: {
        ...currentUser.aiSettings,
        ...updatedData.aiSettings,
      }
    };
    setCurrentUser(newClientUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_FULL_USER_KEY, JSON.stringify(newClientUser));
    }
    // Placeholder for backend update
    return true;
  }, [currentUser, setCurrentUser]);


  const logout = useCallback(() => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_FULL_USER_KEY);
      localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_EMAIL_KEY);
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
