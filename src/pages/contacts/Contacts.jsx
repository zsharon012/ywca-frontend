import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { getAuth } from 'firebase/auth';
import { Search as SearchIcon, Filter as FilterIcon, X as CloseIcon, Plus as PlusIcon, Trash2 as TrashIcon } from 'lucide-react';
import './Contacts.css';

ModuleRegistry.registerModules([ AllCommunityModule ]);

const Contacts = () => {
  const [rowData, setRowData] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [updateError, setUpdateError] = useState(null);
  const [quickFilterText, setQuickFilterText] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('name');
  const [filterValue, setFilterValue] = useState('');
  const [gridApi, setGridApi] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [newContact, setNewContact] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [selectedContactForGroup, setSelectedContactForGroup] = useState(null);
  const [contactGroupAssignments, setContactGroupAssignments] = useState({});
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
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contacts/recipients-with-groups`, {
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
      
      // Build contact-to-group mapping
      const mapping = {};
      contacts.forEach(contact => {
        mapping[contact.recipientid] = (contact.groups || []).map(g => g.id);
      });
      setContactGroupAssignments(mapping);
      setUpdateError(null);

    } catch (error) {
      console.error("Error fetching data:", error);
      setUpdateError("Failed to fetch contacts");
    }
  };

  const fetchGroups = async () => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contacts/lists`, {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }

      const data = await response.json();
      const groupsList = Array.isArray(data) ? data : data["data"] || [];
      setGroups(groupsList);
    } catch (error) {
      console.error("Error fetching groups:", error);
      setUpdateError("Failed to fetch groups");
    }
  };

  // Fetch initial contacts and groups
  useEffect(() => {
    fetchData();
    fetchGroups();
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
        `${import.meta.env.VITE_BACKEND_URL}/contacts/members/${data.recipientid}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            firstName: data.name?.split(' ')[0] || '',
            lastName: data.name?.split(' ').slice(1).join(' ') || '',
            email: data.email,
            phone: data.phone,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update contact');
      }

      setUpdateError(null);
    } catch (error) {
      console.error("Error updating contact:", error);
      setUpdateError("Failed to update contact. Changes were not saved.");
      fetchData();
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    
    if (!newContact.firstName || !newContact.email) {
      setUpdateError('First name and email are required');
      return;
    }

    try {
      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contacts/recipients`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: newContact.firstName,
          lastName: newContact.lastName || '',
          email: newContact.email,
          phone: newContact.phone || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create contact');
      }

      setUploadStatus('success');
      setUploadMessage('Contact created successfully');
      setNewContact({ firstName: '', lastName: '', email: '', phone: '' });
      setShowAddContact(false);
      fetchData();
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 4000);
    } catch (error) {
      console.error('Add contact error:', error);
      setUpdateError(error.message || 'Failed to create contact');
    }
  };

  const handleDeleteContact = async (recipientId) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    try {
      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/contacts/recipients/${recipientId}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete contact');
      }

      setUploadStatus('success');
      setUploadMessage('Contact deleted successfully');
      fetchData();
      fetchGroups();
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 4000);
    } catch (error) {
      console.error('Delete contact error:', error);
      setUpdateError('Failed to delete contact');
    }
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    
    if (!newGroup.name) {
      setUpdateError('Group name is required');
      return;
    }

    try {
      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contacts/lists`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newGroup.name,
          description: newGroup.description || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create group');
      }

      setUploadStatus('success');
      setUploadMessage('Group created successfully');
      setNewGroup({ name: '', description: '' });
      setShowAddGroup(false);
      fetchGroups();
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 4000);
    } catch (error) {
      console.error('Add group error:', error);
      setUpdateError(error.message || 'Failed to create group');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) {
      return;
    }

    try {
      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/contacts/lists/${groupId}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete group');
      }

      setUploadStatus('success');
      setUploadMessage('Group deleted successfully');
      setSelectedGroup(null);
      fetchGroups();
      fetchData();
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 4000);
    } catch (error) {
      console.error('Delete group error:', error);
      setUpdateError('Failed to delete group');
    }
  };

  const handleAssignContactToGroup = async (contactId, groupId) => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contacts/members/add`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId: contactId,
          contactlistID: groupId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign contact to group');
      }

      setUploadStatus('success');
      setUploadMessage('Contact assigned to group');
      fetchData();
      fetchGroups();
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 4000);
    } catch (error) {
      console.error('Assign contact error:', error);
      setUpdateError(error.message || 'Failed to assign contact');
    }
  };

  const handleRemoveContactFromGroup = async (contactId, groupId) => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/contacts/lists/${groupId}/members/${contactId}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove contact from group');
      }

      setUploadStatus('success');
      setUploadMessage('Contact removed from group');
      fetchData();
      fetchGroups();
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 4000);
    } catch (error) {
      console.error('Remove contact error:', error);
      setUpdateError('Failed to remove contact from group');
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
      if (!line.trim()) return null;
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
      fetchData();
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
    { 
      field: 'name', 
      headerName: 'Name', 
      editable: true, 
      filter: 'agTextColumnFilter',
      cellRenderer: (params) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span>{params.value}</span>
          <button
            onClick={() => handleDeleteContact(params.data.recipientid)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-error-text)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Delete contact"
          >
            <TrashIcon size={16} />
          </button>
        </div>
      )
    },
    { field: 'email', headerName: 'Email', editable: true, filter: 'agTextColumnFilter' },
    { field: 'phone', headerName: 'Phone', editable: true, filter: 'agTextColumnFilter' },
    {
      field: 'groups',
      headerName: 'Groups',
      cellRenderer: (params) => (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start', height: '100%', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignContent: 'flex-start', maxHeight: '60px', overflowY: 'auto', overflowX: 'auto', flex: 1, paddingRight: '4px' }}>
            {params.value && params.value.map(group => (
              <span
                key={group.id}
                style={{
                  backgroundColor: '#e0e0e0',
                  padding: '0 4px 0 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  height: '29px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {group.name}
                <button
                  onClick={() => handleRemoveContactFromGroup(params.data.recipientid, group.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#888',
                    padding: '0 2px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '12px',
                    lineHeight: 1,
                  }}
                  title="Remove from group"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={() => setSelectedContactForGroup(params.data.recipientid)}
            style={{
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary-text)',
              border: '1px solid var(--color-primary-border)',
              borderRadius: '4px',
              padding: '2px 6px',
              cursor: 'pointer',
              fontSize: '10px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            +
          </button>
        </div>
      )
    }
  ]);

  return (
    <div className={`contacts-page ${showGroupManagement ? 'contacts-page--sidebar-open' : ''}`}>
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

      {/* Group Management Sidebar */}
      {showGroupManagement && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: '300px',
          backgroundColor: 'white',
          boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
          padding: '20px',
          overflowY: 'auto',
          zIndex: 1000,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Groups</h2>
            <button
              onClick={() => setShowGroupManagement(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}
            >
              <CloseIcon />
            </button>
          </div>

          <button
            onClick={() => setShowAddGroup(true)}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '20px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <PlusIcon size={18} /> New Group
          </button>

          {showAddGroup && (
            <div style={{
              backgroundColor: '#f5f5f5',
              padding: '15px',
              borderRadius: '4px',
              marginBottom: '20px',
            }}>
              <h3>Create Group</h3>
              <form onSubmit={handleAddGroup}>
                <input
                  type="text"
                  placeholder="Group name"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginBottom: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                  }}
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginBottom: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: 'var(--color-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddGroup(false)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div>
            <h3>All Groups</h3>
            {groups.length === 0 ? (
              <p style={{ color: '#999' }}>No groups yet</p>
            ) : (
              groups.map(group => {
                const groupContacts = rowData.filter(contact =>
                  (contact.groups || []).some(g => g.id === group.id)
                );
                const isExpanded = selectedGroup === group.id;

                return (
                  <div
                    key={group.id}
                    style={{
                      marginBottom: '10px',
                      backgroundColor: '#f9f9f9',
                      borderRadius: '4px',
                      border: '1px solid #eee',
                    }}
                  >
                    {/* Group Header */}
                    <div
                      onClick={() => setSelectedGroup(isExpanded ? null : group.id)}
                      style={{
                        padding: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{group.name}</div>
                        <div style={{ fontSize: '12px', color: '#999' }}>{parseInt(group.membercount) || 0} members</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#999' }}>{isExpanded ? '▲' : '▼'}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-error-text)',
                          }}
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Member List */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid #eee', padding: '8px 10px' }}>
                        {groupContacts.length === 0 ? (
                          <div style={{ fontSize: '13px', color: '#999' }}>No members yet</div>
                        ) : (
                          groupContacts.map(contact => (
                            <div
                              key={contact.recipientid}
                              style={{
                                fontSize: '13px',
                                padding: '6px 0',
                                borderBottom: '1px solid #f0f0f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: '500' }}>{contact.name}</div>
                                <div style={{ fontSize: '11px', color: '#999' }}>{contact.email}</div>
                              </div>
                              <button
                                onClick={() => handleRemoveContactFromGroup(contact.recipientid, group.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--color-error-text)',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                                title="Remove from group"
                              >
                                <TrashIcon size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Group Assignment Modal */}
      {selectedContactForGroup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%',
          }}>
            <h2>Assign to Group</h2>
            <div style={{ marginBottom: '20px', maxHeight: '300px', overflowY: 'auto' }}>
              {groups.map(group => {
                const isAssigned = contactGroupAssignments[selectedContactForGroup]?.includes(group.id);
                return (
                  <div key={group.id} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleAssignContactToGroup(selectedContactForGroup, group.id);
                        } else {
                          handleRemoveContactFromGroup(selectedContactForGroup, group.id);
                        }
                      }}
                      style={{ marginRight: '10px' }}
                    />
                    <label>{group.name}</label>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setSelectedContactForGroup(null)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: 'var(--color-border)',
                color: 'var(--color-text)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px', marginBottom: '10px', marginTop: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
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

        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Add Contact Button */}
          <button
            onClick={() => setShowAddContact(true)}
            style={{
              padding: '10px 16px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <PlusIcon size={18} /> Add Contact
          </button>

          {/* Manage Groups Button */}
          <button
            onClick={() => setShowGroupManagement(true)}
            style={{
              padding: '10px 16px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
            }}
          >
            Manage Groups
          </button>

          {/* CSV Upload Button */}
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
              backgroundColor: 'var(--color-primary)',
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

      {/* Add Contact Modal */}
      {showAddContact && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Add New Contact</h2>
              <button
                onClick={() => setShowAddContact(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px' }}
              >
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleAddContact}>
              <input
                type="text"
                placeholder="First Name *"
                value={newContact.firstName}
                onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '15px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '16px',
                }}
              />
              <input
                type="text"
                placeholder="Last Name"
                value={newContact.lastName}
                onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '15px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '16px',
                }}
              />
              <input
                type="email"
                placeholder="Email *"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '15px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '16px',
                }}
              />
              <input
                type="tel"
                placeholder="Phone"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '20px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '16px',
                }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '500',
                  }}
                >
                  Create Contact
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddContact(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '500',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="ag-theme-alpine" style={{ height: 400, width: '100%' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          onCellValueChanged={handleCellValueChanged}
          theme="legacy"
          quickFilterText={quickFilterText}
          onGridReady={(params) => setGridApi(params.api)}
          defaultColDef={{ flex: 1, minWidth: 100 }}
          rowHeight={50}
        />
      </div>
    </div>
  );
};

export default Contacts;
