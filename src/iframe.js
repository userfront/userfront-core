const frameUrl = "https://auth.userfront.net";
const frameId = "uf-auth-frame";

/**
 * Add the auth iframe to the document body, if the iframe
 * has not been added already.
 */
export function addIframe() {
  try {
    const existing = document.getElementById(frameId);
    if (existing) return;
    const newEl = document.createElement("iframe");
    newEl.src = frameUrl;
    newEl.id = frameId;
    newEl.style.width = "0px";
    newEl.style.height = "0px";
    newEl.style.display = "none";
    document.body.appendChild(newEl);
    addIframeMessageListener();
  } catch (error) {}
}

/**
 * Add an event listener to the window that will accept messages
 * from the iframe.
 */
function addIframeMessageListener() {
  try {
    window.addEventListener("message", (e) => {
      console.log(e);
      if (e.origin !== frameUrl) return;
      console.log("origins match");
    });
  } catch (error) {}
}

export default {
  addIframe,
};
