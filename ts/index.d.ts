// init
export declare function init(tenantId: string, options?: object): Promise<void>;

// addInitCallback()
export declare function addInitCallback(callback: function): void;

// user
interface User {
  email?: string;
  phoneNumber?: string;
  name?: string;
  image?: string;
  data?: object;
  username?: string;
  isEmailConfirmed?: boolean;
  isPhoneNumberConfirmed?: boolean;
  isConfirmed?: boolean;
  createdAt?: string;
  updatedAt?: string;
  mode?: "live" | "test";
  tenantId?: string;
  userId?: number;
  userUuid?: string;
  // methods
  update?: function;
  updatePassword?: function;
  getTotp?: function;
  hasRole?: function;
  confirmedAt?: string; // Deprecated
}
export declare const user: User;

// tokens
interface Tokens {
  accessToken: string;
  accessTokenName: string;
  idToken: string;
  idTokenName: string;
  refresh: function;
}
export declare const tokens: Tokens;

// mode
interface Mode {
  value: "live" | "test";
  reason?: string;
  setMode?: function;
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
  tenantId?: string;
  userUuid?: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  name?: string;
  image?: string;
  locked?: boolean;
  data?: object;
  isEmailConfirmed?: boolean;
  isPhoneNumberConfirmed?: boolean;
  isConfirmed?: boolean;
  lastActiveAt?: string;
  createdAt?: string;
  updatedAt?: string;
  tenant?: object;
  authorization?: object;
  confirmedAt?: string; // Deprecated
  uuid?: string; // Deprecated
  // Response
  tokens?: TokensObject;
  redirectTo?: string;
  sessionId?: string;
  nonce?: string;
  message?: string;
  result?: LinkResult;
}

interface LoginResponse {
  mode: string;
  tokens?: TokensObject;
  redirectTo?: string;
  sessionId?: string;
  nonce?: string;
  message?: string;
  result?: LinkResult;
}

interface UpdatePasswordResponse {
  message?: string;
}

interface LogoutResponse {
  message: string;
  redirectTo?: string;
}

interface SessionResponse {
  isLoggedIn: boolean;
}

interface LinkResult {
  email?: string;
  submittedAt?: string;
  messageId?: string;
  url?: string;
  to?: string; // deprecated
}

interface LinkResponse {
  message: string;
  result?: LinkResult;
}

interface VerificationCodeResult {
  channel?: string;
  phoneNumber?: string;
  email?: string;
  submittedAt?: string;
  messageId?: string;
  verificationCode?: string;
}

interface VerificationCodeResponse {
  message: string;
  result?: VerificationCodeResult;
}

// signup()
export declare function signup({
  method,
  email,
  username,
  phoneNumber,
  name,
  data,
  password,
  channel,
  redirect,
  handleUpstreamResponse,
  handleMfaRequired,
  handlePkceRequired,
  handleTokens,
  handleRedirect,
}: {
  method: string;
  email?: string;
  username?: string;
  phoneNumber?: string;
  name?: string;
  data?: object;
  password?: string;
  channel?: "sms" | "email";
  redirect?: string | boolean;
  handleUpstreamResponse?: function;
  handleMfaRequired?: function;
  handlePkceRequired?: function;
  handleTokens?: function;
  handleRedirect?: function;
}): Promise<SignupResponse>;

// login()
export declare function login({
  method,
  // User identifiers
  userId,
  userUuid,
  email,
  username,
  emailOrUsername,
  phoneNumber,
  // Password
  password,
  // Link
  token,
  uuid,
  // Totp
  totpCode,
  backupCode,
  // Verification code
  verificationCode,
  channel,
  // Other
  redirect,
  handleUpstreamResponse,
  handleMfaRequired,
  handlePkceRequired,
  handleTokens,
  handleRedirect,
  options,
}: {
  method: string;
  userId?: number;
  userUuid?: string;
  email?: string;
  username?: string;
  emailOrUsername?: string;
  phoneNumber?: string;
  password?: string;
  token?: string;
  uuid?: string;
  totpCode?: string;
  backupCode?: string;
  verificationCode?: string;
  channel?: "sms" | "email";
  redirect?: string | boolean;
  handleUpstreamResponse?: function;
  handleMfaRequired?: function;
  handlePkceRequired?: function;
  handleTokens?: function;
  handleRedirect?: function;
  options?: object;
}): Promise<LoginResponse>;

// logout()
export declare function logout({
  redirect,
}?: {
  redirect?: string | boolean;
}): Promise<LogoutResponse>;

// getSession()
export declare function getSession(): Promise<SessionResponse>;

// redirectIfLoggedIn()
export declare function redirectIfLoggedIn({
  redirect,
}?: {
  redirect?: string;
}): Promise<void>;

// redirectIfLoggedOut()
export declare function redirectIfLoggedOut({
  redirect,
}?: {
  redirect?: string;
}): Promise<void>;

// updatePassword()
export declare function updatePassword({
  password,
  existingPassword,
  token,
  uuid,
  redirect,
  method,
}: {
  password: string;
  existingPassword?: string;
  token?: string;
  uuid?: string;
  redirect?: string | boolean;
  method?: "link" | "jwt";
}): Promise<LoginResponse | UpdatePasswordResponse>;

// resetPassword()
export declare function resetPassword({
  password,
  existingPassword,
  token,
  uuid,
  redirect,
  method,
}: {
  password: string;
  existingPassword?: string;
  token?: string;
  uuid?: string;
  redirect?: string | boolean;
  method?: "link" | "jwt";
}): Promise<LoginResponse | UpdatePasswordResponse>;

// sendLoginLink()
export declare function sendLoginLink(email: string): Promise<LinkResponse>;

// sendResetLink()
export declare function sendResetLink(email: string): Promise<LinkResponse>;

// sendVerificationCode()
export declare function sendVerificationCode({
  channel,
  phoneNumber,
  email,
  name,
  username,
  data,
}: {
  channel: "sms" | "email";
  phoneNumber?: string;
  email?: string;
  name?: string;
  username?: string;
  data?: object;
}): Promise<VerificationCodeResponse>;
