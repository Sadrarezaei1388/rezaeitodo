"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import {
  CalendarClock,
  Baby,
  UserRound,
  Edit3,
  Clock,
  Plus,
  Check,
  Trash2,
  AlertTriangle,
  LogOut,
  Settings,
  Mail,
  Loader2,
} from "lucide-react";

/* =========================================================
   Rezaei Family Todo — EmailJS + Duration (No Tabs)
   - تعیین «مدت‌زمان انجام» توسط مامان (ساعت)، پیش‌فرض 3h
   - ددلاین = createdAt + مدت‌زمان
   - نمایش درحال انجام و پایان‌یافته باهم، زیر هم
   - EmailJS (frontend-only): env های زیر را ست کن:
     NEXT_PUBLIC_EMAILJS_SERVICE_ID, NEXT_PUBLIC_EMAILJS_TEMPLATE_ID, NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
   ========================================================= */

type Role = "mom" | "dad" | "son";
interface Profile { name: string; email: string; }
interface Task {
  id: string;
  title: string;
  notes?: string;
  assignee: Exclude<Role, "mom">;
  createdAt: number;
  dueAt: number;
  status: "pending" | "done";
  notified?: boolean;
}

const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!;
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!;
const EMAILJS_PUBLIC_KEY  = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!;

const LS_KEYS = {
  currentUser: "familyTasks.currentUser",
  profiles: "familyTasks.profiles",
  tasks: "familyTasks.tasks",
  settings: "familyTasks.settings",
  mailLog: "familyTasks.mailLog",
};

const defaultProfiles: Record<Role, Profile> = {
  mom: { name: "مامان", email: "" },
  dad: { name: "بابا", email: "" },
  son: { name: "پسر", email: "" },
};
const defaultSettings = { warnMinutes: 30 };

// ---------- helpers ----------
const now = () => Date.now();
const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
function formatRemaining(ms: number) {
  if (ms <= 0) return "تمام شد";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d} روز و ${h} ساعت`;
  if (h > 0) return `${h} ساعت و ${m} دقیقه`;
  if (m > 0) return `${m} دقیقه و ${sec} ثانیه`;
  return `${sec} ثانیه`;
}
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((e || "").trim());

// ---------- main ----------
export default function FamilyTasksApp() {
  // init
  useEffect(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.style.fontFamily = "Vazirmatn, system-ui, sans-serif";
    emailjs.init(EMAILJS_PUBLIC_KEY || "");
    return () => { document.documentElement.dir = "ltr"; };
  }, []);

  // session
  const [currentRole, setCurrentRole] = useState<Role | null>(() => {
    try {
      const raw = localStorage.getItem(LS_KEYS.currentUser);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.role && parsed?.expiresAt && Date.now() < parsed.expiresAt) return parsed.role as Role;
      return null;
    } catch { return null; }
  });

  // state
  const [profiles, setProfiles] = useState<Record<Role, Profile>>(() => {
    const raw = localStorage.getItem(LS_KEYS.profiles);
    return raw ? JSON.parse(raw) : defaultProfiles;
  });
  const [settings, setSettings] = useState(() => {
    const raw = localStorage.getItem(LS_KEYS.settings);
    return raw ? JSON.parse(raw) : defaultSettings;
  });
  const [tasks, setTasks] = useState<Task[]>(() => {
    const raw = localStorage.getItem(LS_KEYS.tasks);
    return raw ? JSON.parse(raw) : [];
  });
  const [mailLog, setMailLog] = useState<{ id: string; to: string; text: string; time: number }[]>(() => {
    const raw = localStorage.getItem(LS_KEYS.mailLog);
    return raw ? JSON.parse(raw) : [];
  });

  // tick
  const [tick, setTick] = useState(0);
  useEffect(() => { const i = setInterval(() => setTick(x => x + 1), 1000); return () => clearInterval(i); }, []);

  // persist
  useEffect(() => {
    if (currentRole) {
      localStorage.setItem(LS_KEYS.currentUser, JSON.stringify({
        role: currentRole, expiresAt: Date.now() + 24 * 60 * 60 * 1000
      }));
    }
  }, [currentRole]);
  useEffect(() => { localStorage.setItem(LS_KEYS.profiles, JSON.stringify(profiles)); }, [profiles]);
  useEffect(() => { localStorage.setItem(LS_KEYS.settings, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(LS_KEYS.tasks, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem(LS_KEYS.mailLog, JSON.stringify(mailLog)); }, [mailLog]);

  // email sender (EmailJS, light retry)
  async function sendEmail(to: string, text: string, toName?: string): Promise<boolean> {
    if (!isValidEmail(to)) {
      setMailLog((prev) => [{ id: crypto.randomUUID(), to: to || "—", text: `[INVALID EMAIL] ${text}`, time: now() }, ...prev].slice(0, 60));
      return false;
    }
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      setMailLog((prev) => [{ id: crypto.randomUUID(), to, text: `[CONFIG MISSING] ${text}`, time: now() }, ...prev].slice(0, 60));
      return false;
    }
    const params = { to_email: to, to_name: toName || "کاربر عزیز", subject: "یادآوری تسک", message: text };
    for (let i = 0; i < 2; i++) {
      try {
        const res = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
        if (res?.status === 200) {
          setMailLog((prev) => [{ id: crypto.randomUUID(), to, text: `[EMAIL] ${text}`, time: now() }, ...prev].slice(0, 60));
          return true;
        }
      } catch { /* retry */ }
    }
    setMailLog((prev) => [{ id: crypto.randomUUID(), to, text: `[FAILED EMAIL] ${text}`, time: now() }, ...prev].slice(0, 60));
    return false;
  }

  // deadline warn (۳۰ دقیقه آخر)
  useEffect(() => {
    const warnMs = settings.warnMinutes * 60 * 1000;
    const n = now();
    setTasks(prev => prev.map(t => {
      if (t.status === "pending" && !t.notified && n >= t.dueAt - warnMs && n < t.dueAt) {
        const who = t.assignee;
        const email = profiles[who]?.email || "";
        const name  = profiles[who]?.name || "";
        const remain = formatRemaining(t.dueAt - n);
        if (isValidEmail(email)) void sendEmail(email, `یادآوری: «${t.title}» تا ${remain} دیگه تموم میشه ⏳`, name);
        return { ...t, notified: true };
      }
      return t;
    }));
  }, [tick]); // closures ok

  // notify mom on done
  const prevStatus = useRef<Record<string, Task["status"]>>({});
  useEffect(() => { tasks.forEach(t => (prevStatus.current[t.id] ??= t.status)); }, []);
  useEffect(() => {
    tasks.forEach(t => {
      const prev = prevStatus.current[t.id];
      if (prev === "pending" && t.status === "done") {
        const who = t.assignee === "dad" ? (profiles.dad.name || "بابا") : (profiles.son.name || "پسر");
        const mTo = profiles.mom.email, mName = profiles.mom.name || "مامان";
        if (isValidEmail(mTo)) void sendEmail(mTo, `تسک «${t.title}» توسط ${who} انجام شد ✅`, mName);
      }
      prevStatus.current[t.id] = t.status;
    });
  }, [tasks, profiles]);

  // ui
  function logout() { setCurrentRole(null); localStorage.removeItem(LS_KEYS.currentUser); }

  return (
    <div className="min-h-screen text-white bg-[radial-gradient(ellipse_at_top_right,rgba(120,119,198,0.35),transparent_35%),radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.35),transparent_30%),linear-gradient(180deg,#0b1020,#0b1020)]">
      <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;600;800&display=swap" rel="stylesheet" />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8 relative flex items-center justify-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Rezaei Family Todo</h1>
            <div className="h-10 w-10 rounded-2xl bg-white/10 backdrop-blur ring-1 ring-white/15 grid place-items-center shadow-lg">
              <CalendarClock className="h-5 w-5" />
            </div>
          </div>
          {currentRole && (
            <button onClick={logout} className="absolute right-0 btn-ghost flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 px-4 py-2">
              <LogOut className="h-4 w-4" /> خروج
            </button>
          )}
        </header>

        {!currentRole ? (
          <AuthCard profiles={profiles} setProfiles={setProfiles} onLoggedIn={setCurrentRole} />
        ) : currentRole === "mom" ? (
          <MomDashboard
            profiles={profiles}
            setProfiles={setProfiles}
            tasks={tasks}
            setTasks={setTasks}
            settings={settings}
            setSettings={setSettings}
            mailLog={mailLog}
          />
        ) : (
          <MemberDashboard role={currentRole as Exclude<Role,"mom">} profiles={profiles} tasks={tasks} setTasks={setTasks} mailLog={mailLog} />
        )}
      </div>
      <StyleInject />
    </div>
  );
}

/* ======================== Auth ======================== */
function AuthCard({
  profiles, setProfiles, onLoggedIn,
}: {
  profiles: Record<Role, Profile>;
  setProfiles: React.Dispatch<React.SetStateAction<Record<Role, Profile>>>;
  onLoggedIn: (r: Role) => void;
}) {
  const [role, setRole] = useState<Role>("mom");
  const [name, setName] = useState(profiles[role].name);
  const [email, setEmail] = useState(profiles[role].email);
  const [err, setErr]   = useState<{name?: string; email?: string}>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { setName(profiles[role].name); setEmail(profiles[role].email); setErr({}); }, [role, profiles]);

  function validate() {
    const e: typeof err = {};
    if (!name.trim()) e.name = "نام را وارد کنید";
    if (!email.trim()) e.email = "ایمیل را وارد کنید";
    else if (!isValidEmail(email)) e.email = "ایمیل نامعتبر است";
    setErr(e);
    return Object.keys(e).length === 0;
  }

  function save() {
    if (!validate()) return;
    setBusy(true);
    setProfiles(prev => ({ ...prev, [role]: { name: name.trim() || prev[role].name, email: email.trim() } }));
    onLoggedIn(role);
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card title="ورود" subtitle="نقش را انتخاب کن و ایمیلت را بنویس">
        <div className="grid gap-6">
          <RoleSelector role={role} onChange={setRole} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="نام" icon={<UserRound className="h-5 w-5" />}>
              <input className={`field ${err.name ? "ring-red-400 focus:ring-red-400" : ""}`} value={name} onChange={e=>setName(e.target.value)} placeholder="مثلاً بابای عزیز" />
              {err.name && <div className="text-red-300 text-sm mt-1">{err.name}</div>}
            </Field>
            <Field label="ایمیل" icon={<Mail className="h-5 w-5" />}>
              <input className={`field ltr ${err.email ? "ring-red-400 focus:ring-red-400" : ""}`} dir="ltr" inputMode="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="dad@example.com" />
              {err.email && <div className="text-red-300 text-sm mt-1">{err.email}</div>}
            </Field>
          </div>
          <button onClick={save} disabled={busy || !name.trim() || !isValidEmail(email)} className="btn-fancy">
             ورود به پنل
          </button>
        </div>
      </Card>
    </div>
  );
}

function RoleSelector({ role, onChange }: { role: Role; onChange: (r: Role)=>void }) {
  const items: { value: Role; label: string; icon: React.ReactNode }[] = [
    { value: "mom", label: "مامان", icon: <UserRound className="h-5 w-5" /> },
    { value: "dad", label: "بابا", icon: <UserRound className="h-5 w-5" /> },
    { value: "son", label: "پسر", icon: <Baby className="h-5 w-5" /> },
  ];
  return (
    <div className="flex gap-3">
      {items.map(it=>(
        <button key={it.value} onClick={()=>onChange(it.value)} className={`flex-1 rounded-2xl p-4 text-center ring-1 ring-white/15 backdrop-blur bg-white/5 hover:bg-white/10 transition ${role===it.value?"shadow-xl shadow-emerald-500/20 ring-emerald-400/50":""}`}>
          <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-white/10">{it.icon}</div>
          <div className="text-lg font-semibold">{it.label}</div>
        </button>
      ))}
    </div>
  );
}

/* ======================== Mom Dashboard ======================== */
function MomDashboard({
  profiles, setProfiles, tasks, setTasks, settings, setSettings, mailLog,
}: {
  profiles: Record<Role, Profile>;
  setProfiles: React.Dispatch<React.SetStateAction<Record<Role, Profile>>>;
  tasks: Task[]; setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  settings: { warnMinutes: number }; setSettings: React.Dispatch<React.SetStateAction<{ warnMinutes: number }>>;
  mailLog: { id: string; to: string; text: string; time: number }[];
}) {
  // creator (duration-based)
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [assignee, setAssignee] = useState<"dad"|"son">("dad");
  const [durationHours, setDurationHours] = useState<number>(3); // default 3h
  const [editingId, setEditingId] = useState<string|null>(null);
  const [editingCreatedAt, setEditingCreatedAt] = useState<number|null>(null);
  const [err, setErr] = useState<{title?: string; duration?: string}>({});
  const [saving, setSaving] = useState(false);

  function validateForm() {
    const e: typeof err = {};
    if (!title.trim()) e.title = "عنوان را بنویس";
    if (!Number.isFinite(durationHours) || durationHours <= 0) e.duration = "مدت‌زمان باید بزرگ‌تر از صفر باشد";
    setErr(e);
    return Object.keys(e).length === 0;
  }

  function upsertTask() {
    if (!validateForm()) return;
    setSaving(true);
    const durationMs = Math.max(0.1, durationHours) * 60 * 60 * 1000;

    if (editingId) {
      // حفظ createdAt سابق، محاسبهٔ dueAt بر اساس مدت جدید
      const createdAt = editingCreatedAt ?? now();
      const dueAt = createdAt + durationMs;
      setTasks(prev => prev.map(t => t.id === editingId ? { ...t, title: title.trim(), notes, assignee, dueAt } : t));
      setEditingId(null);
      setEditingCreatedAt(null);
    } else {
      const createdAt = now();
      const dueAt = createdAt + durationMs;
      const nt: Task = { id: crypto.randomUUID(), title: title.trim(), notes, assignee, createdAt, dueAt, status: "pending" };
      setTasks(prev => [nt, ...prev]);
    }
    // reset
    setTitle(""); setNotes(""); setAssignee("dad"); setDurationHours(3);
    setSaving(false);
  }

  function editTask(t: Task) {
    setEditingId(t.id);
    setEditingCreatedAt(t.createdAt);
    setTitle(t.title); setNotes(t.notes || ""); setAssignee(t.assignee);
    // استخراج مدت از اختلاف dueAt - createdAt
    const hours = Math.max(0.1, (t.dueAt - t.createdAt) / (60*60*1000));
    setDurationHours(Number(hours.toFixed(2)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const removeTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  const pending = tasks.filter(t => t.status === "pending");
  const done    = tasks.filter(t => t.status === "done");

  return (
    <div className="grid gap-8">
      <Card
        title={editingId ? "ویرایش تسک" : "تسک جدید"}
        subtitle="مدت‌زمان انجام را مشخص کن؛ اگر خالی بگذاری، ۳ ساعت در نظر گرفته می‌شود"
        actions={<SettingsPopup settings={settings} setSettings={setSettings} />}
      >
        <div className="rounded-3xl p-5 md:p-6 bg-white/5 ring-1 ring-white/10 backdrop-blur shadow-xl shadow-black/20">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="عنوان" icon={<Edit3 className="h-4 w-4" />}>
              <input className={`field ${err.title ? "ring-red-400 focus:ring-red-400" : ""}`} value={title} onChange={e=>setTitle(e.target.value)} placeholder="مثلاً «خرید نان تازه»" />
              {err.title && <div className="text-red-300 text-sm mt-1">{err.title}</div>}
            </Field>
            <Field label="مدت‌زمان (ساعت)" icon={<Clock className="h-4 w-4" />}>
              <input
                type="number"
                min={0.25}
                step={0.25}
                className={`field ltr ${err.duration ? "ring-red-400 focus:ring-red-400" : ""}`}
                value={Number.isFinite(durationHours) ? durationHours : 3}
                onChange={(e)=> setDurationHours(e.target.value === "" ? 3 : parseFloat(e.target.value))}
                placeholder="مثلاً 3"
              />
              {err.duration && <div className="text-red-300 text-sm mt-1">{err.duration}</div>}
              <div className="text-xs text-white/60 mt-1">اگر خالی بگذاری، پیش‌فرض ۳ ساعت لحاظ می‌شود.</div>
            </Field>
          </div>

          <Field label="توضیحات">
            <textarea className="field" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="اگر نکته‌ای هست اینجا بنویس…" />
          </Field>

          <div className="mt-3 flex flex-wrap gap-3">
            <AssignChip who="dad" selected={assignee==="dad"} onClick={()=>setAssignee("dad")} label={profiles.dad.name || "بابا"} />
            <AssignChip who="son" selected={assignee==="son"} onClick={()=>setAssignee("son")} label={profiles.son.name || "پسر"} />
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-6">
            <button onClick={upsertTask} disabled={saving} className="btn-fancy flex items-center justify-center gap-2">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : (editingId ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />)}
              {editingId ? "ذخیره تغییرات" : "ایجاد تسک"}
            </button>
            {editingId && <button onClick={()=>{ setEditingId(null); setEditingCreatedAt(null); }} className="btn-ghost">انصراف از ویرایش</button>}
          </div>
        </div>
      </Card>

      {/* هر دو بخش باهم، زیر هم */}
      <Card title={`تسک‌های درحال انجام (${pending.length})`} subtitle="فقط فرد مسئول می‌تواند تیک بزند">
        <TaskGrid tasks={pending} profiles={profiles} onEdit={editTask} onRemove={removeTask} />
      </Card>

      <Card title={`پایان‌یافته (${done.length})`} subtitle="تسک‌های انجام‌شده">
        <TaskGrid tasks={done} profiles={profiles} onEdit={editTask} onRemove={removeTask} />
      </Card>

      {/* Mail log */}
      <Card title="ایمیل‌های ارسال‌شده">
        <div className="grid gap-2">
          {mailLog.length===0 && <EmptyState text="هنوز ایمیلی ارسال نشده" />}
          {mailLog.map(s=>(
            <div key={s.id} className="flex items-start justify-between gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
              <div>
                <div className="text-xs text-white/60">به: {s.to || "—"}</div>
                <div className="text-sm whitespace-pre-wrap">{s.text}</div>
              </div>
              <div className="text-xs text-white/60 ltr whitespace-nowrap">{new Date(s.time).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ======================== Member Dashboard ======================== */
function MemberDashboard({
  role, profiles, tasks, setTasks, mailLog,
}: {
  role: Exclude<Role,"mom">;
  profiles: Record<Role, Profile>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  mailLog: { id: string; to: string; text: string; time: number }[];
}) {
  const mine = tasks.filter(t=>t.assignee===role);
  const pending = mine.filter(t=>t.status==="pending");
  const done    = mine.filter(t=>t.status==="done");

  function toggle(t: Task){
    const nt = { ...t, status: t.status==="pending" ? "done" : "pending" } as Task;
    setTasks(prev=>prev.map(x=>x.id===t.id?nt:x));
  }

  const myEmail = profiles[role].email?.trim();
  const myMailLog = useMemo(()=>mailLog.filter(m=>myEmail && m.to.trim().toLowerCase()===myEmail.toLowerCase()),[mailLog,myEmail]);

  return (
    <div className="grid gap-8">
      <Card title={`سلام ${profiles[role].name || (role==="dad"?"بابا":"پسر")} 👋`} subtitle="اینجا تسک‌های شماست" />
      <Card title={`درحال انجام (${pending.length})`}>
        <TaskGrid tasks={pending} profiles={profiles} onToggle={toggle} />
      </Card>
      <Card title={`پایان‌یافته (${done.length})`}>
        <TaskGrid tasks={done} profiles={profiles} onToggle={toggle} />
      </Card>

      <Card title="ایمیل‌های شما">
        <div className="grid gap-2">
          {myMailLog.length===0 && <EmptyState text="هنوز ایمیلی برای شما ثبت نشده" />}
          {myMailLog.map(s=>(
            <div key={s.id} className="flex items-start justify-between gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
              <div>
                <div className="text-xs text-white/60">به: {s.to || "—"}</div>
                <div className="text-sm whitespace-pre-wrap">{s.text}</div>
              </div>
              <div className="text-xs text-white/60 ltr whitespace-nowrap">{new Date(s.time).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ======================== Pretty Task Grid ======================== */
function TaskGrid({
  tasks, profiles, onEdit, onRemove, onToggle,
}: {
  tasks: Task[];
  profiles: Record<Role, Profile>;
  onEdit?: (t: Task)=>void;
  onRemove?: (id: string)=>void;
  onToggle?: (t: Task)=>void;
}) {
  if (tasks.length===0) return <EmptyState text="اینجا فعلاً چیزی نیست" />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tasks.map(t=><TaskCard key={t.id} t={t} profiles={profiles} onEdit={onEdit} onRemove={onRemove} onToggle={onToggle} />)}
    </div>
  );
}

function TaskCard({
  t, profiles, onEdit, onRemove, onToggle,
}: {
  t: Task; profiles: Record<Role, Profile>;
  onEdit?: (t: Task)=>void; onRemove?: (id: string)=>void; onToggle?: (t: Task)=>void;
}) {
  const [tick, setTick] = useState(Date.now());
  useEffect(()=>{ const i=setInterval(()=>setTick(Date.now()),1000); return ()=>clearInterval(i); },[]);
  const total = Math.max(1, t.dueAt - t.createdAt);
  const remain = t.dueAt - tick;
  const late = remain <= 0;
  const progress = clamp(((tick - t.createdAt)/total)*100);
  const whoLabel = t.assignee==="dad" ? (profiles.dad.name||"بابا") : (profiles.son.name||"پسر");

  // مدت‌کل (ساعت) از روی task
  const totalHours = Math.max(0.1, (t.dueAt - t.createdAt)/(60*60*1000));

  return (
    <div className="rounded-3xl p-4 bg-white/8 ring-1 ring-white/10 backdrop-blur shadow-xl hover:shadow-2xl transition">
      <div className="flex items-center justify-between mb-2">
        <span className={`chip ${late ? "bg-red-400 text-black ring-red-500" : t.status==="done" ? "bg-emerald-400 text-black ring-emerald-500" : "bg-white/10 ring-white/15"}`}>
          {late ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />} {late ? "گذشته" : (t.status==="done" ? "تمام‌شده" : "درحال انجام")}
        </span>
        <span className="chip bg-white/10 ring-white/15">{t.assignee==="dad"?<UserRound className="h-4 w-4" />:<Baby className="h-4 w-4" />} {whoLabel}</span>
      </div>

      <div className="font-extrabold text-lg">{t.title}</div>
      {t.notes && <div className="text-sm text-white/85 my-1 leading-7">{t.notes}</div>}

      <div className="mt-2 text-sm text-white/70 flex items-center gap-2">
        <CalendarClock className="h-4 w-4" />
        ددلاین: {new Date(t.dueAt).toLocaleString()} <span className="text-white/50">•</span> کل زمان: {totalHours.toFixed(2)} ساعت
      </div>

      {/* progress bar */}
      <div className="mt-4 h-3 w-full rounded-full bg-white/10 ring-1 ring-white/10 overflow-hidden">
        <div className={`h-full ${late ? "bg-gradient-to-r from-red-400 to-red-300" : "bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-200"}`} style={{ width: `${late ? 100 : progress}%` }} />
      </div>
      <div className="mt-1 text-xs text-white/60">
        {late ? "ددلاین گذشته" : `${formatRemaining(remain)} مانده`}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-white/60">شروع: {new Date(t.createdAt).toLocaleString()}</div>
        <div className="flex items-center gap-2">
          {onToggle && (
            <button onClick={()=>onToggle(t)} className="btn-ghost flex items-center gap-2">
              <Check className="h-4 w-4" /> {t.status==="pending" ? "تسک انجام شد" : "برگردان"}
            </button>
          )}
          {onEdit && <button onClick={()=>onEdit(t)} className="btn-ghost flex items-center gap-2"><Edit3 className="h-4 w-4" /> ویرایش</button>}
          {onRemove && <button onClick={()=>onRemove(t.id)} className="btn-ghost flex items-center gap-2"><Trash2 className="h-4 w-4" /> حذف</button>}
        </div>
      </div>
    </div>
  );
}

/* ======================== small parts ======================== */
function AssignChip({ who, selected, onClick, label }: { who: "dad"|"son"; selected: boolean; onClick: ()=>void; label: string }) {
  return (
    <button onClick={onClick} className={`chip px-4 py-2 rounded-xl ${selected ? "bg-emerald-400 text-black ring-emerald-500" : "bg-white/10 ring-white/15"}`}>
      {who==="dad"?<UserRound className="h-4 w-4" />:<Baby className="h-4 w-4" />} {label}
    </button>
  );
}

function SettingsPopup({ settings, setSettings }: {
  settings: { warnMinutes: number };
  setSettings: React.Dispatch<React.SetStateAction<{ warnMinutes: number }>>;
}) {
  const [open, setOpen] = useState(false);
  const [warn, setWarn] = useState(settings.warnMinutes);
  function save(){ setSettings({ warnMinutes: Math.max(1, Math.min(1440, warn)) }); setOpen(false); }
  return (
    <>
      <button onClick={()=>setOpen(true)} className="btn-ghost flex items-center gap-2"><Settings className="h-4 w-4" /> تنظیمات</button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0f1629] p-6 ring-1 ring-white/10">
            <h3 className="text-lg font-extrabold">تنظیمات یادآوری</h3>
            <p className="text-sm text-white/70 mt-1">چند دقیقه مانده به ددلاین ایمیل برود؟</p>
            <div className="mt-4 flex items-center gap-3">
              <input className="field ltr w-28 text-center" type="number" min={1} max={1440} value={warn} onChange={e=>setWarn(parseInt(e.target.value||"0",10))} />
              <span className="text-sm">دقیقه</span>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button onClick={()=>setOpen(false)} className="btn-ghost">بستن</button>
              <button onClick={save} className="btn-fancy w-auto">ذخیره</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ======================== primitives ======================== */
function Card({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: React.ReactNode; children?: React.ReactNode; }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-7 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-3xl font-extrabold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-1 text-white/70">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <div className="flex items-center gap-2 text-white/85"><span className="inline-grid h-8 w-8 place-items-center rounded-lg bg-white/10">{icon}</span><span className="text-lg">{label}</span></div>
      <div>{children}</div>
    </label>
  );
}
function EmptyState({ text }: { text: string }) {
  return <div className="grid place-items-center rounded-3xl border border-dashed border-white/15 bg-white/5 p-8 text-white/70">{text}</div>;
}
function StyleInject() {
  return (
    <style>{`
      .field{width:100%;border-radius:1.25rem;background:rgba(255,255,255,.08);padding:.9rem 1.1rem;outline:0;box-shadow:inset 0 1px 0 rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15)}
      .btn-fancy{width:100%;border-radius:1.25rem;background:linear-gradient(90deg,#34d399,#6ee7b7,#a7f3d0);color:#000;font-weight:800;padding:.9rem 1.1rem;box-shadow:0 10px 25px rgba(16,185,129,.35);border:1px solid rgba(16,185,129,.4)}
      .btn-ghost{border-radius:1rem;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);padding:.6rem 1rem}
      .chip{display:inline-flex;align-items:center;gap:.4rem;padding:.35rem .65rem;border-radius:.8rem;border:1px solid rgba(255,255,255,.16)}
      .bg-white\\/8{background:rgba(255,255,255,.08)}
    `}</style>
  );
}
