import React from "react";

import AdminView from "../components/AdminView";
import UserView from "../components/UserView";
import logo from "../img/logo.png";


import firebaseApp from "../firebase/credenciales";
import { getAuth, signOut } from "firebase/auth";
const auth = getAuth(firebaseApp);

function Home({ user }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <img
          src={logo}
          alt="Logo"
          style={{ width: "150px", height: "auto", marginBottom: 30}}
        />
      </div>
      <div>
        <button onClick={() => signOut(auth)}>Cerrar sesión</button>
        {user.rol === "admin" ? <AdminView /> : <UserView />}
      </div>
    </div>
  );
}

export default Home;