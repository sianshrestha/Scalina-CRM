import React, { useState, useEffect } from 'react';
import {
    fetchPipeline,
    fetchAllProjects,
    fetchAllTasks,
    assignTask,
    markTaskAsDone,
    updateTaskDate,
    deleteTask,
    fetchTeamMembers,
    type ClientLead,
    type Project,
    type Task,
    type TeamMember,
    TaskType
} from '../services/api';

// Helper to get today's date in YYYY-MM-DD format based on local timezone
const getTodayString = () => {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
};

export const ResourceCalendar: React.FC = () => {
    const [clients, setClients] = useState<ClientLead[]>([]);
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [allTasks, setAllTasks] = useState<Task[]>([]);

    const [selectedClientId, setSelectedClientId] = useState<number | ''>('');
    const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
    const [taskType, setTaskType] = useState<TaskType | ''>('');
    const [assignee, setAssignee] = useState<string>('');
    const [videoNumber, setVideoNumber] = useState<number | ''>('');

    // Default to today's date instead of an empty string
    const [taskDate, setTaskDate] = useState<string>(getTodayString());

    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()));

    async function loadAllTasks() {
        const data = await fetchAllTasks();
        setAllTasks(data);
    }

    useEffect(() => {
        // Filter out inactive clients from the dropdown
        fetchPipeline().then(data => setClients(data.filter((c: ClientLead) => c.clientCode && c.pipelineStage !== 'INACTIVE')));
        fetchAllProjects().then(setAllProjects);
        fetchTeamMembers().then(setTeamMembers);
        fetchAllTasks().then(setAllTasks);
    }, []);

    // Filter out cancelled projects from the project selection dropdown
    const filteredProjects = selectedClientId
        ? allProjects.filter(p => p.client?.id === Number(selectedClientId) && p.overallProjectStatus !== 'CANCELLED')
        : [];

    const selectedProject = allProjects.find(p => p.id === Number(selectedProjectId));

    function getStartOfWeek(date: Date) {
        const d = new Date(date);
        const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    const getDaysInWeek = (startDate: Date) => {
        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            return d;
        });
    };

    const formatDateForInput = (date: Date) => {
        const offset = date.getTimezoneOffset();
        date = new Date(date.getTime() - (offset*60*1000));
        return date.toISOString().split('T')[0];
    };

    const isPastProjectDeadline = (dateStr: string, project?: Project) => {
        return Boolean(project?.projectDeadline && dateStr > project.projectDeadline);
    };

    const getTeamMemberFirstName = (member: TeamMember) => {
        return member.firstName || member.name?.split(' ')[0] || member.name;
    };

    const getTaskTypeStyles = (task: Task) => {
        if (task.completed) {
            return {
                card: 'bg-green-50 border-green-200 text-green-900 opacity-90',
                label: 'text-green-700',
                button: 'border-green-200 text-green-800'
            };
        }

        if (task.taskType === 'SHOOT') {
            return {
                card: 'bg-blue-50 border-blue-300 text-blue-900 shadow-sm hover:border-blue-400',
                label: 'text-blue-700',
                button: 'border-blue-200 text-blue-800'
            };
        }

        if (task.taskType === 'EDIT') {
            return {
                card: 'bg-red-50 border-red-300 text-red-900 shadow-sm hover:border-red-400',
                label: 'text-red-700',
                button: 'border-red-200 text-red-800'
            };
        }

        return {
            card: 'bg-yellow-50 border-yellow-300 text-yellow-900 shadow-sm hover:border-yellow-400',
            label: 'text-yellow-700',
            button: 'border-yellow-200 text-yellow-800'
        };
    };

    const handleAssignTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProjectId || !taskType || !assignee || !taskDate) return;

        const newTask: Partial<Task> = {
            title: `${taskType} Task - ${assignee}`,
            taskType: taskType as TaskType,
            assignee: assignee,
            taskDate: taskDate,
            videoNumber: taskType === 'EDIT' ? Number(videoNumber) : undefined,
            completed: false
        };

        await assignTask(Number(selectedProjectId), newTask as Task);

        // Reset form, but keep taskDate as today
        setTaskType('');
        setAssignee('');
        setVideoNumber('');
        setTaskDate(getTodayString());

        loadAllTasks();
    };

    const handleMarkDone = async (task: Task) => {
        if (window.confirm('Mark this task as completed?')) {
            await markTaskAsDone(task.id!);
            loadAllTasks();
        }
    };

    const handleDeleteTask = async (task: Task) => {
        if (!task.id) return;

        if (window.confirm('Delete this task from the calendar?')) {
            const taskId = task.id;
            setAllTasks(currentTasks => currentTasks.filter(t => t.id !== taskId));

            try {
                await deleteTask(taskId);
            } catch (error) {
                console.error('Failed to delete task', error);
                loadAllTasks();
            }
        }
    };

    // --- NORMAL DAY DRAG AND DROP ---
    const handleDragStart = (e: React.DragEvent, taskId: number, currentDate: string) => {
        e.dataTransfer.setData('taskId', taskId.toString());
        e.dataTransfer.setData('taskDate', currentDate); // Save the current date in case we shift weeks
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const handleDrop = async (e: React.DragEvent, newDate: string) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;
        await updateTaskDate(Number(taskId), newDate);
        loadAllTasks();
    };

    // --- CROSS-WEEK DRAG AND DROP ---
    const handleDropWeekShift = async (e: React.DragEvent, direction: 'prev' | 'next') => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        const originalDateStr = e.dataTransfer.getData('taskDate');
        if (!taskId || !originalDateStr) return;

        // Calculate exact same day, but shifted by +/- 7 days
        const date = new Date(originalDateStr);
        date.setDate(date.getDate() + (direction === 'next' ? 7 : -7));
        const newDateStr = formatDateForInput(date);

        await updateTaskDate(Number(taskId), newDateStr);

        // Also physically change the calendar view to follow the task!
        setCurrentWeekStart(getStartOfWeek(date));
        loadAllTasks();
    };

    const weekDays = getDaysInWeek(currentWeekStart);

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col gap-6">

            {/* ASSIGN FORM */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 shrink-0">
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-widest mb-4">Assign New Task</h3>
                <form onSubmit={handleAssignTask} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Client</label>
                        <select required className="w-full border-gray-200 border p-2.5 rounded-lg text-sm outline-none focus:border-blue-400" value={selectedClientId} onChange={e => { setSelectedClientId(Number(e.target.value)); setSelectedProjectId(''); }}>
                            <option value="">Select...</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {/* UPDATED PROJECT SELECTION DROPDOWN */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Project Week</label>
                        <select required className="w-full border-gray-200 border p-2.5 rounded-lg text-sm outline-none focus:border-blue-400 disabled:bg-gray-50" value={selectedProjectId} onChange={e => setSelectedProjectId(Number(e.target.value))} disabled={!selectedClientId}>
                            <option value="">Select...</option>
                            {filteredProjects.map(p => {
                                // Extract the week number (e.g., 'wk03' -> '3')
                                const weekNum = p.weekCode ? p.weekCode.replace('wk', '').replace(/^0+/, '') : '??';
                                return (
                                    <option key={p.id} value={p.id}>
                                        Week {weekNum}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Task Type</label>
                        <select required className="w-full border-gray-200 border p-2.5 rounded-lg text-sm outline-none focus:border-blue-400" value={taskType} onChange={e => { setTaskType(e.target.value as TaskType); setAssignee(''); }}>
                            <option value="">Select...</option>
                            <option value="SCRIPT">Script</option>
                            <option value="SHOOT">Shoot</option>
                            <option value="EDIT">Edit</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Team Member</label>
                        <select
                            required
                            disabled={!taskType}
                            className="w-full border-gray-200 border p-2.5 rounded-lg text-sm outline-none focus:border-blue-400 disabled:bg-gray-50"
                            value={assignee}
                            onChange={e => setAssignee(e.target.value)}
                        >
                            <option value="">Select...</option>
                            {teamMembers
                                .filter(member =>
                                    member.role === 'Admin' ||
                                    (taskType === 'SHOOT' && member.role === 'Shoot') ||
                                    (taskType === 'EDIT' && member.role === 'Edit') ||
                                    (taskType === 'SCRIPT' && member.role === 'Script')
                                )
                                .map(m => {
                                    const firstName = getTeamMemberFirstName(m);
                                    return <option key={m.id} value={firstName}>{firstName}</option>;
                                })
                            }
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Video</label>
                        <select required={taskType === 'EDIT'} disabled={taskType !== 'EDIT'} className="w-full border-gray-200 border p-2.5 rounded-lg text-sm outline-none disabled:bg-gray-50 focus:border-blue-400" value={videoNumber} onChange={e => setVideoNumber(Number(e.target.value))}>
                            <option value="">N/A</option>
                            {selectedProject && Array.from({ length: selectedProject.numberOfVideos }).map((_, i) => (
                                <option key={i+1} value={i+1}>Video {i+1}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Date</label>
                        <input
                            required
                            type="date"
                            className={`w-full border p-2.5 rounded-lg text-sm outline-none focus:border-blue-400 ${
                                isPastProjectDeadline(taskDate, selectedProject)
                                    ? 'border-red-300 bg-red-50 text-red-700'
                                    : 'border-gray-200'
                            }`}
                            value={taskDate}
                            onChange={e => setTaskDate(e.target.value)}
                            title={selectedProject?.projectDeadline ? `Project deadline: ${selectedProject.projectDeadline}` : undefined}
                        />
                    </div>
                    <div className="md:col-span-6 flex justify-end mt-2">
                        <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg shadow hover:bg-blue-700 font-medium transition">
                            Assign to Calendar
                        </button>
                    </div>
                </form>
            </div>

            {/* GLOBAL CALENDAR */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white">
                    <h3 className="text-sm font-bold text-gray-600">Weekly View</h3>
                    <div className="flex space-x-2">
                        {/* DROP ZONES */}
                        <button
                            onClick={() => {const d = new Date(currentWeekStart); d.setDate(d.getDate() - 7); setCurrentWeekStart(d)}}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropWeekShift(e, 'prev')}
                            className="px-3 py-1.5 border border-gray-200 rounded-md text-sm text-gray-600 hover:bg-blue-50 hover:border-blue-300 transition"
                            title="Drop a task here to move it 7 days back"
                        >
                            ← Prev Week
                        </button>
                        <button onClick={() => setCurrentWeekStart(getStartOfWeek(new Date()))} className="px-3 py-1.5 border border-gray-200 rounded-md text-sm font-bold text-gray-800 hover:bg-gray-50 transition">Today</button>
                        <button
                            onClick={() => {const d = new Date(currentWeekStart); d.setDate(d.getDate() + 7); setCurrentWeekStart(d)}}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropWeekShift(e, 'next')}
                            className="px-3 py-1.5 border border-gray-200 rounded-md text-sm text-gray-600 hover:bg-blue-50 hover:border-blue-300 transition"
                            title="Drop a task here to move it 7 days forward"
                        >
                            Next Week →
                        </button>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-7 divide-x divide-gray-100 overflow-y-auto">
                    {weekDays.map((day, i) => {
                        const dateStr = formatDateForInput(day);
                        const dayTasks = allTasks.filter(t => t.taskDate === dateStr);
                        const isToday = dateStr === formatDateForInput(new Date());
                        const isPastSelectedProjectDeadline = isPastProjectDeadline(dateStr, selectedProject);

                        return (
                            <div
                                key={i}
                                className={`p-3 min-h-[400px] flex flex-col ${
                                    isPastSelectedProjectDeadline
                                        ? 'bg-red-50/70'
                                        : isToday ? 'bg-blue-50/20' : 'bg-gray-50/30'
                                }`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, dateStr)}
                            >
                                <div className="text-center mb-4">
                                    <h4 className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                                    </h4>
                                    <span className={`text-xl font-medium ${isToday ? 'text-blue-700 font-bold' : 'text-gray-800'}`}>
                                        {day.getDate()}
                                    </span>
                                </div>

                                <div className="flex-1 space-y-2.5">
                                    {dayTasks.map(task => {
                                        const taskStyles = getTaskTypeStyles(task);

                                        return (
                                            <div
                                                key={task.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, task.id!, task.taskDate)}
                                                className={`p-3 rounded-lg border text-sm flex flex-col gap-1 transition cursor-grab active:cursor-grabbing ${taskStyles.card}`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className={`text-[10px] font-bold tracking-wider ${taskStyles.label}`}>
                                                        {task.project?.projectCode || 'UNKNOWN'}
                                                    </span>
                                                </div>

                                                <div className="font-bold flex items-center gap-1 mt-0.5">
                                                    {task.taskType}
                                                    {task.videoNumber && <span className="opacity-70 font-medium text-xs">(V{task.videoNumber})</span>}
                                                </div>

                                                <div className="text-xs font-medium flex items-center gap-1 opacity-80">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                    {task.assignee}
                                                </div>

                                                {!task.completed ? (
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleMarkDone(task)}
                                                            className={`text-[10px] flex-1 py-1.5 bg-white/50 hover:bg-white rounded-md border font-bold transition ${taskStyles.button}`}
                                                        >
                                                            Mark Done
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTask(task)}
                                                            className="w-7 h-7 shrink-0 bg-white/50 hover:bg-white rounded-md border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-300 transition flex items-center justify-center"
                                                            title="Delete task"
                                                            aria-label="Delete task"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0V5a2 2 0 012-2h4a2 2 0 012 2v2" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="mt-2 text-[10px] w-full py-1.5 rounded-md font-bold text-green-700 flex justify-center items-center gap-1">
                                                        ✓ Completed
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};