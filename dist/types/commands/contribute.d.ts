#!/usr/bin/env node
import { Contribution, ContributionValidity, FirebaseDocumentInfo } from "@nocturne-xyz/p0tion-actions";
import { DocumentSnapshot, DocumentData, Firestore } from "firebase/firestore";
import { Functions } from "firebase/functions";
/**
 * Return the verification result for latest contribution.
 * @param firestoreDatabase <Firestore> - the Firestore service instance associated to the current Firebase application.
 * @param ceremonyId <string> - the unique identifier of the ceremony.
 * @param circuitId <string> - the unique identifier of the circuit.
 * @param participantId <string> - the unique identifier of the contributor.
 */
export declare const getLatestVerificationResult: (firestoreDatabase: Firestore, ceremonyId: string, circuitId: string, participantId: string) => Promise<void>;
/**
 * Generate a ready-to-share tweet on public attestation.
 * @param ceremonyTitle <string> - the title of the ceremony.
 * @param gistUrl <string> - the Github public attestation gist url.
 */
export declare const handleTweetGeneration: (hashes: string[]) => Promise<void>;
/**
 * Display if a set of contributions computed for a circuit is valid/invalid.
 * @param contributionsWithValidity <Array<ContributionValidity>> - list of contributor contributions together with contribution validity.
 */
export declare const displayContributionValidity: (contributionsWithValidity: Array<ContributionValidity>) => void;
/**
 * Display and manage data necessary when participant has already made the contribution for all circuits of a ceremony.
 * @param firestoreDatabase <Firestore> - the Firestore service instance associated to the current Firebase application.
 * @param circuits <Array<FirebaseDocumentInfo>> - the array of ceremony circuits documents.
 * @param ceremonyId <string> - the unique identifier of the ceremony.
 * @param participantId <string> - the unique identifier of the contributor.
 */
export declare const handleContributionValidity: (firestoreDatabase: Firestore, circuits: Array<FirebaseDocumentInfo>, ceremonyId: string, participantId: string) => Promise<void>;
/**
 * Display and manage data necessary when participant would like to contribute but there is still an on-going timeout.
 * @param firestoreDatabase <Firestore> - the Firestore service instance associated to the current Firebase application.
 * @param ceremonyId <string> - the unique identifier of the ceremony.
 * @param participantId <string> - the unique identifier of the contributor.
 * @param participantContributionProgress <number> - the progress in the contribution of the various circuits of the ceremony.
 * @param wasContributing <boolean> - flag to discriminate between participant currently contributing (true) or not (false).
 */
export declare const handleTimedoutMessageForContributor: (firestoreDatabase: Firestore, participantId: string, ceremonyId: string, participantContributionProgress: number, wasContributing: boolean) => Promise<void>;
/**
 * Check if the participant has enough disk space available before joining the waiting queue
 * for the computing the next circuit contribution.
 * @param cloudFunctions <Functions> - the instance of the Firebase cloud functions for the application.
 * @param ceremonyId <string> - the unique identifier of the ceremony.
 * @param circuitSequencePosition <number> - the position of the circuit in the sequence for contribution.
 * @param circuitZkeySizeInBytes <number> - the size in bytes of the circuit zKey.
 * @param isResumingAfterTimeout <boolean> - flag to discriminate between resuming after a timeout expiration (true) or progressing to next contribution (false).
 * @param providerUserId <string> - the external third-party provider user identifier.
 * @return <Promise<boolean>> - true when the contributor would like to generate the attestation and do not provide any further contribution to the ceremony; otherwise false.
 */
export declare const handleDiskSpaceRequirementForNextContribution: (cloudFunctions: Functions, ceremonyId: string, circuitSequencePosition: number, circuitZkeySizeInBytes: number, isResumingAfterTimeout: boolean, providerUserId: string) => Promise<boolean>;
/**
 * Generate the public attestation for the contributor.
 * @param firestoreDatabase <Firestore> - the Firestore service instance associated to the current Firebase application.
 * @param circuits <Array<FirebaseDocumentInfo>> - the array of ceremony circuits documents.
 * @param ceremonyId <string> - the unique identifier of the ceremony.
 * @param participantId <string> - the unique identifier of the contributor.
 * @param participantContributions <Array<Co> - the document data of the participant.
 * @param contributorIdentifier <string> - the identifier of the contributor (handle, name, uid).
 * @param ceremonyName <string> - the name of the ceremony.
 * @returns <Promise<[string, string[]]>> - the public attestation followed by a list of the contribution hashes
 */
export declare const generatePublicAttestation: (firestoreDatabase: Firestore, circuits: Array<FirebaseDocumentInfo>, ceremonyId: string, participantId: string, participantContributions: Array<Contribution>, contributorIdentifier: string, ceremonyName: string) => Promise<[string, string[]]>;
/**
 * Generate a public attestation for a contributor, publish the attestation as gist, and prepare a new ready-to-share tweet about ceremony participation.
 * @param firestoreDatabase <Firestore> - the Firestore service instance associated to the current Firebase application.
 * @param circuits <Array<FirebaseDocumentInfo>> - the array of ceremony circuits documents.
 * @param ceremonyId <string> - the unique identifier of the ceremony.
 * @param participantId <string> - the unique identifier of the contributor.
 * @param participantContributions <Array<Co> - the document data of the participant.
 * @param contributorIdentifier <string> - the identifier of the contributor (handle, name, uid).
 * @param ceremonyName <string> - the name of the ceremony.
 * @param ceremonyPrefix <string> - the prefix of the ceremony.
 * @param participantAccessToken <string> - the access token of the participant.
 */
export declare const handlePublicAttestation: (firestoreDatabase: Firestore, circuits: Array<FirebaseDocumentInfo>, ceremonyId: string, participantId: string, participantContributions: Array<Contribution>, contributorIdentifier: string, ceremonyName: string, ceremonyPrefix: string, participantAccessToken: string) => Promise<void>;
/**
 * Listen to circuit document changes.
 * @notice the circuit is the one for which the participant wants to contribute.
 * @dev display custom messages in order to make the participant able to follow what's going while waiting in the queue.
 * Also, this listener use another listener for the current circuit contributor in order to inform the waiting participant about the current contributor's progress.
 * @param firestoreDatabase <Firestore> - the Firestore service instance associated to the current Firebase application.
 * @param ceremonyId <string> - the unique identifier of the ceremony.
 * @param participantId <string> - the unique identifier of the participant.
 * @param circuit <FirebaseDocumentInfo> - the Firestore document info about the circuit.
 */
export declare const listenToCeremonyCircuitDocumentChanges: (firestoreDatabase: Firestore, ceremonyId: string, participantId: string, circuit: FirebaseDocumentInfo) => void;
/**
 * Listen to current authenticated participant document changes.
 * @dev this is the core business logic related to the execution of the contribute command.
 * Basically, the command follows the updates of circuit waiting queue, participant status and contribution steps,
 * while covering aspects regarding memory requirements, contribution completion or resumability, interaction w/ cloud functions, and so on.
 * @notice in order to compute a contribute for each circuit, this method follows several steps:
 * 1) Checking participant memory availability on root disk before joining for the first contribution (circuit having circuitPosition = 1).
 * 2) Check if the participant has not completed the contributions for every circuit or has just finished contributing.
 * 3) If (2) is true:
 *  3.A) Check if the participant switched to `WAITING` as contribution status.
 *      3.A.1) if true; display circuit waiting queue updates to the participant (listener to circuit document changes).
 *      3.A.2) otherwise; do nothing and continue with other checks.
 *  3.B) Check if the participant switched to `CONTRIBUTING` status. The participant must be the current contributor for the circuit w/ a resumable contribution step.
 *      3.B.1) if true; start or resume the contribution from last contribution step.
 *      3.B.2) otherwise; do nothing and continue with other checks.
 *  3.C) Check if the current contributor is resuming from the "VERIFYING" contribution step.
 *      3.C.1) if true; display previous completed steps and wait for verification results.
 *      3.C.2) otherwise; do nothing and continue with other checks.
 *  3.D) Check if the 'verifycontribution' cloud function has successfully completed the execution.
 *      3.D.1) if true; get and display contribution verification results.
 *      3.D.2) otherwise; do nothing and continue with other checks.
 *  3.E) Check if the participant experiences a timeout while contributing.
 *      3.E.1) if true; display timeout message and gracefully terminate.
 *      3.E.2) otherwise; do nothing and continue with other checks.
 *  3.F) Check if the participant has completed the contribution or is trying to resume the contribution after timeout expiration.
 *      3.F.1) if true; check the memory requirement for next/current (completed/resuming) contribution while
 *             handling early interruption of contributions resulting in a final public attestation generation.
 *             (this allows a user to stop their contributions to a certain circuit X if their cannot provide/do not own
 *              an adequate amount of memory for satisfying the memory requirements of the next/current contribution).
 *      3.F.2) otherwise; do nothing and continue with other checks.
 *  3.G) Check if the participant has already contributed to every circuit when running the command.
 *      3.G.1) if true; generate public final attestation and gracefully exit.
 *      3.G.2) otherwise; do nothing
 * @param firestoreDatabase <Firestore> - the Firestore service instance associated to the current Firebase application.
 * @param cloudFunctions <Functions> - the instance of the Firebase cloud functions for the application.
 * @param participant <DocumentSnapshot<DocumentData>> - the Firestore document of the participant.
 * @param ceremony <FirebaseDocumentInfo> - the Firestore document info about the selected ceremony.
 * @param entropy <string> - the random value (aka toxic waste) entered by the participant for the contribution.
 * @param providerUserId <string> - the unique provider user identifier associated to the authenticated account.
 * @param accessToken <string> - the Github token generated through the Device Flow process.
 */
export declare const listenToParticipantDocumentChanges: (firestoreDatabase: Firestore, cloudFunctions: Functions, participant: DocumentSnapshot<DocumentData>, ceremony: FirebaseDocumentInfo, entropy: string, providerUserId: string, accessToken: string) => Promise<void>;
/**
 * Contribute command.
 * @notice The contribute command allows an authenticated user to become a participant (contributor) to the selected ceremony by providing the
 * entropy (toxic waste) for the contribution.
 * @dev For proper execution, the command requires the user to be authenticated with Github account (run auth command first) in order to
 * handle sybil-resistance and connect to Github APIs to publish the gist containing the public attestation.
 */
declare const contribute: (opt: any) => Promise<void>;
export default contribute;
