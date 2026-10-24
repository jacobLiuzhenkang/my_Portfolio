import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { BoardImage } from "@contracts/guestbook";
export default function PhotoViewer({
  images,
  start,
  onClose,
}: {
  images: BoardImage[];
  start: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(start);
  useEffect(() => {
    document.body.classList.add("dialog-open");
    return () => document.body.classList.remove("dialog-open");
  }, []);
  const move = (by: number) =>
    setIndex(old => (old + by + images.length) % images.length);
  return (
    <Dialog.Root
      open
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="gb-viewer-overlay" />
        <Dialog.Content
          className="gb-viewer"
          aria-describedby={undefined}
          onKeyDown={e => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              move(-1);
            }
            if (e.key === "ArrowRight") {
              e.preventDefault();
              move(1);
            }
          }}
        >
          <Dialog.Title className="sr-only">留言图片预览</Dialog.Title>
          <Dialog.Close className="gb-viewer-close" aria-label="关闭图片预览">
            <X size={24} />
          </Dialog.Close>
          <img src={images[index].url} alt={"留言图片 " + (index + 1)} />
          {images.length > 1 && (
            <>
              <button
                className="gb-viewer-prev"
                onClick={() => move(-1)}
                aria-label="上一张"
              >
                <ChevronLeft />
              </button>
              <button
                className="gb-viewer-next"
                onClick={() => move(1)}
                aria-label="下一张"
              >
                <ChevronRight />
              </button>
            </>
          )}
          <span className="gb-viewer-count">
            {index + 1} / {images.length}
          </span>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
