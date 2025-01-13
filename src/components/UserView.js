import React, { useEffect, useState } from "react";
import {
  getFirestore,
  collection,
  query,
  onSnapshot,
  updateDoc,
  doc,serverTimestamp
} from "firebase/firestore";
import firebaseApp from "../firebase/credenciales";


const firestore = getFirestore(firebaseApp);

function UserView() {
  const [pendingTasks, setPendingTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);

  useEffect(() => {
    const tasksRef = collection(firestore, "tareas");
    const q = query(tasksRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pending = [];
      const completed = [];

      snapshot.docs.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        if (data.estado === "pendiente") {
          pending.push(data);
        } else if (data.estado === "completada") {
          completed.push(data);
        }
      });

      setPendingTasks(pending);
      setCompletedTasks(completed);
    });

    return () => unsubscribe();
  }, []);

  const moveToCompleted = async (id) => {
    const taskDoc = doc(firestore, "tareas", id);
    await updateDoc(taskDoc, {
      estado: "completada",
      fechaCompletada: serverTimestamp(),
    });
  };

  const moveToPending = async (id) => {
    const taskDoc = doc(firestore, "tareas", id);
    await updateDoc(taskDoc, { estado: "pendiente" });
  };

  const saveComment = async (id, comment) => {
    const taskDoc = doc(firestore, "tareas", id);
    await updateDoc(taskDoc, { comentario: comment });
  };

  return (
    <div className="container">
      <h1>Gestión de Tareas</h1>
      <div className="tasks-section">
        <div className="task-column">
          <h2>Pendientes</h2>
          <div id="pending-tasks">
            {pendingTasks.map((task) => (
              <div key={task.id} className="task">
                <h3>{task.tipo}</h3>
                <p>{task.descripcion}</p>
                <p><strong>Comentario:</strong> {task.comentario || "Sin comentario"}</p>
                <div className="task-actions">
                  <button
                    className="complete-btn"
                    onClick={() => moveToCompleted(task.id)}
                  >
                    Completar
                  </button>
                  <button
                    className="comment-btn"
                    onClick={() => {
                      const comment = prompt("Escribe un comentario");
                      if (comment) saveComment(task.id, comment);
                    }}
                  >
                    Comentar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="task-column">
          <h2>Completadas</h2>
          <div id="completed-tasks">
            {completedTasks.map((task) => (
              <div key={task.id} className="task">
                <h3>{task.tipo}</h3>
                <p>{task.descripcion}</p>
                <p><strong>Comentario:</strong> {task.comentario || "Sin comentario"}</p>
                <div className="task-actions">
                  <button
                    className="revert-btn"
                    onClick={() => moveToPending(task.id)}
                  >
                    Revertir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserView;
