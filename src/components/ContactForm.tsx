import { useState } from "react";
import { trpc } from "@/providers/trpc-client";
import "./contact-form.css";
export default function ContactForm() {
  const [openedAt, setOpenedAt] = useState(() => Date.now());
  const [sent, setSent] = useState(false);
  const submit = trpc.contact.submit.useMutation();
  return (
    <form
      className="contact-form"
      onSubmit={async e => {
        e.preventDefault();
        if (submit.isPending) return;
        const form = e.currentTarget;
        const data = new FormData(form);
        setSent(false);
        try {
          await submit.mutateAsync({
            name: String(data.get("name")),
            email: String(data.get("email")),
            company: String(data.get("company")),
            body: String(data.get("body")),
            website: String(data.get("website")),
            openedAt,
          });
          form.reset();
          setOpenedAt(Date.now());
          setSent(true);
        } catch {
          /* Mutation error is shown below; keep the visitor's draft. */
        }
      }}
    >
      <h3>私信联系</h3>
      <p>仅站长可见，不会发布到公开留言板。称呼、邮箱和正文为必填。</p>
      <div className="contact-fields">
        <label>
          称呼
          <input name="name" autoComplete="name" required maxLength={100} />
        </label>
        <label>
          邮箱
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={320}
          />
        </label>
      </div>
      <label>
        公司（选填）
        <input name="company" autoComplete="organization" maxLength={160} />
      </label>
      <label>
        正文
        <textarea name="body" required maxLength={2000} rows={5} />
      </label>
      <div className="contact-trap" aria-hidden="true">
        <label>
          Website
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            maxLength={200}
          />
        </label>
      </div>
      <input type="hidden" name="openedAt" value={openedAt} />
      <button type="submit" disabled={submit.isPending}>
        {submit.isPending ? "提交中…" : "发送私信 ↗"}
      </button>
      <p role="status">
        {sent
          ? "留言已收到，谢谢你的联系。"
          : submit.error
            ? submit.error.data?.code === "INTERNAL_SERVER_ERROR"
              ? "暂时无法提交，请稍后重试，或通过邮箱联系。"
              : submit.error.message
            : ""}
      </p>
    </form>
  );
}
