import React, { useState, useEffect } from 'react';
import {
    fetchPipeline,
    fetchAllProjects,
    fetchProjectTasks,
    fetchAllTasks,
    createProject,
    updateProject,
    cancelProject,
    type ClientLead,
    type Project,
    type Task
} from '../services/api';

export const ProjectManagement: React.FC = () => {
    // --- Data State ---
    const [clients, setClients] = useState<ClientLead[]>([]);
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [projectTasksMap, setProjectTasksMap] = useState<Record<number, Task[]>>({});
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingProjectId, setEditingProjectId] = useState<number | null>(null);

    // --- Filter & Sort State (Projects) ---
    const [clientFilter, setClientFilter] = useState<number | ''>('');
    const [statusFilters, setStatusFilters] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<{ field: 'week' | 'deadline', order: 'asc' | 'desc' }>({ field: 'deadline', order: 'asc' });
    const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());

    // --- Filter & Sort State (Tasks) ---
    const [taskTypeFilter, setTaskTypeFilter] = useState<string>('ALL');
    const [taskStatusFilter, setTaskStatusFilter] = useState<string>('PENDING');
    const [taskSortOrder, setTaskSortOrder] = useState<'asc' | 'desc'>('asc');

    // --- Modal Form State ---
    const [modalClientId, setModalClientId] = useState<number | ''>('');
    const [weekCode, setWeekCode] = useState('wk01');
    const [numVideos, setNumVideos] = useState(1);
    const [deadline, setDeadline] = useState('');

    async function loadAllProjects() {
        const data = await fetchAllProjects();
        setAllProjects(data);

        const tasksMap: Record<number, Task[]> = {};
        for (const p of data) {
            if (p.id) {
                tasksMap[p.id] = await fetchProjectTasks(p.id);
            }
        }
        setProjectTasksMap(tasksMap);
    }

    async function loadAllTasks() {
        const data = await fetchAllTasks();
        setAllTasks(data);
    }

    useEffect(() => {
        fetchPipeline().then(data => setClients(data.filter((c: ClientLead) => c.clientCode)));
        fetchAllProjects().then(async data => {
            setAllProjects(data);

            const tasksMap: Record<number, Task[]> = {};
            for (const p of data) {
                if (p.id) {
                    tasksMap[p.id] = await fetchProjectTasks(p.id);
                }
            }
            setProjectTasksMap(tasksMap);
        });
        fetchAllTasks().then(setAllTasks);
    }, []);

    // Helper to calculate deadline 6 days from today
    const getDefaultDeadline = () => {
        const d = new Date();
        d.setDate(d.getDate() + 6);
        const offset = d.getTimezoneOffset();
        return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
    };

    // --- SMART WEEK CALCULATOR ---
    const clientProjects = allProjects.filter(p => p.client && p.client.id === modalClientId);
    const lastWeekCode = clientProjects.length > 0
        ? clientProjects.map(p => p.weekCode).sort().reverse()[0]
        : null;

    const getNextWeekCode = (clientId: number | '') => {
        if (!clientId) return 'wk01';

        const projects = allProjects.filter(p => p.client && p.client.id === clientId && p.id !== editingProjectId);
        const latestWeekCode = projects.length > 0
            ? projects.map(p => p.weekCode).sort().reverse()[0]
            : null;

        if (!latestWeekCode) return 'wk01';

        const currentWeekNum = parseInt(latestWeekCode.replace('wk', ''), 10);
        if (isNaN(currentWeekNum) || currentWeekNum >= 52) return 'wk01';

        return `wk${(currentWeekNum + 1).toString().padStart(2, '0')}`;
    };

    const isWeekTakenForClient = (candidateWeekCode: string, clientId: number | '') => {
        if (!clientId) return false;

        return allProjects.some(p =>
            p.client?.id === clientId &&
            p.weekCode === candidateWeekCode &&
            p.id !== editingProjectId
        );
    };

    const getFirstAvailableWeekCode = (clientId: number | '') => {
        for (let i = 1; i <= 52; i++) {
            const candidateWeekCode = `wk${i.toString().padStart(2, '0')}`;
            if (!isWeekTakenForClient(candidateWeekCode, clientId)) {
                return candidateWeekCode;
            }
        }
        return 'wk01';
    };

    const handleModalClientChange = (clientId: number | '') => {
        setModalClientId(clientId);
        if (!editingProjectId && !isWeekTakenForClient(getNextWeekCode(clientId), clientId)) {
            setWeekCode(getNextWeekCode(clientId));
        } else if (isWeekTakenForClient(weekCode, clientId)) {
            setWeekCode(getFirstAvailableWeekCode(clientId));
        }
    };

    const resetProjectModal = () => {
        setShowModal(false);
        setEditingProjectId(null);
        setModalClientId('');
        setWeekCode('wk01');
        setNumVideos(1);
        setDeadline('');
    };

    const openCreateModal = () => {
        setEditingProjectId(null);
        setModalClientId('');
        setWeekCode(getFirstAvailableWeekCode(''));
        setNumVideos(1);
        setDeadline(getDefaultDeadline()); // Set auto deadline here
        setShowModal(true);
    };

    const openEditModal = (project: Project) => {
        setEditingProjectId(project.id || null);
        setModalClientId(project.client?.id || '');
        setWeekCode(project.weekCode);
        setNumVideos(project.numberOfVideos);
        setDeadline(project.projectDeadline || getDefaultDeadline());
        setShowModal(true);
    };

    const handleSaveProject = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isWeekTakenForClient(weekCode, modalClientId)) {
            alert('This client already has a project for that week. Please choose another week.');
            return;
        }

        const payload = {
            clientId: modalClientId,
            weekCode,
            numberOfVideos: numVideos,
            deadline
        };

        try {
            if (editingProjectId) {
                await updateProject(editingProjectId, payload);
            } else {
                await createProject(payload);
            }

            resetProjectModal();
            loadAllProjects();
            loadAllTasks();
        } catch (error) {
            console.error('Failed to save project', error);
            const message = error instanceof Error ? error.message : '';
            alert(message || 'Could not save this project. Please make sure the backend is restarted and try again.');
        }
    };

    const handleCancel = async (id: number) => {
        if (window.confirm('Cancel this project?')) {
            await cancelProject(id);
            loadAllProjects();
        }
    };

    const toggleExpand = async (projectId: number) => {
        const newExpanded = new Set(expandedProjects);
        if (newExpanded.has(projectId)) {
            newExpanded.delete(projectId);
        } else {
            newExpanded.add(projectId);
            if (!projectTasksMap[projectId]) {
                const tasks = await fetchProjectTasks(projectId);
                setProjectTasksMap(prev => ({ ...prev, [projectId]: tasks }));
            }
        }
        setExpandedProjects(newExpanded);
    };

    const handleSort = (field: 'week' | 'deadline') => {
        setSortConfig({
            field,
            order: sortConfig.field === field && sortConfig.order === 'asc' ? 'desc' : 'asc'
        });
    };

    const toggleStatusFilter = (status: string) => {
        if (statusFilters.includes(status)) {
            setStatusFilters(statusFilters.filter(s => s !== status));
        } else {
            setStatusFilters([...statusFilters, status]);
        }
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            'PENDING': 'bg-gray-100 text-gray-800',
            'UNASSIGNED': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
            'INITIATED': 'bg-blue-100 text-blue-800',
            'COMPLETED': 'bg-green-100 text-green-800',
            'CANCELLED': 'bg-red-100 text-red-800',
        };
        return <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${colors[status] || colors['PENDING']}`}>{status}</span>;
    };

    const getDerivedEditStatus = (p: Project) => {
        if (!p.id || !projectTasksMap[p.id]) return p.overallEditStatus;

        const tasks = projectTasksMap[p.id];
        let completedVideos = 0;

        for (let i = 1; i <= p.numberOfVideos; i++) {
            const editTask = tasks.find(t => t.taskType === 'EDIT' && t.videoNumber === i);
            if (editTask && editTask.completed) {
                completedVideos++;
            }
        }

        if (p.numberOfVideos > 0 && completedVideos === p.numberOfVideos) {
            return 'COMPLETED';
        }
        if (completedVideos > 0) {
            return 'INITIATED';
        }

        return p.overallEditStatus;
    };

    const getDerivedProjectStatus = (p: Project) => {
        if (p.overallProjectStatus === 'CANCELLED' || p.overallProjectStatus === 'COMPLETED') {
            return p.overallProjectStatus;
        }

        const smartEditStatus = getDerivedEditStatus(p);

        if (p.scriptStatus === 'COMPLETED' && p.shootStatus === 'COMPLETED' && smartEditStatus === 'COMPLETED') {
            return 'COMPLETED';
        }

        const subStatuses = [p.scriptStatus, p.shootStatus, smartEditStatus];
        const hasStartedWork = subStatuses.some(s => s === 'INITIATED' || s === 'IN PROGRESS' || s === 'COMPLETED');

        if (p.overallProjectStatus === 'PENDING' && hasStartedWork) {
            return 'INITIATED';
        }

        return p.overallProjectStatus;
    };

    const filteredAndSortedProjects = allProjects
        .filter(p => {
            const matchesClient = clientFilter === '' || Number(p.client?.id) === Number(clientFilter);
            const derivedStatus = getDerivedProjectStatus(p);
            const matchesStatus = statusFilters.length === 0 || statusFilters.includes(derivedStatus);
            return matchesClient && matchesStatus;
        })
        .sort((a, b) => {
            let valA, valB;
            if (sortConfig.field === 'week') {
                valA = parseInt(a.weekCode.replace('wk', ''), 10);
                valB = parseInt(b.weekCode.replace('wk', ''), 10);
            } else {
                valA = new Date(a.projectDeadline || '2099-12-31').getTime();
                valB = new Date(b.projectDeadline || '2099-12-31').getTime();
            }
            return sortConfig.order === 'asc' ? valA - valB : valB - valA;
        });

    const filteredAndSortedTasks = allTasks
        .filter(t => {
            const matchesType = taskTypeFilter === 'ALL' || t.taskType === taskTypeFilter;
            const matchesStatus = taskStatusFilter === 'ALL' ||
                (taskStatusFilter === 'COMPLETED' && t.completed) ||
                (taskStatusFilter === 'PENDING' && !t.completed);
            return matchesType && matchesStatus;
        })
        .sort((a, b) => {
            const valA = new Date(a.taskDate || '2099-12-31').getTime();
            const valB = new Date(b.taskDate || '2099-12-31').getTime();
            return taskSortOrder === 'asc' ? valA - valB : valB - valA;
        });

    const activeClientCode = clients.find(c => c.id === modalClientId)?.clientCode || '___';
    const projectCodePreview = modalClientId ? `PSM${activeClientCode}${weekCode}` : '';

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col gap-8">
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Project Management</h2>
                    <button onClick={openCreateModal} className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 font-medium transition">
                        + Add Weekly Project
                    </button>
                </div>

                <div className="flex flex-wrap gap-6 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 items-center">
                    <div className="w-[250px]">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Client Filter</label>
                        <select
                            className="w-full border-gray-200 border p-2.5 rounded-lg text-sm outline-none focus:border-blue-400 transition"
                            value={clientFilter}
                            onChange={e => setClientFilter(e.target.value === '' ? '' : Number(e.target.value))}
                        >
                            <option value="">All Clients</option>
                            {clients.map((c: ClientLead) => <option key={c.id} value={c.id}>{c.name} ({c.clientCode})</option>)}
                        </select>
                    </div>

                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Status Filter (Multi-select)</label>
                        <div className="flex flex-wrap items-center gap-2">
                            {['PENDING', 'INITIATED', 'COMPLETED', 'CANCELLED'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => toggleStatusFilter(status)}
                                    className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border transition ${statusFilters.includes(status) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                            <tr className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                                <th className="w-12 py-4"></th>
                                <th className="px-6 py-4 text-left">Project Code</th>
                                <th className="px-6 py-4 text-left">Client Name</th>
                                <th className="px-6 py-4 text-left w-24 cursor-pointer hover:text-blue-600" onClick={() => handleSort('week')}>Week {sortConfig.field === 'week' ? (sortConfig.order === 'asc' ? '↑' : '↓') : ''}</th>
                                <th className="px-6 py-4 text-left w-32">Script</th>
                                <th className="px-6 py-4 text-left w-32">Shoot</th>
                                <th className="px-6 py-4 text-left w-40">Edit Status</th>
                                <th className="px-6 py-4 text-left w-40">Overall</th>
                                <th className="px-6 py-4 text-left w-40 cursor-pointer hover:text-blue-600" onClick={() => handleSort('deadline')}>Deadline {sortConfig.field === 'deadline' ? (sortConfig.order === 'asc' ? '↑' : '↓') : ''}</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                            {filteredAndSortedProjects.length === 0 ? (
                                <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">No projects match your criteria.</td></tr>
                            ) : (
                                filteredAndSortedProjects.map((p: Project) => {
                                    const isExpanded = expandedProjects.has(p.id!);
                                    return (
                                        <React.Fragment key={p.id}>
                                            <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-blue-50/20' : ''}`}>
                                                <td className="text-center cursor-pointer text-gray-400" onClick={() => toggleExpand(p.id!)}>
                                                    {isExpanded ? '▼' : '▶'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-bold text-gray-900">{p.projectCode}</div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <button onClick={() => openEditModal(p)} className="text-blue-500 hover:underline text-[9px] font-bold uppercase">Edit</button>
                                                        {p.overallProjectStatus !== 'CANCELLED' && (
                                                            <button onClick={() => handleCancel(p.id!)} className="text-red-500 hover:underline text-[9px] font-bold uppercase">Cancel</button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                                                    {p.client?.name || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 font-medium">{p.weekCode.replace('wk','')}</td>
                                                <td className="px-6 py-4">{getStatusBadge(p.scriptStatus)}</td>
                                                <td className="px-6 py-4">{getStatusBadge(p.shootStatus)}</td>
                                                <td className="px-6 py-4">{getStatusBadge(getDerivedEditStatus(p))}</td>
                                                <td className="px-6 py-4">{getStatusBadge(getDerivedProjectStatus(p))}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-gray-700">{p.projectDeadline || '-'}</td>
                                            </tr>

                                            {isExpanded && Array.from({ length: p.numberOfVideos }).map((_, i) => {
                                                const videoNum = i + 1;
                                                const editTask = projectTasksMap[p.id!]?.find(t => t.taskType === 'EDIT' && t.videoNumber === videoNum);
                                                const vidStatus = editTask ? (editTask.completed ? 'COMPLETED' : 'INITIATED') : 'UNASSIGNED';

                                                return (
                                                    <tr key={videoNum} className="bg-gray-50/50 border-l-2 border-l-blue-400">
                                                        <td className="py-2"></td>
                                                        <td colSpan={4} className="px-6 py-2"></td>
                                                        <td className="px-6 py-2 text-[11px] text-gray-400 font-bold uppercase">Video {videoNum}</td>
                                                        <td className="px-6 py-2">{getStatusBadge(vidStatus)}</td>
                                                        <td className="px-6 py-2 text-[11px] font-medium text-gray-600">{editTask?.assignee || '-'}</td>
                                                        <td className="px-6 py-2 text-[11px] font-bold text-gray-800">{editTask?.taskDate || '-'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Individual Tasks List... */}
            <div className="mt-4">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Individual Tasks</h3>
                        <p className="text-xs text-gray-500 mt-1">Global view of all underlying operations.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <select className="border-gray-200 border p-2 rounded-lg text-xs font-bold outline-none focus:border-blue-400 text-gray-600 bg-white" value={taskTypeFilter} onChange={e => setTaskTypeFilter(e.target.value)}>
                            <option value="ALL">All Types</option>
                            <option value="SCRIPT">Script</option>
                            <option value="SHOOT">Shoot</option>
                            <option value="EDIT">Edit</option>
                        </select>
                        <select className="border-gray-200 border p-2 rounded-lg text-xs font-bold outline-none focus:border-blue-400 text-gray-600 bg-white" value={taskStatusFilter} onChange={e => setTaskStatusFilter(e.target.value)}>
                            <option value="ALL">All Statuses</option>
                            <option value="PENDING">Pending (To-Do)</option>
                            <option value="COMPLETED">Completed</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                            <tr className="text-gray-500 text-[10px] uppercase font-bold tracking-widest text-left">
                                <th className="px-6 py-4 cursor-pointer hover:text-blue-600" onClick={() => setTaskSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
                                    Deadline Date {taskSortOrder === 'asc' ? '↑' : '↓'}
                                </th>
                                <th className="px-6 py-4">Task Type</th>
                                <th className="px-6 py-4">Project Code</th>
                                <th className="px-6 py-4">Assignee</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                            {filteredAndSortedTasks.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">No tasks found for these filters.</td></tr>
                            ) : (
                                filteredAndSortedTasks.map((t) => {
                                    const proj = allProjects.find(p => p.id === t.project?.id || p.projectCode === t.project?.projectCode);
                                    const clientName = proj?.client?.name || 'Unknown Client';

                                    return (
                                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                            <td className={`px-6 py-4 text-sm font-bold whitespace-nowrap ${new Date(t.taskDate) < new Date() && !t.completed ? 'text-red-600' : 'text-gray-800'}`}>
                                                {t.taskDate}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-bold text-sm text-gray-900">{t.taskType}</span>
                                                {t.videoNumber && <span className="text-[10px] text-gray-500 font-bold ml-1">(Video {t.videoNumber})</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-blue-600">{t.project?.projectCode || '-'}</div>
                                                <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{clientName}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-[8px] font-black text-gray-600">
                                                        {t.assignee?.substring(0,2).toUpperCase() || '?'}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700">{t.assignee || 'Unassigned'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {t.completed ? (
                                                    <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Completed</span>
                                                ) : (
                                                    <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Pending</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* NEW / EDIT PROJECT MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-2xl w-[450px] shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">{editingProjectId ? 'Edit Weekly Project' : 'New Weekly Project'}</h3>
                        <div className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded-xl text-center">
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-1">Preview Project Code</span>
                            <span className="text-2xl font-mono font-black text-gray-900">{projectCodePreview || 'PSM___wk__'}</span>
                        </div>
                        <form onSubmit={handleSaveProject} className="space-y-4">
                            <select required className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400" value={modalClientId} onChange={e => handleModalClientChange(e.target.value === '' ? '' : Number(e.target.value))}>
                                <option value="">Select Client</option>
                                {/* Filter to hide inactive clients only in the dropdown */}
                                {clients
                                    .filter((c: ClientLead) => c.pipelineStage !== 'INACTIVE')
                                    .map((c: ClientLead) => <option key={c.id} value={c.id}>{c.name}</option>)
                                }
                            </select>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">
                                        Week {modalClientId && lastWeekCode && <span className="text-blue-500">(Last: {lastWeekCode.replace('wk','')})</span>}
                                    </label>
                                    <select className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400" value={weekCode} onChange={e => setWeekCode(e.target.value)}>
                                        {[...Array(52)].map((_, i) => {
                                            const candidateWeekCode = `wk${(i+1).toString().padStart(2, '0')}`;
                                            const isTaken = isWeekTakenForClient(candidateWeekCode, modalClientId);

                                            return (
                                                <option key={i} value={candidateWeekCode} disabled={isTaken}>
                                                    Week {i+1}{isTaken ? ' - Already Exists' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Total</label>
                                    <select className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400" value={numVideos} onChange={e => setNumVideos(Number(e.target.value))}>
                                        {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} Videos</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Deadline</label>
                                <input type="date" required className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400" value={deadline} onChange={e => setDeadline(e.target.value)} />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={resetProjectModal} className="flex-1 bg-gray-100 p-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200">Cancel</button>
                                <button type="submit" disabled={!modalClientId || isWeekTakenForClient(weekCode, modalClientId)} className="flex-1 bg-blue-600 p-3 rounded-xl font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50">
                                    {editingProjectId ? 'Save Changes' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};