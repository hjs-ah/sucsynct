import { MicIcon, PenIcon, UploadIcon } from "@/components/icons";
import type { Mode } from "@/lib/types";

const MODES: Record<Mode, { label: string; Icon: typeof MicIcon }> = {
  write: { label: "Written", Icon: PenIcon },
  speak: { label: "Spoken", Icon: MicIcon },
  upload: { label: "Uploaded audio", Icon: UploadIcon },
};

/** Small icon + word saying how an entry was submitted. */
export function ModeLabel({ mode, className = "" }: { mode: Mode; className?: string }) {
  const { label, Icon } = MODES[mode] ?? MODES.write;
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
