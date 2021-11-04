// init
export declare function init(tenantId: string, options?: object): Promise<void>;

// addInitCallback()
export declare function addInitCallback(callback: Function): void;

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
  hasRole?: Function;
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

interface TokenObject {
  value: string;
  cookieOptions?: object;
}

interface TokensObject {
  access: TokenObject;
  id: TokenObject;
  refresh?: TokenObject;
}

interface SignupResponse {
  mode: string;
  // User attributes
  userId?: number;
  uuid?: string;
  username?: string;
  email?: string;
  name?: string;
  image?: string;
  locked?: boolean;
  data?: object;
  authorization?: object;
  isConfirmed?: boolean;
  lastActiveAt?: string;
  updatedAt?: string;
  createdAt?: string;
  tenant?: object;
  // Response
  tokens?: TokensObject;
  redirectTo?: string;
  sessionId?: string;
  nonce?: string;
}

interface LoginResponse {
  mode: string;
  tokens?: TokensObject;
  redirectTo?: string;
  sessionId?: string;
  nonce?: string;
}

interface LogoutResponse {
  message: string;
  redirectTo?: string;
}

interface LinkResult {
  to?: string;
  submittedAt?: string;
  messageId?: string;
  url?: string;
}

interface LinkResponse {
  message: string;
  result?: LinkResult;
}

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
}): Promise<SignupResponse>;

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
}): Promise<LoginResponse>;

// logout()
export declare function logout({
  redirect,
}: {
  redirect?: string | boolean;
}): Promise<LogoutResponse>;

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
}): Promise<LoginResponse>;

// sendLoginLink()
export declare function sendLoginLink(email: string): Promise<LinkResponse>;

// sendResetLink()
export declare function sendResetLink(email: string): Promise<LinkResponse>;
