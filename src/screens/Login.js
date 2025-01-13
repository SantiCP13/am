import React, { useState } from "react";
import firebaseApp from "../firebase/credenciales";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import logo from "../img/logo.png";

const auth = getAuth(firebaseApp);

function Login() {
  const firestore = getFirestore(firebaseApp);
  const [isRegistrando, setIsRegistrando] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function registrarUsuario(email, password, rol) {
    setLoading(true);
    setError(null); // Limpia errores previos
    try {
      // Crear usuario
      const infoUsuario = await createUserWithEmailAndPassword(auth, email, password);
      console.log("Usuario creado:", infoUsuario);

      // UID del usuario creado
      const userId = infoUsuario.user.uid;

      // Guardar información en Firestore
      const docuRef = doc(firestore, `usuarios/${userId}`);
      await setDoc(docuRef, { correo: email, rol: rol });
      console.log("Información guardada en Firestore.");

      alert("Registro exitoso. Ya puedes iniciar sesión.");
      setIsRegistrando(false); // Cambiar a vista de inicio de sesión
    } catch (error) {
      console.error("Error al registrar usuario:", error.message);
      setError("No se pudo completar el registro: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loginUsuario(email, password) {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      alert("Inicio de sesión exitoso.");
    } catch (error) {
      console.error("Error al iniciar sesión:", error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Se ha enviado un enlace para restablecer tu contraseña. Revisa tu correo.");
    } catch (error) {
      console.error("Error al restablecer contraseña:", error.message);
      setError(error.message);
    }
  }

  function submitHandler(e) {
    e.preventDefault();
    const password = e.target.elements.password.value;
    const rol = isRegistrando ? e.target.elements.rol.value : null;

    if (email.trim() === "" || password.trim() === "") {
      setError("Por favor completa todos los campos.");
      return;
    }

    if (isRegistrando) {
      registrarUsuario(email, password, rol);
    } else {
      loginUsuario(email, password);
    }
  }

  return (
    <div className="login-container">
      <div style={{ display: "flex", justifyContent: "center" }}>
        <img
          src={logo}
          alt="Logo"
          style={{ width: "150px", height: "auto", marginBottom: 10 }}
        />
      </div>
      <h1>{isRegistrando ? "Regístrate" : "Inicia sesión"}</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {loading && <p>Cargando...</p>}
      <form onSubmit={submitHandler}>
        <label>
          Correo electrónico:
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Contraseña:
          <input type="password" id="password" required />
        </label>

        {isRegistrando && (
          <label>
            Rol:
            <select id="rol">
              <option value="admin">Administrador</option>
              <option value="user">Usuario</option>
            </select>
          </label>
        )}

        <input
          type="submit"
          className="form-submit-button"
          value={isRegistrando ? "Registrar" : "Iniciar sesión"}
          disabled={loading}
        />
      </form>

      <button
        className="form-submit-button"
        onClick={() => {
          setError(null);
          setIsRegistrando(!isRegistrando);
        }}
        disabled={loading}
      >
        {isRegistrando ? "Ya tengo una cuenta" : "Quiero registrarme"}
      </button>

      {!isRegistrando && (
        <a 
          href="#" 
          className="reset-link" 
          onClick={(e) => {
            e.preventDefault();
            resetPassword();
          }}
        > 
          ¿Olvidaste tu contraseña?
        </a>
      )}
    </div>
  );
}

export default Login;
