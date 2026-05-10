import { useEffect, useState } from 'react';
import {
    type TeamMember, type ClientLead, type WorkAssignment,
    fetchTeamMembers, createTeamMember,
    fetchPipeline, fetchWorkAssignments, createWorkAssignment
} from '../services/api';

export default function ResourceCalendar() {
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [clients, setClients] = useState<ClientLead[]>([]);
    const [assignments, setAssignments] = useState<WorkAssignment[]>([]);

    // Forms
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('Shooter');

    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD

    useEffect(() => {
        // Load everything we need for the calendar
        fetchTeamMembers().then(setTeam).catch(console.error);
        fetchPipeline().then(leads => setClients(leads.filter(l => l.client))).catch(console.error); // Only active clients
        fetchWorkAssignments().then(setAssignments).catch(console.error);
    }, []);

    const handleAddMember = async () => {
        if (!newMemberName) return;
        const saved = await createTeamMember({ name: newMemberName, role: newMemberRole });
        setTeam([...team, saved]);
        setNewMemberName('');
    };

    const handleAssignWork = async () => {
        if (!selectedMemberId || !selectedClientId || !selectedDate) return alert("Please fill all fields!");
        try {
            const saved = await createWorkAssignment({ workDate: selectedDate }, selectedMemberId, selectedClientId);
            setAssignments([...assignments, saved]);
            // Reset form, but keep the date for rapid entry
            setSelectedMemberId('');
            setSelectedClientId('');
        } catch (error) { console.error(error); }
    };

    // Group assignments by date for the view
    const assignmentsByDate = assignments.reduce((acc, curr) => {
        if (!acc[curr.workDate]) acc[curr.workDate] = [];
        acc[curr.workDate].push(curr);
        return acc;
    }, {} as Record<string, WorkAssignment[]>);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Resource Calendar</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* ADD TEAM MEMBER PANEL */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-xl font-bold mb-4">Add Team Member</h3>
                    <div className="flex gap-2 mb-4">
                        <input className="border p-2 rounded flex-grow" placeholder="Name (e.g. Nipesh)" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} />
                        <select className="border p-2 rounded bg-gray-50" value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)}>
                            <option>Shooter</option>
                            <option>Editor</option>
                            <option>Developer</option>
                        </select>
                    </div>
                    <button onClick={handleAddMember} className="w-full bg-gray-800 text-white font-bold py-2 rounded hover:bg-gray-900 cursor-pointer">Save Member</button>

                    <h4 className="font-bold mt-6 mb-2 text-gray-500 text-sm uppercase">Current Team</h4>
                    <div className="flex flex-wrap gap-2">
                        {team.map(t => (
                            <span key={t.id} className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full text-sm font-bold">
                                {t.name} <span className="text-xs font-normal opacity-70">({t.role})</span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* ASSIGNMENT PANEL */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
                    <h3 className="text-xl font-bold mb-4">Assign Work</h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                            <input type="date" className="border p-2 rounded w-full cursor-pointer" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Team Member</label>
                            <select className="border p-2 rounded w-full cursor-pointer bg-blue-50" value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)}>
                                <option value="">Select Member...</option>
                                {team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Client</label>
                            <select className="border p-2 rounded w-full cursor-pointer bg-green-50" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                                <option value="">Select Client...</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.clientIdCode ? `[${c.clientIdCode}] ` : ''}{c.company} (Effort: {c.effortType || 1.0})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button onClick={handleAssignWork} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 cursor-pointer shadow-sm">
                        + Assign to Calendar
                    </button>
                    <p className="text-xs text-gray-400 mt-2 text-center">Payroll calculation ($50 full / $25 half) happens automatically based on the client's effort type!</p>
                </div>
            </div>

            {/* UPCOMING ASSIGNMENTS LIST */}
            <h3 className="text-2xl font-bold mb-4">Recent & Upcoming Assignments</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {Object.keys(assignmentsByDate).sort().reverse().map(date => (
                    <div key={date} className="border-b last:border-0">
                        <div className="bg-gray-50 px-6 py-2 font-bold text-gray-700 border-b">{new Date(date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {assignmentsByDate[date].map(a => (
                                <div key={a.id} className="bg-white border border-gray-100 shadow-sm p-4 rounded-lg flex flex-col relative">
                                    <span className="absolute top-4 right-4 bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded text-xs">
                                        Pay: ${a.calculatedCost?.toFixed(2)}
                                    </span>
                                    <span className="font-bold text-lg text-indigo-700">{a.teamMember?.name}</span>
                                    <span className="text-sm text-gray-500 mb-2">{a.teamMember?.role}</span>
                                    <div className="mt-auto pt-2 border-t border-gray-100">
                                        <span className="text-sm font-bold text-gray-800">Client: </span>
                                        <span className="text-sm text-gray-600">
                                            {a.client?.clientIdCode && <span className="font-mono text-xs bg-gray-100 px-1 mr-1 rounded">{a.client.clientIdCode}</span>}
                                            {a.client?.company}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {Object.keys(assignmentsByDate).length === 0 && (
                    <div className="p-8 text-center text-gray-500 italic">No assignments scheduled yet.</div>
                )}
            </div>
        </div>
    );
}