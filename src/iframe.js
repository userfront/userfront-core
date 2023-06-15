import { setCookiesAndTokens } from "./authentication.js";

export const iframeOrigin = "https://auth.userfront.net";
const iframeId = "uf-auth-frame";

let iframe;

/**
 * Add the auth iframe to the document body, if the iframe
 * has not been added already.
 */
export function setIframe() {
  try {
    if (iframe) return;
    const existingIframe = document.getElementById(iframeId);
    if (existingIframe) {
      iframe = existingIframe;
      addIframeMessageListener();
      return;
    }
    iframe = document.createElement("iframe");
    iframe.src = iframeOrigin;
    iframe.id = iframeId;
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
 * Object containing promise resolve functions associated
 * with each message sent into the iframe.
 *
 * Exported for testing purposes.
 */
export const resolvers = {};

/**
 * Resolve the promise associated with an event
 * @param {Object} e
 */
function resolve(e) {
  try {
    resolvers[e.data.messageId].resolve(e.data);
  } catch (error) {}
}

/**
 * Reject the promise associated with an event
 * @param {Object} e
 */
function reject(e) {
  try {
    resolvers[e.data.messageId].reject();
  } catch (error) {}
}

/**
 * Post a message to the iframe and return a promise that
 * will be resolved when the iframe responds.
 * @param {Object} message
 * @returns {Promise}
 */
export async function postMessageAsPromise(message) {
  // Create a random messageId
  const messageId = `message${Math.random().toString().slice(2, 10)}`;

  // Create a promise to resolve after the iframe responds
  const promise = new Promise((resolve, reject) => {
    resolvers[messageId] = { resolve, reject };
  });

  // Post the message with the messageId
  message.messageId = messageId;
  iframe.contentWindow.postMessage(message, iframeOrigin);

  // Remove the promise from resolvers in 1 minute
  setTimeout(() => {
    delete resolvers[messageId];
  }, 60000);

  // Return the promise
  return promise;
}

/**
 * Separated this call out from addIframeMessageListener
 * in order to make it testable.
 *
 * @param {Object} e - iframe event
 */
export function triageEvent(e) {
  if (!e || e.origin !== iframeOrigin || !e.data || !e.data.type) return;
  if (e.data.status !== 200 && e.data.type !== "logout") {
    console.warn(`Problem with ${e.data.type} request.`);
    return reject(e);
  }

  switch (e.data.type) {
    case "exchange":
      resolve(e); // No further action needed for exchange
      return;
    case "refresh":
      setCookiesAndTokens(e.data.body.tokens);
      resolve(e);
      return;
    case "logout":
      resolve(e); // Logout method handles the rest
      break;
    default:
      return;
  }
}

let iframeMessageListenerWasAdded = false;
/**
 * Add an event listener to the window that will accept messages
 * from the iframe. Repeat calls will not add more listeners.
 */
function addIframeMessageListener() {
  if (iframeMessageListenerWasAdded) return;
  try {
    window.addEventListener("message", triageEvent);
    iframeMessageListenerWasAdded = true;
  } catch (error) {}
}
