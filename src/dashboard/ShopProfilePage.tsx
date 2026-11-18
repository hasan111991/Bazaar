import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useDashboard } from './DashboardContext';
import { useAuth } from '../context/AuthContext';
import {
  getShopContactMessages,
  updateShopContactMessageStatus,
  getShopActivityLogs,
} from '../services/tenantService';
import { ContactMessage, ActivityLog } from '../types';

export const ShopProfilePage: React.FC = () => {
  const { shopId, shop, userRole, isReadOnly } = useDashboard();
  const { currentUser, resetPassword } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetSent, setResetSent] = useState(false);

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [msgs, lgs] = await Promise.all([
        getShopContactMessages(shopId),
        getShopActivityLogs(shopId),
      ]);
      setMessages(msgs);
      setLogs(lgs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId]);

  const handlePasswordReset = async () => {
    if (!currentUser?.email) return;
    await resetPassword(currentUser.email);
    setResetSent(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Owner Profile, Inbox &amp; Activity</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your security credentials, respond to storefront customer inquiries, and audit recent actions.
        </p>
      </div>

      {/* Account Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="space-y-1">
          <p className="text-sm font-extrabold text-slate-900">{currentUser?.displayName || shop?.ownerName}</p>
          <p className="text-slate-600">{currentUser?.email}</p>
          <p className="text-slate-500 uppercase font-bold text-[11px]">
            Role: {userRole.replace('_', ' ')} · Store: {shop?.name}
          </p>
        </div>
        {!isReadOnly && (
          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <button
              type="button"
              onClick={handlePasswordReset}
              className="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50"
            >
              Send Password Reset Email
            </button>
            {resetSent && (
              <span className="text-emerald-700 font-semibold">Reset instructions emailed!</span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center text-xs text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#065F46]" /> Loading inbox &amp; logs...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Messages */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
            <h3 className="text-sm font-extrabold text-slate-900">
              Customer Inquiries ({messages.length})
            </h3>
            {messages.length === 0 ? (
              <p className="text-slate-500 py-6 text-center">No customer contact inquiries yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {messages.map((m) => (
                  <div key={m.id} className="py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{m.name} ({m.email})</span>
                      <span className={`font-bold uppercase text-[10px] ${m.status === 'resolved' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {m.status}
                      </span>
                    </div>
                    {m.subject && <p className="font-semibold text-slate-700">{m.subject}</p>}
                    <p className="text-slate-600">{m.message}</p>
                    {!isReadOnly && m.status !== 'resolved' && (
                      <button
                        type="button"
                        onClick={() => updateShopContactMessageStatus(shopId, m.id, 'resolved').then(loadData)}
                        className="text-[11px] font-bold text-[#065F46] hover:underline flex items-center gap-1 pt-1"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Mark Resolved
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Logs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
            <h3 className="text-sm font-extrabold text-slate-900">Shop Activity Audit Trail</h3>
            {logs.length === 0 ? (
              <p className="text-slate-500 py-6 text-center">No actions recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {logs.map((l) => (
                  <div key={l.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900">{l.action}</p>
                      <p className="text-[11px] text-slate-600">{l.details}</p>
                      <p className="text-[10px] text-slate-400">{l.actorEmail}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
