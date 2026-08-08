import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBEm7CnJ1muljuTjX2zkeLduQ7d5BG_Mbk",
  authDomain: "mascrypto.firebaseapp.com",
  projectId: "mascrypto",
  storageBucket: "mascrypto.firebasestorage.app",
  messagingSenderId: "310906627126",
  appId: "1:310906627126:web:12636e4682772e4119e497",
  measurementId: "G-2XYJP1MKH7",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
