export declare const localPaths: {
    output: string;
    setup: string;
    contribute: string;
    finalize: string;
    pot: string;
    zkeys: string;
    wasm: string;
    contributions: string;
    transcripts: string;
    attestations: string;
    finalZkeys: string;
    finalPot: string;
    finalTranscripts: string;
    finalAttestations: string;
    verificationKeys: string;
    verifierContracts: string;
};
/**
 * Return the access token, if present.
 * @returns <string | undefined> - the access token if present, otherwise undefined.
 */
export declare const getLocalAccessToken: () => string | unknown;
/**
 * Check if the access token exists in the local storage.
 * @returns <boolean>
 */
export declare const checkLocalAccessToken: () => boolean;
/**
 * Set the access token.
 * @param token <string> - the access token to be stored.
 */
export declare const setLocalAccessToken: (token: string) => void;
/**
 * Delete the stored access token.
 */
export declare const deleteLocalAccessToken: () => void;
/**
 * Get the complete local file path.
 * @param cwd <string> - the current working directory path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the complete local path to the file.
 */
export declare const getCWDFilePath: (cwd: string, completeFilename: string) => string;
/**
 * Get the complete PoT file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the complete PoT path to the file.
 */
export declare const getPotLocalFilePath: (completeFilename: string) => string;
/**
 * Get the complete zKey file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the complete zKey path to the file.
 */
export declare const getZkeyLocalFilePath: (completeFilename: string) => string;
/**
 * Get the complete contribution file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the complete contribution path to the file.
 */
export declare const getContributionLocalFilePath: (completeFilename: string) => string;
/**
 * Get the contribution attestation file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the the contribution attestation path to the file.
 */
export declare const getAttestationLocalFilePath: (completeFilename: string) => string;
/**
 * Get the transcript file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the the transcript path to the file.
 */
export declare const getTranscriptLocalFilePath: (completeFilename: string) => string;
/**
 * Get the complete final zKey file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the complete final zKey path to the file.
 */
export declare const getFinalZkeyLocalFilePath: (completeFilename: string) => string;
/**
 * Get the complete final PoT file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the complete final PoT path to the file.
 */
export declare const getFinalPotLocalFilePath: (completeFilename: string) => string;
/**
 * Get the complete verification key file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the complete final verification key path to the file.
 */
export declare const getVerificationKeyLocalFilePath: (completeFilename: string) => string;
/**
 * Get the complete verifier contract file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the complete final verifier contract path to the file.
 */
export declare const getVerifierContractLocalFilePath: (completeFilename: string) => string;
/**
 * Get the complete final attestation file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the complete final final attestation path to the file.
 */
export declare const getFinalAttestationLocalFilePath: (completeFilename: string) => string;
/**
 * Get the final transcript file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the the final transcript path to the file.
 */
export declare const getFinalTranscriptLocalFilePath: (completeFilename: string) => string;
