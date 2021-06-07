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

// async function refresh() {
//   const res = await axios.get({
//     url: `${apiUrl}auth/refresh`,
//     headers: {
//       authorization: `Bearer ${store.accessToken}`,
//     },
//   });
//   if (!res || !res.data || !res.data.tokens) {
//     throw new Error("Problem refreshing tokens.");
//   }

//   setCookiesAndTokens(res.data.tokens);
//   setUser();
// }
