import { useRef } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

const SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
}

export type { TurnstileInstance };
export { useRef as useTurnstileRef };

export function TurnstileWidget({
  onSuccess,
  onError,
  onExpire,
  className,
}: TurnstileWidgetProps) {
  return (
    <div className={className}>
      <Turnstile
        siteKey={SITE_KEY}
        onSuccess={onSuccess}
        onError={onError}
        onExpire={onExpire}
        options={{ size: "flexible", theme: "auto" }}
      />
    </div>
  );
}

export function TurnstileWithRef({
  onSuccess,
  onError,
  onExpire,
  className,
  turnstileRef,
}: TurnstileWidgetProps & { turnstileRef: React.RefObject<TurnstileInstance | null> }) {
  return (
    <div className={className}>
      <Turnstile
        ref={turnstileRef}
        siteKey={SITE_KEY}
        onSuccess={onSuccess}
        onError={onError}
        onExpire={onExpire}
        options={{ size: "flexible", theme: "auto" }}
      />
    </div>
  );
}
