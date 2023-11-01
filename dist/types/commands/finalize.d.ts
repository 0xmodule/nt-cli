#!/usr/bin/env node
import { FirebaseDocumentInfo } from "@nocturne-xyz/p0tion-actions";
import { Functions } from "firebase/functions";
import { Firestore } from "firebase/firestore";
/**
 * Export and store on the ceremony bucket the verification key for the given final contribution.
 * @param cloudFunctions <Functions> - the instance of the Firebase cloud functions for the application.
 * @param bucketName <string> - the name of the ceremony bucket.
 * @param finalZkeyLocalFilePath <string> - the local file path of the final zKey.
 * @param verificationKeyLocalFilePath <string> - the local file path of the verification key.
 * @param verificationKeyStorageFilePath <string> - the storage file path of the verification key.
 */
export declare const handleVerificationKey: (cloudFunctions: Functions, bucketName: string, finalZkeyLocalFilePath: string, verificationKeyLocalFilePath: string, verificationKeyStorageFilePath: string) => Promise<void>;
/**
 * Derive and store on the ceremony bucket the Solidity Verifier smart contract for the given final contribution.
 * @param cloudFunctions <Functions> - the instance of the Firebase cloud functions for the application.
 * @param bucketName <string> - the name of the ceremony bucket.
 * @param finalZkeyLocalFilePath <string> - the local file path of the final zKey.
 * @param verifierContractLocalFilePath <string> - the local file path of the verifier smart contract.
 * @param verifierContractStorageFilePath <string> - the storage file path of the verifier smart contract.
 */
export declare const handleVerifierSmartContract: (cloudFunctions: Functions, bucketName: string, finalZkeyLocalFilePath: string, verifierContractLocalFilePath: string, verifierContractStorageFilePath: string) => Promise<void>;
/**
 * Handle the process of finalizing a ceremony circuit.
 * @dev this process results in the extraction of the final ceremony artifacts for the calculation and verification of proofs.
 * @notice this method must enforce the order among these steps:
 * 1) Compute the final contribution (zKey).
 * 2) Extract the verification key (vKey).
 * 3) Extract the Verifier smart contract (.sol).
 * 4) Upload the artifacts in the AWS S3 storage.
 * 5) Complete the final contribution data w/ artifacts references and hashes (cloud function).
 * @param cloudFunctions <Functions> - the instance of the Firebase cloud functions for the application.
 * @param firestoreDatabase <Firestore> - the Firestore service instance associated to the current Firebase application.
 * @param ceremony <FirebaseDocumentInfo> - the Firestore document of the ceremony.
 * @param circuit <FirebaseDocumentInfo> - the Firestore document of the ceremony circuit.
 * @param participant <FirebaseDocumentInfo> - the Firestore document of the participant (coordinator).
 * @param beacon <string> - the value used to compute the final contribution while finalizing the ceremony.
 * @param coordinatorIdentifier <string> - the identifier of the coordinator.
 * @param circuitsLength <number> - the number of circuits in the ceremony.
 */
export declare const handleCircuitFinalization: (cloudFunctions: Functions, firestoreDatabase: Firestore, ceremony: FirebaseDocumentInfo, circuit: FirebaseDocumentInfo, participant: FirebaseDocumentInfo, beacon: string, coordinatorIdentifier: string, circuitsLength: number) => Promise<void>;
/**
 * Finalize command.
 * @notice The finalize command allows a coordinator to finalize a Trusted Setup Phase 2 ceremony by providing the final beacon,
 * computing the final zKeys and extracting the Verifier Smart Contract + Verification Keys per each ceremony circuit.
 * anyone could use the final zKey to create a proof and everyone else could verify the correctness using the
 * related verification key (off-chain) or Verifier smart contract (on-chain).
 * @dev For proper execution, the command requires the coordinator to be authenticated with a GitHub account (run auth command first) in order to
 * handle sybil-resistance and connect to GitHub APIs to publish the gist containing the final public attestation.
 */
declare const finalize: (opt: any) => Promise<void>;
export default finalize;
