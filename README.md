# Userfront Core JS library

## addInitCallback (function)

Calls the supplied callback whenever `Userfront.init()` is called. A JSON object with the `tenantId` is supplied to the callback.

If `addInitCallback` is called more than once, callbacks will be called in the order they were added (first added = first called).

Once `Userfront.init()` is called, the callbacks are reset and will not be called on subsequent `Userfront.init()` calls.

```js
import Userfront, { addInitCallback } from "@userfront/core";

addInitCallback((data) => console.log(data));
addInitCallback(console.log("Again"));

Userfront.init("demo1234");

// => { tenantId: "demo1234" }
// => Again

Userfront.init("demo1234");

// No callbacks
```

## accessToken ()

Returns the JWT access token.

```js
import Userfront from "@userfront/core";

Userfront.accessToken();

// => "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJtb2RlIjoidGVzdCIsImlzQ29uZmlybWVkIjp0cnVlLCJ1c2VySWQiOjEsInVzZXJVdWlkIjoiZDAwNTlmN2UtYzU0OS00NmYzLWEzYTMtOGEwNDY0MDkzZmMyIiwidGVuYW50SWQiOiJwOW55OGJkaiIsInNlc3Npb25JZCI6IjRlZjBlMjdjLTI1NDAtNDIzOS05YTJiLWRkZjgyZjE3YmExYiIsImF1dGhvcml6YXRpb24iOnsicDlueThiZGoiOnsidGVuYW50SWQiOiJwOW55OGJkaiIsIm5hbWUiOiJVc2VyZnJvbnQiLCJyb2xlcyI6WyJhZG1pbiJdLCJwZXJtaXNzaW9ucyI6W119fSwiaWF0IjoxNjE3MTQ4MDY3LCJleHAiOjE2MTk3NDAwNjd9.gYz4wxPHLY6PNp8KPEyIjLZ8QzG3-NFJGPitginuLaU"
```

Your frontend application can send the access token to your server in order to authenticate a user and provide information about their access levels. For more information, see [Token types](https://userfront.com/guide/tokens.html).

## idToken ()

Returns the JWT ID token.

```js
import Userfront from "@userfront/core";

Userfront.idToken();

// => "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJtb2RlIjoidGVzdCIsInRlbmFudElkIjoicDlueThiZGoiLCJ1c2VySWQiOjEsInVzZXJVdWlkIjoiZDAwNTlmN2UtYzU0OS00NmYzLWEzYTMtOGEwNDY0MDkzZmMyIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsImlzQ29uZmlybWVkIjp0cnVlLCJ1c2VybmFtZSI6ImFkbWluIiwibmFtZSI6IkFkbWluIFVzZXIiLCJpbWFnZSI6Imh0dHBzOi8vcmVzLmNsb3VkaW5hcnkuY29tL2NvbXBvbmVudC9pbWFnZS91cGxvYWQvYXZhdGFycy9hdmF0YXItMDcucG5nIiwiZGF0YSI6eyJjdXN0b20iOiJkYXRhIn0sImNvbmZpcm1lZEF0IjoiMjAyMC0wOS0xMVQyMTo1MjoyOC44MjBaIiwiY3JlYXRlZEF0IjoiMjAyMC0wOS0xMVQyMTo1MjoyOC4wOTVaIiwidXBkYXRlZEF0IjoiMjAyMS0wMy0yNFQyMDo1MzowMi4zMDVaIiwic2Vzc2lvbklkIjoiNGVmMGUyN2MtMjU0MC00MjM5LTlhMmItZGRmODJmMTdiYTFiIiwiaWF0IjoxNjE3MTQ4MDY3LCJleHAiOjE2MTk3NDAwNjd9.SZXylt-4G9KtS1Tr52ei75l0Y2eYqYWhVYzQLzXMvS8"
```

The ID token is not intended for authentication or access control. Instead, your frontend application can use it to display data about the current logged in user. For more information, see [Token types](https://userfront.com/guide/tokens.html).

## init (tenantId)

Initializes the Userfront library.

```js
import Userfront from "@userfront/core";

Userfront.init("demo1234");
```

You can add a callback to run after `Userfront.init()` by calling [addInitCallback](#addInitCallback)

## login (options)

Initiates a login for a user with one of the available methods.

| option            | description                                                                                                                               |
| :---------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| _method_          | The login method. Options are: `password`, `link`, `azure`, `facebook`, `github`,`google`,`linkedin`. See below for more info on methods. |
| _email_           | The user's email. Usable with the `password` method only.                                                                                 |
| _username_        | The user's username. Usable with the `password` method only.                                                                              |
| _emailOrUsername_ | The user's email or username. Usable with the `password` method only.                                                                     |
| _password_        | The user's password. Usable with the `password` method only.                                                                              |
| _token_           | The `token=` URL parameter sent in a login link. Usable with the `link` method only.                                                      |
| _uuid_            | The `uuid=` URL parameter sent in a login link. Usable with the `link` method only.                                                       |

### Login via `password` method:

Sends a username or email along with a password in order to receive auth tokens, then adds tokens to the browser's cookies and redirects the browser.

```js
import Userfront from "@userfront/core";
Userfront.init("demo1234");

// Example with email
Userfront.login({
  method: "password",
  email: "admin@example.com",
  password: "testmodepassword",
});

// Example with username
Userfront.login({
  method: "password",
  username: "admin",
  password: "testmodepassword",
});

// Example with emailOrUsername
Userfront.login({
  method: "password",
  emailOrUsername: "admin@example.com", // or "admin"
  password: "testmodepassword",
});
```

### Login via `link` method:

This method is used to read the URL query parameters `token` and `uuid` that are sent with login link emails, and uses these parameters to log in a user.

Sends the token and uuid in order to receive auth tokens, then adds tokens to the browser's cookies and redirects the browser.

```js
import Userfront from "@userfront/core";
Userfront.init("demo1234");

// Get token & uuid from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");
const uuid = urlParams.get("uuid");

// Log in with link
Userfront.login({
  method: "link",
  token: token,
  uuid: uuid,
});
```

### Login via `azure`, `facebook`, `github`,`google`, or `linkedin` methods

Initiates the sign on flow for a given SSO provider.

```js
import Userfront from "@userfront/core";
Userfront.init("demo1234");

// Example with Azure
Userfront.login({ method: "azure" });

// Example with Google
Userfront.login({ method: "google" });
```

## logout

## redirectIfLoggedIn

## registerUrlChangedEventListener

## resetPassword

## sendLoginLink

## sendResetLink

## setMode

## setCookie

## signup
