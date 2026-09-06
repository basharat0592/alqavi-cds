'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   ORGANIZATION ONBOARDING — the page an invited admin lands on.

   Public: whoever holds the link has no session. The token in the URL is the
   credential, so this page shows only what the invite itself carries — the
   organization name and who it was addressed to — and nothing about the rest
   of the platform.

   On success the API returns a token pair, so the new admin is signed in here
   and pushed straight into their console rather than bounced to a login form
   with credentials they just typed.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Building2, Loader2, AlertTriangle, Eye, EyeOff, CheckCircle2,
    User as UserIcon, Mail, Phone, MapPin, Lock, ArrowRight, Clock,
} from 'lucide-react';
import { onboardingService } from '@/lib/api';
import { authService } from '@/lib/auth';

const AMBER = '#F59E0B';

const inputCls =
    'w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-[13.5px] font-medium text-slate-900 ' +
    'placeholder:text-slate-400 placeholder:font-normal outline-none transition-all ' +
    'hover:bg-white hover:border-slate-400 focus:bg-white focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/20';
const lockedCls =
    'w-full h-11 px-3.5 bg-slate-100 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-500 cursor-not-allowed';
const labelCls = 'block text-[11.5px] font-bold uppercase tracking-[0.04em] text-slate-600 mb-1.5';

function Field({ label, icon: Icon, hint, children }: any) {
    return (
        <div>
            <label className={labelCls}>
                {Icon && <Icon size={11} className="inline-block mr-1 -mt-px text-slate-400" />}
                {label}
            </label>
            {children}
            {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
        </div>
    );
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-[560px]">{children}</div>
        </div>
    );
}

/** Dead-link states all look the same to the visitor; only the wording differs. */
function DeadLink({ title, message }: { title: string; message: string }) {
    return (
        <Shell>
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <span className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={22} />
                </span>
                <h1 className="text-[18px] font-black text-slate-900 tracking-tight">{title}</h1>
                <p className="mt-2 text-[13px] text-slate-500 leading-relaxed">{message}</p>
                <p className="mt-5 text-[12px] text-slate-400">
                    Ask whoever sent you this link for a new one.
                </p>
                <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 mt-6 h-10 px-5 rounded-xl bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-800 transition-colors"
                >
                    Go to sign in <ArrowRight size={14} />
                </Link>
            </div>
        </Shell>
    );
}

export default function OnboardPage() {
    const params = useParams();
    const router = useRouter();
    const token = String(params?.token || '');

    const [invite, setInvite] = useState<any>(null);
    const [loadError, setLoadError] = useState<{ title: string; message: string } | null>(null);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        full_name: '', username: '', password: '', confirm_password: '',
        phone: '', address: '', area: '' as string,
    });
    const [showPw, setShowPw] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [done, setDone] = useState(false);

    const set = (k: string, v: string) => {
        setForm(f => ({ ...f, [k]: v }));
        // Clear a field's error the moment it is edited; leaving a stale error
        // under a field the visitor just fixed reads as if it is still wrong.
        setErrors(e => (e[k] ? { ...e, [k]: '' } : e));
    };

    useEffect(() => {
        if (!token) return;
        onboardingService.getInvite(token)
            .then(d => {
                setInvite(d);
                setForm(f => ({
                    ...f,
                    full_name: d.admin_name || '',
                    phone: d.phone || '',
                    address: d.address || '',
                    area: d.area ? String(d.area) : '',
                }));
            })
            .catch(err => {
                const st = err?.response?.status;
                const detail = err?.response?.data?.detail;
                setLoadError(
                    st === 410
                        ? { title: 'This link is no longer active', message: detail || 'It has already been used, cancelled, or expired.' }
                        : st === 404
                            ? { title: 'Invite not found', message: 'This link is not valid. It may have been mistyped or already replaced.' }
                            : { title: 'Could not open this invite', message: 'Something went wrong reaching the server. Try again in a moment.' }
                );
            })
            .finally(() => setLoading(false));
    }, [token]);

    const daysLeft = useMemo(() => {
        if (!invite?.expires_at) return null;
        const ms = new Date(invite.expires_at).getTime() - Date.now();
        if (!Number.isFinite(ms) || ms <= 0) return null;
        const d = Math.ceil(ms / 86_400_000);
        return d <= 1 ? 'today' : `in ${d} days`;
    }, [invite]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.full_name.trim()) e.full_name = 'Tell us your name.';
        if (form.password.length < 8) e.password = 'Use at least 8 characters.';
        if (form.confirm_password !== form.password) e.confirm_password = 'Passwords do not match.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        try {
            const res = await onboardingService.acceptInvite(token, {
                username: form.username.trim() || undefined,
                password: form.password,
                confirm_password: form.confirm_password,
                full_name: form.full_name.trim(),
                phone: form.phone.trim(),
                address: form.address.trim(),
                area: form.area ? Number(form.area) : null,
            });
            authService.setSession(res.access, res.refresh, res.user);
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('admin_session_start', String(Date.now()));
            }
            setDone(true);
            // Let the confirmation register before the console replaces it.
            setTimeout(() => router.push('/admin/dashboard'), 1200);
        } catch (err: any) {
            const data = err?.response?.data;
            if (err?.response?.status === 410 || err?.response?.status === 404) {
                setLoadError({
                    title: 'This link is no longer active',
                    message: 'It was used or cancelled while you were filling this in.',
                });
            } else if (data && typeof data === 'object') {
                const mapped: Record<string, string> = {};
                Object.entries(data).forEach(([k, v]) => {
                    mapped[k] = Array.isArray(v) ? String(v[0]) : String(v);
                });
                setErrors(mapped);
            } else {
                setErrors({ __all__: 'Could not complete setup. Please try again.' });
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Shell>
                <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Loader2 size={26} className="animate-spin" />
                    <p className="text-[13px] font-medium">Opening your invite…</p>
                </div>
            </Shell>
        );
    }

    if (loadError) return <DeadLink title={loadError.title} message={loadError.message} />;

    if (done) {
        return (
            <Shell>
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                    <span className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={24} />
                    </span>
                    <h1 className="text-[18px] font-black text-slate-900 tracking-tight">
                        {invite?.organization_name} is ready
                    </h1>
                    <p className="mt-2 text-[13px] text-slate-500">Taking you to your dashboard…</p>
                    <Loader2 size={18} className="animate-spin text-slate-300 mx-auto mt-5" />
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            {/* Header */}
            <div className="text-center mb-6">
                <span
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg"
                    style={{ background: AMBER, boxShadow: '0 10px 24px -8px rgba(245,158,11,0.6)' }}
                >
                    <Building2 size={26} />
                </span>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#B4780B]">
                    You have been invited to run
                </p>
                <h1 className="mt-1.5 text-[26px] sm:text-[30px] font-black text-slate-900 tracking-tight leading-tight">
                    {invite?.organization_name}
                </h1>
                <p className="mt-2 text-[13px] text-slate-500">
                    Set up your account and we will open your console.
                </p>
                {daysLeft && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-400">
                        <Clock size={11} /> This link expires {daysLeft}
                    </p>
                )}
            </div>

            <form
                onSubmit={submit}
                className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-[0_1px_3px_rgba(15,23,42,0.06)] space-y-6"
            >
                {errors.__all__ && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-100 text-[12.5px] text-rose-700">
                        <AlertTriangle size={15} className="shrink-0 mt-px" /> {errors.__all__}
                    </div>
                )}

                {/* ── Your account ── */}
                <section className="space-y-4">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 pb-2 border-b border-slate-100">
                        Your account
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Full name" icon={UserIcon}>
                            <input
                                value={form.full_name}
                                onChange={e => set('full_name', e.target.value)}
                                placeholder="Ali Raza"
                                className={inputCls}
                                autoFocus
                            />
                            {errors.full_name && <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.full_name}</p>}
                        </Field>

                        <Field label="Phone" icon={Phone}>
                            <input
                                value={form.phone}
                                onChange={e => set('phone', e.target.value)}
                                placeholder="+92 300 1234567"
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    <Field label="Email" icon={Mail} hint="The invite was sent to this address, so it cannot be changed here.">
                        <input value={invite?.email || ''} readOnly disabled className={lockedCls} />
                        {errors.email && <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.email}</p>}
                    </Field>

                    <Field label="Username" icon={UserIcon} hint="Leave blank and we will build one from your email.">
                        <input
                            value={form.username}
                            onChange={e => set('username', e.target.value)}
                            placeholder="optional"
                            className={inputCls}
                        />
                        {errors.username && <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.username}</p>}
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Password" icon={Lock}>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={e => set('password', e.target.value)}
                                    placeholder="At least 8 characters"
                                    className={inputCls + ' pr-10'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(s => !s)}
                                    aria-label={showPw ? 'Hide password' : 'Show password'}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                >
                                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            {errors.password && <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.password}</p>}
                        </Field>

                        <Field label="Confirm password" icon={Lock}>
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={form.confirm_password}
                                onChange={e => set('confirm_password', e.target.value)}
                                placeholder="Repeat it"
                                className={inputCls}
                            />
                            {errors.confirm_password && <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.confirm_password}</p>}
                        </Field>
                    </div>
                </section>

                {/* ── Organization ── */}
                <section className="space-y-4">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 pb-2 border-b border-slate-100">
                        Your organization
                    </h2>

                    <Field label="Organization" icon={Building2} hint="Set by the platform administrator.">
                        <input value={invite?.organization_name || ''} readOnly disabled className={lockedCls} />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="City" icon={MapPin}>
                            <select
                                value={form.area}
                                onChange={e => set('area', e.target.value)}
                                className={inputCls + ' cursor-pointer'}
                            >
                                <option value="">Not set</option>
                                {(invite?.areas || []).map((a: any) => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Address" icon={MapPin}>
                            <input
                                value={form.address}
                                onChange={e => set('address', e.target.value)}
                                placeholder="Shop / street address"
                                className={inputCls}
                            />
                        </Field>
                    </div>
                </section>

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 rounded-xl text-white text-[14px] font-black tracking-tight transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-95 flex items-center justify-center gap-2"
                    style={{ background: AMBER, boxShadow: '0 8px 20px -8px rgba(245,158,11,0.7)' }}
                >
                    {submitting ? <><Loader2 size={17} className="animate-spin" /> Setting up…</> : <>Create my workspace <ArrowRight size={16} /></>}
                </button>

                <p className="text-center text-[11.5px] text-slate-400">
                    Already set up? <Link href="/login" className="font-bold text-[#B4780B] hover:underline">Sign in</Link>
                </p>
            </form>
        </Shell>
    );
}
