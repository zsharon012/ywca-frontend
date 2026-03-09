import { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { getAuth } from 'firebase/auth';

ModuleRegistry.registerModules([ AllCommunityModule ]);

const Contacts = () => {
  const [rowData, setRowData] = useState([]);
  const [updateError, setUpdateError] = useState(null);

  const fetchData = async () => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-contacts`, {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }

      const data = await response.json();
      const contacts = data["data"];

      setRowData(contacts);
      setUpdateError(null);

    } catch (error) {
      console.error("Error fetching data:", error);
      setUpdateError("Failed to fetch contacts");
    }
  };

  // fetch initial contacts from backend
  useEffect(() => {
    fetchData();
  }, []);

  const handleCellValueChanged = async (event) => {
    const { data } = event;

    if (!data.recipientid) {
      console.error("Missing recipient ID");
      return;
    }

    try {
      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/update-contact/${data.recipientid}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            phone: data.phone,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update contact');
      }

      setUpdateError(null);
      console.log("Contact updated successfully");
    } catch (error) {
      console.error("Error updating contact:", error);
      setUpdateError("Failed to update contact. Changes were not saved.");
      // Refresh data to show last saved state
      fetchData();
    }
  };

  const [columnDefs] = useState([
    { field: 'name', headerName: 'Name', editable: true },
    { field: 'email', headerName: 'Email', editable: true },
    { field: 'phone', headerName: 'Phone', editable: true },
  ]);

  return (
    <div style={{ width: '100%' }}>
      {updateError && (
        <div style={{
          backgroundColor: '#fee',
          color: '#c00',
          padding: '10px',
          marginBottom: '10px',
          borderRadius: '4px',
        }}>
          {updateError}
        </div>
      )}
      <div className="ag-theme-alpine" style={{ height: 400, width: '100%' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          onCellValueChanged={handleCellValueChanged}
          theme="legacy"
          defaultColDef={{
            flex: 1,
            minWidth: 100,
          }}
        />
      </div>
    </div>
  );
};

export default Contacts;
