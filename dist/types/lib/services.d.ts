import { FirebaseApp } from "firebase/app";
import { OAuthCredential } from "firebase/auth";
import { AuthUser } from "../types/index.js";
/**
 * Bootstrap services and configs is needed for a new command execution and related services.
 * @returns <Promise<FirebaseServices>>
 */
export declare const bootstrapCommandExecutionAndServices: () => Promise<any>;
/**
 * Execute the sign in to Firebase using OAuth credentials.
 * @dev wrapper method to handle custom errors.
 * @param firebaseApp <FirebaseApp> - the configured instance of the Firebase App in use.
 * @param credentials <OAuthCredential> - the OAuth credential generated from token exchange.
 * @returns <Promise<void>>
 */
export declare const signInToFirebase: (firebaseApp: FirebaseApp, credentials: OAuthCredential) => Promise<void>;
/**
 * Ensure that the callee is an authenticated user.
 * @notice The token will be passed as parameter.
 * @dev This method can be used within GitHub actions or other CI/CD pipelines.
 * @param firebaseApp <FirebaseApp> - the configured instance of the Firebase App in use.
 * @param token <string> - the token to be used for authentication.
 * @returns <Promise<AuthUser>> - a custom object containing info about the authenticated user, the token and github handle.
 */
export declare const authWithToken: (firebaseApp: FirebaseApp, token: string) => Promise<AuthUser>;
/**
 * Ensure that the callee is an authenticated user.
 * @dev This method MUST be executed before each command to avoid authentication errors when interacting with the command.
 * @returns <Promise<AuthUser>> - a custom object containing info about the authenticated user, the token and github handle.
 */
export declare const checkAuth: (firebaseApp: FirebaseApp) => Promise<AuthUser>;
