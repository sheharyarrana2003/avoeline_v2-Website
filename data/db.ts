import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";


// TODO: Replace the following with your app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBU5FdMWnZjJeetXCW5OQWHweImww5-USY",
  authDomain: "avoelinev2-38f83.firebaseapp.com",
  projectId: "avoelinev2-38f83",
  storageBucket: "avoelinev2-38f83.firebasestorage.app",
  messagingSenderId: "346057387026",
  appId: "1:346057387026:web:12f053bdbcc2e6c1cd3ccb",
  measurementId: "G-V57J4XYY3Z"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth();

