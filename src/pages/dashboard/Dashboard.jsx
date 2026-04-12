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
        <div className={cardClasses} onClick={() => setExpanded(!expanded)}>
            <div className="flex items-center justify-between">
                <h2 className={`m-0 text-2xl text-slate-900 ${expanded ? 'mb-3' : ''}`}>
                    {title}
                </h2>
                <span className="text-2xl text-slate-900 select-none pr-4">
                    {expanded ? '−' : '+'}
                </span>
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

function Outbox() {
    return (
        <DashboardCard title="Outbox">
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