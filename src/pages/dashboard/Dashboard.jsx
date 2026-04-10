import { useState } from 'react'

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
        expanded ? 'min-h-[25rem]' : 'min-h-[9rem]',
    ].join(' ')

    return (
        <div className={cardClasses} onClick={() => setExpanded(!expanded)}>
            <h2 className="m-0 mb-3 text-2xl text-slate-900">
                {title}
            </h2>
            <div>
                {children}
            </div>
        </div>
    )
}

function SummaryStats() {
    return (
        <DashboardCard title="Summary and Statistics">
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