import React, { useState, useEffect, useRef } from "react";
import Home from "./screens/Home";
import Login from "./screens/Login";

import firebaseApp from "./firebase/credenciales";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

function App() {
  const [user, setUser] = useState(null);
  const inactivityTimeout = useRef(null); // Ref para manejar el temporizador

  // Obtener el rol del usuario desde Firestore
  async function getRol(uid) {
    try {
      const docuRef = doc(firestore, `usuarios/${uid}`);
      const docuCifrada = await getDoc(docuRef);
      if (docuCifrada.exists()) {
        return docuCifrada.data().rol;
      } else {
        console.error("Documento no encontrado");
        return null;
      }
    } catch (error) {
      console.error("Error al obtener el rol:", error);
      return null;
    }
  }

  // Combinar datos de Firebase Auth y Firestore
  function setUserWithFirebaseAndRol(usuarioFirebase) {
    // Ya no verificamos el email
    getRol(usuarioFirebase.uid).then((rol) => {
      const userData = {
        uid: usuarioFirebase.uid,
        email: usuarioFirebase.email,
        emailVerified: usuarioFirebase.emailVerified, // Sigue manteniendo el dato si lo necesitas
        rol: rol,
      };
      setUser(userData);
      console.log("Usuario final:", userData);
    });
  }

  // Cerrar sesión por inactividad
  const logoutDueToInactivity = () => {
    alert("Sesión cerrada por inactividad.");
    signOut(auth)
      .then(() => {
        setUser(null);
      })
      .catch((error) => {
        console.error("Error al cerrar sesión:", error);
      });
  };

  // Iniciar el temporizador de inactividad
  const startInactivityTimer = () => {
    clearTimeout(inactivityTimeout.current);
    inactivityTimeout.current = setTimeout(() => {
      logoutDueToInactivity();
    }, 5 * 60 * 1000); // 5 minutos
  };

  // Reiniciar el temporizador con cualquier actividad del usuario
  const resetInactivityTimer = () => {
    clearTimeout(inactivityTimeout.current);
    startInactivityTimer();
  };

  // Escuchar cambios de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuarioFirebase) => {
      if (usuarioFirebase) {
        setUserWithFirebaseAndRol(usuarioFirebase);
        startInactivityTimer();
      } else {
        setUser(null);
        clearTimeout(inactivityTimeout.current);
      }
    });

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) =>
      window.addEventListener(event, resetInactivityTimer)
    );

    return () => {
      unsubscribe();
      clearTimeout(inactivityTimeout.current);
      events.forEach((event) =>
        window.removeEventListener(event, resetInactivityTimer)
      );
    };
  }, []);

  return <>{user ? <Home user={user} /> : <Login />}</>;
}

export default App;
