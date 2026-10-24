import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Field, FormActions } from "./common";

export default function AccountManager({ username, onSaved, onError }: { username: string; onSaved: () => void; onError: (message: string) => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => { setCurrentPassword(""); setNewPassword(""); setConfirm(""); onSaved(); },
    onError: (e) => onError(e.message),
  });
  return <section className="admin-section"><div className="admin-section-heading"><div><p className="meta-label">ACCOUNT SECURITY</p><h2>管理员账号</h2></div><p>当前登录账号：<strong>{username}</strong></p></div>
    <form className="admin-form narrow" onSubmit={(e) => { e.preventDefault(); if (newPassword !== confirm) { onError("两次输入的新密码不一致"); return; } mutation.mutate({ currentPassword, newPassword }); }}>
      <Field label="当前密码" value={currentPassword} onChange={setCurrentPassword} type="password" required />
      <Field label="新密码" value={newPassword} onChange={setNewPassword} type="password" hint="至少 10 位，建议混合字母、数字与符号" required />
      <Field label="再次输入新密码" value={confirm} onChange={setConfirm} type="password" required />
      <FormActions pending={mutation.isPending} label="更新密码" />
    </form>
  </section>;
}
