// // frontend/src/pages/Admin/AdminDashboard.js
// import React from 'react';
// import { Routes, Route } from 'react-router-dom';
// import AppointmentList from '../../components/Admin/AppointmentList';
// import ServiceManager from '../../components/Admin/ServiceManager';
// import ScheduleManager from '../../components/Admin/ScheduleManager';
// import '../../styles/App.css';

// const AdminDashboard = () => {
//   return (
//     <div className="admin-dashboard-container">
//       <h1>Dashboard do Administrador</h1>
//       <p>Bem-vindo ao painel de controle da barbearia.</p>

//       <Routes>
//         <Route index element={<AppointmentList />} />
//         <Route path="appointments" element={<AppointmentList />} />
//         <Route path="services" element={<ServiceManager />} />
//         <Route path="schedules" element={<ScheduleManager />} />
//       </Routes>
//     </div>
//   );
// };

// export default AdminDashboard;
import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import AppointmentList from '../../components/Admin/AppointmentList';
import ServiceManager from '../../components/Admin/ServiceManager';
import ScheduleManager from '../../components/Admin/ScheduleManager';
import '../../styles/App.css';

const AdminDashboard = () => {
  const location = useLocation();
  
  // Determine which component to show based on the path
  const getContent = () => {
    if (location.pathname.includes('/admin/services')) {
      return <ServiceManager />;
    }
    if (location.pathname.includes('/admin/schedules')) {
      return <ScheduleManager />;
    }
    return <AppointmentList />; // Default
  };

  return (
    <div className="admin-dashboard-container">
      <h1>Dashboard do Administrador</h1>
      <p>Bem-vindo ao painel de controle da barbearia.</p>
      
      {getContent()}
    </div>
  );
};

export default AdminDashboard;