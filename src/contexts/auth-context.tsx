
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserCredentials, StoredUser, AISettings } from '@/types'; // PlanInput removed as it's not directly used here
import { useRouter } from 'next/navigation';

// Key for storing the current logged-in user's full object (excluding password)
const LOCAL_STORAGE_FULL_USER_KEY = "studyMindAiFullCurrentUser_v2"; 
// Key for just the email as a quick check, might be redundant if full user is always stored/cleared.
const LOCAL_STORAGE_CURRENT_USER_EMAIL_KEY = "studyMindAiCurrentUserEmail_v2";


// RegisterData now directly reflects what the API expects (no password_unsafe)
export interface RegisterData {
  name: string;
  email: string;
  password_unsafe: string; // Keep _unsafe here as frontend collects plain password
  studyLevel?: string;
  preferredStudyTime?: string;
  aiSettings?: AISettings;
  securityQuestion?: string;
  securityAnswer?: string; // Keep _unsafe here as frontend collects plain answer
}

interface AuthContextType {
  currentUser: StoredUser | null;
  login: (email: string, password_unsafe: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
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
            // Optional: could verify with a /api/auth/me endpoint here if we had one
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

  const login = useCallback(async (email: string, password_unsafe: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password_unsafe }),
      });

      if (response.ok) {
        const userData: StoredUser = await response.json();
        setCurrentUser(userData);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_FULL_USER_KEY, JSON.stringify(userData));
          localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_EMAIL_KEY, userData.email);
        }
        setIsLoading(false);
        return true;
      } else {
        // const errorData = await response.json(); // For more specific error messages
        setCurrentUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(LOCAL_STORAGE_FULL_USER_KEY);
          localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_EMAIL_KEY);
        }
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Login API error:", error);
      setCurrentUser(null);
       if (typeof window !== 'undefined') {
          localStorage.removeItem(LOCAL_STORAGE_FULL_USER_KEY);
          localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_EMAIL_KEY);
        }
      setIsLoading(false);
      return false;
    }
  }, [setCurrentUser, setIsLoading]);

  const register = useCallback(async (data: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data), // API expects password_unsafe and securityAnswer
      });

      if (response.status === 201) {
        const newUser: StoredUser = await response.json();
        // The API should return the user object without password_hash or securityAnswer_hash for security.
        // We construct the StoredUser object for client-side from what API returns + what we already have (like password_unsafe for storage, though this is less ideal long-term)
        const clientSideUser: StoredUser = {
          ...newUser, // This comes from the API (id, name, email, studyLevel, etc.)
          password_unsafe: data.password_unsafe, // Keep plain password for mock localStorage if needed, or remove if API session is king
          securityAnswer: data.securityAnswer, // Same for security answer
        };

        setCurrentUser(clientSideUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_FULL_USER_KEY, JSON.stringify(clientSideUser));
          localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_EMAIL_KEY, clientSideUser.email);
        }
        setIsLoading(false);
        return true;
      } else {
        // const errorData = await response.json();
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Register API error:", error);
      setIsLoading(false);
      return false;
    }
  }, [setCurrentUser, setIsLoading]);

  const updateUser = useCallback(async (updatedData: Partial<Omit<StoredUser, 'id' | 'email' | 'password_unsafe' | 'securityAnswer_hash' >>): Promise<boolean> => {
    if (!currentUser) return false;
    
    // Optimistic update for UI responsiveness
    const newClientUser: StoredUser = {
      ...currentUser,
      ...updatedData,
      // Ensure aiSettings are merged, not overwritten if only one part is updated
      aiSettings: {
        ...currentUser.aiSettings,
        ...updatedData.aiSettings,
      }
    };
    setCurrentUser(newClientUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_FULL_USER_KEY, JSON.stringify(newClientUser));
    }

    // TODO: Implement backend API call to /api/users/update (or similar)
    // For now, we'll simulate a successful backend update after a short delay
    // try {
    //   const response = await fetch('/api/users/update', { // This endpoint doesn't exist yet
    //     method: 'PUT', // or POST
    //     headers: { 'Content-Type': 'application/json', /* 'Authorization': 'Bearer YOUR_TOKEN_HERE' */ },
    //     body: JSON.stringify({ email: currentUser.email, ...updatedData }),
    //   });
    //   if (!response.ok) {
    //     // Revert optimistic update if backend fails
    //     setCurrentUser(currentUser); 
    //      if (typeof window !== 'undefined') {
    //        localStorage.setItem(LOCAL_STORAGE_FULL_USER_KEY, JSON.stringify(currentUser));
    //     }
    //     return false;
    //   }
    //   const confirmedUserData = await response.json();
    //   setCurrentUser(confirmedUserData); // Update with data from backend if it differs
    //   if (typeof window !== 'undefined') {
    //      localStorage.setItem(LOCAL_STORAGE_FULL_USER_KEY, JSON.stringify(confirmedUserData));
    //   }
    //   return true;
    // } catch (error) {
    //   console.error("Update user API error:", error);
    //   // Revert optimistic update
    //   setCurrentUser(currentUser);
    //   if (typeof window !== 'undefined') {
    //      localStorage.setItem(LOCAL_STORAGE_FULL_USER_KEY, JSON.stringify(currentUser));
    //   }
    //   return false;
    // }
    return true; // Placeholder for successful "backend" update
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
    // No need to explicitly call router.push here if AppLayout handles redirection
    // However, it's fine to keep for explicitness if desired.
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
