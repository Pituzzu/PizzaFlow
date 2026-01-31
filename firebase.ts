
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAyl5SgTD_5UgHkt4sUjMW0rQRhANyEhNc",
  authDomain: "pizzaflow-52c83.firebaseapp.com",
  projectId: "pizzaflow-52c83",
  storageBucket: "pizzaflow-52c83.firebasestorage.app",
  messagingSenderId: "544794674603",
  appId: "1:544794674603:web:4680a894e70edd92b37eee",
  measurementId: "G-K6EVV698GD"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
