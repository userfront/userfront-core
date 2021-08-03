# Userfront Core JS library

The Userfront Core JavaScript library is intended for use in frontend applications.

The Core library can be used for the following:

- **Tokens**: read the user's access token to send to your backend
- **User info**: information about the currently logged in user
- **Authentication**: signup, login, logout, and password reset tasks; these are useful for building custom forms and auth flows.

# Docs

Full docs can be found in the Userfront guide:

https://userfront.com/docs/js.html

# Setup

Install by npm (or yarn):

```sh
npm install @userfront/core --save
```

Import and initialize the library:

```js
import Userfront from "@userfront/core";

Userfront.init("demo1234");
```
