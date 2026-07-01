"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, UserRoundCheck, X } from "lucide-react";
import { accessControl, apartments, auth, residents, roles, users, type ApartmentResponse, type FaceProfileResponse, type GetUserResponse, type ResidentResponse } from "@/lib/api";

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
    .replace(/[\u0300-\u036f]/g, "")
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
  const [editing, setEditing] = useState<ResidentResponse | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [faceTarget, setFaceTarget] = useState<ResidentResponse | null>(null);

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

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError("");
    setFormOpen(true);
  }

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
        const accountRes = await auth.createUser({
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
          <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground"><Plus className="size-4" /> Thêm cư dân</button>
        </div>
      </header>

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
