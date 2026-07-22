'use client';

// Cloudflare Turnstile widget for the auth forms (register, password login,
// password reset). Renders explicitly via the Turnstile JS API and reports
// the token up through onToken; a null token means "not solved yet" (also
// after expiry/error).
//
// Behavior is deliberately soft when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset:
// the component renders nothing and the forms submit without a captchaToken —
// so environments without the key (and the period before the Supabase
// "CAPTCHA protection" switch is flipped) keep working. Once the switch is ON
// in Supabase, auth calls without a token fail server-side regardless.
//
// Tokens are SINGLE-USE: after a failed auth call the form must call
// resetTurnstile() so the user can solve a fresh challenge.

import { useEffect, useRef } from 'react';

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
      // Tokens live ~300 s — 'auto' makes the widget re-solve an expired
      // challenge by itself, so a user who types slowly never submits a
      // stale token (Supabase would reject it as captcha_failed). Optional:
      // wiring it up is part of the PAUSED Turnstile investigation.
      'refresh-expired'?: 'auto' | 'manual' | 'never';
      theme: 'auto' | 'light' | 'dark';
    }
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

// One auth form (and thus one widget) per page in this app — a module-level
// id is enough for the reset helper.
let activeWidgetId: string | null = null;

/** Invalidate the solved challenge after a failed submit (tokens are single-use). */
export function resetTurnstile(): void {
  if (typeof window !== 'undefined' && window.turnstile && activeWidgetId !== null) {
    window.turnstile.reset(activeWidgetId);
  }
}

export default function TurnstileWidget({ onToken }: { onToken: (token: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;
    const key = siteKey; // narrow for the nested closure
    let cancelled = false;
    let widgetId: string | null = null;

    function renderWidget() {
      if (cancelled || !window.turnstile || !containerRef.current || widgetId !== null) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: key,
        callback: (token) => onTokenRef.current(token),
        'expired-callback': () => onTokenRef.current(null),
        'error-callback': () => onTokenRef.current(null),
        theme: 'auto'
      });
      activeWidgetId = widgetId;
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      // Load the script once; multiple mounts share the same tag.
      let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
      if (!script) {
        script = document.createElement('script');
        script.src = SCRIPT_SRC;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', renderWidget);
    }

    return () => {
      cancelled = true;
      if (widgetId !== null && window.turnstile) {
        window.turnstile.remove(widgetId);
        if (activeWidgetId === widgetId) activeWidgetId = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={containerRef} className="min-h-[65px]" aria-label="Weryfikacja antybotowa" />;
}

/**
 * True when the site key is configured — forms use this to require a solved
 * challenge before submitting (and to skip the requirement in environments
 * without Turnstile).
 */
export const turnstileConfigured = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
