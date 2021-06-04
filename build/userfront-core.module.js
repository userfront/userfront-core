import e from"js-cookie";import t from"axios";const n="https://api.userfront.com/v0/",r=/((^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.))\d{1,3}\.\d{1,3}/g;function o(e){try{const t=e||window.location.hostname;return!(!t.match(/localhost/g)&&!t.match(r))}catch(e){return!0}}const i={mode:o()?"test":"live"};function a(){return i.accessToken=e.get(i.accessTokenName),i.accessToken}function s(){return i.idToken=e.get(i.idTokenName),i.idToken}function c(){i.accessToken=e.get(i.accessTokenName),i.idToken=e.get(i.idTokenName),i.refreshToken=e.get(i.refreshTokenName)}function u(t,n,r){const o=`${r}.${i.tenantId}`;n=n||{secure:"live"===i.mode,sameSite:"Lax"},"refresh"===r&&(n.sameSite="Strict"),e.set(o,t,n)}function d(t){e.remove(t),e.remove(t,{secure:!0,sameSite:"Lax"}),e.remove(t,{secure:!0,sameSite:"None"}),e.remove(t,{secure:!1,sameSite:"Lax"}),e.remove(t,{secure:!1,sameSite:"None"})}function h(){d(i.accessTokenName),d(i.idTokenName),d(i.refreshTokenName),i.accessToken=void 0,i.idToken=void 0,i.refreshToken=void 0}const l=function(){try{if(!i.accessToken)return Promise.resolve(h());if(m("redirect"))return Promise.resolve(f(m("redirect")));const e=function(e,r){try{var o=Promise.resolve(t.get(n+"self",{headers:{authorization:"Bearer "+i.accessToken}})).then(function({data:e}){e.tenant&&e.tenant.loginRedirectPath&&f(e.tenant.loginRedirectPath)})}catch(e){return r()}return o&&o.then?o.then(void 0,r):o}(0,function(){h()});return Promise.resolve(e&&e.then?e.then(function(){}):void 0)}catch(e){return Promise.reject(e)}};function m(e){if(window.location.href&&!(window.location.href.indexOf(e+"=")<0))return decodeURIComponent(window.location.href.split(e+"=")[1].split("&")[0])}function f(e){try{document}catch(e){return}if(!e)return;const t=document.createElement("a");t.href=e,t.pathname!==window.location.pathname&&window.location.assign(`${t.pathname}${t.hash}${t.search}`)}function w(e,t){try{var n=e()}catch(e){return t(e)}return n&&n.then?n.then(void 0,t):n}const p=function({uuid:e,token:t,password:n}){try{if(t||(t=m("token")),e||(e=m("uuid")),!t||!e)throw new Error("Missing token or uuid");return Promise.resolve(axios.put(apiUrl+"auth/reset",{tenantId:i.tenantId,uuid:e,token:t,password:n})).then(function({data:e}){if(!e.tokens)throw new Error("There was a problem resetting your password. Please try again.");setCookiesAndTokens(e.tokens),redirectToPath(m("redirect")||e.redirectTo||"/")})}catch(e){return Promise.reject(e)}},k=function(e){try{return Promise.resolve(w(function(){return Promise.resolve(axios.post(apiUrl+"auth/reset/link",{email:e,tenantId:i.tenantId})).then(function({data:e}){return e})},function(){throw new Error("Problem sending link")}))}catch(e){return Promise.reject(e)}},v=function(e){try{return Promise.resolve(w(function(){return Promise.resolve(axios.post(apiUrl+"auth/link",{email:e,tenantId:i.tenantId})).then(function({data:e}){return e})},function(){throw new Error("Problem sending link")}))}catch(e){return Promise.reject(e)}},g=function({method:e,email:t,username:n,emailOrUsername:r,password:o,token:a,uuid:s}){try{if(!e)throw new Error('Userfront.login called without "method" property');switch(e){case"azure":case"facebook":case"github":case"google":case"linkedin":return Promise.resolve(function(e){if(!e)throw new Error("Missing provider");const t=P(e);window.location.assign(t)}(e));case"password":return function({email:e,username:t,emailOrUsername:n,password:r}){try{return Promise.resolve(axios.post(apiUrl+"auth/basic",{tenantId:i.tenantId,emailOrUsername:e||t||n,password:r})).then(function({data:e}){if(!e.tokens)throw new Error("Please try again.");setCookiesAndTokens(e.tokens),redirectToPath(m("redirect")||e.redirectTo||"/")})}catch(e){return Promise.reject(e)}}({email:t,username:n,emailOrUsername:r,password:o});case"link":return function(e,t){try{return e||(e=m("token")),t||(t=m("uuid")),e&&t?Promise.resolve(axios.put(apiUrl+"auth/link",{token:e,uuid:t,tenantId:i.tenantId})).then(function({data:e}){if(!e.tokens)throw new Error("Problem logging in.");setCookiesAndTokens(e.tokens),redirectToPath(m("redirect")||e.redirectTo||"/")}):Promise.resolve()}catch(e){return Promise.reject(e)}}(a,s);default:throw new Error('Userfront.login called with invalid "method" property')}}catch(e){return Promise.reject(e)}},y=function({method:e,username:t,name:n,email:r,password:o}){try{if(!e)throw new Error('Userfront.signup called without "method" property');switch(e){case"azure":case"facebook":case"github":case"google":case"linkedin":return Promise.resolve(function(e){if(!e)throw new Error("Missing provider");const t=P(e);window.location.assign(t)}(e));case"password":return function({username:e,name:t,email:n,password:r}){try{return Promise.resolve(axios.post(apiUrl+"auth/create",{tenantId:i.tenantId,username:e,name:t,email:n,password:r})).then(function({data:e}){if(!e.tokens)throw new Error("Please try again.");setCookiesAndTokens(e.tokens),redirectToPath(m("redirect")||e.redirectTo||"/")})}catch(e){return Promise.reject(e)}}({username:t,name:n,email:r,password:o});default:throw new Error('Userfront.signup called with invalid "method" property')}}catch(e){return Promise.reject(e)}};function P(e){if(!e)throw new Error("Missing provider");if(!i.tenantId)throw new Error("Missing tenant ID");let t=`https://api.userfront.com/v0/auth/${e}/login?tenant_id=${i.tenantId}&origin=${window.location.origin}`;const n=m("redirect");return n&&(t+="&redirect="+encodeURIComponent(n)),t}const T=function(){try{if(!i.accessToken)return Promise.resolve(h());const e=function(e,r){try{var o=Promise.resolve(t.get(n+"auth/logout",{headers:{authorization:"Bearer "+i.accessToken}})).then(function({data:e}){h(),f(e.redirectTo)})}catch(e){return r()}return o&&o.then?o.then(void 0,r):o}(0,function(){h()});return Promise.resolve(e&&e.then?e.then(function(){}):void 0)}catch(e){return Promise.reject(e)}},E=function(){try{const e=function(e,r){try{var o=Promise.resolve(t.get(`${n}tenants/${i.tenantId}/mode`)).then(function({data:e}){i.mode=e.mode||"test"})}catch(e){return r()}return o&&o.then?o.then(void 0,r):o}(0,function(){i.mode="test"});return Promise.resolve(e&&e.then?e.then(function(){}):void 0)}catch(e){return Promise.reject(e)}},I="https://auth.userfront.net";let x;function U(e){var t;if(e&&e.origin===I&&e.data&&e.data.type)switch(e.data.type){case"exchange":console.log("exchange");break;case"refresh":u((t=e.data.body.tokens).access.value,t.access.cookieOptions,"access"),u(t.id.value,t.id.cookieOptions,"id"),u(t.refresh.value,t.refresh.cookieOptions,"refresh"),c();break;case"logout":console.log("logout");break;default:return}}let b=[];function N(e){if(!e)return console.warn("Userfront initialized without tenant ID");i.tenantId=e,i.accessTokenName="access."+e,i.idTokenName="id."+e,i.refreshTokenName="refresh."+e,function(){try{if(x)return;x=document.createElement("iframe"),x.src=I,x.id="uf-auth-frame",x.style.width="0px",x.style.height="0px",x.style.display="none",document.body.appendChild(x),function(){try{window.addEventListener("message",U)}catch(e){}}()}catch(e){}}(),c();try{b.length>0&&b.forEach(t=>{t&&"function"==typeof t&&t({tenantId:e})}),b=[]}catch(e){}}function j(e){e&&"function"==typeof e&&b.push(e)}let S=!1;function L(){if(!S){S=!0;try{history.pushState=(e=history.pushState,function(){var t=e.apply(this,arguments);return window.dispatchEvent(new Event("pushstate")),window.dispatchEvent(new Event("urlchanged")),t}),history.replaceState=(e=>function(){var t=e.apply(this,arguments);return window.dispatchEvent(new Event("replacestate")),window.dispatchEvent(new Event("urlchanged")),t})(history.replaceState),window.addEventListener("popstate",()=>{window.dispatchEvent(new Event("urlchanged"))})}catch(e){}var e}}var $={addInitCallback:j,init:N,registerUrlChangedEventListener:L,logout:T,isTestHostname:o,setMode:E,login:g,resetPassword:p,sendLoginLink:v,sendResetLink:k,signup:y,store:i,accessToken:a,idToken:s,redirectIfLoggedIn:l,exports:"named"};export default $;export{a as accessToken,j as addInitCallback,s as idToken,N as init,o as isTestHostname,g as login,T as logout,l as redirectIfLoggedIn,L as registerUrlChangedEventListener,p as resetPassword,v as sendLoginLink,k as sendResetLink,E as setMode,y as signup,i as store};
//# sourceMappingURL=userfront-core.module.js.map
