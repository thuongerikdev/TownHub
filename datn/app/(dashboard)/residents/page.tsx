"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Camera, Eye, EyeOff, Loader2, Pencil, Plus, RefreshCw, Search,
  Trash2, UserPlus, UserRoundCheck, X,
} from "lucide-react";
import {
  accessControl, apartments, residents, roles, users,
  type ApartmentResponse, type FaceProfileResponse, type GetUserResponse, type ResidentResponse,
} from "@/lib/api";

type FormState = {
  fullName: string; phone: string; email: string; idCard: string; apartmentId: string;
  userName: string; password: string; isOwner: boolean;
};

const EMPTY: FormState = {
  fullName: "", phone: "", email: "", idCard: "", apartmentId: "",
  userName: "", password: "", isOwner: false,
};

function normalizeRoleName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .trim()
    .toLowerCase();
}

export default function ResidentsPage() {
  const [items, setItems] = useState<ResidentResponse[]>([]);
  const [accounts, setAccounts] = useState<GetUserResponse[]>([]);
  const [apartmentList, setApartmentList] = useState<ApartmentResponse[]>([]);
  const [faces, setFaces] = useState<Record<number, FaceProfileResponse | null>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ResidentResponse | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [faceTarget, setFaceTarget] = useState<ResidentResponse | null>(null);
  const [notice, setNotice] = useState<{ message: string; warning?: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [residentRes, userRes, apartmentRes] = await Promise.all([
      residents.getAll(), users.getAllResidents(), apartments.getAll(),
    ]);
    const residentItems = residentRes.errorCode === 200 ? residentRes.data ?? [] : [];
    setItems(residentItems);
    setAccounts(userRes.errorCode === 200 ? userRes.data ?? [] : []);
    setApartmentList(apartmentRes.errorCode === 200 ? apartmentRes.data ?? [] : []);
    const results = await Promise.all(residentItems.map(async (resident) => {
      const response = await accessControl.getFace(resident.id);
      return [resident.id, response.errorCode === 200 ? response.data : null] as const;
    }));
    setFaces(Object.fromEntries(results));
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial remote data synchronization for this client-only administration screen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      [item.fullName, item.phone, item.email, item.idCard, item.apartmentCode]
        .some((value) => value?.toLowerCase().includes(normalized)));
  }, [items, query]);

  function openEdit(item: ResidentResponse) {
    const account = accounts.find((user) => user.userID === item.authUserId);
    setEditing(item);
    setForm({
      fullName: item.fullName, phone: item.phone, email: item.email ?? "",
      idCard: item.idCard ?? "", apartmentId: item.apartmentId ? String(item.apartmentId) : "",
      userName: account?.userName ?? "", password: "", isOwner: item.isOwner,
    });
    setError("");
    setFormOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.fullName.trim() || !form.phone.trim() || !form.email.trim()) {
      setError("Họ tên, số điện thoại và email là bắt buộc.");
      return;
    }
    if (!editing && (!form.userName.trim() || form.password.length < 6)) {
      setError("Tên đăng nhập là bắt buộc và mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    setSaving(true);
    try {
      let authUserId = editing?.authUserId;
      let createdAuthUserId: number | undefined;
      if (!editing) {
        const roleRes = await roles.getAllScopeUser();
        if (roleRes.errorCode !== 200) {
          setError(roleRes.errorMessage || "Không tải được danh sách vai trò.");
          return;
        }
        let residentRole = roleRes.data?.find((role) =>
          ["cu dan", "resident"].includes(normalizeRoleName(role.roleName)));
        if (!residentRole) {
          const createRoleRes = await roles.add({
            roleName: "Cư dân",
            roleDescription: "Tài khoản cư dân",
            isDefault: false,
          });
          if (createRoleRes.errorCode !== 200 || !createRoleRes.data) {
            setError(createRoleRes.errorMessage || "Không thể tự tạo role Cư dân.");
            return;
          }
          residentRole = createRoleRes.data;
        }
        const names = form.fullName.trim().split(/\s+/);
        const accountRes = await users.createUser({
          userName: form.userName.trim(), email: form.email.trim(), password: form.password,
          roleIds: [residentRole.roleID], firstName: names.slice(0, -1).join(" "),
          lastName: names.at(-1) ?? "", scope: "user", autoVerifyEmail: true,
        });
        if (accountRes.errorCode !== 200) {
          setError(accountRes.errorMessage || "Không tạo được tài khoản cư dân.");
          return;
        }
        authUserId = accountRes.data.userID;
        createdAuthUserId = authUserId;
      } else {
        const account = accounts.find((user) => user.userID === editing.authUserId);
        if (account && form.userName.trim() && form.userName.trim() !== account.userName) {
          const updateRes = await users.updateUsername(account.userID, form.userName.trim());
          if (updateRes.errorCode !== 200) {
            setError(updateRes.errorMessage || "Không cập nhật được tên đăng nhập.");
            return;
          }
        }
      }

      const body = {
        fullName: form.fullName.trim(), phone: form.phone.trim(), email: form.email.trim(),
        idCard: form.idCard.trim() || undefined,
        apartmentId: form.apartmentId ? Number(form.apartmentId) : undefined,
        isOwner: form.isOwner, authUserId,
      };
      const response = editing
        ? await residents.update({ ...body, id: editing.id })
        : await residents.create(body);
      if (response.errorCode !== 200) {
        if (createdAuthUserId) await users.deleteUser(createdAuthUserId);
        setError(response.errorMessage || "Không lưu được hồ sơ cư dân.");
        return;
      }
      setFormOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: ResidentResponse) {
    if (!confirm(`Xóa vĩnh viễn cư dân ${item.fullName}?\n\nTài khoản, email, mật khẩu, phiên đăng nhập, vai trò và dữ liệu khuôn mặt AI liên kết cũng sẽ bị xóa. Hành động này không thể hoàn tác.`)) return;
    const response = await residents.delete(item.id);
    if (response.errorCode !== 200) return alert(response.errorMessage);
    if (item.authUserId) {
      const accountResponse = await users.deleteUser(item.authUserId);
      if (accountResponse.errorCode !== 200) {
        alert(`Đã xóa hồ sơ cư dân nhưng chưa xóa được tài khoản đăng nhập: ${accountResponse.errorMessage}`);
        await load();
        return;
      }
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tài khoản cư dân</h1>
          <p className="mt-1 text-sm text-muted-foreground">CRUD tài khoản role Cư dân, hồ sơ căn hộ và đăng ký khuôn mặt AI.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="rounded-lg border border-border p-2.5"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground"><Plus className="size-4" /> Thêm cư dân</button>
        </div>
      </header>

      {notice && (
        <div className={`rounded-xl border p-3 text-sm ${notice.warning ? "border-amber-500/30 bg-amber-500/10 text-amber-600" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"}`}>
          {notice.message}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên, SĐT, email, CCCD, căn hộ..." className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm outline-none focus:border-brand" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {loading ? <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-xs uppercase text-muted-foreground"><tr>
                <th className="px-5 py-4">Cư dân</th><th className="px-5 py-4">Tài khoản</th>
                <th className="px-5 py-4">Căn hộ</th><th className="px-5 py-4">Khuôn mặt AI</th><th className="px-5 py-4 text-right">Thao tác</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => {
                  const account = accounts.find((user) => user.userID === item.authUserId);
                  const face = faces[item.id];
                  return <tr key={item.id} className="hover:bg-surface-2/50">
                    <td className="px-5 py-4"><div className="font-semibold">{item.fullName}</div><div className="text-xs text-muted-foreground">{item.phone} · {item.email}</div></td>
                    <td className="px-5 py-4"><div>{account?.userName ?? "Chưa liên kết"}</div><div className="text-xs text-muted-foreground">{account ? `#${account.userID} · ${account.status}` : ""}</div></td>
                    <td className="px-5 py-4">{item.apartmentCode ?? "Chưa gán"}{item.isOwner && <span className="ml-2 rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-500">Chủ hộ</span>}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setFaceTarget(item)}
                        title={face?.failureReason}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                          face?.aiStatus === "failed"
                            ? "border-rose-500/30 text-rose-500"
                            : face
                              ? "border-emerald-500/30 text-emerald-500"
                              : "border-border text-muted-foreground"
                        }`}
                      >
                        {face ? <UserRoundCheck className="size-4" /> : <Camera className="size-4" />}
                        {face ? ({ pending: "Đang xử lý", ready: "Đã đăng ký", failed: "Không thấy khuôn mặt" }[face.aiStatus] ?? face.aiStatus) : "Đăng ký"}
                      </button>
                    </td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(item)} className="rounded-lg p-2 hover:bg-accent"><Pencil className="size-4" /></button>
                      <button onClick={() => void remove(item)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="size-4" /></button>
                    </div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && <ResidentModal form={form} setForm={setForm} editing={editing} apartments={apartmentList} error={error} saving={saving} onClose={() => setFormOpen(false)} onSubmit={submit} />}
      {faceTarget && <FaceModal resident={faceTarget} profile={faces[faceTarget.id]} onClose={() => setFaceTarget(null)} onChanged={load} />}
      {createOpen && (
        <CreateResidentModal
          apartments={apartmentList}
          onClose={() => setCreateOpen(false)}
          onCreated={(message, warning) => {
            setNotice({ message, warning });
            void load();
          }}
        />
      )}
    </div>
  );
}

function ResidentModal({ form, setForm, editing, apartments: apartmentList, error, saving, onClose, onSubmit }: {
  form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; editing: ResidentResponse | null;
  apartments: ApartmentResponse[]; error: string; saving: boolean; onClose: () => void; onSubmit: (event: React.FormEvent) => void;
}) {
  const field = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
    <form onSubmit={onSubmit} className="w-full max-w-2xl rounded-2xl border border-border bg-background p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold">{editing ? "Cập nhật cư dân" : "Thêm tài khoản cư dân"}</h2><p className="text-xs text-muted-foreground">Tài khoản mới sẽ tự động được gán role Cư dân.</p></div><button type="button" onClick={onClose}><X className="size-5" /></button></div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Họ và tên" value={form.fullName} onChange={field("fullName")} />
        <Input label="Số điện thoại" value={form.phone} onChange={field("phone")} />
        <Input label="Email" type="email" value={form.email} onChange={field("email")} disabled={Boolean(editing)} />
        <Input label="CCCD / CMND" value={form.idCard} onChange={field("idCard")} />
        <Input label="Tên đăng nhập" value={form.userName} onChange={field("userName")} />
        {!editing && <Input label="Mật khẩu ban đầu" type="password" value={form.password} onChange={field("password")} />}
        <label className="space-y-1 text-sm"><span className="text-muted-foreground">Căn hộ</span><select value={form.apartmentId} onChange={(e) => setForm((current) => ({ ...current, apartmentId: e.target.value }))} className="h-10 w-full rounded-lg border border-white/15 bg-black px-3 text-white [color-scheme:dark]"><option value="" className="bg-black text-white">Chưa gán</option>{apartmentList.map((apartment) => <option key={apartment.id} value={apartment.id} className="bg-black text-white">{apartment.code}</option>)}</select></label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={form.isOwner} onChange={(e) => setForm((current) => ({ ...current, isOwner: e.target.checked }))} /> Chủ hộ</label>
      </div>
      {error && <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2">Hủy</button><button disabled={saving} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 font-semibold text-brand-foreground">{saving && <Loader2 className="size-4 animate-spin" />} Lưu</button></div>
    </form>
  </div>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return <label className="space-y-1 text-sm"><span className="text-muted-foreground">{label}</span><input {...inputProps} className="h-10 w-full rounded-lg border border-border bg-surface px-3 outline-none focus:border-brand disabled:opacity-60" /></label>;
}

function FaceModal({ resident, profile, onClose, onChanged }: { resident: ResidentResponse; profile: FaceProfileResponse | null; onClose: () => void; onChanged: () => Promise<void> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(profile?.imageUrl ?? "");
  const [saving, setSaving] = useState(false);
  async function choose(file?: File) {
    if (!file) return;
    const value = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
    });
    setPreview(value);
  }
  async function save() {
    if (!preview) return;
    setSaving(true);
    const response = await accessControl.registerFace(resident.id, preview);
    setSaving(false);
    if (response.errorCode !== 200) return alert(response.errorMessage);
    await onChanged(); onClose();
  }
  async function remove() {
    const response = await accessControl.deleteFace(resident.id);
    if (response.errorCode !== 200) return alert(response.errorMessage);
    await onChanged(); onClose();
  }
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4"><div className="w-full max-w-md rounded-2xl border border-border bg-background p-6">
    <div className="flex justify-between"><div><h2 className="font-bold">Đăng ký khuôn mặt AI</h2><p className="text-sm text-muted-foreground">{resident.fullName}</p></div><button onClick={onClose}><X className="size-5" /></button></div>
    <div className="my-5 flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-surface-2">
      {preview ? (
        // Preview can be a local data URL or an API-hosted URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Ảnh khuôn mặt" className="size-full object-cover" />
      ) : <Camera className="size-12 text-muted-foreground" />}
    </div>
    <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => void choose(e.target.files?.[0])} />
    <button onClick={() => fileRef.current?.click()} className="w-full rounded-lg border border-border py-2.5 text-sm">Chụp / chọn ảnh chính diện</button>
    <p className="mt-3 text-xs text-muted-foreground">Ảnh sẽ được đưa vào hàng đợi AI. Chỉ lưu tham chiếu embedding, không lưu vector nhận diện trong giao diện quản trị.</p>
    {profile?.failureReason && <p className="mt-3 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-500">{profile.failureReason} Hãy chọn ảnh chính diện, đủ sáng và khuôn mặt chiếm phần lớn khung hình.</p>}
    <div className="mt-5 flex justify-between">{profile ? <button onClick={() => void remove()} className="text-sm text-destructive">Xóa đăng ký</button> : <span />}<button onClick={() => void save()} disabled={!preview || saving} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 font-semibold text-brand-foreground disabled:opacity-50">{saving && <Loader2 className="size-4 animate-spin" />} Gửi đăng ký</button></div>
  </div></div>;
}

// ─── Create Resident Modal (đăng ký cư dân mới, kèm hộ kinh doanh) ─────────────

const BUSINESS_CATEGORIES = [
  { value: "cleaning",  label: "Vệ sinh – Làm sạch" },
  { value: "repair",    label: "Sửa chữa & Bảo trì" },
  { value: "security",  label: "An ninh – Bảo vệ" },
  { value: "food",      label: "Ẩm thực – F&B" },
  { value: "fitness",   label: "Thể dục – Thể thao" },
  { value: "education", label: "Giáo dục – Đào tạo" },
  { value: "beauty",    label: "Làm đẹp – Spa" },
  { value: "other",     label: "Khác" },
];

const EMPTY_CREATE_FORM = {
  userName: "",
  email: "",
  password: "",
  fullName: "",
  phone: "",
  idCard: "",
  dateOfBirth: "",
  gender: "male",
  apartmentId: "",
  isOwner: true,
  moveInDate: "",
  isBusinessOwner: false,
  businessCompanyName: "",
  businessServiceCategories: [] as string[],
  businessAddress: "",
};

function CreateResidentModal({ apartments: apartmentList, onClose, onCreated }: {
  apartments: ApartmentResponse[];
  onClose: () => void;
  onCreated: (message: string, isWarning?: boolean) => void;
}) {
  const [form, setForm] = useState(EMPTY_CREATE_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof typeof EMPTY_CREATE_FORM>(k: K, v: typeof EMPTY_CREATE_FORM[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  }

  function toggleCategory(cat: string) {
    setForm((f) => ({
      ...f,
      businessServiceCategories: f.businessServiceCategories.includes(cat)
        ? f.businessServiceCategories.filter((c) => c !== cat)
        : [...f.businessServiceCategories, cat],
    }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.userName.trim()) e.userName = "Bắt buộc";
    if (!form.password.trim()) e.password = "Bắt buộc";
    if (!form.fullName.trim()) e.fullName = "Bắt buộc";
    if (!form.phone.trim())    e.phone    = "Bắt buộc";
    if (!form.idCard.trim())   e.idCard   = "Bắt buộc";
    if (!form.dateOfBirth)     e.dateOfBirth = "Bắt buộc";
    if (!form.apartmentId)     e.apartmentId = "Chọn căn hộ";
    if (!form.moveInDate)      e.moveInDate  = "Bắt buộc";
    if (form.isBusinessOwner) {
      if (!form.businessCompanyName.trim()) e.businessCompanyName = "Bắt buộc";
      if (!form.businessServiceCategories.length) e.businessServiceCategories = "Chọn ít nhất 1 loại";
      if (!form.businessAddress.trim()) e.businessAddress = "Bắt buộc";
    }
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setSaving(true);
    try {
      const cats = form.businessServiceCategories.length
        ? JSON.stringify(form.businessServiceCategories)
        : null;

      const res = await residents.registerCreate({
        userName:    form.userName.trim(),
        email:       form.email.trim() || undefined,
        password:    form.password,
        fullName:    form.fullName.trim(),
        phone:       form.phone.trim(),
        idCard:      form.idCard.trim(),
        dateOfBirth: new Date(form.dateOfBirth).toISOString(),
        gender:      form.gender,
        avatarUrl:   null,
        apartmentId: Number(form.apartmentId),
        isOwner:     form.isOwner,
        moveInDate:  new Date(form.moveInDate).toISOString(),
        isBusinessOwner:           form.isBusinessOwner,
        businessCompanyName:       form.isBusinessOwner ? form.businessCompanyName.trim() : null,
        businessServiceCategories: form.isBusinessOwner ? cats : null,
        businessAddress:           form.isBusinessOwner ? form.businessAddress.trim() : null,
      });

      if (res.errorCode !== 200) {
        setErrors({ submit: res.errorMessage || "Không tạo được tài khoản cư dân." });
        return;
      }

      if (res.data?.warning) {
        onCreated(res.data.warning, true);
      } else if (res.data?.message) {
        onCreated(res.data.message);
      } else {
        onCreated("Tạo tài khoản cư dân thành công.");
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, key: keyof typeof EMPTY_CREATE_FORM, opts?: { placeholder?: string; type?: string }) => (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
        {label} {["userName", "password", "fullName", "phone", "idCard", "dateOfBirth", "apartmentId", "moveInDate"].includes(key) && <span className="text-red-400">*</span>}
      </label>
      <input
        type={opts?.type ?? "text"}
        value={form[key] as string}
        onChange={(e) => set(key, e.target.value as never)}
        placeholder={opts?.placeholder}
        className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${
          errors[key] ? "border-red-500/50" : "border-white/10"
        }`}
      />
      {errors[key] && <p className="text-[10px] text-red-400 mt-1">{errors[key]}</p>}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-2xl bg-[#0e0e0e] border border-white/10 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Tạo tài khoản cư dân</h2>
              <p className="text-[10px] text-zinc-500">Tạo tài khoản đăng nhập và hồ sơ cư dân</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body – scrollable */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Section: Tài khoản */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Thông tin tài khoản</p>
            <div className="grid grid-cols-2 gap-3">
              {field("Tên đăng nhập", "userName", { placeholder: "nguyen.van.an" })}
              {field("Email", "email", { placeholder: "email@example.com", type: "email" })}
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Mật khẩu <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="Abc@123456"
                  className={`w-full bg-white/5 border rounded-lg px-3 py-2 pr-9 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${
                    errors.password ? "border-red-500/50" : "border-white/10"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {errors.password && <p className="text-[10px] text-red-400 mt-1">{errors.password}</p>}
            </div>
          </div>

          {/* Section: Hồ sơ cá nhân */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Hồ sơ cá nhân</p>
            <div className="grid grid-cols-2 gap-3">
              {field("Họ và tên", "fullName", { placeholder: "Nguyễn Văn An" })}
              {field("Số điện thoại", "phone", { placeholder: "0901234567" })}
              {field("CCCD / CMND", "idCard", { placeholder: "079200001234" })}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Ngày sinh <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                  className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${
                    errors.dateOfBirth ? "border-red-500/50" : "border-white/10"
                  }`}
                />
                {errors.dateOfBirth && <p className="text-[10px] text-red-400 mt-1">{errors.dateOfBirth}</p>}
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Giới tính</label>
              <div className="flex gap-2">
                {[{ v: "male", l: "Nam" }, { v: "female", l: "Nữ" }, { v: "other", l: "Khác" }].map(({ v, l }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set("gender", v)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      form.gender === v
                        ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                        : "text-zinc-400 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Căn hộ */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Thông tin căn hộ</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Căn hộ <span className="text-red-400">*</span></label>
                <select
                  value={form.apartmentId}
                  onChange={(e) => set("apartmentId", e.target.value)}
                  className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${
                    errors.apartmentId ? "border-red-500/50" : "border-white/10"
                  }`}
                >
                  <option value="" className="bg-[#1a1a1a]">-- Chọn căn hộ --</option>
                  {apartmentList.map((a) => (
                    <option key={a.id} value={a.id} className="bg-[#1a1a1a]">
                      {a.code} – {a.building} ({a.status === "occupied" ? "Đang ở" : a.status === "vacant" ? "Trống" : "Bảo trì"})
                    </option>
                  ))}
                </select>
                {errors.apartmentId && <p className="text-[10px] text-red-400 mt-1">{errors.apartmentId}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Ngày chuyển vào <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={form.moveInDate}
                  onChange={(e) => set("moveInDate", e.target.value)}
                  className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${
                    errors.moveInDate ? "border-red-500/50" : "border-white/10"
                  }`}
                />
                {errors.moveInDate && <p className="text-[10px] text-red-400 mt-1">{errors.moveInDate}</p>}
              </div>
            </div>
            <div className="mt-3">
              <label className="flex items-center gap-2.5 cursor-pointer w-fit">
                <div
                  onClick={() => set("isOwner", !form.isOwner)}
                  className={`w-8 h-4.5 rounded-full transition-colors relative ${form.isOwner ? "bg-amber-500" : "bg-zinc-700"}`}
                >
                  <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${form.isOwner ? "translate-x-3.5" : "translate-x-0.5"}`} />
                </div>
                <span className="text-xs text-zinc-300">Là chủ sở hữu căn hộ</span>
              </label>
            </div>
          </div>

          {/* Section: Hộ kinh doanh */}
          <div className="border border-white/5 rounded-xl p-4">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => set("isBusinessOwner", !form.isBusinessOwner)}
                className={`w-8 h-4.5 rounded-full transition-colors relative flex-shrink-0 ${form.isBusinessOwner ? "bg-blue-500" : "bg-zinc-700"}`}
              >
                <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${form.isBusinessOwner ? "translate-x-3.5" : "translate-x-0.5"}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-200">Đăng ký hộ kinh doanh</p>
                <p className="text-[10px] text-zinc-500">Cư dân này cũng là nhà cung cấp dịch vụ trong tòa nhà</p>
              </div>
            </label>

            <AnimatePresence>
              {form.isBusinessOwner && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tên hộ kinh doanh <span className="text-red-400">*</span></label>
                      <input
                        value={form.businessCompanyName}
                        onChange={(e) => set("businessCompanyName", e.target.value)}
                        placeholder="Hộ KD Dọn Vệ Sinh Lan"
                        className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-blue-500/50 ${
                          errors.businessCompanyName ? "border-red-500/50" : "border-white/10"
                        }`}
                      />
                      {errors.businessCompanyName && <p className="text-[10px] text-red-400 mt-1">{errors.businessCompanyName}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Loại dịch vụ <span className="text-red-400">*</span></label>
                      <div className="flex flex-wrap gap-1.5">
                        {BUSINESS_CATEGORIES.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => toggleCategory(value)}
                            className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                              form.businessServiceCategories.includes(value)
                                ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                : "text-zinc-400 border-white/10 hover:border-white/20"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {errors.businessServiceCategories && (
                        <p className="text-[10px] text-red-400 mt-1">{errors.businessServiceCategories}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Địa chỉ kinh doanh <span className="text-red-400">*</span></label>
                      <input
                        value={form.businessAddress}
                        onChange={(e) => set("businessAddress", e.target.value)}
                        placeholder="Toà B, Tầng 2, TownHub Residences"
                        className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-blue-500/50 ${
                          errors.businessAddress ? "border-red-500/50" : "border-white/10"
                        }`}
                      />
                      {errors.businessAddress && <p className="text-[10px] text-red-400 mt-1">{errors.businessAddress}</p>}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {errors.submit && <p className="rounded-lg bg-red-500/10 p-3 text-xs text-red-400">{errors.submit}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            Tạo tài khoản
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
