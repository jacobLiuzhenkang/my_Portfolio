import { useRef, useState } from "react";
import { trpc } from "@/providers/trpc-client";
import { ALLOWED_FILE_TYPES, UPLOAD_MAX_BYTES, type UploadPurpose } from "@contracts/files";

type Input = { file: File; purpose: UploadPurpose };
type Result = { key: string; size: number; etag: string };

/** The file body goes straight to private storage; functions receive metadata only. */
export function useFileUpload(options: { onSuccess: (result: Result, input: Input) => void | Promise<void>; onError: (error: Error) => void }) {
  const [isPending, setPending] = useState(false);
  const busy = useRef(false);
  const prepare = trpc.storage.prepareUpload.useMutation();
  const finalize = trpc.storage.finalizeUpload.useMutation();
  const mutate = async (input: Input) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      const { file, purpose } = input;
      if (!file.size || file.size > UPLOAD_MAX_BYTES) throw new Error("文件不能为空，且不能超过 25 MB。");
      if (!ALLOWED_FILE_TYPES.includes(file.type as typeof ALLOWED_FILE_TYPES[number])) throw new Error("请选择图片或 PDF 文件。");
      const prepared = await prepare.mutateAsync({ name: file.name, contentType: file.type, size: file.size, purpose });
      const response = await fetch(prepared.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!response.ok) throw new Error("文件上传失败，请重试。");
      const result = await finalize.mutateAsync({ key: prepared.key, name: file.name, purpose });
      await options.onSuccess(result, input);
    } catch (error) { options.onError(error instanceof Error ? error : new Error("文件上传失败。")); }
    finally { busy.current = false; setPending(false); }
  };
  return { mutate: (input: Input) => { void mutate(input); }, isPending };
}
