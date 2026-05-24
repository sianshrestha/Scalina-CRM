// src/components/ClientProjects.tsx
import { useEffect, useState } from 'react';
import {
    type ClientLead, type Project,
    fetchClientProjects, createProject,
    updateProject,
} from '../services/api';

// --- SUB-COMPONENT FOR TASKS ---
const ProjectCard = ({ project }: { project: Project }) => {

    const [isEditingName, setIsEditingName] = useState(false);
    const [projectName, setProjectName] = useState(project.projectCode);



    const handleSaveProjectName = async () => {
        await updateProject(project.id!, { ...project, name: projectName });
        setIsEditingName(false);
    };

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                {isEditingName ? (
                    <div className="flex gap-2">
                        <input className="border p-1 rounded text-sm font-bold" value={projectName} onChange={e => setProjectName(e.target.value)} />
                        <button onClick={handleSaveProjectName} className="bg-green-600 text-white px-2 py-1 text-xs rounded cursor-pointer">Save</button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{projectName}</span>
                        <button onClick={() => setIsEditingName(true)} className="text-gray-400 hover:text-indigo-600 text-xs cursor-pointer">✎ Rename</button>
                    </div>
                )}
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">{project.overallProjectStatus}</span>
            </div>

        </div>
    );
};


export default function ClientProjects({ client, onBack }: { client: ClientLead, onBack: () => void }) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [newProjectName, setNewProjectName] = useState('');

    useEffect(() => {
        fetchClientProjects(client.id!).then(setProjects);
    }, [client.id]);

    const handleAddProject = async () => {
        if (!newProjectName) return;
        const p = await createProject(client.id!);
        setProjects([...projects, p]);
        setNewProjectName('');
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <button onClick={onBack} className="text-indigo-600 hover:underline font-medium mb-6 cursor-pointer">← Back to Pipeline</button>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8 flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        {/* Display custom client ID if it exists */}
                        {client.clientCode && <span className="text-indigo-600 mr-3">[{client.clientCode}]</span>}
                        {client.company}
                    </h2>
                    <p className="text-gray-500 mb-2">{client.name} | {client.email} | {client.phone}</p>
                    {client.address && <p className="text-gray-400 text-sm">{client.address}</p>}
                    {client.abn && <p className="text-gray-400 text-sm">ABN: {client.abn}</p>}
                </div>
                <div className="flex flex-col items-end gap-3">
                    {/* BUTTON TO OPEN INVOICES IN NEW TAB */}
                    <button
                        onClick={() => window.open(`/?invoiceFor=${client.id}`, '_blank')}
                        className="bg-emerald-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-emerald-700 cursor-pointer shadow-sm flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Manage Invoices
                    </button>
                    {client.tags && (
                        <div className="flex gap-2 flex-wrap justify-end">
                            {client.tags.split(',').map(t => (
                                <span key={t} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-bold">{t.trim()}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* PROJECTS SECTION */}
            <div>
                <h3 className="text-2xl font-bold mb-4">Projects & Tasks</h3>
                <div className="flex gap-2 mb-6 max-w-2xl">
                    <input
                        type="text"
                        value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value)}
                        placeholder="New Project Name"
                        className="border p-2 rounded-lg flex-grow shadow-sm"
                    />
                    <button
                        onClick={handleAddProject}
                        className="bg-indigo-600 text-white px-6 rounded-lg cursor-pointer hover:bg-indigo-700 font-bold">
                        Create
                    </button>
                </div>

                {/* Displaying projects in a grid so they look clean now that they have the whole page */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {projects.map(p => <ProjectCard key={p.id} project={p} />)}
                    {projects.length === 0 && (
                        <div className="text-gray-400 italic p-4 border border-dashed rounded-xl flex items-center justify-center">
                            No projects yet. Create one above!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}