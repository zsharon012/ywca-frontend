import { useState, useEffect } from 'react';
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

      <div className="toolbar">
        <div className="search-box">
          <SearchIcon />
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
      </div>

      <div className="table-wrap ag-theme-alpine">
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
