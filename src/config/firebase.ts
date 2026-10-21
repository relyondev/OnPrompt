import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBpekUcEIl8vnVjNXQWaPfIIK15dkfCyNU",
  authDomain: "relyon-app.firebaseapp.com",
  projectId: "relyon-app",
  storageBucket: "relyon-app.firebasestorage.app",
  messagingSenderId: "870433620303",
  appId: "1:870433620303:web:e241c944871ddeb853053a",
  measurementId: "G-E0GL004PW4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
