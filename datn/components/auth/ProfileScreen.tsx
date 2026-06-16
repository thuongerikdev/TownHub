"use client";

import {
  AlertCircle, Camera, Check, KeyRound, Laptop, Loader2, LockKeyhole,
  RefreshCw, Save, ScanFace, ShieldCheck, Smartphone, UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  accessControl, auth, residents, sessions, users,
  type FaceProfileResponse, type ResidentResponse, type UserSession,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfileScreen() {
  const { user, roles, sessionId, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [sessionList, setSessionList] = useState<UserSession[]>([]);
  const [resident, setResident] = useState<ResidentResponse | null>(null);
  const [faceProfile, setFaceProfile] = useState<FaceProfileResponse | null>(null);
  const [faceLoading, setFaceLoading] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    userName: "", firstName: "", lastName: "", gender: "", dateOfBirth: "",
  });

  useEffect(() => {
    if (!user) return;
    // The form is an editable snapshot and must reset when a different user is loaded.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      userName: user.userName ?? "",
      firstName: user.profile?.firstName ?? "",
      lastName: user.profile?.lastName ?? "",
      gender: user.profile?.gender ?? "",
      dateOfBirth: user.profile?.dateOfBirth?.slice(0, 10) ?? "",
    });
    setAvatarPreview(user.profile?.avatar ?? "");
    sessions.getByUser(user.userID).then((response) => {
      if (response.errorCode === 200 && Array.isArray(response.data)) setSessionList(response.data);
    });
    residents.getAll().then(async (response) => {
      const linkedResident = response.errorCode === 200
        ? response.data.find((item) => item.authUserId === user.userID) ?? null
        : null;
      setResident(linkedResident);
      if (linkedResident) {
        const faceResponse = await accessControl.getFace(linkedResident.id);
        setFaceProfile(faceResponse.errorCode === 200 ? faceResponse.data : null);
      } else {
        setFaceProfile(null);
      }
      setFaceLoading(false);
    });
  }, [user]);

  if (!user) return null;

  const fullName = `${form.firstName} ${form.lastName}`.trim() || user.userName;
  const initials = `${form.firstName[0] ?? ""}${form.lastName[0] ?? ""}`.toUpperCase()
    || user.userName.slice(0, 2).toUpperCase();
  const activeSessions = sessionList.filter((item) => !item.isRevoked);

  function chooseAvatar(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Vui lòng chọn một tệp hình ảnh.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Ảnh đại diện không được vượt quá 5 MB.");
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("Vui lòng nhập đầy đủ họ và tên.");
      return;
    }
    setSaving(true);
    const data = new FormData();
    data.append("userID", String(user.userID));
    data.append("newUserName", form.userName.trim());
    data.append("firstName", form.firstName.trim());
    data.append("lastName", form.lastName.trim());
    data.append("gender", form.gender);
    if (form.dateOfBirth) data.append("dateOfBirth", form.dateOfBirth);
    if (avatarFile) data.append("avatar", avatarFile);

    try {
      const response = await users.updateProfile(data);
      if (response.errorCode !== 200) throw new Error(response.errorMessage || "Cập nhật thất bại.");
      await refreshUser();
      setAvatarFile(null);
      toast.success("Đã cập nhật hồ sơ.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật hồ sơ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Tài khoản của tôi" description="Quản lý thông tin cá nhân, bảo mật và các thiết bị đăng nhập." icon={UserRound} />

      <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-28 bg-[linear-gradient(120deg,#173f35,#2e705f_60%,#d6a93d)]" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:px-7">
          <div className="-mt-12">
            <div className="relative size-24 overflow-hidden rounded-2xl border-4 border-card bg-[#173f35] shadow-lg">
              {avatarPreview
                // Avatar URLs can be object URLs or backend-hosted URLs not known at build time.
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={avatarPreview} alt={fullName} className="size-full object-cover" />
                : <div className="flex size-full items-center justify-center text-2xl font-bold text-[#f5c75b]">{initials}</div>}
              <button type="button" onClick={() => fileRef.current?.click()} className="absolute inset-x-0 bottom-0 flex h-8 items-center justify-center bg-black/60 text-white hover:bg-black/75" aria-label="Đổi ảnh đại diện">
                <Camera className="size-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => chooseAvatar(event.target.files?.[0])} />
            </div>
          </div>
          <div className="min-w-0 flex-1 sm:pb-1">
            <h2 className="truncate text-xl font-semibold">{fullName}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              @{user.userName}
              {roles.map((role) => <span key={role.roleID} className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">{role.roleName}</span>)}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/10 px-3 py-2 text-xs font-medium text-success">
            <span className="size-2 rounded-full bg-success" /> Tài khoản đang hoạt động
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-5 h-auto w-full justify-start overflow-x-auto rounded-xl border border-border bg-card p-1 sm:w-fit">
          <TabsTrigger value="profile" className="px-4 py-2"><UserRound /> Thông tin</TabsTrigger>
          <TabsTrigger value="face" className="px-4 py-2"><ScanFace /> Khuôn mặt AI</TabsTrigger>
          <TabsTrigger value="security" className="px-4 py-2"><ShieldCheck /> Bảo mật</TabsTrigger>
          <TabsTrigger value="sessions" className="px-4 py-2"><Laptop /> Thiết bị</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <form onSubmit={saveProfile} className="rounded-2xl border border-border bg-card p-5 sm:p-7">
            <SectionTitle title="Thông tin cá nhân" description="Thông tin này được sử dụng để định danh tài khoản của bạn trong TownHub." />
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <ProfileField label="Họ"><input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></ProfileField>
              <ProfileField label="Tên"><input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></ProfileField>
              <ProfileField label="Tên đăng nhập"><input value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} /></ProfileField>
              <ProfileField label="Email" hint="Email không thể thay đổi tại đây.">
                <input value={user.email} readOnly className="opacity-70" />
              </ProfileField>
              <ProfileField label="Giới tính">
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="">Chưa cập nhật</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option>
                </select>
              </ProfileField>
              <ProfileField label="Ngày sinh">
                <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
              </ProfileField>
            </div>
            <div className="mt-7 flex justify-end border-t border-border pt-5">
              <button disabled={saving} className="flex h-10 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-foreground disabled:opacity-60">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Lưu thay đổi
              </button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="face">
          <FaceRegistration resident={resident} profile={faceProfile} loading={faceLoading} onChanged={setFaceProfile} />
        </TabsContent>

        <TabsContent value="security"><PasswordPanel email={user.email} /></TabsContent>

        <TabsContent value="sessions">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
            <SectionTitle title="Thiết bị đăng nhập" description={`${activeSessions.length} phiên đang hoạt động. Đăng xuất khỏi tất cả thiết bị nếu bạn phát hiện hoạt động lạ.`} />
            <div className="mt-6 space-y-3">
              {activeSessions.length === 0 && <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">Chưa có dữ liệu phiên đăng nhập.</p>}
              {activeSessions.map((item) => {
                const mobile = /mobile|android|iphone/i.test(item.userAgent ?? "");
                const current = item.sessionID === sessionId;
                return (
                  <div key={item.sessionID} className="flex items-start gap-3 rounded-xl border border-border p-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      {mobile ? <Smartphone className="size-5" /> : <Laptop className="size-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{friendlyDevice(item.userAgent)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.ip || "Không rõ IP"} · Hoạt động {formatDate(item.lastSeenAt)}</p>
                    </div>
                    {current && <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-[11px] font-medium text-success"><Check className="size-3" /> Thiết bị này</span>}
                  </div>
                );
              })}
            </div>
            <button onClick={() => auth.logoutAll().then(() => window.location.assign("/login"))} className="mt-6 rounded-xl border border-danger/30 px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/10">
              Đăng xuất khỏi tất cả thiết bị
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FaceRegistration({
  resident,
  profile,
  loading,
  onChanged,
}: {
  resident: ResidentResponse | null;
  profile: FaceProfileResponse | null;
  loading: boolean;
  onChanged: (profile: FaceProfileResponse | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Keep the selected image aligned with the latest profile returned by AI.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(profile?.imageUrl ?? "");
  }, [profile]);

  async function chooseFace(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn tệp ảnh.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ảnh khuôn mặt không được vượt quá 10 MB.");
      return;
    }
    try {
      setPreview(await resizeFaceImage(file));
    } catch {
      toast.error("Không thể xử lý ảnh đã chọn.");
    }
  }

  async function saveFace() {
    if (!resident || !preview) return;
    setSaving(true);
    const response = await accessControl.registerFace(resident.id, preview);
    setSaving(false);
    if (response.errorCode !== 200 || !response.data) {
      toast.error(response.errorMessage || "Không thể cập nhật khuôn mặt.");
      return;
    }
    onChanged(response.data);
    toast.success(profile ? "Đã cập nhật khuôn mặt AI." : "Đã đăng ký khuôn mặt AI.");
  }

  if (loading) {
    return <div className="flex min-h-72 items-center justify-center rounded-2xl border border-border bg-card"><Loader2 className="size-6 animate-spin text-brand" /></div>;
  }

  if (!resident) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex max-w-2xl items-start gap-4 rounded-2xl border border-warning/25 bg-warning/10 p-5">
          <AlertCircle className="mt-0.5 size-6 shrink-0 text-warning" />
          <div>
            <h3 className="font-semibold">Tài khoản chưa liên kết hồ sơ cư dân</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Ban quản lý cần liên kết tài khoản này với hồ sơ cư dân trước khi bạn có thể đăng ký khuôn mặt AI.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const status = faceStatus(profile?.aiStatus);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      <SectionTitle title="Khuôn mặt AI" description="Khuôn mặt được dùng để nhận diện cư dân khi ra vào khu vực." />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="flex aspect-[4/3] max-h-[460px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40">
            {preview ? (
              // The preview can be a local data URL or an API-hosted image.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Khuôn mặt đăng ký" className="size-full object-cover" />
            ) : (
              <div className="text-center text-muted-foreground">
                <ScanFace className="mx-auto size-16 opacity-40" />
                <p className="mt-3 text-sm">Chưa có ảnh khuôn mặt</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(event) => void chooseFace(event.target.files?.[0])} />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => fileRef.current?.click()} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium hover:bg-accent">
              {profile ? <RefreshCw className="size-4" /> : <Camera className="size-4" />}
              {profile ? "Chọn ảnh mới" : "Chụp / chọn ảnh"}
            </button>
            <button type="button" onClick={() => void saveFace()} disabled={!preview || saving || preview === profile?.imageUrl} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-50">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <ScanFace className="size-4" />}
              {profile ? "Cập nhật lên hệ thống" : "Đăng ký khuôn mặt"}
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className={`rounded-2xl border p-4 ${status.className}`}>
            <p className="text-xs font-medium uppercase tracking-wide opacity-70">Trạng thái AI</p>
            <p className="mt-2 flex items-center gap-2 font-semibold">{status.icon}{status.label}</p>
            {profile?.failureReason && <p className="mt-2 text-xs leading-5">{profile.failureReason}</p>}
          </div>
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold">Hướng dẫn chụp ảnh</p>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
              <li>• Nhìn thẳng vào camera, không nghiêng mặt.</li>
              <li>• Chụp ở nơi đủ sáng, không bị ngược sáng.</li>
              <li>• Không đeo khẩu trang, kính râm hoặc che khuất mặt.</li>
              <li>• Chỉ nên có một khuôn mặt trong khung hình.</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">
            Hồ sơ cư dân: <span className="font-medium text-foreground">{resident.fullName}</span>
            {resident.apartmentCode && <> · Căn hộ <span className="font-medium text-foreground">{resident.apartmentCode}</span></>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function faceStatus(status?: string) {
  if (status === "ready") {
    return { label: "Sẵn sàng nhận diện", icon: <Check className="size-4" />, className: "border-success/25 bg-success/10 text-success" };
  }
  if (status === "failed") {
    return { label: "Ảnh chưa đạt yêu cầu", icon: <AlertCircle className="size-4" />, className: "border-danger/25 bg-danger/10 text-danger" };
  }
  if (status === "pending") {
    return { label: "Đang chờ AI xử lý", icon: <Loader2 className="size-4 animate-spin" />, className: "border-warning/25 bg-warning/10 text-warning" };
  }
  return { label: "Chưa đăng ký", icon: <ScanFace className="size-4" />, className: "border-border bg-muted/40 text-muted-foreground" };
}

async function resizeFaceImage(file: File): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
  const image = document.createElement("img");
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("decode-failed"));
    image.src = raw;
  });
  const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return raw;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

function PasswordPanel({ email }: { email: string }) {
  const [step, setStep] = useState<"start" | "verify" | "commit">("start");
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function next() {
    setLoading(true);
    if (step === "start") {
      const response = await auth.changePasswordStart(email);
      setLoading(false);
      if (response.errorCode !== 200) return toast.error(response.errorMessage);
      setStep("verify");
      return;
    }
    if (step === "verify") {
      const response = await auth.changePasswordVerify(email, code);
      setLoading(false);
      if (response.errorCode !== 200 || !response.data) return toast.error(response.errorMessage);
      setTicket(response.data);
      setStep("commit");
      return;
    }
    if (newPassword.length < 8) {
      setLoading(false);
      return toast.error("Mật khẩu mới cần có ít nhất 8 ký tự.");
    }
    const response = await auth.changePasswordCommit(ticket, oldPassword, newPassword);
    setLoading(false);
    if (response.errorCode !== 200) return toast.error(response.errorMessage);
    toast.success("Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.");
    window.location.assign("/login");
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      <SectionTitle title="Mật khẩu và xác thực" description="Thay đổi mật khẩu bằng mã xác thực được gửi đến email của bạn." />
      <div className="mt-6 max-w-xl rounded-2xl border border-border bg-muted/30 p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand"><LockKeyhole className="size-5" /></div>
          <div><p className="text-sm font-medium">Đổi mật khẩu</p><p className="text-xs text-muted-foreground">{email}</p></div>
        </div>
        {step === "start" && <p className="text-sm leading-6 text-muted-foreground">TownHub sẽ gửi mã 6 chữ số đến email để xác nhận đây là bạn.</p>}
        {step === "verify" && <ProfileField label="Mã xác thực"><input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className="font-mono tracking-[.3em]" /></ProfileField>}
        {step === "commit" && <div className="space-y-4"><ProfileField label="Mật khẩu hiện tại"><input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} /></ProfileField><ProfileField label="Mật khẩu mới"><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></ProfileField></div>}
        <button onClick={next} disabled={loading || (step === "verify" && code.length !== 6)} className="mt-5 flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground disabled:opacity-60">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          {step === "start" ? "Gửi mã xác thực" : step === "verify" ? "Xác nhận mã" : "Cập nhật mật khẩu"}
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return <div><h3 className="text-base font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>;
}

function ProfileField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium [&_input]:mt-2 [&_input]:h-11 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-border [&_input]:bg-background [&_input]:px-3 [&_input]:text-sm [&_input]:outline-none [&_input]:focus:border-brand/60 [&_input]:focus:ring-4 [&_input]:focus:ring-brand/10 [&_select]:mt-2 [&_select]:h-11 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-border [&_select]:bg-background [&_select]:px-3 [&_select]:text-sm">{label}{children}{hint && <span className="mt-1 block text-xs font-normal text-muted-foreground">{hint}</span>}</label>;
}

function friendlyDevice(userAgent?: string) {
  if (!userAgent) return "Thiết bị không xác định";
  const browser = /Edg/i.test(userAgent) ? "Microsoft Edge" : /Chrome/i.test(userAgent) ? "Google Chrome" : /Safari/i.test(userAgent) ? "Safari" : /Firefox/i.test(userAgent) ? "Firefox" : "Trình duyệt";
  const os = /Windows/i.test(userAgent) ? "Windows" : /iPhone|iPad/i.test(userAgent) ? "iOS" : /Android/i.test(userAgent) ? "Android" : /Mac OS/i.test(userAgent) ? "macOS" : "";
  return `${browser}${os ? ` trên ${os}` : ""}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "không rõ" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}
