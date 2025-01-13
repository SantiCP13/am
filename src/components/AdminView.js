import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import firebaseApp from "../firebase/credenciales";
import { deleteDoc } from "firebase/firestore";

const firestore = getFirestore(firebaseApp);

function AdminView({ onLogout }) {
  const [taskType, setTaskType] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [pendingTasks, setPendingTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [googleSheetData, setGoogleSheetData] = useState([]);
  const [totalValue, setTotalValue] = useState("Cargando...");
  const [activeTab, setActiveTab] = useState("pendientes");
  const [activeSection, setActiveSection] = useState("tareas");  // Nuevo estado para cambiar secciones
  const [editingTask, setEditingTask] = useState(null);
  

  const API_KEY = "AIzaSyBDX__bxsY2Bs7f63_AyL_Di0OViEI1Gms";
  const SHEET_ID = "1PPX5yyQLlmbUfVkZMASzorAqpluPPE5JyyU9cLt6lms";
  const SHEET_RANGE = "REPORTE!A1:G21";
  const VALOR_TOTAL_COLUMN_INDEX = 6;

  let inactivityTimeout;

  useEffect(() => {
    fetchGoogleSheet();

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

    startInactivityTimer();

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) =>
      window.addEventListener(event, resetInactivityTimer)
    );

    return () => {
      unsubscribe();
      clearTimeout(inactivityTimeout);
      events.forEach((event) =>
        window.removeEventListener(event, resetInactivityTimer)
      );
    };
  }, []);

  const startInactivityTimer = () => {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(() => {
      handleLogout();
    }, 5 * 60 * 1000); // 1 minutos
  };

  const resetInactivityTimer = () => {
    clearTimeout(inactivityTimeout);
    startInactivityTimer();
  };

  const handleLogout = () => {
    alert("Sesión cerrada por inactividad.");
    onLogout();
  };

  const fetchGoogleSheet = async () => {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_RANGE}?key=${API_KEY}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      processGoogleSheetData(data.values);
    } catch (error) {
      console.error("Error al cargar la hoja de cálculo:", error);
    }
  };

  const processGoogleSheetData = (values) => {
    if (values.length > 0) {
      const header = values[0];
      const rows = values.slice(1);
      let total = 0;

      rows.forEach((row) => {
        const value = parseFloat(row[VALOR_TOTAL_COLUMN_INDEX]?.replace(/,/g, "")) || 0;
        total += value;
      });

      setGoogleSheetData({ header, rows });
      setTotalValue(total.toLocaleString("es-CO"));
    } else {
      setGoogleSheetData({ header: [], rows: [] });
      setTotalValue("No hay datos disponibles.");
    }
  };

  const handleDeleteTask = async (id) => {
    const taskDoc = doc(firestore, "tareas", id);
    try {
      await deleteDoc(taskDoc); // Elimina la tarea de Firestore
      alert("Tarea eliminada correctamente.");
    } catch (error) {
      console.error("Error al eliminar la tarea:", error);
      alert("Hubo un error al eliminar la tarea.");
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setTaskType(task.tipo);
    setTaskDescription(task.descripcion);
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setTaskType("");
    setTaskDescription("");
  };

  const handleAddOrUpdateTask = async (e) => {
    e.preventDefault();

    if (editingTask) {
      const taskDoc = doc(firestore, "tareas", editingTask.id);
      await updateDoc(taskDoc, {
        tipo: taskType,
        descripcion: taskDescription,
      });
      setEditingTask(null);
    } else {
      await addDoc(collection(firestore, "tareas"), {
        tipo: taskType,
        descripcion: taskDescription,
        estado: "pendiente",
        fechaCreacion: new Date(),
      });
    }

    setTaskType("");
    setTaskDescription("");
  };

  const completeTask = async (id) => {
    const taskDoc = doc(firestore, "tareas", id);
    await updateDoc(taskDoc, { estado: "completada", fechaCompletada: new Date() });
  };

  const renderTableAndTotal = () => {
    if (!googleSheetData.header || googleSheetData.rows.length === 0) {
      return <p>No hay datos disponibles.</p>;
    }

    const visibleColumns = googleSheetData.header.length - 2;

    return (
      <table className="report-table">
        <thead>
          <tr>
            {googleSheetData.header.slice(0, visibleColumns).map((col, index) => (
              <th key={index}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {googleSheetData.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.slice(0, visibleColumns).map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td
              colSpan={visibleColumns}
              style={{ textAlign: "right", fontWeight: "bold" }}
            >
              Valor Total: {totalValue}
            </td>
          </tr>
        </tfoot>
      </table>
    );
  };

  return (
    <>
      <div className="header-titles">
        <h2
          onClick={() => setActiveSection("tareas")}
          className={activeSection === "tareas" ? "active-section" : ""}
        >
          Asignar Tareas
        </h2>
        <h2
          onClick={() => setActiveSection("reportes")} // Cambiar a reportes
          className={activeSection === "reportes" ? "active-section" : ""}
        >
          Reporte de Facturas Pendientes
        </h2>
      </div>
      {activeSection === "reportes" && renderTableAndTotal()}
      {activeSection === "tareas" && (
        <>
          <form onSubmit={handleAddOrUpdateTask}>
            <label htmlFor="task-type">Tipo de Tarea</label>
            <select
              id="task-type"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              required
            >
              <option value="">Seleccione una tarea</option>
              <option value="crear-factura">Crear factura</option>
              <option value="revisar-cuenta">Revisar cuenta bancaria</option>
              <option value="enviar-correo">Enviar correo</option>
              <option value="otro">Otro</option>
            </select>

            <label htmlFor="task-description">Descripción</label>
            <textarea
              id="task-description"
              rows="4"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Escriba los detalles de la tarea..."
              required
            ></textarea>

            <div className="contenedor">
              <button type="submit" className="primary-btn">
                {editingTask ? "Actualizar Tarea" : "Asignar Tarea"}
              </button>
              {editingTask && (
                <button type="button" className="secondary-btn" onClick={handleCancelEdit}>
                  Cancelar Edición
                </button>
              )}
            </div>
          </form>

          <div className="task-titles">
            <h2
              className={`task-title ${activeTab === "pendientes" ? "active" : ""}`}
              onClick={() => setActiveTab("pendientes")}
            >
              Tareas Pendientes
            </h2>
            <h2
              className={`task-title ${activeTab === "completadas" ? "active" : ""}`}
              onClick={() => setActiveTab("completadas")}
            >
              Tareas Completadas
            </h2>
          </div>

          {activeTab === "pendientes" && (
            <table className="task-table">
              <thead>
                <tr>
                  <th>Tipo de Tarea</th>
                  <th>Descripción</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendingTasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.tipo}</td>
                    <td>{task.descripcion}</td>
                    <td>
                      <button onClick={() => handleEditTask(task)}>Editar</button>
                      <button onClick={() => handleDeleteTask(task.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "completadas" && (
            <table className="task-table">
              <thead>
                <tr>
                  <th>Tipo de Tarea</th>
                  <th>Descripción</th>
                  <th>Comentario</th>
                  <th>Fecha de Completado</th>
                </tr>
              </thead>
              <tbody>
                {completedTasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.tipo}</td>
                    <td>{task.descripcion}</td>
                    <td>{task.comentario || "Sin comentario"}</td>
                    <td>{task.fechaCompletada?.toDate && new Date(task.fechaCompletada.toDate()).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      
    </>
  );
}

export default AdminView;
