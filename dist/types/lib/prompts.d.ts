import { Answers } from "prompts";
import { Firestore } from "firebase/firestore";
import { CeremonyInputData, FirebaseDocumentInfo, CircomCompilerData, CircuitInputData, CeremonyTimeoutType, DiskTypeForVM } from "@nocturne-xyz/p0tion-actions";
/**
 * Ask a binary (yes/no or true/false) customizable question.
 * @param question <string> - the question to be answered.
 * @param active <string> - the active option (default yes).
 * @param inactive <string> - the inactive option (default no).
 * @returns <Promise<Answers<string>>>
 */
export declare const askForConfirmation: (question: string, active?: string, inactive?: string) => Promise<Answers<string>>;
/**
 * Prompt a series of questios to gather input data for the ceremony setup.
 * @param firestore <Firestore> - the instance of the Firestore database.
 * @returns <Promise<CeremonyInputData>> - the necessary information for the ceremony provided by the coordinator.
 */
export declare const promptCeremonyInputData: (firestore: Firestore) => Promise<CeremonyInputData>;
/**
 * Prompt a series of questios to gather input about the Circom compiler.
 * @returns <Promise<CircomCompilerData>> - the necessary information for the Circom compiler used for the circuits.
 */
export declare const promptCircomCompiler: () => Promise<CircomCompilerData>;
/**
 * Shows a list of circuits for a single option selection.
 * @dev the circuit names are derived from local R1CS files.
 * @param options <Array<string>> - an array of circuits names.
 * @returns Promise<string> - the name of the choosen circuit.
 */
export declare const promptCircuitSelector: (options: Array<string>) => Promise<string>;
/**
 * Shows a list of standard EC2 VM instance types for a single option selection.
 * @notice the suggested VM configuration type is calculated based on circuit constraint size.
 * @param constraintSize <number> - the amount of circuit constraints
 * @returns Promise<string> - the name of the choosen VM type.
 */
export declare const promptVMTypeSelector: (constraintSize: any) => Promise<string>;
/**
 * Shows a list of disk types for selected VM.
 * @returns Promise<DiskTypeForVM> - the selected disk type.
 */
export declare const promptVMDiskTypeSelector: () => Promise<DiskTypeForVM>;
/**
 * Show a series of questions about the circuits.
 * @param constraintSize <number> - the amount of circuit constraints.
 * @param timeoutMechanismType <CeremonyTimeoutType> - the choosen timeout mechanism type for the ceremony.
 * @param needPromptCircomCompiler <boolean> - a boolean value indicating if the questions related to the Circom compiler version and commit hash must be asked.
 * @param enforceVM <boolean> - a boolean value indicating if the contribution verification could be supported by VM-only approach or not.
 * @returns Promise<Array<Circuit>> - circuit info prompted by the coordinator.
 */
export declare const promptCircuitInputData: (constraintSize: number, timeoutMechanismType: CeremonyTimeoutType, sameCircomCompiler: boolean, enforceVM: boolean) => Promise<CircuitInputData>;
/**
 * Prompt for asking if the same circom compiler version has been used for all circuits of the ceremony.
 * @returns <Promise<boolean>>
 */
export declare const promptSameCircomCompiler: () => Promise<boolean>;
/**
 * Prompt for asking if the coordinator wanna use a pre-computed zKey for the given circuit.
 * @returns <Promise<boolean>>
 */
export declare const promptPreComputedZkey: () => Promise<boolean>;
/**
 * Prompt for asking if the coordinator wants to add a new circuit to the ceremony.
 * @returns <Promise<boolean>>
 */
export declare const promptCircuitAddition: () => Promise<boolean>;
/**
 * Shows a list of pre-computed zKeys for a single option selection.
 * @dev the names are derived from local zKeys files.
 * @param options <Array<string>> - an array of pre-computed zKeys names.
 * @returns Promise<string> - the name of the choosen pre-computed zKey.
 */
export declare const promptPreComputedZkeySelector: (options: Array<string>) => Promise<string>;
/**
 * Prompt asking to the coordinator to choose the desired PoT file for the zKey for the circuit.
 * @param suggestedSmallestNeededPowers <number> - the minimal number of powers necessary for circuit zKey generation.
 * @returns Promise<number> - the selected amount of powers.
 */
export declare const promptNeededPowersForCircuit: (suggestedSmallestNeededPowers: number) => Promise<number>;
/**
 * Shows a list of PoT files for a single option selection.
 * @dev the names are derived from local PoT files.
 * @param options <Array<string>> - an array of PoT file names.
 * @returns Promise<string> - the name of the choosen PoT.
 */
export declare const promptPotSelector: (options: Array<string>) => Promise<string>;
/**
 * Prompt for asking about ceremony selection.
 * @dev this method is used to show a list of ceremonies to be selected for both the computation of a contribution and the finalization of a ceremony.
 * @param ceremoniesDocuments <Array<FirebaseDocumentInfo>> - the list of ceremonies Firestore documents.
 * @param isFinalizing <boolean> - true when the coordinator must select a ceremony for finalization; otherwise false (participant selects a ceremony for contribution).
 * @returns Promise<FirebaseDocumentInfo> - the Firestore document of the selected ceremony.
 */
export declare const promptForCeremonySelection: (ceremoniesDocuments: Array<FirebaseDocumentInfo>, isFinalizing: boolean) => Promise<FirebaseDocumentInfo>;
/**
 * Prompt the participant to type the entropy or the coordinator to type the beacon.
 * @param isEntropy <boolean> - true when prompting for typing entropy; otherwise false.
 * @returns <Promise<string>> - the entropy or beacon value.
 */
export declare const promptToTypeEntropyOrBeacon: (isEntropy?: boolean) => Promise<string>;
/**
 * Prompt for entropy generation or insertion.
 * @return <Promise<string>> - the entropy.
 */
export declare const promptForEntropy: () => Promise<string>;
