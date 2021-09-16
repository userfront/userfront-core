declare function P(): Promise<any>;
declare namespace a {
    export namespace user {
        export function update(e: object): Promise<void> | Promise<{}>;
    }
}
export declare function addInitCallback(e: any): void;
export declare function init(e: any, r?: {}): void;
export declare function registerUrlChangedEventListener(): void;
export declare function logout(): Promise<void>;
export declare function setMode(): Promise<void>;
export declare function login({ method: e, email: r, username: o, emailOrUsername: i, password: c, token: u, uuid: d, redirect: h }?: {
    method: string;
    email: string;
    username: string;
    emailOrUsername: string;
    password: string;
    token: string;
    uuid: string;
    redirect: boolean;
}): Promise<any>;
export declare function resetPassword({ uuid: e, token: r, password: o, redirect: i }: {
    uuid: string;
    token: string;
    password: string;
    redirect: boolean;
}): Promise<any>;
export declare function sendLoginLink(e: any): Promise<any>;
export declare function sendResetLink(e: any): Promise<any>;
export declare function signup({ method: e, username: r, name: o, email: i, password: s, data: c, redirect: u }?: {
    method: string;
    username: string;
    name: string;
    email: string;
    password: string;
    data: any;
    redirect: boolean;
}): Promise<any>;
export declare function accessToken(): any;
export declare function idToken(): any;
export declare function redirectIfLoggedIn(): Promise<void>;
export { P as refresh, a as store };
