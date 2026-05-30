import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getAuth } from 'firebase/auth';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

import { Calendar } from '@/components/ui/calendar';
import { Trash2 as TrashIcon } from 'lucide-react';
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

function CalendarPopover({ popover, position, onSave, onDelete, onClose }) {
    const [title, setTitle] = useState(popover.title);

    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    return createPortal(
        <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onClose} />
            <div
                className="bg-white border border-slate-300 rounded-lg shadow-xl p-3 flex flex-col gap-2 min-w-[200px]"
                style={{ position: 'fixed', zIndex: 50, top: position.y, left: position.x }}
                onClick={e => e.stopPropagation()}
            >
                <p className="text-xs text-slate-500 font-medium">{popover.date}</p>
                <input
                    autoFocus
                    className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Event title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') onSave(title); }}
                />
                <div className="flex gap-2">
                    <button
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded px-2 py-1"
                        onClick={() => onSave(title)}
                    >
                        Save
                    </button>
                    {onDelete && (
                        <button
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded px-2 py-1"
                            onClick={onDelete}
                        >
                            Delete
                        </button>
                    )}
                    <button
                        className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded px-2 py-1"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </>,
        document.body
    );
}

function SummaryStats() {
    const [pending, setPending] = useState(0);
    const [sent, setSent] = useState(0);
    const [scheduledEvents, setScheduledEvents] = useState([]);
    const [manualEvents, setManualEvents] = useState([]);
    const [popover, setPopover] = useState(null);
    const popoverPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        authFetch('/scheduledsends/pending')
            .then(data => setPending(data.length))
            .catch(err => console.error('Error fetching pending sends:', err));

        authFetch('/scheduledsends')
            .then(data => {
                setSent(data.filter(s => s.sent).length);
                setScheduledEvents(data.map(s => ({
                    id: s.mailobjectid,
                    title: s.subject,
                    date: s.sendate,
                    color: s.sent ? '#4ade80' : '#60a5fa',
                    editable: false,
                })));
            })
            .catch(err => console.error('Error fetching sends:', err));
    }, []);

    const handleDateClick = (info) => {
        popoverPos.current = { x: info.jsEvent.clientX + 8, y: info.jsEvent.clientY + 8 };
        setPopover({ mode: 'new', date: info.dateStr, title: '' });
    };

    const handleEventClick = (info) => {
        if (!info.event.id.startsWith('manual-')) return;
        popoverPos.current = { x: info.jsEvent.clientX + 8, y: info.jsEvent.clientY + 8 };
        setPopover({ mode: 'edit', date: info.event.startStr, eventId: info.event.id, title: info.event.title });
    };

    const handleSave = (title) => {
        if (!title.trim()) return;
        if (popover.mode === 'new') {
            setManualEvents(prev => [...prev, { id: `manual-${Date.now()}`, title: title.trim(), date: popover.date, color: '#f97316' }]);
        } else {
            setManualEvents(prev => prev.map(e => e.id === popover.eventId ? { ...e, title: title.trim() } : e));
        }
        setPopover(null);
    };

    const handleDelete = () => {
        setManualEvents(prev => prev.filter(e => e.id !== popover.eventId));
        setPopover(null);
    };

    return (
        <DashboardCard title="Summary and Statistics">
            <div className="flex flex-row items-stretch gap-4 w-full p-2">

                {/* Summary Box */}
                <div className="flex flex-col gap-4 min-w-[180px] w-[180px]">
                    <div className="flex flex-col gap-5 rounded-[var(--border-radius-lg)] p-5 self-start w-full" style={{ background: '#D85A30' }}>
                        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: '#FAECE7' }}>Overview</p>
                        <div className="flex flex-col gap-3">
                            {[{ label: 'Sent', value: sent }, { label: 'Pending', value: pending }].map(({ label, value }) => (
                                <div key={label} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                    <p className="text-xs font-medium mb-1" style={{ color: '#F5C4B3' }}>{label}</p>
                                    <p className="text-4xl font-medium leading-none" style={{ color: '#FAECE7' }}>{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Calendar */}
                <div
                    className="flex-1 min-w-0 rounded-[var(--border-radius-lg)] border border-black bg-white overflow-hidden p-3"
                    onClick={e => e.stopPropagation()}
                >
                    <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-3">Scheduled sends</p>
                    <style>{`
                        .fc-daygrid-day { position: relative; }
                        .fc-daygrid-day:hover::after {
                            content: '+ add';
                            position: absolute;
                            bottom: 4px;
                            right: 6px;
                            font-size: 10px;
                            color: #9ca3af;
                            pointer-events: none;
                        }
                        .fc-event {
                            cursor: pointer;
                            overflow: hidden;
                            white-space: nowrap;
                            text-overflow: ellipsis;
                        }
                        .fc-event-title {
                            font-weight: 600 !important;
                            font-size: 12px !important;
                        }
                        ${popover ? `.fc-day[data-date="${popover.date}"] { background-color: rgba(45, 212, 191, 0.35) !important; }` : ''}
                    `}</style>
                    <FullCalendar
                        plugins={[dayGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        events={[...scheduledEvents, ...manualEvents]}
                        height="auto"
                        headerToolbar={{ left: 'prev,next', center: 'title', right: '' }}
                        dateClick={handleDateClick}
                        eventClick={handleEventClick}
                        eventDidMount={(info) => {
                            const el = info.el;
                            const originalBgColor = window.getComputedStyle(el).backgroundColor;
                            
                            el.style.overflow = 'hidden';
                            el.style.whiteSpace = 'nowrap';
                            el.style.textOverflow = 'ellipsis';
                            el.style.transition = 'width 0.2s ease, box-shadow 0.2s ease';
                            el.style.zIndex = '1';

                            el.addEventListener('mouseenter', () => {
                                el.style.overflow = 'visible';
                                el.style.whiteSpace = 'nowrap';
                                el.style.zIndex = '100';
                                el.style.width = 'max-content';
                                el.style.maxWidth = '400px';
                                el.style.padding = '4px 8px';
                                el.style.borderRadius = '4px';
                                el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                            });

                            el.addEventListener('mouseleave', () => {
                                el.style.overflow = 'hidden';
                                el.style.whiteSpace = 'nowrap';
                                el.style.zIndex = '1';
                                el.style.width = '';
                                el.style.maxWidth = '';
                                el.style.padding = '';
                                el.style.boxShadow = '';
                                el.style.backgroundColor = originalBgColor;
                            });
                        }}
                    />
                    <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100">
                        {[['#4ade80', 'Sent'], ['#60a5fa', 'Scheduled'], ['#f97316', 'Manual']].map(([color, label]) => (
                            <div key={label} className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                                <span className="text-xs text-slate-400">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {popover && (
                <CalendarPopover
                    popover={popover}
                    position={popoverPos.current}
                    onSave={handleSave}
                    onDelete={popover.mode === 'edit' ? handleDelete : null}
                    onClose={() => setPopover(null)}
                />
            )}
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
    };

    const handleDeleteScheduledSend = async (mailobjectid) => {
        if (!window.confirm('Are you sure you want to delete this scheduled send?')) {
            return;
        }

        try {
            await authFetch(`/scheduledsends/${mailobjectid}`, {
                method: 'DELETE',
            });

            // Remove the deleted item from the rows state
            setRows(prevRows => prevRows.filter(row => row.id !== mailobjectid));
        } catch (error) {
            console.error('Delete scheduled send error:', error);
            setError('Failed to delete scheduled send');
        }
    };

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
                                    <td className="px-4 py-3 align-top">
                                        <button
                                            onClick={() => handleDeleteScheduledSend(row.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--color-error-text)',
                                        }}
                                            title="Delete scheduled send"
                                        >
                                            <TrashIcon size={16} />
                                        </button>
                                    </td>
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