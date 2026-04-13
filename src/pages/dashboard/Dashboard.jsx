import { useState, useEffect } from 'react'
import { getAuth } from 'firebase/auth';
import { Calendar } from '@/components/ui/calendar';

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

function SummaryStats() {
    const [pending, setPending] = useState(0);
    const [read, setRead] = useState(0);
    const [unread, setUnread] = useState(0);
    const [date, setDate] = useState(new Date());

    useEffect(() => {
        const fetchPending = async () => {
            try {
                const auth = getAuth();

                if (!auth.currentUser) {
                    return;
                }
                const token = await auth.currentUser.getIdToken();
                
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/scheduledsends/pending`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch pending sends');
                }

                const data = await response.json();
                setPending(data.length);
            } catch (error) {
                console.error('Error fetching pending sends:', error);
            }
        };

        fetchPending();

        // TODO: hardcoded data for read/unread
        // fix after endpoints r done
        setRead(42);
        setUnread(15);
    }, []);

    return (
        <DashboardCard title="Summary and Statistics">
            <div className="flex items-center gap-[101px] m-4">

                {/* Summary Box */}
                <div className="w-[575px] h-[244px] rounded-[5px] border border-black bg-[#F3793E] shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] p-4 text-white">
                    <h3 className="text-xl font-bold mt-6 mb-4 ml-4">Summary</h3>
                    <div className="ml-4 space-y-1">
                        <h3 className="text-xl font-bold">Unread: {Math.round(unread / (unread + read) * 100)}% ({unread} of {unread + read})</h3>
                        <h3 className="text-xl font-bold">Read: {Math.round(read / (unread + read) * 100)}% ({read} of {unread + read})</h3>
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

const outboxRows = [ // Hardcoded data for outbox entries for now
    {
        id: 1,
        recipients: ['District 30', 'Parents'],
        subject: 'Spring fundraiser update',
        status: 'Scheduled',
        sentDate: '2026-04-15',
        receivedDate: 'N/A',
    },
    {
        id: 2,
        recipients: ['Staff', 'Volunteers'],
        subject: 'Weekly volunteer briefing',
        status: 'Sent',
        sentDate: '2026-04-10',
        receivedDate: '2026-04-10',
    },
    {
        id: 3,
        recipients: ['District 30'],
        subject: 'Event reminder: community meeting',
        status: 'Unread',
        sentDate: '2026-04-12',
        receivedDate: '2026-04-12',
    },
    {
        id: 4,
        recipients: ['Parents'],
        subject: 'Monthly newsletter',
        status: 'Read',
        sentDate: '2026-04-08',
        receivedDate: '2026-04-08',
    },
]

function statusBadge(status) {
    const base = 'rounded-full px-3 py-1 text-xs font-semibold'
    switch (status) {
        case 'Scheduled':
            return `${base} bg-yellow-200 text-yellow-900`
        case 'Sent':
            return `${base} bg-blue-200 text-blue-900`
        case 'Unread':
            return `${base} bg-orange-200 text-orange-900`
        case 'Read':
            return `${base} bg-green-200 text-green-900`
        default:
            return `${base} bg-slate-200 text-slate-900`
    }
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

    return rows.filter((row) => {
        const cellValue = normalizeRowValue(row, selectedColumn).toLowerCase()
        const matchesColumnFilter = !filteredValue || cellValue.includes(filteredValue)
        const matchesQuickFilter = !quickFilter ||
            normalizeRowValue(row, 'recipients').toLowerCase().includes(quickFilter) ||
            normalizeRowValue(row, 'subject').toLowerCase().includes(quickFilter) ||
            normalizeRowValue(row, 'status').toLowerCase().includes(quickFilter) ||
            normalizeRowValue(row, 'sentDate').toLowerCase().includes(quickFilter) ||
            normalizeRowValue(row, 'receivedDate').toLowerCase().includes(quickFilter)

        return matchesColumnFilter && matchesQuickFilter
    })
}

function Outbox() {
    const [selectedColumn, setSelectedColumn] = useState('recipients')
    const [filterValue, setFilterValue] = useState('')
    const [sortConfig, setSortConfig] = useState({ key: 'sentDate', direction: 'desc' })
    const [quickFilterText, setQuickFilterText] = useState('')

    const sortedFilteredRows = sortRows(
        filterRows(outboxRows, selectedColumn, filterValue, quickFilterText),
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
                            <option value="receivedDate">Received Date</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Filter value..."
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            className="rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                        />
                    </div>
                    <div className="text-sm text-slate-600">
                        Sort by: <span className="font-semibold">{sortConfig.key}</span> ({sortConfig.direction})
                    </div>
                </div>
                <div className="w-full overflow-x-auto">
                    <table className="min-w-full border-collapse text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-300 text-slate-700">
                                <th
                                    className="cursor-pointer px-4 py-3"
                                    onClick={() => handleSortChange('recipients')}
                                >
                                    Recipients{sortIndicator('recipients')}
                                </th>
                                <th
                                    className="cursor-pointer px-4 py-3"
                                    onClick={() => handleSortChange('subject')}
                                >
                                    Subject{sortIndicator('subject')}
                                </th>
                                <th
                                    className="cursor-pointer px-4 py-3"
                                    onClick={() => handleSortChange('status')}
                                >
                                    Status{sortIndicator('status')}
                                </th>
                                <th
                                    className="cursor-pointer px-4 py-3"
                                    onClick={() => handleSortChange('sentDate')}
                                >
                                    Sent Date{sortIndicator('sentDate')}
                                </th>
                                <th
                                    className="cursor-pointer px-4 py-3"
                                    onClick={() => handleSortChange('receivedDate')}
                                >
                                    Received Date{sortIndicator('receivedDate')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedFilteredRows.map((row) => (
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
                                    <td className="px-4 py-3 align-top text-slate-900">{row.receivedDate}</td>
                                </tr>
                            ))}
                            {sortedFilteredRows.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-4 py-6 text-center text-sm text-slate-500">
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

export default function Dashboard() {
    return (
        <div className="flex flex-col items-center py-6">
            <SummaryStats />
            <Outbox />
        </div>
    )
}