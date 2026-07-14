import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  projectId: "gen-lang-client-0993488679",
  appId: "1:927360559301:web:fccde8b3a68e4b967128ac",
  apiKey: "AIzaSyAbRRD-iw4NyNY-KyiCqX5CF0XaqAlY0-k",
  authDomain: "gen-lang-client-0993488679.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-4719def6-8798-46bf-b425-29dfaeaf11c9",
  storageBucket: "gen-lang-client-0993488679.firebasestorage.app",
  messagingSenderId: "927360559301"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Cloud Storage for client-side uploads (persistent across server restarts)
export const storage = getStorage(app);

export default app;
