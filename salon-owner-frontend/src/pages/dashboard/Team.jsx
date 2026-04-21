import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Edit2, Trash2, Star, IndianRupee, Calendar,
  Phone, Mail, Clock, Scissors, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, UserCheck, X, Loader2, Eye, EyeOff,
  CalendarOff, CalendarCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';

const ROLE_LABELS = {
  owner:        { label: 'Owner',       cls: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' },
  manager:      { label: 'Manager',     cls: 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300' },
  receptionist: { label: 'Receptionist',cls: 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300' },
  stylist:      { label: 'Stylist',     cls: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' },
};

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_SHORT = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };

const initials = (name) => (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="animate-pulse bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-800" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-32" />
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-lg w-20" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-3">
      {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
    </div>
  </div>
);

/* ─── Staff Form Modal ───────────────────────────────────────────────────── */
function StaffModal({ mode, initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', gender: '', bio: '',
    staffRole: 'stylist', experience: 0,
    workingDays: ['monday','tuesday','wednesday','thursday','friday','saturday'],
    shiftStart: '09:00', shiftEnd: '18:00',
    showEarningsToStaff: false,
    ...initial,
  });
  const [saving, setSaving] = useState(false);

  const toggle = (field) => setForm(f => ({ ...f, [field]: !f[field] }));
  const toggleDay = (day) => setForm(f => ({
    ...f,
    workingDays: f.workingDays.includes(day)
      ? f.workingDays.filter(d => d !== day)
      : [...f.workingDays, day],
  }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {mode === 'add' ? 'Add Team Member' : 'Edit Team Member'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              placeholder="e.g. Priya Sharma"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Role + Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Role</label>
              <select value={form.staffRole} onChange={e => setForm(f => ({...f, staffRole: e.target.value}))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="stylist">Stylist</option>
                <option value="receptionist">Receptionist</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Gender</label>
              <select value={form.gender || ''} onChange={e => setForm(f => ({...f, gender: e.target.value}))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Phone</label>
              <input value={form.phone || ''} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                placeholder="+91XXXXXXXXXX"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
              <input value={form.email || ''} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                placeholder="priya@salon.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Experience + Bio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Experience (years)</label>
              <input type="number" min="0" value={form.experience || 0} onChange={e => setForm(f => ({...f, experience: Number(e.target.value)}))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Shift Hours</label>
              <div className="flex items-center gap-2">
                <input type="time" value={form.shiftStart} onChange={e => setForm(f => ({...f, shiftStart: e.target.value}))}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <span className="text-gray-400 text-xs">to</span>
                <input type="time" value={form.shiftEnd} onChange={e => setForm(f => ({...f, shiftEnd: e.target.value}))}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>

          {/* Working Days */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Working Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <button key={day} type="button" onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    form.workingDays.includes(day)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                  {DAY_SHORT[day]}
                </button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Bio (optional)</label>
            <textarea value={form.bio || ''} onChange={e => setForm(f => ({...f, bio: e.target.value}))}
              rows={2} placeholder="e.g. 5 years experience in hair coloring and balayage..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>

          {/* Earnings toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Show earnings to this staff member</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">They will see their own daily estimated earnings</div>
            </div>
            <button onClick={() => toggle('showEarningsToStaff')} className="text-gray-400">
              {form.showEarningsToStaff
                ? <ToggleRight size={28} className="text-indigo-600" />
                : <ToggleLeft  size={28} />}
            </button>
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {mode === 'add' ? 'Add Member' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Staff Card ─────────────────────────────────────────────────────────── */
function StaffCard({ member, onEdit, onRemove, onToggleActive, onMarkAbsent, isAbsent, absentLoading }) {
  const [expanded, setExpanded] = useState(false);
  const role = ROLE_LABELS[member.staffRole] || ROLE_LABELS.stylist;

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border transition-all ${
      member.isActive ? 'border-gray-100 dark:border-gray-800' : 'border-red-100 dark:border-red-900/30 opacity-60'
    }`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative flex-shrink-0">
            {member.profilePhoto
              ? <img src={member.profilePhoto} alt={member.name} className="w-14 h-14 rounded-full object-cover" />
              : <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                  {initials(member.name)}
                </div>
            }
            {member.isOwner && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                <UserCheck size={11} className="text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900 dark:text-white text-base truncate">{member.name}</span>
              {member.isOwner && <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">(You)</span>}
            </div>
            <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${role.cls}`}>{role.label}</span>
            {member.averageRating > 0 && (
              <div className="flex items-center gap-1 mt-1.5">
                <Star size={11} className="text-amber-400 fill-amber-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">{member.averageRating.toFixed(1)} ({member.totalReviews} reviews)</span>
              </div>
            )}
          </div>
          {!member.isOwner && (
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => onEdit(member)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-indigo-600 transition-colors"><Edit2 size={14} /></button>
              <button onClick={() => onToggleActive(member)} className={`p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${member.isActive ? 'text-emerald-500' : 'text-red-400'}`}>
                {member.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{member.monthBookings ?? 0}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Bookings</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">₹{((member.monthRevenue ?? 0) / 1000).toFixed(1)}k</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Revenue</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{member.experience ?? 0}y</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Experience</div>
          </div>
        </div>

        {/* Expand toggle */}
        <button onClick={() => setExpanded(e => !e)}
          className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          {expanded ? <><ChevronUp size={13} /> Less details</> : <><ChevronDown size={13} /> More details</>}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-5 pb-5 pt-4 space-y-3">
          {member.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Phone size={13} className="text-gray-400" />{member.phone}
            </div>
          )}
          {member.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Mail size={13} className="text-gray-400" />{member.email}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Clock size={13} className="text-gray-400" />{member.shiftStart} – {member.shiftEnd}
          </div>
          {member.workingDays?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {member.workingDays.map(d => (
                <span key={d} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-medium">
                  {DAY_SHORT[d]}
                </span>
              ))}
            </div>
          )}
          {member.bio && <p className="text-xs text-gray-500 dark:text-gray-400 italic">{member.bio}</p>}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Earnings visibility:</span>
            <span className={member.showEarningsToStaff ? 'text-emerald-500' : 'text-gray-400'}>
              {member.showEarningsToStaff ? 'Shown to staff' : 'Hidden from staff'}
            </span>
          </div>
          {/* Fix 5: Mark Absent Today */}
          {!member.isOwner && member.isActive && (
            <button
              onClick={() => onMarkAbsent(member._id, isAbsent)}
              disabled={absentLoading}
              className={`w-full mt-1 py-2 rounded-xl border text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                isAbsent
                  ? 'border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                  : 'border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
              }`}
            >
              {absentLoading
                ? <Loader2 size={12} className="animate-spin" />
                : isAbsent
                  ? <><CalendarCheck size={12} /> Mark Present</>
                  : <><CalendarOff size={12} /> Mark Absent Today</>
              }
            </button>
          )}
          {!member.isOwner && (
            <button onClick={() => onRemove(member)}
              className="w-full mt-1 py-2 rounded-xl border border-red-200 dark:border-red-900/40 text-red-500 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center justify-center gap-1.5">
              <Trash2 size={12} /> Remove from Team
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function Team() {
  const [staff, setStaff]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null); // null | { mode: 'add'|'edit', initial: {} }
  const [removing, setRemoving]   = useState(null);
  const [absentIds, setAbsentIds] = useState(new Set()); // staffIds absent today
  const [absentLoading, setAbsentLoading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/owner/team');
      setStaff(r.data.data.staff || []);
    } catch { toast.error('Failed to load team'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load today's absences
  useEffect(() => {
    api.get('/owner/team/absences')
      .then(res => {
        const ids = new Set((res.data.data?.absences || []).map(a => String(a.barberId)));
        setAbsentIds(ids);
      })
      .catch(() => {});
  }, []);

  const handleMarkAbsent = async (staffId, currentlyAbsent) => {
    setAbsentLoading(staffId);
    try {
      if (currentlyAbsent) {
        await api.delete(`/owner/team/${staffId}/absent`);
        setAbsentIds(prev => { const s = new Set(prev); s.delete(String(staffId)); return s; });
        toast.success('Staff marked present');
      } else {
        const res = await api.post(`/owner/team/${staffId}/absent`);
        setAbsentIds(prev => new Set([...prev, String(staffId)]));
        toast.success(res.data?.message || 'Staff marked absent, bookings reassigned');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setAbsentLoading(null); }
  };

  const handleSave = async (form) => {
    try {
      if (modal.mode === 'add') {
        await api.post('/owner/team', form);
        toast.success('Team member added');
      } else {
        await api.put(`/owner/team/${modal.initial._id}`, form);
        toast.success('Changes saved');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleToggleActive = async (member) => {
    try {
      if (member.isActive) {
        await api.delete(`/owner/team/${member._id}`);
        toast.success(`${member.name} deactivated`);
      } else {
        await api.put(`/owner/team/${member._id}`, { isActive: true });
        toast.success(`${member.name} reactivated`);
      }
      load();
    } catch { toast.error('Failed to update'); }
  };

  const activeStaff   = staff.filter(s => s.isActive);
  const inactiveStaff = staff.filter(s => !s.isActive);
  const hasTeam       = activeStaff.filter(s => !s.isOwner).length > 0;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {hasTeam
                ? `${activeStaff.length} active member${activeStaff.length !== 1 ? 's' : ''}`
                : 'Add your first team member to get started'}
            </p>
          </div>
          <button onClick={() => setModal({ mode: 'add', initial: {} })}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
            <Plus size={16} /> Add Member
          </button>
        </div>

        {/* Solo owner banner — shown when no staff added yet */}
        {!loading && !hasTeam && (
          <div className="mb-6 p-5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center flex-shrink-0">
              <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="font-semibold text-indigo-900 dark:text-indigo-200 text-sm">You're the whole team right now</div>
              <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 leading-relaxed">
                When you add your first staff member, you'll be able to assign bookings to them,
                track their performance, and let customers choose their preferred stylist.
              </div>
            </div>
          </div>
        )}

        {/* Staff grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeStaff.map(m => (
                <StaffCard key={m._id} member={m}
                  onEdit={member => setModal({ mode: 'edit', initial: member })}
                  onRemove={() => setRemoving(m)}
                  onToggleActive={handleToggleActive}
                  onMarkAbsent={handleMarkAbsent}
                  isAbsent={absentIds.has(String(m._id))}
                  absentLoading={absentLoading === m._id} />
              ))}
            </div>

            {inactiveStaff.length > 0 && (
              <div className="mt-8">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Inactive Members</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inactiveStaff.map(m => (
                    <StaffCard key={m._id} member={m}
                      onEdit={member => setModal({ mode: 'edit', initial: member })}
                      onRemove={() => setRemoving(m)}
                      onToggleActive={handleToggleActive} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <StaffModal mode={modal.mode} initial={modal.initial}
          onSave={handleSave} onClose={() => setModal(null)} />
      )}

      {/* Remove confirm */}
      {removing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">Remove {removing.name}?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Their past booking history is preserved. You can reactivate them later.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setRemoving(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold">Cancel</button>
              <button onClick={async () => { await handleToggleActive(removing); setRemoving(null); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
