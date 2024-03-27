# Userfront Core JS library

The Userfront Core JavaScript library is intended for use in frontend applications.

The Core library can be used for the following:

- **Tokens**: read the user's access token to send to your backend
- **User info**: information about the currently logged in user
- **Authentication**: signup, login, logout, and password reset tasks; these are useful for building custom forms and auth flows.

## Docs

Full docs can be found in the Userfront guide:

https://userfront.com/docs/js.html

## Setup

Install by npm (or yarn):

```sh
npm install @userfront/core --save
```

Import and initialize the library:

```js
import Userfront from "@userfront/core";

Userfront.init("demo1234");
```

## Examples

```js
// Import and initialize Userfront core JS
import Userfront from "@userfront/core";
Userfront.init("demo1234");

// Send a login link
Userfront.sendLoginLink("jane@example.com");

// Read the access token
Userfront.tokens.accessToken;

// => "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJtb2RlIjoidGVzdCIsImlzQ29uZmlybWVkIjp0cnVlLCJ1c2VySWQiOjEsInVzZXJVdWlkIjoiZDAwNTlmN2UtYzU0OS00NmYzLWEzYTMtOGEwNDY0MDkzZmMyIiwidGVuYW50SWQiOiJwOW55OGJkaiIsInNlc3Npb25JZCI6IjRlZjBlMjdjLTI1NDAtNDIzOS05YTJiLWRkZjgyZjE3YmExYiIsImF1dGhvcml6YXRpb24iOnsicDlueThiZGoiOnsidGVuYW50SWQiOiJwOW55OGJkaiIsIm5hbWUiOiJVc2VyZnJvbnQiLCJyb2xlcyI6WyJhZG1pbiJdLCJwZXJtaXNzaW9ucyI6W119fSwiaWF0IjoxNjE3MTQ4MDY3LCJleHAiOjE2MTk3NDAwNjd9.gYz4wxPHLY6PNp8KPEyIjLZ8QzG3-NFJGPitginuLaU"

// Log the user out
Userfront.logout();

// Access the user's information
Userfront.user;

/** =>
 * {
 *    email: "jane@example.com",
 *    phoneNumber: "+15558675309",
 *    name: "Jane Example",
 *    image: "https://res.cloudinary.com/component/image/upload/avatars/avatar-plain-9.png",
 *    data: {},
 *    username: "jane-example",
 *    isEmailConfirmed: true,
 *    isPhoneNumberConfirmed: false,
 *    confirmedEmailAt: "2020-01-01T00:00:00.000Z",
 *    confirmedPhoneNumberAt: "2020-01-01T00:00:00.000Z",
 *    isMfaRequired: false,
 *    createdAt: "2020-01-01T00:00:00.000Z",
 *    updatedAt: "2020-01-01T00:00:00.000Z",
 *    mode: "test",
 *    tenantId: "demo1234",
 *    userId: 1,
 *    userUuid: "d6f0f045-f6ea-4262-8724-dfc0b77e7dc9",
 * }
 */
```

## Development

### Building

- `npm build`: build all library files

The build commands are split into two parts. `build` and `build:beta` both run these commands, which do not need to be run separately:

- `npm build:standard`: build the standard library files:
  - ESM module `build/userfront-core.module.js`
  - CJS module `build/userfront-core.js`
  - UMD module `build/userfront-core.umd.js`
  - Module with bundled dependencies, for import from CDN: `build/userfront-core.modern.mjs`
