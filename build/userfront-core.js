function e(e){return e&&"object"==typeof e&&"default"in e?e.default:e}var t=e(require("js-cookie")),n=e(require("axios"));const r="https://api.userfront.com/v0/",o=/((^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.))\d{1,3}\.\d{1,3}/g;function i(e){try{const t=e||window.location.hostname;return!(!t.match(/localhost/g)&&!t.match(o))}catch(e){return!0}}const a={mode:i()?"test":"live"};function s(){a.accessToken=t.get(a.accessTokenName),a.idToken=t.get(a.idTokenName),a.refreshToken=t.get(a.refreshTokenName)}function c(e,n,r){const o=`${r}.${a.tenantId}`;n=n||{secure:"live"===a.mode,sameSite:"Lax"},"refresh"===r&&(n.sameSite="Strict"),t.set(o,e,n)}function u(e){t.remove(e),t.remove(e,{secure:!0,sameSite:"Lax"}),t.remove(e,{secure:!0,sameSite:"None"}),t.remove(e,{secure:!1,sameSite:"Lax"}),t.remove(e,{secure:!1,sameSite:"None"})}function d(){u(a.accessTokenName),u(a.idTokenName),u(a.refreshTokenName),a.accessToken=void 0,a.idToken=void 0,a.refreshToken=void 0}function h(e){if(window.location.href&&!(window.location.href.indexOf(e+"=")<0))return decodeURIComponent(window.location.href.split(e+"=")[1].split("&")[0])}function l(e){try{document}catch(e){return}if(!e)return;const t=document.createElement("a");t.href=e,t.pathname!==window.location.pathname&&window.location.assign(`${t.pathname}${t.hash}${t.search}`)}function m(e,t){try{var n=e()}catch(e){return t(e)}return n&&n.then?n.then(void 0,t):n}function f(e){if(!e)throw new Error("Missing provider");if(!a.tenantId)throw new Error("Missing tenant ID");let t=`https://api.userfront.com/v0/auth/${e}/login?tenant_id=${a.tenantId}&origin=${window.location.origin}`;const n=h("redirect");return n&&(t+="&redirect="+encodeURIComponent(n)),t}const w="https://auth.userfront.net";let p;function k(e){var t;if(e&&e.origin===w&&e.data&&e.data.type)switch(e.data.type){case"exchange":console.log("exchange");break;case"refresh":c((t=e.data.body.tokens).access.value,t.access.cookieOptions,"access"),c(t.id.value,t.id.cookieOptions,"id"),c(t.refresh.value,t.refresh.cookieOptions,"refresh"),s();break;case"logout":console.log("logout");break;default:return}}let v=[],g=!1;module.exports={addInitCallback:function(e){e&&"function"==typeof e&&v.push(e)},init:function(e){if(!e)return console.warn("Userfront initialized without tenant ID");a.tenantId=e,a.accessTokenName="access."+e,a.idTokenName="id."+e,a.refreshTokenName="refresh."+e,function(){try{if(p)return;p=document.createElement("iframe"),p.src=w,p.id="uf-auth-frame",p.style.width="0px",p.style.height="0px",p.style.display="none",document.body.appendChild(p),function(){try{window.addEventListener("message",k)}catch(e){}}()}catch(e){}}(),s();try{v.length>0&&v.forEach(t=>{t&&"function"==typeof t&&t({tenantId:e})}),v=[]}catch(e){}},registerUrlChangedEventListener:function(){if(!g){g=!0;try{history.pushState=(e=history.pushState,function(){var t=e.apply(this,arguments);return window.dispatchEvent(new Event("pushstate")),window.dispatchEvent(new Event("urlchanged")),t}),history.replaceState=(e=>function(){var t=e.apply(this,arguments);return window.dispatchEvent(new Event("replacestate")),window.dispatchEvent(new Event("urlchanged")),t})(history.replaceState),window.addEventListener("popstate",()=>{window.dispatchEvent(new Event("urlchanged"))})}catch(e){}var e}},logout:function(){try{if(!a.accessToken)return Promise.resolve(d());const e=function(e,t){try{var o=Promise.resolve(n.get(r+"auth/logout",{headers:{authorization:"Bearer "+a.accessToken}})).then(function({data:e}){d(),l(e.redirectTo)})}catch(e){return t()}return o&&o.then?o.then(void 0,t):o}(0,function(){d()});return Promise.resolve(e&&e.then?e.then(function(){}):void 0)}catch(e){return Promise.reject(e)}},setMode:function(){try{const e=function(e,t){try{var o=Promise.resolve(n.get(`${r}tenants/${a.tenantId}/mode`)).then(function({data:e}){a.mode=e.mode||"test"})}catch(e){return t()}return o&&o.then?o.then(void 0,t):o}(0,function(){a.mode="test"});return Promise.resolve(e&&e.then?e.then(function(){}):void 0)}catch(e){return Promise.reject(e)}},login:function({method:e,email:t,username:n,emailOrUsername:r,password:o,token:i,uuid:s}){try{if(!e)throw new Error('Userfront.login called without "method" property');switch(e){case"azure":case"facebook":case"github":case"google":case"linkedin":return Promise.resolve(function(e){if(!e)throw new Error("Missing provider");const t=f(e);window.location.assign(t)}(e));case"password":return function({email:e,username:t,emailOrUsername:n,password:r}){try{return Promise.resolve(axios.post(apiUrl+"auth/basic",{tenantId:a.tenantId,emailOrUsername:e||t||n,password:r})).then(function({data:e}){if(!e.tokens)throw new Error("Please try again.");setCookiesAndTokens(e.tokens),redirectToPath(h("redirect")||e.redirectTo||"/")})}catch(e){return Promise.reject(e)}}({email:t,username:n,emailOrUsername:r,password:o});case"link":return function(e,t){try{return e||(e=h("token")),t||(t=h("uuid")),e&&t?Promise.resolve(axios.put(apiUrl+"auth/link",{token:e,uuid:t,tenantId:a.tenantId})).then(function({data:e}){if(!e.tokens)throw new Error("Problem logging in.");setCookiesAndTokens(e.tokens),redirectToPath(h("redirect")||e.redirectTo||"/")}):Promise.resolve()}catch(e){return Promise.reject(e)}}(i,s);default:throw new Error('Userfront.login called with invalid "method" property')}}catch(e){return Promise.reject(e)}},resetPassword:function({uuid:e,token:t,password:n}){try{if(t||(t=h("token")),e||(e=h("uuid")),!t||!e)throw new Error("Missing token or uuid");return Promise.resolve(axios.put(apiUrl+"auth/reset",{tenantId:a.tenantId,uuid:e,token:t,password:n})).then(function({data:e}){if(!e.tokens)throw new Error("There was a problem resetting your password. Please try again.");setCookiesAndTokens(e.tokens),redirectToPath(h("redirect")||e.redirectTo||"/")})}catch(e){return Promise.reject(e)}},sendLoginLink:function(e){try{return Promise.resolve(m(function(){return Promise.resolve(axios.post(apiUrl+"auth/link",{email:e,tenantId:a.tenantId})).then(function({data:e}){return e})},function(){throw new Error("Problem sending link")}))}catch(e){return Promise.reject(e)}},sendResetLink:function(e){try{return Promise.resolve(m(function(){return Promise.resolve(axios.post(apiUrl+"auth/reset/link",{email:e,tenantId:a.tenantId})).then(function({data:e}){return e})},function(){throw new Error("Problem sending link")}))}catch(e){return Promise.reject(e)}},signup:function({method:e,username:t,name:n,email:r,password:o}){try{if(!e)throw new Error('Userfront.signup called without "method" property');switch(e){case"azure":case"facebook":case"github":case"google":case"linkedin":return Promise.resolve(function(e){if(!e)throw new Error("Missing provider");const t=f(e);window.location.assign(t)}(e));case"password":return function({username:e,name:t,email:n,password:r}){try{return Promise.resolve(axios.post(apiUrl+"auth/create",{tenantId:a.tenantId,username:e,name:t,email:n,password:r})).then(function({data:e}){if(!e.tokens)throw new Error("Please try again.");setCookiesAndTokens(e.tokens),redirectToPath(h("redirect")||e.redirectTo||"/")})}catch(e){return Promise.reject(e)}}({username:t,name:n,email:r,password:o});default:throw new Error('Userfront.signup called with invalid "method" property')}}catch(e){return Promise.reject(e)}},store:a,accessToken:function(){return a.accessToken=t.get(a.accessTokenName),a.accessToken},idToken:function(){return a.idToken=t.get(a.idTokenName),a.idToken},redirectIfLoggedIn:function(){try{if(!a.accessToken)return Promise.resolve(d());if(h("redirect"))return Promise.resolve(l(h("redirect")));const e=function(e,t){try{var o=Promise.resolve(n.get(r+"self",{headers:{authorization:"Bearer "+a.accessToken}})).then(function({data:e}){e.tenant&&e.tenant.loginRedirectPath&&l(e.tenant.loginRedirectPath)})}catch(e){return t()}return o&&o.then?o.then(void 0,t):o}(0,function(){d()});return Promise.resolve(e&&e.then?e.then(function(){}):void 0)}catch(e){return Promise.reject(e)}},isTestHostname:i};
//# sourceMappingURL=userfront-core.js.map
