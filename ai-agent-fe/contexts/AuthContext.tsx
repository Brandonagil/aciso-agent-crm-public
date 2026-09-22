'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import {
  onAuthStateChange,
  signInWithGoogle as firebaseSignInWithGoogle,
  signInWithGoogleRedirect as firebaseSignInWithGoogleRedirect,
  handleGoogleRedirectResult as firebaseHandleGoogleRedirectResult,
  signInWithEmailPassword as firebaseSignInWithEmailPassword,
  signUpWithEmailPassword as firebaseSignUpWithEmailPassword,
  signOut as firebaseSignOut,
} from '@/lib/firebase/auth';
import { initializeUserProfile } from '@/lib/firebase/firestore'; // Import the function
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  // Google Sign In methods
  signInWithGoogle: () => Promise<User | null>;
  signInWithGoogleRedirect: () => Promise<void>;
  // Email/Password Methods
  signInWithEmail: (email: string, password: string) => Promise<User | null>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Handle Google redirect result on app load
    const handleRedirect = async () => {
      try {
        const user = await firebaseHandleGoogleRedirectResult();
        if (user) {
          console.log('Google redirect successful:', user.displayName);
          await initializeUserProfile(user);
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error handling redirect result:', error);
      }
    };
    
    handleRedirect();
    
    const unsubscribe = onAuthStateChange(async (firebaseUser: User | null) => {
      setUser(firebaseUser);
      if (firebaseUser) {
          // Initialize profile on initial auth state change if user exists
         await initializeUserProfile(firebaseUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleAuthSuccess = async (signedInUser: User | null) => {
    setUser(signedInUser);
    if (signedInUser) {
      // Ensure profile is initialized/updated after explicit login/signup actions
      await initializeUserProfile(signedInUser); 
      router.push('/dashboard');
    }
    setLoading(false); // Set loading false after init and redirect
    return signedInUser;
  };

  const handleAuthError = (error: unknown) => {
      console.error("Auth Error:", error);
      setLoading(false);
      // Rethrow the error so UI components can catch it
      if (error instanceof Error) throw error;
      else throw new Error("An unknown authentication error occurred.");
  }

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const signedInUser = await firebaseSignInWithGoogle();
      return await handleAuthSuccess(signedInUser);
    } catch (error) {
        console.warn('Popup blocked, trying redirect method...');
        try {
          await firebaseSignInWithGoogleRedirect();
          return null; // Redirect will handle the rest
        } catch (redirectError) {
          handleAuthError(redirectError);
          return null;
        }
    }
  };

  const signInWithGoogleRedirect = async () => {
    setLoading(true);
    try {
      await firebaseSignInWithGoogleRedirect();
      // The redirect will handle the rest, no return needed
    } catch (error) {
        handleAuthError(error);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
     try {
      const signedInUser = await firebaseSignInWithEmailPassword(email, password);
       return await handleAuthSuccess(signedInUser);
    } catch (error) {
        handleAuthError(error); // handleAuthError now throws
        return null;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    setLoading(true);
    try {
      const signedInUser = await firebaseSignUpWithEmailPassword(email, password, displayName);
       return await handleAuthSuccess(signedInUser);
    } catch (error) {
       handleAuthError(error); // handleAuthError now throws
       return null;
    }
  };

  const signOut = async () => {
    setLoading(true);
    await firebaseSignOut();
    setUser(null);
    setLoading(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        loading, 
        signInWithGoogle,
        signInWithGoogleRedirect, 
        signInWithEmail, 
        signUpWithEmail, 
        signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 