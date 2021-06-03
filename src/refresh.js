import { getIframe } from "./iframe.js";

export async function refresh() {
  const iframe = getIframe();
  if (!iframe) return;
  console.log(window.location.origin);
  iframe.contentWindow.postMessage(
    {
      type: "refresh",
    },
    "*"
  );
}
