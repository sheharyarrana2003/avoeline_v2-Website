"use client";

import { useEffect, useRef } from "react";
import { markInviteOpened } from "../actions/markInviteOpened.action";

/**
 * Reports that an invite link was opened, once per mount.
 *
 * A client component purely so the write happens after the render rather than
 * inside it. Renders nothing. The ref guards against React's development
 * double-effect firing it twice; the action is idempotent anyway, since it only
 * writes when openedAt is still null.
 */
export function TrackInviteOpen({ token }: { token: string }) {
    const sent = useRef(false);

    useEffect(() => {
        if (sent.current || !token) return;
        sent.current = true;
        void markInviteOpened(token);
    }, [token]);

    return null;
}
