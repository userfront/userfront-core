import { getIframe } from "./iframe.js";

export async function refresh() {
  const iframe = getIframe();
  if (!iframe) return;
  iframe.contentWindow.postMessage(
    {
      type: "refresh",
    },
    "*"
  );
}
