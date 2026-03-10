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
  const [quickFilterText, setQuickFilterText] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('name');
  const [filterValue, setFilterValue] = useState('');
  const [gridApi, setGridApi] = useState(null);

  const applyFilter = () => {
    if (gridApi) {
      const filterModel = filterValue
        ? { [selectedColumn]: { filterType: 'text', type: 'contains', filter: filterValue } }
        : {};
      gridApi.setFilterModel(filterModel);
    }
  };

  useEffect(() => {
    applyFilter();
  }, [selectedColumn, filterValue, gridApi]);

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
    { field: 'name', headerName: 'Name', editable: true, filter: 'agTextColumnFilter' },
    { field: 'email', headerName: 'Email', editable: true, filter: 'agTextColumnFilter' },
    { field: 'phone', headerName: 'Phone', editable: true, filter: 'agTextColumnFilter' },
  ]);

  return (
    <div style={{ width: '100%', padding: '20px', boxSizing: 'border-box' }}>
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
      <div style={{ display: 'flex', gap: '20px', marginBottom: '10px', marginTop: '20px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search all..."
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            style={{
              width: '200px',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '16px',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <select
            value={selectedColumn}
            onChange={(e) => setSelectedColumn(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '16px',
            }}
          >
            <option value="name">Name</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
          </select>
          <span>is</span>
          <input
            type="text"
            placeholder="Filter..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            style={{
              width: '150px',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '16px',
            }}
          />
        </div>
      </div>
      <div className="ag-theme-alpine" style={{ height: 400, width: '100%' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          onCellValueChanged={handleCellValueChanged}
          theme="legacy"
          quickFilterText={quickFilterText}
          onGridReady={(params) => setGridApi(params.api)}
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
