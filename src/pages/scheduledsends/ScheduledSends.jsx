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
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [sendDateTime, setSendDateTime] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadGroups();
  }, []);

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!selectedTemplate || !selectedGroup || !sendDateTime) {
      setErrorMessage('Please choose a template, a group, and a send date/time.');
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
          contactgroupid: selectedGroup,
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

    if (!selectedTemplate || !selectedGroup) {
      setErrorMessage('Please choose a template and a group before sending now.');
      return;
    }

    setLoading(true);

    try {
      const sendResult = await authFetch('/sendmail', {
        method: 'POST',
        body: {
          templateid: selectedTemplate,
          contactgroupids: [selectedGroup],
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

  return (
    <div className="flex justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl">
        <div className="rounded-2xl border border-slate-300 bg-white p-8 shadow-sm">
          <h1 className="mb-3 text-3xl font-bold text-slate-900">Schedule a Template Send</h1>
          <p className="mb-6 text-sm text-slate-600">
            Pick a saved template, assign it to a contact group, and choose a future send date/time.
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

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Contact group</span>
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
            </label>

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

          {(selectedTemplateObj || selectedGroupObj) && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="mb-3 text-xl font-bold text-slate-900">Review</h2>
              <dl className="space-y-3 text-sm text-slate-700">
                <div>
                  <dt className="font-semibold">Template</dt>
                  <dd>{selectedTemplateObj ? selectedTemplateObj.name || selectedTemplateObj.customname || selectedTemplateObj.subject : 'None selected'}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Group</dt>
                  <dd>{selectedGroupObj ? selectedGroupObj.name || selectedGroupObj.customname : 'None selected'}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Send time</dt>
                  <dd>{sendDateTime ? new Date(sendDateTime).toLocaleString() : 'None selected'}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
