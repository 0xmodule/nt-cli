import { FirebaseDocumentInfo } from "@nocturne-xyz/p0tion-actions";
import { OAuthCredential } from "firebase/auth";
import { DocumentData, Firestore } from "firebase/firestore";
import { Functions } from "firebase/functions";
import { Ora } from "ora";
import { Logger } from "winston";
import { GithubGistFile, Timing } from "../types/index.js";
/**
 * Exchange the Github token for OAuth credential.
 * @param githubToken <string> - the Github token generated through the Device Flow process.
 * @returns <OAuthCredential>
 */
export declare const exchangeGithubTokenForCredentials: (githubToken: string) => OAuthCredential;
/**
 * Get the information associated to the account from which the token has been generated to
 * create a custom unique identifier for the user.
 * @notice the unique identifier has the following form 'handle-identifier'.
 * @param githubToken <string> - the Github token.
 * @returns <Promise<any>> - the Github (provider) unique identifier associated to the user.
 */
export declare const getGithubProviderUserId: (githubToken: string) => Promise<any>;
/**
 * Get the gists associated to the authenticated user account.
 * @param githubToken <string> - the Github token.
 * @param params <Object<number,number>> - the necessary parameters for the request.
 * @returns <Promise<any>> - the Github gists associated with the authenticated user account.
 */
export declare const getGithubAuthenticatedUserGists: (githubToken: string, params: {
    perPage: number;
    page: number;
}) => Promise<any>;
/**
 * Check whether or not the user has published the gist.
 * @dev gather all the user's gists and check if there is a match with the expected public attestation.
 * @param githubToken <string> - the Github token.
 * @param publicAttestationFilename <string> - the public attestation filename.
 * @returns <Promise<GithubGistFile | undefined>> - return the public attestation gist if and only if has been published.
 */
export declare const getPublicAttestationGist: (githubToken: string, publicAttestationFilename: string) => Promise<GithubGistFile | undefined>;
/**
 * Return the Github handle from the provider user id.
 * @notice the provider user identifier must have the following structure 'handle-id'.
 * @param providerUserId <string> - the unique provider user identifier.
 * @returns <string> - the third-party provider handle of the user.
 */
export declare const getUserHandleFromProviderUserId: (providerUserId: string) => string;
/**
 * Return a custom spinner.
 * @param text <string> - the text that should be displayed as spinner status.
 * @param spinnerLogo <any> - the logo.
 * @returns <Ora> - a new Ora custom spinner.
 */
export declare const customSpinner: (text: string, spinnerLogo: any) => Ora;
/**
 * Custom sleeper.
 * @dev to be used in combination with loggers and for workarounds where listeners cannot help.
 * @param ms <number> - sleep amount in milliseconds
 * @returns <Promise<any>>
 */
export declare const sleep: (ms: number) => Promise<any>;
/**
 * Simple loader for task simulation.
 * @param loadingText <string> - spinner text while loading.
 * @param spinnerLogo <any> - spinner logo.
 * @param durationInMs <number> - spinner loading duration in ms.
 * @returns <Promise<void>>.
 */
export declare const simpleLoader: (loadingText: string, spinnerLogo: any, durationInMs: number) => Promise<void>;
/**
 * Check and return the free aggregated disk space (in KB) for participant machine.
 * @dev this method use the node-disk-info method to retrieve the information about
 * disk availability for all visible disks.
 * nb. no other type of data or operation is performed by this methods.
 * @returns <number> - the free aggregated disk space in kB for the participant machine.
 */
export declare const estimateParticipantFreeGlobalDiskSpace: () => number;
/**
 * Get seconds, minutes, hours and days from milliseconds.
 * @param millis <number> - the amount of milliseconds.
 * @returns <Timing> - a custom object containing the amount of seconds, minutes, hours and days in the provided millis.
 */
export declare const getSecondsMinutesHoursFromMillis: (millis: number) => Timing;
/**
 * Convert milliseconds to seconds.
 * @param millis <number>
 * @returns <number>
 */
export declare const convertMillisToSeconds: (millis: number) => number;
/**
 * Gracefully terminate the command execution
 * @params ghUsername <string> - the Github username of the user.
 */
export declare const terminate: (ghUsername: string) => Promise<never>;
/**
 * Publish public attestation using Github Gist.
 * @dev the contributor must have agreed to provide 'gist' access during the execution of the 'auth' command.
 * @param accessToken <string> - the contributor access token.
 * @param publicAttestation <string> - the public attestation.
 * @param ceremonyTitle <string> - the ceremony title.
 * @param ceremonyPrefix <string> - the ceremony prefix.
 * @returns <Promise<string>> - the url where the gist has been published.
 */
export declare const publishGist: (token: string, content: string, ceremonyTitle: string, ceremonyPrefix: string) => Promise<string>;
/**
 * Generate a custom url that when clicked allows you to compose a tweet ready to be shared.
 * @param hashes <string> - the contribution hashes of the circuits. If there are more than 2 circuits, the other hashes will be omitted
 * @returns <string> - the ready to share tweet url.
 */
export declare const generateCustomUrlToTweetAboutParticipation: (hashes: string[]) => string;
/**
 * Download an artifact from the ceremony bucket.
 * @dev this method request a pre-signed url to make a GET request to download the artifact.
 * @param cloudFunctions <Functions> - the instance of the Firebase cloud functions for the application.
 * @param bucketName <string> - the name of the ceremony artifacts bucket (AWS S3).
 * @param storagePath <string> - the storage path that locates the artifact to be downloaded in the bucket.
 * @param localPath <string> - the local path where the artifact will be downloaded.
 */
export declare const downloadCeremonyArtifact: (cloudFunctions: Functions, bucketName: string, storagePath: string, localPath: string) => Promise<void>;
/**
 *
 * @param lastZkeyLocalFilePath <string> - the local path of the last contribution.
 * @param nextZkeyLocalFilePath <string> - the local path where the next contribution is going to be stored.
 * @param entropyOrBeacon <string> - the entropy or beacon (only when finalizing) for the contribution.
 * @param contributorOrCoordinatorIdentifier <string> - the identifier of the contributor or coordinator (only when finalizing).
 * @param averageComputingTime <number> - the current average contribution computation time.
 * @param transcriptLogger <Logger> - the custom file logger to generate the contribution transcript.
 * @param isFinalizing <boolean> - flag to discriminate between ceremony finalization (true) and contribution (false).
 * @returns <Promise<number>> - the amount of time spent contributing.
 */
export declare const handleContributionComputation: (lastZkeyLocalFilePath: string, nextZkeyLocalFilePath: string, entropyOrBeacon: string, contributorOrCoordinatorIdentifier: string, averageComputingTime: number, transcriptLogger: Logger, isFinalizing: boolean) => Promise<number>;
/**
 * Return the most up-to-date data about the participant document for the given ceremony.
 * @param firestoreDatabase <Firestore> - the Firestore service instance associated to the current Firebase application.
 * @param ceremonyId <string> - the unique identifier of the ceremony.
 * @param participantId <string> - the unique identifier of the participant.
 * @returns <Promise<DocumentData>> - the most up-to-date participant data.
 */
export declare const getLatestUpdatesFromParticipant: (firestoreDatabase: Firestore, ceremonyId: string, participantId: string) => Promise<DocumentData>;
/**
 * Start or resume a contribution from the last participant contribution step.
 * @notice this method goes through each contribution stage following this order:
 * 1) Downloads the last contribution from previous contributor.
 * 2) Computes the new contribution.
 * 3) Uploads the new contribution.
 * 4) Requests the verification of the new contribution to the coordinator's backend and waits for the result.
 * @param cloudFunctions <Functions> - the instance of the Firebase cloud functions for the application.
 * @param firestoreDatabase <Firestore> - the Firestore service instance associated to the current Firebase application.
 * @param ceremony <FirebaseDocumentInfo> - the Firestore document of the ceremony.
 * @param circuit <FirebaseDocumentInfo> - the Firestore document of the ceremony circuit.
 * @param participant <FirebaseDocumentInfo> - the Firestore document of the participant (contributor or coordinator).
 * @param participantContributionStep <ParticipantContributionStep> - the contribution step of the participant (from where to start/resume contribution).
 * @param entropyOrBeaconHash <string> - the entropy or beacon hash (only when finalizing) for the contribution.
 * @param contributorOrCoordinatorIdentifier <string> - the identifier of the contributor or coordinator (only when finalizing).
 * @param isFinalizing <boolean> - flag to discriminate between ceremony finalization (true) and contribution (false).
 * @param circuitsLength <number> - the total number of circuits in the ceremony.
 */
export declare const handleStartOrResumeContribution: (cloudFunctions: Functions, firestoreDatabase: Firestore, ceremony: FirebaseDocumentInfo, circuit: FirebaseDocumentInfo, participant: FirebaseDocumentInfo, entropyOrBeaconHash: any, contributorOrCoordinatorIdentifier: string, isFinalizing: boolean, circuitsLength: number) => Promise<void>;
