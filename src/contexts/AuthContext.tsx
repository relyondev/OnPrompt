import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';
import { auth } from '../config/firebase';

const DRIVE_TOKEN_KEY = 'prompt-manager-drive-token';
const DRIVE_TOKEN_OWNER_KEY = 'prompt-manager-drive-token-owner';
interface AuthContextType { currentUser: User | null; loading: boolean; login: (email: string, password: string) => Promise<void>; signup: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; loginWithGoogle: () => Promise<void>; connectGoogleDrive: () => Promise<string>; driveAccessToken: string | null; isGoogleUser: boolean; }
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = (): AuthContextType => { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used within an AuthProvider'); return context; };

const clearDriveToken = (setToken: (value: string | null) => void) => { setToken(null); sessionStorage.removeItem(DRIVE_TOKEN_KEY); sessionStorage.removeItem(DRIVE_TOKEN_OWNER_KEY); };

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(null);
  const persistDriveToken = (result: UserCredential): string | null => {
    const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken || null;
    if (!token) return null;
    const uid = result.user.uid;
    setDriveAccessToken(token); sessionStorage.setItem(DRIVE_TOKEN_KEY, token); sessionStorage.setItem(DRIVE_TOKEN_OWNER_KEY, uid);
    return token;
  };
  const login = async (email: string, password: string) => { clearDriveToken(setDriveAccessToken); await signInWithEmailAndPassword(auth, email, password); };
  const signup = async (email: string, password: string) => { clearDriveToken(setDriveAccessToken); await createUserWithEmailAndPassword(auth, email, password); };
  const logout = async () => { clearDriveToken(setDriveAccessToken); await signOut(auth); };
  const loginWithGoogle = async () => { clearDriveToken(setDriveAccessToken); const provider = new GoogleAuthProvider(); provider.addScope('https://www.googleapis.com/auth/drive.file'); persistDriveToken(await signInWithPopup(auth, provider)); };
  const connectGoogleDrive = async (): Promise<string> => { clearDriveToken(setDriveAccessToken); const provider = new GoogleAuthProvider(); provider.addScope('https://www.googleapis.com/auth/drive.file'); const token = persistDriveToken(await signInWithPopup(auth, provider)); if (!token) throw new Error('Google did not return a Drive access token. Please reconnect Google Drive.'); return token; };
  useEffect(() => onAuthStateChanged(auth, user => {
    setCurrentUser(user);
    const isGoogleUser = Boolean(user?.providerData.some(provider => provider.providerId === 'google.com'));
    const savedOwner = sessionStorage.getItem(DRIVE_TOKEN_OWNER_KEY);
    const savedToken = sessionStorage.getItem(DRIVE_TOKEN_KEY);
    if (user && isGoogleUser && savedToken && savedOwner === user.uid) setDriveAccessToken(savedToken);
    else clearDriveToken(setDriveAccessToken);
    setLoading(false);
  }), []);
  return <AuthContext.Provider value={{ currentUser, loading, login, signup, logout, loginWithGoogle, connectGoogleDrive, driveAccessToken, isGoogleUser: Boolean(currentUser?.providerData.some(provider => provider.providerId === 'google.com')) }}>{!loading && children}</AuthContext.Provider>;
};
