import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { getAuth } from 'firebase/auth';
import { Search as SearchIcon, Filter as FilterIcon } from 'lucide-react';
import './Contacts.css';

ModuleRegistry.registerModules([ AllCommunityModule ]);

const Contacts = () => {
  const [rowData, setRowData] = useState([]);
  const [updateError, setUpdateError] = useState(null);
  const [quickFilterText, setQuickFilterText] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('name');
  const [filterValue, setFilterValue] = useState('');
  const [gridApi, setGridApi] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success' | 'error' | null
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef(null);

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
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contacts/recipients`, {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }

      const data = await response.json();
      const contacts = Array.isArray(data) ? data : data["data"];
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

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file is empty');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    // validate required columns exist
    const required = ['name', 'email', 'phone'];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length > 0) {
      throw new Error(`CSV missing required columns: ${missing.join(', ')}`);
    }

    return lines.slice(1).map((line, index) => {
      if (!line.trim()) return null; // Skip empty lines
      const values = line.split(',').map(v => v.trim());
      const row = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || '';
      });

      if (!row.name || !row.email) {
        throw new Error(`Row ${index + 2}: Name and email are required`);
      }

      return {
        name: row.name,
        email: row.email,
        phone: row.phone || '',
      };
    }).filter(Boolean);
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // reset input so same file can be re-uploaded if needed
    e.target.value = '';

    try {
      const text = await file.text();
      const contacts = parseCSV(text);

      if (contacts.length === 0) {
        throw new Error('No valid contacts found in CSV');
      }

      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contacts/bulk`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contacts }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bulk upload failed');
      }

      const result = await response.json();
      setUploadStatus('success');
      setUploadMessage(`Successfully uploaded ${result.inserted} contact(s)`);
      setUpdateError(null);
      fetchData(); // refresh the table
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 4000);

    } catch (error) {
      console.error('CSV upload error:', error);
      setUploadStatus('error');
      setUploadMessage(error.message || 'CSV upload failed');
      setUpdateError(error.message || 'CSV upload failed');
    }
  };

  const [columnDefs] = useState([
    { field: 'name', headerName: 'Name', editable: true, filter: 'agTextColumnFilter' },
    { field: 'email', headerName: 'Email', editable: true, filter: 'agTextColumnFilter' },
    { field: 'contact-status', headerName: 'Contact Status', editable: true, filter: 'agTextColumnFilter' },
    { field: 'phone', headerName: 'Phone', editable: true, filter: 'agTextColumnFilter' },
  ]);

  return (
    <div className="contacts-page">
      {updateError && (
        <div className="contacts-error">{updateError}</div>
      )}

      {uploadStatus === 'success' && (
        <div style={{
          backgroundColor: '#efe',
          color: '#060',
          padding: '10px',
          marginBottom: '10px',
          borderRadius: '4px',
        }}>
          {uploadMessage}
        </div>
      )}

      {uploadStatus === 'error' && (
        <div style={{
          backgroundColor: '#fee',
          color: '#c00',
          padding: '10px',
          marginBottom: '10px',
          borderRadius: '4px',
        }}>
          {uploadMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px', marginBottom: '10px', marginTop: '20px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            className="search-box__input"
            type="text"
            placeholder="Search all..."
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
          />
        </div>

        <div className="filter-bar">
          <FilterIcon />
          <span className="filter-bar__label">Filter where</span>
          <select
            className="filter-pill filter-pill--select"
            value={selectedColumn}
            onChange={(e) => setSelectedColumn(e.target.value)}
          >
            <option value="name">Name</option>
            <option value="email">Email</option>
            <option value="contact-status">Contact Status</option>
            <option value="phone">Phone</option>
          </select>
          <span className="filter-bar__is">is</span>
          <input
            className="filter-pill filter-pill--input"
            type="text"
            placeholder="Filter..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
          />
        </div>

        {/* CSV Upload Button */}
        <div style={{ marginLeft: 'auto' }}>
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleCSVUpload}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '10px 16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
            }}
          >
            Upload CSV
          </button>
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
          defaultColDef={{ flex: 1, minWidth: 100 }}
        />
      </div>
    </div>
  );
};

export default Contacts;
