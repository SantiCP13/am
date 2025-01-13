// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDubuIH2NJMQZHMFksgWoBUnYO8EbViOnk",
  authDomain: "amproject2-1b2be.firebaseapp.com",
  projectId: "amproject2-1b2be",
  storageBucket: "amproject2-1b2be.firebasestorage.app",
  messagingSenderId: "47156755562",
  appId: "1:47156755562:web:1c35a100361a2912751e13"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
export default firebaseApp;