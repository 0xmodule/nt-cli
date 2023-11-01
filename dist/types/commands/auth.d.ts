#!/usr/bin/env node
import { Verification } from "@octokit/auth-oauth-device/dist-types/types.js";
/**
 * Custom countdown which throws an error when expires.
 * @param expirationInSeconds <number> - the expiration time in seconds.
 */
export declare const expirationCountdownForGithubOAuth: (expirationInSeconds: number) => void;
/**
 * Callback to manage the data requested for Github OAuth2.0 device flow.
 * @param verification <Verification> - the data from Github OAuth2.0 device flow.
 */
export declare const onVerification: (verification: Verification) => Promise<void>;
/**
 * Return the Github OAuth 2.0 token using manual Device Flow authentication process.
 * @param clientId <string> - the client id for the CLI OAuth app.
 * @returns <string> the Github OAuth 2.0 token.
 */
export declare const executeGithubDeviceFlow: (clientId: string) => Promise<string>;
/**
 * Auth command.
 * @notice The auth command allows a user to make the association of their Github account with the CLI by leveraging OAuth 2.0 as an authentication mechanism.
 * @dev Under the hood, the command handles a manual Device Flow following the guidelines in the Github documentation.
 */
declare const auth: () => Promise<void>;
export default auth;
