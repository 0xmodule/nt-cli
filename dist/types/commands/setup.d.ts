#!/usr/bin/env node
import { Functions } from "firebase/functions";
import { CeremonyTimeoutType, CircomCompilerData, CircuitInputData, CeremonyInputData, CircuitDocument } from "@nocturne-xyz/p0tion-actions";
/**
 * Handle whatever is needed to obtain the input data for a circuit that the coordinator would like to add to the ceremony.
 * @param choosenCircuitFilename <string> - the name of the circuit to add.
 * @param matchingWasmFilename <string> - the name of the circuit wasm file.
 * @param ceremonyTimeoutMechanismType <CeremonyTimeoutType> - the type of ceremony timeout mechanism.
 * @param sameCircomCompiler <boolean> - true, if this circuit shares with the others the <CircomCompilerData>; otherwise false.
 * @param circuitSequencePosition <number> - the position of the circuit in the contribution queue.
 * @param sharedCircomCompilerData <string> - version and commit hash of the Circom compiler used to compile the ceremony circuits.
 * @returns <Promise<CircuitInputData>> - the input data of the circuit to add to the ceremony.
 */
export declare const getInputDataToAddCircuitToCeremony: (choosenCircuitFilename: string, matchingWasmFilename: string, ceremonyTimeoutMechanismType: CeremonyTimeoutType, sameCircomCompiler: boolean, circuitSequencePosition: number, sharedCircomCompilerData: CircomCompilerData) => Promise<CircuitInputData>;
/**
 * Handle the addition of one or more circuits to the ceremony.
 * @param options <Array<string>> - list of possible circuits that can be added to the ceremony.
 * @param ceremonyTimeoutMechanismType <CeremonyTimeoutType> - the type of ceremony timeout mechanism.
 * @returns <Promise<Array<CircuitInputData>>> - the input data for each circuit that has been added to the ceremony.
 */
export declare const handleAdditionOfCircuitsToCeremony: (r1csOptions: Array<string>, wasmOptions: Array<string>, ceremonyTimeoutMechanismType: CeremonyTimeoutType) => Promise<Array<CircuitInputData>>;
/**
 * Print ceremony and related circuits information.
 * @param ceremonyInputData <CeremonyInputData> - the input data of the ceremony.
 * @param circuits <Array<CircuitDocument>> - the circuit documents associated to the circuits of the ceremony.
 */
export declare const displayCeremonySummary: (ceremonyInputData: CeremonyInputData, circuits: Array<CircuitDocument>) => void;
/**
 * Check if the smallest Powers of Tau has already been downloaded/stored in the correspondent local path
 * @dev we are downloading the Powers of Tau file from Hermez Cryptography Phase 1 Trusted Setup.
 * @param powers <string> - the smallest amount of powers needed for the given circuit (should be in a 'XY' stringified form).
 * @param ptauCompleteFilename <string> - the complete file name of the powers of tau file to be downloaded.
 * @returns <Promise<void>>
 */
export declare const checkAndDownloadSmallestPowersOfTau: (powers: string, ptauCompleteFilename: string) => Promise<void>;
/**
 * Handle the needs in terms of Powers of Tau for the selected pre-computed zKey.
 * @notice in case there are no Powers of Tau file suitable for the pre-computed zKey (i.e., having a
 * number of powers greater than or equal to the powers needed by the zKey), the coordinator will be asked
 * to provide a number of powers manually, ranging from the smallest possible to the largest.
 * @param neededPowers <number> - the smallest amount of powers needed by the zKey.
 * @returns Promise<string, string> - the information about the choosen Powers of Tau file for the pre-computed zKey
 * along with related powers.
 */
export declare const handlePreComputedZkeyPowersOfTauSelection: (neededPowers: number) => Promise<{
    doubleDigitsPowers: string;
    potCompleteFilename: string;
    usePreDownloadedPoT: boolean;
}>;
/**
 * Generate a brand new zKey from scratch.
 * @param r1csLocalPathAndFileName <string> - the local complete path of the R1CS selected file.
 * @param potLocalPathAndFileName <string> - the local complete path of the PoT selected file.
 * @param zkeyLocalPathAndFileName <string> - the local complete path of the pre-computed zKey selected file.
 */
export declare const handleNewZkeyGeneration: (r1csLocalPathAndFileName: string, potLocalPathAndFileName: string, zkeyLocalPathAndFileName: string) => Promise<void>;
/**
 * Manage the creation of a ceremony file storage bucket.
 * @param firebaseFunctions <Functions> - the Firebase Cloud Functions instance connected to the current application.
 * @param ceremonyPrefix <string> - the prefix of the ceremony.
 * @returns <Promise<string>> - the ceremony bucket name.
 */
export declare const handleCeremonyBucketCreation: (firebaseFunctions: Functions, ceremonyPrefix: string) => Promise<string>;
/**
 * Upload a circuit artifact (r1cs, WASM, ptau) to the ceremony storage.
 * @dev this method uses a multi part upload to upload the file in chunks.
 * @param firebaseFunctions <Functions> - the Firebase Cloud Functions instance connected to the current application.
 * @param bucketName <string> - the ceremony bucket name.
 * @param storageFilePath <string> - the storage (bucket) path where the file should be uploaded.
 * @param localPathAndFileName <string> - the local file path where is located.
 * @param completeFilename <string> - the complete filename.
 */
export declare const handleCircuitArtifactUploadToStorage: (firebaseFunctions: Functions, bucketName: string, storageFilePath: string, localPathAndFileName: string, completeFilename: string) => Promise<void>;
/**
 * Setup command.
 * @notice The setup command allows the coordinator of the ceremony to prepare the next ceremony by interacting with the CLI.
 * @dev For proper execution, the command must be run in a folder containing the R1CS files related to the circuits
 * for which the coordinator wants to create the ceremony. The command will download the necessary Tau powers
 * from Hermez's ceremony Phase 1 Reliable Setup Ceremony.
 * @param cmd? <any> - the path to the ceremony setup file.
 */
declare const setup: (cmd: {
    template?: string;
    auth?: string;
}) => Promise<void>;
export default setup;
