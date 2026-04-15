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
  const [activeSection, setActiveSection] = useState("tareas");
  const [editingTask, setEditingTask] = useState(null);

  // --- CONFIGURACIÓN DE COLUMNAS SEGÚN TU EXCEL ---
  const API_KEY = "AIzaSyBDX__bxsY2Bs7f63_AyL_Di0OViEI1Gms";
  const SHEET_ID = "1PPX5yyQLlmbUfVkZMASzorAqpluPPE5JyyU9cLt6lms";
  const SHEET_RANGE = "REPORTE!A1:O100"; // Aumentamos el rango para traer todas las columnas

  // Índices basados en la imagen de tu Excel:
  const COL_INDEX = {
    ID: 0,
    FECHA_ENVIADA: 1,
    CLIENTE: 2,
    VR_SESION: 4,
    FECHA_PAGO_APROX: 12,
    ADICIONAL: 13,
    ESTADO: 14
  };

  // Definimos qué columnas queremos mostrar en la tabla web (en orden)
  const columnsToShow = [
    COL_INDEX.ID,
    COL_INDEX.FECHA_ENVIADA,
    COL_INDEX.CLIENTE,
    COL_INDEX.VR_SESION,
    COL_INDEX.FECHA_PAGO_APROX,
    COL_INDEX.ADICIONAL,
    COL_INDEX.ESTADO
  ];

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
        if (data.estado === "pendiente") pending.push(data);
        else if (data.estado === "completada") completed.push(data);
      });
      setPendingTasks(pending);
      setCompletedTasks(completed);
    });
    startInactivityTimer();
    return () => {
      unsubscribe();
      clearTimeout(inactivityTimeout);
    };
  }, []);

  const startInactivityTimer = () => {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(() => handleLogout(), 5 * 60 * 1000);
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
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
    if (values && values.length > 0) {
      const header = values[0];
      const rows = values.slice(1);
      let total = 0;

      rows.forEach((row) => {
        // Calculamos el total usando la columna VR. SESION (Índice 4)
        const rawValue = row[COL_INDEX.VR_SESION] ? row[COL_INDEX.VR_SESION].toString().replace(/,/g, "") : "0";
        total += parseFloat(rawValue) || 0;
      });

      setGoogleSheetData({ header, rows });
      setTotalValue(total.toLocaleString("es-CO"));
    }
  };

  // Función para parsear fechas tipo "abr 10" o "may 12" y compararlas
  const isDateExpired = (dateStr) => {
    if (!dateStr) return false;
    const months = { abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11, ene: 0, feb: 1, mar: 2 };
    const parts = dateStr.toLowerCase().split(" ");
    if (parts.length < 2) return false;

    const month = months[parts[0]];
    const day = parseInt(parts[1]);
    const currentYear = new Date().getFullYear();
    
    const paymentDate = new Date(currentYear, month, day);
    const today = new Date();
    today.setHours(0,0,0,0); // Normalizar hoy para comparar solo fechas

    // Si la fecha de pago es anterior a hoy, está vencida (ROJO)
    return paymentDate < today;
  };

  const renderTableAndTotal = () => {
    if (!googleSheetData.rows || googleSheetData.rows.length === 0) {
      return <p>No hay datos disponibles.</p>;
    }

    return (
      <table className="report-table">
        <thead>
          <tr>
            {columnsToShow.map((idx) => (
              <th key={idx}>{googleSheetData.header[idx]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {googleSheetData.rows.map((row, rowIndex) => {
            const isExpired = isDateExpired(row[COL_INDEX.FECHA_PAGO_APROX]);
            return (
              <tr key={rowIndex} style={{ backgroundColor: isExpired ? "#ffcccc" : "transparent" }}>
                {columnsToShow.map((colIdx) => (
                  <td key={colIdx} style={{ color: isExpired ? "#b30000" : "inherit", fontWeight: isExpired ? "bold" : "normal" }}>
                    {row[colIdx] || ""}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={columnsToShow.length} style={{ textAlign: "right", fontWeight: "bold" }}>
              Valor Total: {totalValue}
            </td>
          </tr>
        </tfoot>
      </table>
    );
  };

  // ... (Resto de funciones handleAddOrUpdateTask, etc, se mantienen igual)
  const handleDeleteTask = async (id) => {
    const taskDoc = doc(firestore, "tareas", id);
    try {
        await deleteDoc(taskDoc);
        alert("Tarea eliminada.");
    } catch (e) { console.error(e); }
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
      await updateDoc(doc(firestore, "tareas", editingTask.id), { tipo: taskType, descripcion: taskDescription });
      setEditingTask(null);
    } else {
      await addDoc(collection(firestore, "tareas"), { tipo: taskType, descripcion: taskDescription, estado: "pendiente", fechaCreacion: new Date() });
    }
    setTaskType(""); setTaskDescription("");
  };

  return (
    <>
      <div className="header-titles">
        <h2 onClick={() => setActiveSection("tareas")} className={activeSection === "tareas" ? "active-section" : ""}>
          Asignar Tareas
        </h2>
        <h2 onClick={() => setActiveSection("reportes")} className={activeSection === "reportes" ? "active-section" : ""}>
          Reporte de Facturas Pendientes
        </h2>
      </div>

      {activeSection === "reportes" && renderTableAndTotal()}

      {activeSection === "tareas" && (
        <div style={{padding: "20px"}}>
          <form onSubmit={handleAddOrUpdateTask}>
            <label>Tipo de Tarea</label>
            <select value={taskType} onChange={(e) => setTaskType(e.target.value)} required>
              <option value="">Seleccione...</option>
              <option value="crear-factura">Crear factura</option>
              <option value="revisar-cuenta">Revisar cuenta bancaria</option>
              <option value="enviar-correo">Enviar correo</option>
              <option value="otro">Otro</option>
            </select>
            <label>Descripción</label>
            <textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} required />
            <div className="contenedor">
              <button type="submit" className="primary-btn">{editingTask ? "Actualizar" : "Asignar"}</button>
              {editingTask && <button onClick={handleCancelEdit} className="secondary-btn">Cancelar</button>}
            </div>
          </form>

          <div className="task-titles">
            <h2 className={`task-title ${activeTab === "pendientes" ? "active" : ""}`} onClick={() => setActiveTab("pendientes")}>Pendientes</h2>
            <h2 className={`task-title ${activeTab === "completadas" ? "active" : ""}`} onClick={() => setActiveTab("completadas")}>Completadas</h2>
          </div>

          {activeTab === "pendientes" && (
            <table className="task-table">
              <thead><tr><th>Tipo</th><th>Descripción</th><th>Acciones</th></tr></thead>
              <tbody>
                {pendingTasks.map(t => (
                  <tr key={t.id}>
                    <td>{t.tipo}</td><td>{t.descripcion}</td>
                    <td>
                      <button onClick={() => handleEditTask(t)}>Editar</button>
                      <button onClick={() => handleDeleteTask(t.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}

export default AdminView;