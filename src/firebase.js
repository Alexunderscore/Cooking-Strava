import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// REPLACE THIS with YOUR Firebase config from Part 1, Step 2
const firebaseConfig = {
  apiKey: "AIzaSyB2s47q8oXb3UUgVTsBTuv4t7idA01FA4Q",
  authDomain: "cooking-app-b83c8.firebaseapp.com",
  projectId: "cooking-app-b83c8",
  storageBucket: "cooking-app-b83c8.firebasestorage.app",
  messagingSenderId: "468039392938",
  appId: "1:468039392938:web:15a39f11664a2dc22c3ad3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
