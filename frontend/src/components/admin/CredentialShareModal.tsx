'use client';

import { useState } from 'react';
import { CheckCircle, Copy, Check, X } from 'lucide-react';
import { Button } from '@/components/admin/ui';

export interface CreatedAccount {
    name: string;
    email: string;
    password: string;
    loginUrl: string;
    invite: string;
}

/** Build the shareable login link + invite message for a newly created account. */
export function buildCreatedAccount(opts: { firstName?: string; name?: string; email: string; password: string }): CreatedAccount {
    const { firstName = '', name = '', email, password } = opts;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const loginUrl = `${origin}/login?email=${encodeURIComponent(email)}`;
    const invite =
        `Hi ${firstName || 'there'}, your Al-Qavi Hub account is ready.\n\n` +
        `Login link: ${loginUrl}\n` +
        `Email: ${email}\n` +
        `Password: ${password}\n\n` +
        `Open the link and sign in.`;
    return { name: name || firstName, email, password, loginUrl, invite };
}

/**
 * Success dialog shown after creating a login-capable account (admin, supplier,
 * customer). Surfaces a copyable login link + credentials to share.
 */
export default function CredentialShareModal({ created, subtitle, onDone }: { created: CreatedAccount | null; subtitle?: string; onDone: () => void }) {
    const [copied, setCopied] = useState('');
    const copy = async (key: string, text: string) => {
        try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1800); } catch { }
    };
    if (!created) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden text-left animate-in zoom-in-95 duration-200">
                <div className="bg-emerald-50/60 px-5 py-4 border-b border-emerald-100 flex items-center gap-3">
                    <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 shrink-0"><CheckCircle className="w-5 h-5" /></span>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Account created</h3>
                        <p className="text-[11px] text-slate-500 truncate">{subtitle || `Share the login link below with ${created.name || 'them'}.`}</p>
                    </div>
                    <button type="button" onClick={onDone} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"><X size={16} /></button>
                </div>

                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Login link</label>
                        <div className="mt-1.5 flex items-center gap-2">
                            <input readOnly value={created.loginUrl} onFocus={e => e.currentTarget.select()}
                                className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-[12px] text-slate-700 outline-none focus:border-indigo-400" />
                            <button type="button" onClick={() => copy('link', created.loginUrl)}
                                className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-[11px] font-bold inline-flex items-center gap-1.5 hover:bg-indigo-700 transition-colors shrink-0">
                                {copied === 'link' ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                            <p className="text-[12px] font-bold text-slate-800 truncate">{created.email}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</p>
                            <p className="text-[12px] font-bold text-slate-800 font-mono truncate">{created.password}</p>
                        </div>
                    </div>

                    <button type="button" onClick={() => copy('invite', created.invite)}
                        className="w-full h-10 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-[12px] font-bold inline-flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors">
                        {copied === 'invite' ? <><Check className="w-4 h-4" /> Copied invite message</> : <><Copy className="w-4 h-4" /> Copy invite (link + credentials)</>}
                    </button>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                        They open the link with their email pre-filled — just enter the password above to sign in.
                    </p>
                </div>

                <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex justify-end">
                    <Button variant="primary" onClick={onDone}>Done</Button>
                </div>
            </div>
        </div>
    );
}
