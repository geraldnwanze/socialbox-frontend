"use client";

import { useRef, useState } from "react";

// The server already strips everything but basic formatting; this frame is a second wall: no
// scripts (sandbox), nothing fetched from the network (CSP), links open in a new tab.
const FRAME_HEAD =
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'">' +
  '<base target="_blank">' +
  "<style>body{margin:0;font:14px/1.5 system-ui,sans-serif;color:#222;word-wrap:break-word}a{color:#2563eb}table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:2px 6px}pre{white-space:pre-wrap}</style>";

export function FormattedEmail({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(80);

  return (
    <iframe
      ref={ref}
      title="Formatted email"
      sandbox="allow-same-origin allow-popups"
      srcDoc={`<!doctype html><html><head>${FRAME_HEAD}</head><body>${html}</body></html>`}
      onLoad={() => {
        const doc = ref.current?.contentDocument;
        if (doc?.body) setHeight(Math.min(doc.body.scrollHeight + 4, 600));
      }}
      style={{ height }}
      className="w-full rounded-md border bg-white"
    />
  );
}
