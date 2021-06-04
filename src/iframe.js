import { setCookiesAndTokens } from "./cookies.js";

const frameUrl = "https://auth.userfront.net";
const frameId = "uf-auth-frame";

let iframe;

/**
 * Add the auth iframe to the document body, if the iframe
 * has not been added already.
 */
export function setIframe() {
  try {
    if (iframe) return;
    iframe = document.createElement("iframe");
    iframe.src = frameUrl;
    iframe.id = frameId;
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    addIframeMessageListener();
  } catch (error) {}
}

/**
 * Return the iframe element
 */
export function getIframe() {
  return iframe;
}

/**
 * Separated this call out from addIframeMessageListener
 * in order to make it testable.
 *
 * @param {*} e - iframe event
 */
export function triageEvent(e) {
  if (!e || e.origin !== frameUrl || !e.data || !e.data.type) return;
  if (e.data.status !== 200 && e.data.type !== "logout") {
    return console.warn(`Problem with ${e.data.type} request.`);
  }

  switch (e.data.type) {
    case "exchange":
      console.log("exchange");
      break;
    case "refresh":
      setCookiesAndTokens(e.data.body.tokens);
      break;
    case "logout":
      console.log("logout");
      break;
    default:
      return;
  }
}

/**
 * Add an event listener to the window that will accept messages
 * from the iframe.
 */
function addIframeMessageListener() {
  try {
    window.addEventListener("message", triageEvent);
  } catch (error) {}
}
