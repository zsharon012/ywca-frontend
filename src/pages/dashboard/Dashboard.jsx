import { useState, useEffect, useCallback } from 'react'
import { getAuth } from 'firebase/auth';
import { Calendar } from '@/components/ui/calendar';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function authFetch(path, options = {}) {
    const auth = getAuth();
    if (!auth.currentUser) throw new Error('Not authenticated');
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(options.headers ?? {}),
        },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path}`);
    return res.json();
}

// ─── DashboardCard ───────────────────────────────────────────────────────────

function DashboardCard({ title, children }) {
    const [expanded, setExpanded] = useState(false)
    const cardClasses = [
        'w-full',
        'max-w-5xl',
        'bg-slate-100',
        'p-5',
        'my-4',
        'overflow-hidden',
        'border',
        'border-black',
        'flex',
        'flex-col',
        expanded ? 'min-h-[32rem]' : 'min-h-[9rem] justify-center',
    ].join(' ')

    return (
        <div className={cardClasses}>
            <div className="flex items-center justify-between">
                <h2 className={`m-0 text-xl font-semibold text-slate-900 ${expanded ? 'mb-3' : ''}`}>
                    {title}
                </h2>
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-2xl font-bold text-slate-900 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                    aria-label={expanded ? 'Collapse card' : 'Expand card'}
                >
                    {expanded ? '−' : '+'}
                </button>
            </div>
            {expanded && (
                <div className="flex flex-1 items-center">
                    {children}
                </div>
            )}
        </div>
    )
}

// ─── SummaryStats ────────────────────────────────────────────────────────────

function SummaryStats() {
    const [pending, setPending] = useState(0);
    const [sent, setSent] = useState(0);
    const [date, setDate] = useState(new Date());

    useEffect(() => {
        authFetch('/scheduledsends/pending')
            .then(data => setPending(data.length))
            .catch(err => console.error('Error fetching pending sends:', err));

        authFetch('/scheduledsends')
            .then(data => setSent(data.filter(s => s.sent).length))
            .catch(err => console.error('Error fetching sends:', err));
    }, []);

    return (
        <DashboardCard title="Summary and Statistics">
            <div className="flex items-center gap-[101px] m-4">
                {/* Summary Box */}
                <div className="w-[575px] h-[244px] rounded-[5px] border border-black bg-[#F3793E] shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] p-4 text-white">
                    <h3 className="text-xl font-bold mt-6 mb-4 ml-4">Summary</h3>
                    <div className="ml-4 space-y-1">
                        <h3 className="text-xl font-bold">Sent: {sent}</h3>
                        <h3 className="text-xl font-bold">Pending: {pending}</h3>
                    </div>
                </div>

                {/* Calendar */}
                <div
                    className="h-[320px] rounded-[5px] border border-black bg-white shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] overflow-visible p-2"
                    onClick={e => e.stopPropagation()}
                >
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="w-full"
                    />
                </div>
            </div>
        </DashboardCard>
    )
}

// ─── Outbox helpers ──────────────────────────────────────────────────────────

function statusBadge(status) {
    const base = 'rounded-full px-3 py-1 text-xs font-semibold'
    switch (status) {
        case 'Scheduled': return `${base} bg-yellow-200 text-yellow-900`
        case 'Sent':      return `${base} bg-blue-200 text-blue-900`
        default:          return `${base} bg-slate-200 text-slate-900`
    }
}

/**
 * Derive a display status from the scheduled-send record.
 * Adjust the field names below if the API shape differs.
 */
function deriveStatus(send) {
    return send.sent ? 'Sent' : 'Scheduled';
}

/**
 * Shape a raw scheduled-send + its mail-object into an outbox row.
 * Field names are inferred from the API docs; adjust as needed.
 */
function toOutboxRow(send, mailObject) {
    const recipients = send.contactlistname
        ? [send.contactlistname]
        : send.contactgroupid
            ? [send.contactgroupid]
            : ['—'];
    const formatter = new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'full',
        timeStyle: 'short'
        });

    return {
        id: send._id ?? send.mailobjectid,
        recipients,
        subject: send.subject ?? mailObject?.subject ?? '(no subject)',
        status: deriveStatus(send),
        sentDate: send.sendate
            ? formatter.format(new Date(send.sendate))
            : 'N/A',
    };
}

function normalizeRowValue(row, key) {
    if (key === 'recipients') {
        return row.recipients.join(', ')
    }
    return row[key] ? String(row[key]) : ''
}

function sortRows(rows, sortConfig) {
    if (!sortConfig?.key) {
        return rows
    }

    return [...rows].sort((a, b) => {
        const aValue = normalizeRowValue(a, sortConfig.key)
        const bValue = normalizeRowValue(b, sortConfig.key)

        if (sortConfig.key === 'sentDate' || sortConfig.key === 'receivedDate') {
            const aDate = new Date(aValue)
            const bDate = new Date(bValue)
            if (Number.isNaN(aDate.valueOf()) && Number.isNaN(bDate.valueOf())) {
                return 0
            }
            if (Number.isNaN(aDate.valueOf())) {
                return 1
            }
            if (Number.isNaN(bDate.valueOf())) {
                return -1
            }
            return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate
        }

        if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
    })
}

function filterRows(rows, selectedColumn, filterValue, quickFilterText) {
    const filteredValue = filterValue.trim().toLowerCase()
    const quickFilter = quickFilterText.trim().toLowerCase()
    return rows.filter(row => {
        const cellValue = normalizeRowValue(row, selectedColumn).toLowerCase()
        const matchesColumnFilter = !filteredValue || cellValue.includes(filteredValue)
        const matchesQuickFilter = !quickFilter ||
            ['recipients', 'subject', 'status', 'sentDate']
                .some(k => normalizeRowValue(row, k).toLowerCase().includes(quickFilter))
        return matchesColumnFilter && matchesQuickFilter
    })
}


// ─── Outbox ──────────────────────────────────────────────────────────────────

function Outbox() {
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [selectedColumn, setSelectedColumn] = useState('recipients')
    const [filterValue, setFilterValue] = useState('')
    const [sortConfig, setSortConfig] = useState({ key: 'sentDate', direction: 'desc' })
    const [quickFilterText, setQuickFilterText] = useState('')

    const loadOutbox = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            // 1. Fetch all scheduled sends
            const sends = await authFetch('/scheduledsends')

            // 2. Shape into outbox rows (subject is already on send object)
            const outboxRows = sends.map(send => toOutboxRow(send, null))

            setRows(outboxRows)
        } catch (err) {
            console.error('Failed to load outbox:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadOutbox() }, [loadOutbox])

    const sortedFilteredRows = sortRows(
        filterRows(rows, selectedColumn, filterValue, quickFilterText),
        sortConfig
    )

    const handleSortChange = (key) => {
        setSortConfig((prev) => {
            if (prev.key === key) {
                return {
                    key,
                    direction: prev.direction === 'asc' ? 'desc' : 'asc',
                }
            }
            return { key, direction: 'asc' }
        })
    }

    const sortIndicator = (key) => {
        if (sortConfig.key !== key) return ''
        return sortConfig.direction === 'asc' ? ' ▲' : ' ▼'
    }

    return (
        <DashboardCard title="Outbox">
            <div className="w-full p-2">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <input
                            type="text"
                            placeholder="Quick search..."
                            value={quickFilterText}
                            onChange={(e) => setQuickFilterText(e.target.value)}
                            className="rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                        />
                        <label htmlFor="outbox-filter-column" className="text-sm font-medium text-slate-700">Filter by</label>
                        <select
                            id="outbox-filter-column"
                            value={selectedColumn}
                            onChange={(e) => setSelectedColumn(e.target.value)}
                            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                        >
                            <option value="recipients">Recipients</option>
                            <option value="subject">Subject</option>
                            <option value="status">Status</option>
                            <option value="sentDate">Sent Date</option>

                        </select>
                        <input
                            type="text"
                            placeholder="Filter value..."
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            className="rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600">
                            Sort by: <span className="font-semibold">{sortConfig.key}</span> ({sortConfig.direction})
                        </span>
                        <button
                            type="button"
                            onClick={loadOutbox}
                            disabled={loading}
                            className="rounded border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50"
                        >
                            {loading ? 'Loading…' : '↻ Refresh'}
                        </button>
                    </div>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="mb-3 rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
                        Failed to load outbox: {error}
                    </div>
                )}

                {/* Table */}
                <div className="w-full overflow-x-auto">
                    <table className="min-w-full border-collapse text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-300 text-slate-700">
                                {[
                                    { key: 'recipients', label: 'Recipients' },
                                    { key: 'subject', label: 'Subject' },
                                    { key: 'status', label: 'Status' },
                                    { key: 'sentDate', label: 'Sent Date' },
                                ].map(col => (
                                    <th
                                        key={col.key}
                                        className="cursor-pointer px-4 py-3"
                                        onClick={() => handleSortChange(col.key)}
                                    >
                                        {col.label}{sortIndicator(col.key)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan="4" className="px-4 py-6 text-center text-sm text-slate-500">
                                        Loading outbox…
                                    </td>
                                </tr>
                            )}
                            {!loading && sortedFilteredRows.map(row => (
                                <tr key={row.id} className="border-b border-slate-200">
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex flex-wrap gap-2">
                                            {row.recipients.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-800"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top text-slate-900">{row.subject}</td>
                                    <td className="px-4 py-3 align-top">
                                        <span className={statusBadge(row.status)}>{row.status}</span>
                                    </td>
                                    <td className="px-4 py-3 align-top text-slate-900">{row.sentDate}</td>
                                </tr>
                            ))}
                            {!loading && sortedFilteredRows.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-4 py-6 text-center text-sm text-slate-500">
                                        No matching outbox entries.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardCard>
    )
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
    return (
        <div className="flex flex-col items-center py-6">
            <SummaryStats />
            <Outbox />
        </div>
    )
}