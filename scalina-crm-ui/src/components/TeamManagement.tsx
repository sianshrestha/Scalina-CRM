import React, { useState, useEffect } from 'react';
import {
    fetchTeamMembers,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember,
    type TeamMember
} from '../services/api';

type TeamMemberForm = {
    role: string;
    firstName: string;
    lastName: string;
    dob: string;
    nationality: string;
    personalEmail: string;
    phoneNumber: string;
    residentialCountry: string;
    residentialState: string;
    streetAddress: string;
    postcode: string;
    bankCountry: string;
    bankName: string;
    accountName: string;
    bsb: string;
    accountNumber: string;
    accountPhoneNumber: string;
    emergencyContactName: string;
    emergencyContactNumber: string;
};

const emptyForm: TeamMemberForm = {
    role: 'Shoot',
    firstName: '',
    lastName: '',
    dob: '',
    nationality: 'Nepal',
    personalEmail: '',
    phoneNumber: '',
    residentialCountry: 'Nepal',
    residentialState: '',
    streetAddress: '',
    postcode: '',
    bankCountry: 'Nepal',
    bankName: '',
    accountName: '',
    bsb: '',
    accountNumber: '',
    accountPhoneNumber: '',
    emergencyContactName: '',
    emergencyContactNumber: ''
};

export const TeamManagement: React.FC = () => {
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingMemberId, setEditingMemberId] = useState<number | null>(null);

    // Form State
    const [form, setForm] = useState<TeamMemberForm>(emptyForm);

    // STRATEGIC UPDATE: Roles perfectly match the Resource Calendar task types
    const AVAILABLE_ROLES = ['Admin', 'Shoot', 'Edit', 'Script'];
    const COUNTRY_OPTIONS = ['Nepal', 'Germany', 'Australia'];

    async function loadTeam() {
        const data = await fetchTeamMembers();
        setTeamMembers(data);
    }

    useEffect(() => {
        fetchTeamMembers().then(setTeamMembers);
    }, []);

    const updateForm = (field: keyof TeamMemberForm, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const resetForm = () => {
        setForm(emptyForm);
        setEditingMemberId(null);
    };

    const closeModal = () => {
        setShowModal(false);
        resetForm();
    };

    const handleSaveMember = async (e: React.FormEvent) => {
        e.preventDefault();

        const name = `${form.firstName} ${form.lastName}`.trim();
        const payload = { ...form, name } as TeamMember;

        if (editingMemberId) {
            await updateTeamMember(editingMemberId, payload);
        } else {
            await createTeamMember(payload);
        }

        closeModal();
        loadTeam();
    };

    const handleEdit = (member: TeamMember) => {
        const [fallbackFirstName = '', ...fallbackLastNameParts] = (member.name || '').split(' ');

        setEditingMemberId(member.id || null);
        setForm({
            role: member.role || 'Shoot',
            firstName: member.firstName || fallbackFirstName,
            lastName: member.lastName || fallbackLastNameParts.join(' '),
            dob: member.dob || '',
            nationality: member.nationality || 'Nepal',
            personalEmail: member.personalEmail || '',
            phoneNumber: member.phoneNumber || '',
            residentialCountry: member.residentialCountry || 'Nepal',
            residentialState: member.residentialState || '',
            streetAddress: member.streetAddress || '',
            postcode: member.postcode || '',
            bankCountry: member.bankCountry || 'Nepal',
            bankName: member.bankName || '',
            accountName: member.accountName || '',
            bsb: member.bsb || '',
            accountNumber: member.accountNumber || '',
            accountPhoneNumber: member.accountPhoneNumber || '',
            emergencyContactName: member.emergencyContactName || '',
            emergencyContactNumber: member.emergencyContactNumber || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number, memberName: string) => {
        if (window.confirm(`Are you sure you want to remove ${memberName} from the team? This action cannot be undone.`)) {
            await deleteTeamMember(id);
            setTeamMembers(currentMembers => currentMembers.filter(member => member.id !== id));
        }
    };

    const getDisplayName = (member: TeamMember) => {
        return  `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unnamed';
    };

    const renderTextInput = (
        label: string,
        field: keyof TeamMemberForm,
        options: { type?: string; required?: boolean; placeholder?: string } = {}
    ) => (
        <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">{label}</label>
            <input
                required={options.required}
                type={options.type || 'text'}
                placeholder={options.placeholder}
                className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition text-sm"
                value={form[field]}
                onChange={e => updateForm(field, e.target.value)}
            />
        </div>
    );

    const renderCountrySelect = (label: string, field: keyof TeamMemberForm) => (
        <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">{label}</label>
            <select
                className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition text-sm bg-white"
                value={form[field]}
                onChange={e => updateForm(field, e.target.value)}
            >
                {COUNTRY_OPTIONS.map(country => <option key={country} value={country}>{country}</option>)}
            </select>
        </div>
    );

    // Helper for Role badge colors
    const getRoleColor = (roleName: string) => {
        if (roleName === 'Admin') return 'bg-red-50 text-red-600 border-red-200';
        if (roleName === 'Shoot') return 'bg-blue-50 text-blue-600 border-blue-200';
        if (roleName === 'Edit') return 'bg-purple-50 text-purple-600 border-purple-200';
        if (roleName === 'Script') return 'bg-orange-50 text-orange-600 border-orange-200';
        return 'bg-gray-100 text-gray-600 border-gray-200';
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col gap-6">

            {/* ADMIN BANNER */}
            <div className="bg-gray-900 text-white p-3 rounded-lg flex items-center justify-center gap-2 shadow-sm shrink-0">
                <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                <span className="text-xs font-bold uppercase tracking-widest">Admin Access Only</span>
            </div>

            <div className="flex justify-between items-end shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Team Directory</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage agency staff and system access roles.</p>
                </div>
                <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 font-medium transition flex items-center gap-2">
                    <span>+</span> Add Member
                </button>
            </div>

            {/* TEAM LIST */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden flex-1">
                <table className="min-w-full w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-gray-500 text-[10px] uppercase font-bold tracking-widest text-left">
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Assigned Role</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {teamMembers.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="text-center py-10 text-gray-400 text-sm">No team members found.</td>
                        </tr>
                    ) : (
                        teamMembers.map((member) => {
                            const displayName = getDisplayName(member);

                            return (
                            <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs uppercase">
                                            {displayName.substring(0, 2)}
                                        </div>
                                        <div>
                                            <span className="font-bold text-sm text-gray-900">{displayName}</span>
                                            <div className="text-[10px] text-gray-400 font-medium">{member.personalEmail || member.phoneNumber || '-'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${getRoleColor(member.role)}`}>
                                            {member.role}
                                        </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <button
                                        onClick={() => handleEdit(member)}
                                        className="text-[10px] font-bold text-blue-500 hover:text-white hover:bg-blue-500 border border-transparent hover:border-blue-600 px-3 py-1.5 rounded transition mr-2"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(member.id!, displayName)}
                                        className="text-[10px] font-bold text-red-500 hover:text-white hover:bg-red-500 border border-transparent hover:border-red-600 px-3 py-1.5 rounded transition"
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                            );
                        })
                    )}
                    </tbody>
                </table>
            </div>

            {/* ADD MEMBER MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-2xl w-[760px] max-h-[90vh] shadow-2xl flex flex-col">
                        <h3 className="text-xl font-bold text-gray-800 mb-6 shrink-0">{editingMemberId ? 'Edit Team Member' : 'Add Team Member'}</h3>

                        <form onSubmit={handleSaveMember} className="space-y-6 overflow-y-auto pr-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Role</label>
                                    <select required className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition font-medium text-sm bg-white" value={form.role} onChange={e => updateForm('role', e.target.value)}>
                                        {AVAILABLE_ROLES.map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3">Personal Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {renderTextInput('First Name', 'firstName', { required: true })}
                                    {renderTextInput('Last Name', 'lastName', { required: true })}
                                    {renderTextInput('DOB', 'dob', { type: 'date', required: true })}
                                    {renderCountrySelect('Nationality', 'nationality')}
                                    {renderTextInput('Personal Email', 'personalEmail', { type: 'email', required: true })}
                                    {renderTextInput('Phone Number', 'phoneNumber', { required: true })}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3">Residential Address</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {renderCountrySelect('Country', 'residentialCountry')}
                                    {renderTextInput('State', 'residentialState')}
                                    {renderTextInput('Street Address', 'streetAddress')}
                                    {renderTextInput('Postcode', 'postcode')}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3">Bank Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {renderCountrySelect('Country', 'bankCountry')}
                                    {renderTextInput('Bank Name', 'bankName')}
                                    {renderTextInput('Account Name', 'accountName')}
                                    {form.bankCountry === 'Australia' && renderTextInput('BSB', 'bsb')}
                                    {renderTextInput('Account Number', 'accountNumber')}
                                    {renderTextInput('Account Phone Number', 'accountPhoneNumber')}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3">Emergency Contact</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {renderTextInput('Emergency Contact Name', 'emergencyContactName')}
                                    {renderTextInput('Emergency Contact Number', 'emergencyContactNumber')}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 mt-2 border-t border-gray-100 sticky bottom-0 bg-white">
                                <button type="button" onClick={closeModal} className="flex-1 bg-gray-100 p-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition">Cancel</button>
                                <button type="submit" className="flex-1 bg-blue-600 p-3 rounded-xl font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition">{editingMemberId ? 'Save Changes' : 'Add Member'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
