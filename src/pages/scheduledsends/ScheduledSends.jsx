import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';

const API_ROOT = import.meta.env.VITE_BACKEND_URL;

async function authFetch(path, options = {}) {
  const auth = getAuth();
  if (!auth.currentUser) {
    throw new Error('Not authenticated');
  }

  const token = await auth.currentUser.getIdToken();
  const res = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText} — ${path}${text ? `: ${text}` : ''}`);
  }

  return res.json();
}

export default function ScheduledSends() {
  const [templates, setTemplates] = useState([]);
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templatePreview, setTemplatePreview] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedContact, setSelectedContact] = useState('');
  const [sendDateTime, setSendDateTime] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sendMode, setSendMode] = useState('group'); // 'group' or 'individual'

  useEffect(() => {
    loadTemplates();
    loadGroups();
    loadContacts();
  }, []);

  useEffect(() => {
    // Load full template details when selection changes
    if (selectedTemplate) {
      loadTemplatePreview(selectedTemplate);
    } else {
      setTemplatePreview(null);
    }
  }, [selectedTemplate]);

  const loadTemplatePreview = async (templateId) => {
    try {
      const response = await authFetch(`/templates/${templateId}`);
      setTemplatePreview(response?.data || null);
    } catch (error) {
      console.error('Failed to load template preview:', error);
      setTemplatePreview(null);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await authFetch('/templates');
      const templatesList = Array.isArray(data) ? data : data.data || [];
      setTemplates(templatesList);
      if (!selectedTemplate && templatesList.length > 0) {
        setSelectedTemplate(templatesList[0].templateid || templatesList[0].id || '');
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      setErrorMessage('Unable to load templates.');
    }
  };

  const loadGroups = async () => {
    try {
      const data = await authFetch('/contacts/lists');
      const groupList = Array.isArray(data) ? data : data.data || [];
      setGroups(groupList);
      if (!selectedGroup && groupList.length > 0) {
        setSelectedGroup(groupList[0].id || groupList[0].contactgroupid || '');
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
      setErrorMessage('Unable to load contact groups.');
    }
  };

  const loadContacts = async () => {
    try {
      const data = await authFetch('/contacts/recipients');
      const contactsList = Array.isArray(data) ? data : data.data || [];
      setContacts(contactsList);
      if (!selectedContact && contactsList.length > 0) {
        const firstContactId = contactsList[0]?.recipientid;
        if (firstContactId) {
          setSelectedContact(firstContactId);
        }
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
      setErrorMessage('Unable to load contacts.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!selectedTemplate) {
      setErrorMessage('Please choose a template.');
      return;
    }

    if (sendMode === 'group' && !selectedGroup) {
      setErrorMessage('Please choose a contact group.');
      return;
    }

    if (sendMode === 'individual' && !selectedContact) {
      setErrorMessage('Please choose a contact.');
      return;
    }

    if (!sendDateTime) {
      setErrorMessage('Please choose a send date/time.');
      return;
    }

    const sendDate = new Date(sendDateTime);
    if (!(sendDate instanceof Date) || Number.isNaN(sendDate.valueOf())) {
      setErrorMessage('Please enter a valid send date/time.');
      return;
    }

    if (sendDate <= new Date()) {
      setErrorMessage('Send date/time must be in the future.');
      return;
    }

    setLoading(true);

    try {
      const mailObjectResponse = await authFetch('/mailobjects', {
        method: 'POST',
        body: {
          templateid: selectedTemplate,
          ...(sendMode === 'group' 
            ? { contactgroupid: selectedGroup }
            : { recipientid: selectedContact }
          ),
        },
      });

      const mailobjectid = mailObjectResponse?.data?.mailobjectid || mailObjectResponse?.mailobjectid;
      if (!mailobjectid) {
        throw new Error('Failed to create the mail object.');
      }

      const scheduledSendResponse = await authFetch('/scheduledsends', {
        method: 'POST',
        body: {
          mailobjectid,
          sendate: sendDate.toISOString(),
        },
      });

      setStatusMessage(
        scheduledSendResponse?.message || 'Scheduled send created successfully.'
      );
      setErrorMessage(null);
      setSendDateTime('');
    } catch (error) {
      console.error('Failed to schedule send:', error);
      setErrorMessage(error.message || 'Unable to schedule send.');
      setStatusMessage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async () => {
    setErrorMessage(null);
    setStatusMessage(null);

    if (!selectedTemplate) {
      setErrorMessage('Please choose a template.');
      return;
    }

    if (sendMode === 'group' && !selectedGroup) {
      setErrorMessage('Please choose a contact group before sending now.');
      return;
    }

    if (sendMode === 'individual' && !selectedContact) {
      setErrorMessage('Please choose a contact before sending now.');
      return;
    }

    setLoading(true);

    try {
      const sendResult = await authFetch('/sendmail', {
        method: 'POST',
        body: {
          templateid: selectedTemplate,
          ...(sendMode === 'group'
            ? { contactgroupids: [selectedGroup] }
            : { recipientids: [selectedContact] }
          ),
        },
      });

      const results = sendResult?.data?.sendResults || [];
      const successCount = results.filter((item) => !item.error).length;
      const errorCount = results.filter((item) => item.error).length;
      const summary = `${successCount} sent${errorCount ? `, ${errorCount} failed` : ''}`;

      setStatusMessage(`Send now completed: ${summary}.`);
      setErrorMessage(null);
    } catch (error) {
      console.error('Failed to send now:', error);
      setErrorMessage(error.message || 'Unable to send now.');
      setStatusMessage(null);
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplateObj = templates.find(
    (template) => template.templateid === selectedTemplate || template.id === selectedTemplate
  );
  const selectedGroupObj = groups.find(
    (group) => group.id === selectedGroup || group.contactgroupid === selectedGroup
  );
  const selectedContactObj = contacts.find(
    (contact) => contact.recipientid === selectedContact
  );

  return (
    <div className="flex justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl">
        <div className="rounded-2xl border border-slate-300 bg-white p-8 shadow-sm">
          <h1 className="mb-3 text-3xl font-bold text-slate-900">Schedule a Template Send</h1>
          <p className="mb-6 text-sm text-slate-600">
            Pick a saved template and choose a recipient (group or individual), then set a future send date/time.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Template</span>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-500"
              >
                <option value="" disabled>
                  Select a template
                </option>
                {templates.map((template) => (
                  <option
                    key={template.templateid || template.id}
                    value={template.templateid || template.id}
                  >
                    {template.name || template.customname || template.subject || 'Untitled template'}
                  </option>
                ))}
              </select>
            </label>

            <div className="block">
              <span className="mb-3 block text-sm font-semibold text-slate-700">Send to</span>
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setSendMode('group')}
                  className={`px-4 py-2 rounded text-sm font-medium transition ${
                    sendMode === 'group'
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Contact Group
                </button>
                <button
                  type="button"
                  onClick={() => setSendMode('individual')}
                  className={`px-4 py-2 rounded text-sm font-medium transition ${
                    sendMode === 'individual'
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Individual Contact
                </button>
              </div>

              {sendMode === 'group' ? (
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-500"
                >
                  <option value="" disabled>
                    Select a contact group
                  </option>
                  {groups.map((group) => (
                    <option
                      key={group.contactgroupid || group.id}
                      value={group.contactgroupid || group.id}
                    >
                      {group.name || group.customname || 'Unnamed group'}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedContact}
                  onChange={(e) => setSelectedContact(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-500"
                >
                  <option value="" disabled>
                    Select a contact
                  </option>
                  {contacts.map((contact) => (
                    <option
                      key={contact.recipientid}
                      value={contact.recipientid}
                    >
                      {contact.name || contact.email || 'Unnamed contact'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Send date and time</span>
              <input
                type="datetime-local"
                value={sendDateTime}
                onChange={(e) => setSendDateTime(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-500"
              />
            </label>

            {errorMessage && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            {statusMessage && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                {statusMessage}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Scheduling…' : 'Schedule Send'}
              </button>
              <button
                type="button"
                onClick={handleSendNow}
                disabled={loading}
                className="inline-flex items-center justify-center rounded border border-slate-900 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send Now'}
              </button>
            </div>
          </form>

          {(selectedTemplateObj || (sendMode === 'group' ? selectedGroupObj : selectedContactObj)) && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="mb-3 text-xl font-bold text-slate-900">Review</h2>
              <dl className="space-y-3 text-sm text-slate-700">
                <div>
                  <dt className="font-semibold">Template</dt>
                  <dd>{selectedTemplateObj ? selectedTemplateObj.name || selectedTemplateObj.customname || selectedTemplateObj.subject : 'None selected'}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{sendMode === 'group' ? 'Group' : 'Contact'}</dt>
                  <dd>
                    {sendMode === 'group'
                      ? (selectedGroupObj ? selectedGroupObj.name || selectedGroupObj.customname : 'None selected')
                      : (selectedContactObj ? selectedContactObj.name || selectedContactObj.email : 'None selected')}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Send time</dt>
                  <dd>{sendDateTime ? new Date(sendDateTime).toLocaleString() : 'None selected'}</dd>
                </div>
              </dl>
            </div>
          )}

          {templatePreview && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                <h2 className="text-xl font-bold text-slate-900">Email Preview</h2>
              </div>
              <div className="p-6">
                {/* Email header simulation */}
                <div className="mb-6 border-b border-slate-200 pb-6">
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <span className="w-16 font-semibold text-slate-700">From:</span>
                      <span className="text-slate-900">Your Organization</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-16 font-semibold text-slate-700">To:</span>
                      <span className="text-slate-900">
                        {sendMode === 'group' ? (selectedGroupObj?.name || 'Group members') : (selectedContactObj?.name || selectedContactObj?.email || 'Recipient')}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-16 font-semibold text-slate-700">Subject:</span>
                      <span className="text-slate-900">{templatePreview.subject || '(no subject)'}</span>
                    </div>
                  </div>
                </div>

                {/* Email body simulation */}
                <div className="prose prose-sm max-w-none">
                  <div 
                    className="rounded border border-slate-200 bg-white p-6 text-slate-800 leading-relaxed"
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#1f2937',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    }}
                  >
                    {templatePreview.body ? (
                      <div dangerouslySetInnerHTML={{ __html: templatePreview.body }} />
                    ) : (
                      <p className="text-slate-500 italic">(no content)</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
