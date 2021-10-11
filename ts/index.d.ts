// init
export declare function init(tenantId: string, options?: object): Promise<void>;

// addInitCallback()
export declare function addInitCallback(callback: Function): void;

// signup()
export declare function signup({
  method,
  email,
  username,
  name,
  password,
  redirect,
}: {
  method: string;
  email?: string;
  username?: string;
  name?: string;
  password?: string;
  redirect?: string | boolean;
}): Promise<void>;

// login()
export declare function login({
  method,
  email,
  username,
  emailOrUsername,
  password,
  token,
  uuid,
  redirect,
}: {
  method: string;
  email?: string;
  username?: string;
  emailOrUsername?: string;
  password?: string;
  token?: string;
  uuid?: string;
  redirect?: string | boolean;
}): Promise<void>;

// logout()
export declare function logout({
  redirect,
}: {
  redirect?: string | boolean;
}): Promise<void>;

// redirectIfLoggedIn()
export declare function redirectIfLoggedIn({
  redirect,
}: {
  redirect?: string;
}): Promise<void>;

// resetPassword()
export declare function resetPassword({
  password,
  token,
  uuid,
  redirect,
}: {
  password: string;
  token?: string;
  uuid?: string;
  redirect?: string | boolean;
}): Promise<void>;

// sendLoginLink()
export declare function sendLoginLink(email: string): Promise<void>;

// sendResetLink()
export declare function sendResetLink(email: string): Promise<void>;

// user
interface User {
  email?: string;
  name?: string;
  image?: string;
  data?: object;
  username?: string;
  confirmedAt?: string;
  isConfirmed?: boolean;
  createdAt?: string;
  updatedAt?: string;
  mode?: "live" | "test";
  tenantId?: string;
  userId?: number;
  userUuid?: string;
  update?: Function;
}
export declare const user: User;

// tokens
interface Tokens {
  accessToken: string;
  accessTokenName: string;
  idToken: string;
  idTokenName: string;
}
export declare const tokens: Tokens;

// mode
interface Mode {
  value: "live" | "test";
  reason?: string;
  setMode?: Function;
}
export declare const mode: Mode;
