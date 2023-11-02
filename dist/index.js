#!/usr/bin/env node

/**
 * @module @nocturne-xyz/nocturne-setup
 * @version 0.2.10
 * @file All-in-one interactive command-line for interfacing with zkSNARK Phase 2 Trusted Setup ceremonies
 * @copyright Ethereum Foundation 2022
 * @license MIT
 * @see [Github]{@link https://github.com/privacy-scaling-explorations/p0tion}
 */
import { createCommand } from 'commander';
import fs, { readFileSync, createWriteStream, renameSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { zKey } from 'snarkjs';
import boxen from 'boxen';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import fetch$1 from 'node-fetch';
import {
  commonTerms,
  formatZkeyIndex,
  getZkeyStorageFilePath,
  finalContributionIndex,
  createCustomLoggerForFile,
  getBucketName,
  progressToNextContributionStep,
  permanentlyStoreCurrentContributionTimeAndHash,
  convertToDoubleDigits,
  multiPartUpload,
  verifyContribution,
  generateGetObjectPreSignedUrl,
  convertBytesOrKbToGb,
  numExpIterations,
  getDocumentById,
  getParticipantsCollectionPath,
  fromQueryToFirebaseDocumentInfo,
  getAllCollectionDocs,
  extractPrefix,
  autoGenerateEntropy,
  vmConfigurationTypes,
  initializeFirebaseCoreServices,
  signInToFirebaseWithCredentials,
  getCurrentFirebaseAuthUser,
  isCoordinator,
  parseCeremonyFile,
  blake512FromPath,
  checkIfObjectExist,
  setupCeremony,
  genesisZkeyIndex,
  getR1csStorageFilePath,
  getWasmStorageFilePath,
  getPotStorageFilePath,
  extractPoTFromFilename,
  potFileDownloadMainUrl,
  createS3Bucket,
  potFilenameTemplate,
  getR1CSInfo,
  getOpenedCeremonies,
  getCeremonyCircuits,
  checkParticipantForCeremony,
  generateValidContributionsAttestation,
  getCurrentActiveParticipantTimeout,
  getCircuitBySequencePosition,
  getCircuitContributionsFromContributor,
  progressToNextCircuitForContribution,
  resumeContributionAfterTimeoutExpiration,
  getContributionsValidityForContributor,
  getClosedCeremonies,
  checkAndPrepareCoordinatorForFinalization,
  computeSHA256ToHex,
  finalizeCeremony,
  getVerificationKeyStorageFilePath,
  verificationKeyAcronym,
  finalizeCircuit,
  exportVkey,
} from '@nocturne-xyz/p0tion-actions';
import fetch from '@adobe/node-fetch-retry';
import { request } from '@octokit/request';
import { SingleBar, Presets } from 'cli-progress';
import dotenv from 'dotenv';
import { GithubAuthProvider, getAuth, signOut } from 'firebase/auth';
import { getDiskInfoSync } from 'node-disk-info';
import ora from 'ora';
import { Timer } from 'timer-node';
import chalk from 'chalk';
import logSymbols from 'log-symbols';
import emoji from 'node-emoji';
import Conf from 'conf';
import prompts from 'prompts';
import clear from 'clear';
import figlet from 'figlet';
import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device';
import clipboard from 'clipboardy';
import open from 'open';
import { Timestamp, onSnapshot } from 'firebase/firestore';
import readline from 'readline';

/**
 * Different custom progress bar types.
 * @enum {string}
 */
var ProgressBarType;
(function (ProgressBarType) {
  ProgressBarType['DOWNLOAD'] = 'DOWNLOAD';
  ProgressBarType['UPLOAD'] = 'UPLOAD';
})(ProgressBarType || (ProgressBarType = {}));

/**
 * Custom theme object.
 */
var theme = {
  colors: {
    yellow: chalk.yellow,
    magenta: chalk.magenta,
    red: chalk.red,
    green: chalk.green,
  },
  text: {
    underlined: chalk.underline,
    bold: chalk.bold,
    italic: chalk.italic,
  },
  symbols: {
    success: logSymbols.success,
    warning: logSymbols.warning,
    error: logSymbols.error,
    info: logSymbols.info,
  },
  emojis: {
    tada: emoji.get('tada'),
    key: emoji.get('key'),
    broom: emoji.get('broom'),
    pointDown: emoji.get('point_down'),
    eyes: emoji.get('eyes'),
    wave: emoji.get('wave'),
    clipboard: emoji.get('clipboard'),
    fire: emoji.get('fire'),
    clock: emoji.get('hourglass'),
    dizzy: emoji.get('dizzy_face'),
    rocket: emoji.get('rocket'),
    oldKey: emoji.get('old_key'),
    pray: emoji.get('pray'),
    moon: emoji.get('moon'),
    upsideDown: emoji.get('upside_down_face'),
    arrowUp: emoji.get('arrow_up'),
    arrowDown: emoji.get('arrow_down'),
  },
};

/** Services */
const CORE_SERVICES_ERRORS = {
  FIREBASE_DEFAULT_APP_DOUBLE_CONFIG: `Wrong double default configuration for Firebase application`,
  FIREBASE_TOKEN_EXPIRED_REMOVED_PERMISSIONS: `The Github authorization has failed due to lack of association between your account and the CLI`,
  FIREBASE_USER_DISABLED: `The Github account has been suspended by the ceremony coordinator(s), blocking the possibility of contribution. Please, contact them to understand the motivation behind it.`,
  FIREBASE_FAILED_CREDENTIALS_VERIFICATION: `Firebase cannot verify your Github credentials due to network errors. Please, try once again later.`,
  FIREBASE_NETWORK_ERROR: `Unable to reach Firebase due to network erros. Please, try once again later and make sure your Internet connection is stable.`,
  FIREBASE_CEREMONY_NOT_OPENED: `There are no ceremonies opened to contributions`,
  FIREBASE_CEREMONY_NOT_CLOSED: `There are no ceremonies ready to finalization`,
  AWS_CEREMONY_BUCKET_CREATION: `Unable to create a new bucket for the ceremony. Something went wrong during the creation. Please, repeat the process by providing a new ceremony name of the ceremony.`,
  AWS_CEREMONY_BUCKET_CANNOT_DOWNLOAD_GET_PRESIGNED_URL: `Unable to download the file from the ceremony bucket. This problem could be related to failure when generating the pre-signed url. Please, we kindly ask you to terminate the current session and repeat the process.`,
};
/** Github */
const THIRD_PARTY_SERVICES_ERRORS = {
  GITHUB_ACCOUNT_ASSOCIATION_REJECTED: `You have decided not to associate the CLI application with your Github account. This declination will not allow you to make a contribution to any ceremony. In case you made a mistake, you can always repeat the process and accept the association of your Github account with the CLI.`,
  GITHUB_SERVER_TIMEDOUT: `Github's servers are experiencing downtime. Please, try once again later and make sure your Internet connection is stable.`,
  GITHUB_GET_GITHUB_ACCOUNT_INFO: `Something went wrong while retrieving your Github account public information (handle and identifier). Please, try once again later`,
  GITHUB_NOT_AUTHENTICATED: `You are unable to execute the command since you have not authorized this device with your Github account.\n${
    theme.symbols.info
  } Please, run the ${theme.text.bold(
    'phase2cli auth'
  )} command and make sure that your account meets the authentication criteria.`,
  GITHUB_GIST_PUBLICATION_FAILED: `Unable to publish the public attestation as gist making the request using your authenticated Github account. Please, verify that you have allowed the 'gist' access permission during the authentication step.`,
};
/** Command */
const COMMAND_ERRORS = {
  COMMAND_NOT_COORDINATOR: `Unable to execute the command. In order to perform coordinator functionality you must authenticate with an account having adeguate permissions.`,
  COMMAND_ABORT_PROMPT: `The data submission process was suddenly interrupted. Your previous data has not been saved. We are sorry, you will have to repeat the process again from the beginning.`,
  COMMAND_ABORT_SELECTION: `The data selection process was suddenly interrupted. Your previous data has not been saved. We are sorry, you will have to repeat the process again from the beginning.`,
  COMMAND_SETUP_NO_R1CS: `Unable to retrieve R1CS files from current working directory. Please, run this command from a working directory where the R1CS files are located to continue with the setup process. We kindly ask you to run the command from an empty directory containing only the R1CS and WASM files.`,
  COMMAND_SETUP_NO_WASM: `Unable to retrieve WASM files from current working directory. Please, run this command from a working directory where the WASM files are located to continue with the setup process. We kindly ask you to run the command from an empty directory containing only the WASM and R1CS files.`,
  COMMAND_SETUP_MISMATCH_R1CS_WASM: `The folder contains more R1CS files than WASM files (or vice versa). Please, run this command from a working directory where each R1CS is paired with its corresponding file WASM.`,
  COMMAND_SETUP_DOWNLOAD_PTAU: `Unable to download Powers of Tau file from Hermez Cryptography Phase 1 Trusted Setup. Possible causes may involve an error while making the request (be sure to have a stable internet connection). Please, we kindly ask you to terminate the current session and repeat the process.`,
  COMMAND_SETUP_ABORT: `You chose to abort the setup process.`,
  COMMAND_CONTRIBUTE_NO_OPENED_CEREMONIES: `Unfortunately, there is no ceremony for which you can make a contribution at this time. Please, try again later.`,
  COMMAND_CONTRIBUTE_NO_PARTICIPANT_DATA: `Unable to retrieve your data as ceremony participant. Please, terminate the current session and try again later. If the error persists, please contact the ceremony coordinator.`,
  COMMAND_CONTRIBUTE_WRONG_OPTION_CEREMONY: `The ceremony name you provided does not exist or belongs to a ceremony not yet open. Please, double-check your option and retry.`,
  COMMAND_CONTRIBUTE_NO_CURRENT_CONTRIBUTOR_DATA: `Unable to retrieve current circuit contributor information. Please, terminate the current session and try again later. If the error persists, please contact the ceremony coordinator.`,
  COMMAND_CONTRIBUTE_NO_CURRENT_CONTRIBUTOR_CONTRIBUTION: `Unable to retrieve circuit last contribution information. This could happen due to a timeout or some errors while writing the information on the database.`,
  COMMAND_CONTRIBUTE_WRONG_CURRENT_CONTRIBUTOR_CONTRIBUTION_STEP: `Something went wrong when progressing the contribution step of the current circuit contributor. If the error persists, please contact the ceremony coordinator.`,
  COMMAND_CONTRIBUTE_NO_CIRCUIT_DATA: `Unable to retrieve circuit data from the ceremony. Please, terminate the current session and try again later. If the error persists, please contact the ceremony coordinator.`,
  COMMAND_CONTRIBUTE_NO_ACTIVE_TIMEOUT_DATA: `Unable to retrieve your active timeout data. This problem could be related to failure to write timeout data to the database. If the error persists, please contact the ceremony coordinator.`,
  COMMAND_CONTRIBUTE_NO_UNIQUE_ACTIVE_TIMEOUTS: `The number of active timeouts is different from one. This problem could be related to failure to update timeout document in the database. If the error persists, please contact the ceremony coordinator.`,
  COMMAND_CONTRIBUTE_FINALIZE_NO_TRANSCRIPT_CONTRIBUTION_HASH_MATCH: `Unable to retrieve contribution hash from transcript. Possible causes may involve an error while using the logger or unexpected file descriptor termination. Please, terminate the current session and repeat the process.`,
  COMMAND_FINALIZED_NO_CLOSED_CEREMONIES: `Unfortunately, there is no ceremony closed and ready for finalization. Please, try again later.`,
  COMMAND_FINALIZED_NOT_READY_FOR_FINALIZATION: `You are not ready for ceremony finalization. This could happen because the ceremony does not appear closed or you do not have completed every circuit contributions. If the error persists, please contact the operator to check the server logs.`,
};
/** Config */
const CONFIG_ERRORS = {
  CONFIG_GITHUB_ERROR: `Configuration error. The Github client id environment variable has not been configured correctly.`,
  CONFIG_FIREBASE_ERROR: `Configuration error. The Firebase environment variable has not been configured correctly`,
  CONFIG_OTHER_ERROR: `Configuration error. One or more config environment variable has not been configured correctly`,
};
/** Generic */
const GENERIC_ERRORS = {
  GENERIC_ERROR_RETRIEVING_DATA: `Something went wrong when retrieving the data from the database`,
  GENERIC_COUNTDOWN_EXPIRATION: `Your time to carry out the action has expired`,
};
/**
 * Print an error string and gracefully terminate the process.
 * @param err <string> - the error string to be shown.
 * @param doExit <boolean> - when true the function terminate the process; otherwise not.
 */
const showError = (err, doExit) => {
  // Print the error.
  console.error(`${theme.symbols.error} ${err}`);
  // Terminate the process.
  if (doExit) process.exit(1);
};

/**
 * Check a directory path.
 * @param directoryPath <string> - the local path of the directory.
 * @returns <boolean> true if the directory at given path exists, otherwise false.
 */
const directoryExists = (directoryPath) => fs.existsSync(directoryPath);
/**
 * Write a new file locally.
 * @param localFilePath <string> - the local path of the file.
 * @param data <Buffer> - the content to be written inside the file.
 */
const writeFile = (localFilePath, data) =>
  fs.writeFileSync(localFilePath, data);
/**
 * Read a new file from local folder.
 * @param localFilePath <string> - the local path of the file.
 */
const readFile = (localFilePath) => fs.readFileSync(localFilePath, 'utf-8');
/**
 * Get back the statistics of the provided file.
 * @param localFilePath <string> - the local path of the file.
 * @returns <Stats> - the metadata of the file.
 */
const getFileStats = (localFilePath) => fs.statSync(localFilePath);
/**
 * Return the sub-paths for each file stored in the given directory.
 * @param directoryLocalPath <string> - the local path of the directory.
 * @returns <Promise<Array<Dirent>>> - the list of sub-paths of the files contained inside the directory.
 */
const getDirFilesSubPaths = async (directoryLocalPath) => {
  // Get Dirent sub paths for folders and files.
  const subPaths = await fs.promises.readdir(directoryLocalPath, {
    withFileTypes: true,
  });
  // Return Dirent sub paths for files only.
  return subPaths.filter((dirent) => dirent.isFile());
};
/**
 * Filter all files in a directory by returning only those that match the given extension.
 * @param directoryLocalPath <string> - the local path of the directory.
 * @param fileExtension <string> - the file extension.
 * @returns <Promise<Array<Dirent>>> - return the filenames of the file that match the given extension, if any
 */
const filterDirectoryFilesByExtension = async (
  directoryLocalPath,
  fileExtension
) => {
  // Get the sub paths for each file stored in the given directory.
  const cwdFiles = await getDirFilesSubPaths(directoryLocalPath);
  // Filter by extension.
  return cwdFiles.filter((file) => file.name.includes(fileExtension));
};
/**
 * Delete a directory specified at a given path.
 * @param directoryLocalPath <string> - the local path of the directory.
 */
const deleteDir = (directoryLocalPath) => {
  fs.rmSync(directoryLocalPath, { recursive: true, force: true });
};
/**
 * Clean a directory specified at a given path.
 * @param directoryLocalPath <string> - the local path of the directory.
 */
const cleanDir = (directoryLocalPath) => {
  deleteDir(directoryLocalPath);
  fs.mkdirSync(directoryLocalPath);
};
/**
 * Create a new directory in a specified path if not exist in that path.
 * @param directoryLocalPath <string> - the local path of the directory.
 */
const checkAndMakeNewDirectoryIfNonexistent = (directoryLocalPath) => {
  console.log(directoryLocalPath);
  if (!directoryExists(directoryLocalPath)) fs.mkdirSync(directoryLocalPath);
};
/**
 * Write data a local JSON file at a given path.
 * @param localFilePath <string> - the local path of the file.
 * @param data <JSON> - the JSON content to be written inside the file.
 */
const writeLocalJsonFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
};

// Get npm package name.
const packagePath$4 = `${dirname(fileURLToPath(import.meta.url))}/..`;
const { name: name$1 } = JSON.parse(
  readFileSync(
    packagePath$4.includes(`src/lib/`)
      ? `${packagePath$4}/../package.json`
      : `${packagePath$4}/package.json`,
    'utf8'
  )
);
/**
 * Local Storage.
 * @dev The CLI implementation use the Conf package to create a local storage
 * in the user device (`.config/@nocturne-xyz/p0tion-phase2cli-nodejs/config.json` path) to store the access token.
 */
const config = new Conf({
  projectName: name$1,
  schema: {
    accessToken: {
      type: 'string',
      default: '',
    },
  },
});
/**
 * Local Paths.
 * @dev definition of the paths to the local folders containing the CLI-generated artifacts.
 */
const outputLocalFolderPath = `./${commonTerms.foldersAndPathsTerms.output}`;
const setupLocalFolderPath = `${outputLocalFolderPath}/${commonTerms.foldersAndPathsTerms.setup}`;
const contributeLocalFolderPath = `${outputLocalFolderPath}/${commonTerms.foldersAndPathsTerms.contribute}`;
const finalizeLocalFolderPath = `${outputLocalFolderPath}/${commonTerms.foldersAndPathsTerms.finalize}`;
const potLocalFolderPath = `${setupLocalFolderPath}/${commonTerms.foldersAndPathsTerms.pot}`;
const zkeysLocalFolderPath = `${setupLocalFolderPath}/${commonTerms.foldersAndPathsTerms.zkeys}`;
const wasmLocalFolderPath = `${setupLocalFolderPath}/${commonTerms.foldersAndPathsTerms.wasm}`;
const contributionsLocalFolderPath = `${contributeLocalFolderPath}/${commonTerms.foldersAndPathsTerms.zkeys}`;
const contributionTranscriptsLocalFolderPath = `${contributeLocalFolderPath}/${commonTerms.foldersAndPathsTerms.transcripts}`;
const attestationLocalFolderPath = `${contributeLocalFolderPath}/${commonTerms.foldersAndPathsTerms.attestation}`;
const finalZkeysLocalFolderPath = `${finalizeLocalFolderPath}/${commonTerms.foldersAndPathsTerms.zkeys}`;
const finalPotLocalFolderPath = `${finalizeLocalFolderPath}/${commonTerms.foldersAndPathsTerms.pot}`;
const finalTranscriptsLocalFolderPath = `${finalizeLocalFolderPath}/${commonTerms.foldersAndPathsTerms.transcripts}`;
const finalAttestationsLocalFolderPath = `${finalizeLocalFolderPath}/${commonTerms.foldersAndPathsTerms.attestation}`;
const verificationKeysLocalFolderPath = `${finalizeLocalFolderPath}/${commonTerms.foldersAndPathsTerms.vkeys}`;
const verifierContractsLocalFolderPath = `${finalizeLocalFolderPath}/${commonTerms.foldersAndPathsTerms.verifiers}`;
const localPaths = {
  output: outputLocalFolderPath,
  setup: setupLocalFolderPath,
  contribute: contributeLocalFolderPath,
  finalize: finalizeLocalFolderPath,
  pot: potLocalFolderPath,
  zkeys: zkeysLocalFolderPath,
  wasm: wasmLocalFolderPath,
  contributions: contributionsLocalFolderPath,
  transcripts: contributionTranscriptsLocalFolderPath,
  attestations: attestationLocalFolderPath,
  finalZkeys: finalZkeysLocalFolderPath,
  finalPot: finalPotLocalFolderPath,
  finalTranscripts: finalTranscriptsLocalFolderPath,
  finalAttestations: finalAttestationsLocalFolderPath,
  verificationKeys: verificationKeysLocalFolderPath,
  verifierContracts: verifierContractsLocalFolderPath,
};
/**
 * Return the access token, if present.
 * @returns <string | undefined> - the access token if present, otherwise undefined.
 */
const getLocalAccessToken = () => config.get('accessToken');
/**
 * Check if the access token exists in the local storage.
 * @returns <boolean>
 */
const checkLocalAccessToken = () =>
  config.has('accessToken') && !!config.get('accessToken');
/**
 * Set the access token.
 * @param token <string> - the access token to be stored.
 */
const setLocalAccessToken = (token) => config.set('accessToken', token);
/**
 * Delete the stored access token.
 */
const deleteLocalAccessToken = () => config.delete('accessToken');
/**
 * Get the complete local file path.
 * @param cwd <string> - the current working directory path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the complete local path to the file.
 */
const getCWDFilePath = (cwd, completeFilename) => `${cwd}/${completeFilename}`;
/**
 * Get the complete PoT file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the complete PoT path to the file.
 */
const getPotLocalFilePath = (completeFilename) =>
  `${potLocalFolderPath}/${completeFilename}`;
/**
 * Get the complete zKey file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the complete zKey path to the file.
 */
const getZkeyLocalFilePath = (completeFilename) =>
  `${zkeysLocalFolderPath}/${completeFilename}`;
/**
 * Get the complete contribution file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the complete contribution path to the file.
 */
const getContributionLocalFilePath = (completeFilename) =>
  `${contributionsLocalFolderPath}/${completeFilename}`;
/**
 * Get the contribution attestation file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the the contribution attestation path to the file.
 */
const getAttestationLocalFilePath = (completeFilename) =>
  `${attestationLocalFolderPath}/${completeFilename}`;
/**
 * Get the transcript file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the the transcript path to the file.
 */
const getTranscriptLocalFilePath = (completeFilename) =>
  `${contributionTranscriptsLocalFolderPath}/${completeFilename}`;
/**
 * Get the complete final zKey file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the complete final zKey path to the file.
 */
const getFinalZkeyLocalFilePath = (completeFilename) =>
  `${finalZkeysLocalFolderPath}/${completeFilename}`;
/**
 * Get the complete verification key file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the complete final verification key path to the file.
 */
const getVerificationKeyLocalFilePath = (completeFilename) =>
  `${verificationKeysLocalFolderPath}/${completeFilename}`;
/**
 * Get the complete final attestation file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the complete final final attestation path to the file.
 */
const getFinalAttestationLocalFilePath = (completeFilename) =>
  `${finalAttestationsLocalFolderPath}/${completeFilename}`;
/**
 * Get the final transcript file path.
 * @param completeFilename <string> - the complete filename of the file (name.ext).
 * @returns <string> - the the final transcript path to the file.
 */
const getFinalTranscriptLocalFilePath = (completeFilename) =>
  `${finalTranscriptsLocalFolderPath}/${completeFilename}`;

const packagePath$3 = `${dirname(fileURLToPath(import.meta.url))}`;
dotenv.config({
  path: packagePath$3.includes(`src/lib`)
    ? `${dirname(fileURLToPath(import.meta.url))}/../../.env`
    : `${dirname(fileURLToPath(import.meta.url))}/.env`,
});
/**
 * Exchange the Github token for OAuth credential.
 * @param githubToken <string> - the Github token generated through the Device Flow process.
 * @returns <OAuthCredential>
 */
const exchangeGithubTokenForCredentials = (githubToken) =>
  GithubAuthProvider.credential(githubToken);
/**
 * Get the information associated to the account from which the token has been generated to
 * create a custom unique identifier for the user.
 * @notice the unique identifier has the following form 'handle-identifier'.
 * @param githubToken <string> - the Github token.
 * @returns <Promise<any>> - the Github (provider) unique identifier associated to the user.
 */
const getGithubProviderUserId = async (githubToken) => {
  // Ask for user account public information through Github API.
  const response = await request('GET https://api.github.com/user', {
    headers: {
      authorization: `token ${githubToken}`,
    },
  });
  if (response && response.status === 200)
    return `${response.data.login}-${response.data.id}`;
  showError(THIRD_PARTY_SERVICES_ERRORS.GITHUB_GET_GITHUB_ACCOUNT_INFO, true);
};
/**
 * Get the gists associated to the authenticated user account.
 * @param githubToken <string> - the Github token.
 * @param params <Object<number,number>> - the necessary parameters for the request.
 * @returns <Promise<any>> - the Github gists associated with the authenticated user account.
 */
const getGithubAuthenticatedUserGists = async (githubToken, params) => {
  // Ask for user account public information through Github API.
  const response = await request(
    'GET https://api.github.com/gists{?per_page,page}',
    {
      headers: {
        authorization: `token ${githubToken}`,
      },
      per_page: params.perPage,
      page: params.page,
    }
  );
  if (response && response.status === 200) return response.data;
  showError(THIRD_PARTY_SERVICES_ERRORS.GITHUB_GET_GITHUB_ACCOUNT_INFO, true);
};
/**
 * Check whether or not the user has published the gist.
 * @dev gather all the user's gists and check if there is a match with the expected public attestation.
 * @param githubToken <string> - the Github token.
 * @param publicAttestationFilename <string> - the public attestation filename.
 * @returns <Promise<GithubGistFile | undefined>> - return the public attestation gist if and only if has been published.
 */
const getPublicAttestationGist = async (
  githubToken,
  publicAttestationFilename
) => {
  const itemsPerPage = 50; // number of gists to fetch x page.
  let gists = []; // The list of user gists.
  let publishedGist; // the published public attestation gist.
  let page = 1; // Page of gists = starts from 1.
  // Get first batch (page) of gists
  let pageGists = await getGithubAuthenticatedUserGists(githubToken, {
    perPage: itemsPerPage,
    page,
  });
  // State update.
  gists = gists.concat(pageGists);
  // Keep going until hitting a blank page.
  while (pageGists.length > 0) {
    // Fetch next page.
    page += 1;
    pageGists = await getGithubAuthenticatedUserGists(githubToken, {
      perPage: itemsPerPage,
      page,
    });
    // State update.
    gists = gists.concat(pageGists);
  }
  // Look for public attestation.
  for (const gist of gists) {
    const numberOfFiles = Object.keys(gist.files).length;
    const publicAttestationCandidateFile = Object.values(gist.files)[0];
    /// @todo improve check by using expected public attestation content (e.g., hash).
    if (
      numberOfFiles === 1 &&
      publicAttestationCandidateFile.filename === publicAttestationFilename
    )
      publishedGist = publicAttestationCandidateFile;
  }
  return publishedGist;
};
/**
 * Return the Github handle from the provider user id.
 * @notice the provider user identifier must have the following structure 'handle-id'.
 * @param providerUserId <string> - the unique provider user identifier.
 * @returns <string> - the third-party provider handle of the user.
 */
const getUserHandleFromProviderUserId = (providerUserId) => {
  if (providerUserId.indexOf('-') === -1)
    showError(THIRD_PARTY_SERVICES_ERRORS.GITHUB_GET_GITHUB_ACCOUNT_INFO, true);
  return providerUserId.split('-')[0];
};
/**
 * Return a custom spinner.
 * @param text <string> - the text that should be displayed as spinner status.
 * @param spinnerLogo <any> - the logo.
 * @returns <Ora> - a new Ora custom spinner.
 */
const customSpinner = (text, spinnerLogo) =>
  ora({
    text,
    spinner: spinnerLogo,
  });
/**
 * Custom sleeper.
 * @dev to be used in combination with loggers and for workarounds where listeners cannot help.
 * @param ms <number> - sleep amount in milliseconds
 * @returns <Promise<any>>
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/**
 * Simple loader for task simulation.
 * @param loadingText <string> - spinner text while loading.
 * @param spinnerLogo <any> - spinner logo.
 * @param durationInMs <number> - spinner loading duration in ms.
 * @returns <Promise<void>>.
 */
const simpleLoader = async (loadingText, spinnerLogo, durationInMs) => {
  // Custom spinner (used as loader).
  const loader = customSpinner(loadingText, spinnerLogo);
  loader.start();
  // nb. simulate execution for requested duration.
  await sleep(durationInMs);
  loader.stop();
};
/**
 * Check and return the free aggregated disk space (in KB) for participant machine.
 * @dev this method use the node-disk-info method to retrieve the information about
 * disk availability for all visible disks.
 * nb. no other type of data or operation is performed by this methods.
 * @returns <number> - the free aggregated disk space in kB for the participant machine.
 */
const estimateParticipantFreeGlobalDiskSpace = () => {
  // Get info about disks.
  const disks = getDiskInfoSync();
  // Get an estimation of available memory.
  let availableDiskSpace = 0;
  for (const disk of disks) availableDiskSpace += disk.available;
  // Return the disk space available in KB.
  return availableDiskSpace;
};
/**
 * Get seconds, minutes, hours and days from milliseconds.
 * @param millis <number> - the amount of milliseconds.
 * @returns <Timing> - a custom object containing the amount of seconds, minutes, hours and days in the provided millis.
 */
const getSecondsMinutesHoursFromMillis = (millis) => {
  let delta = millis / 1000;
  const days = Math.floor(delta / 86400);
  delta -= days * 86400;
  const hours = Math.floor(delta / 3600) % 24;
  delta -= hours * 3600;
  const minutes = Math.floor(delta / 60) % 60;
  delta -= minutes * 60;
  const seconds = Math.floor(delta) % 60;
  return {
    seconds: seconds >= 60 ? 59 : seconds,
    minutes: minutes >= 60 ? 59 : minutes,
    hours: hours >= 24 ? 23 : hours,
    days,
  };
};
/**
 * Gracefully terminate the command execution
 * @params ghUsername <string> - the Github username of the user.
 */
const terminate = async (ghUsername) => {
  console.log(
    `\nSee you, ${theme.text.bold(
      `@${getUserHandleFromProviderUserId(ghUsername)}`
    )} ${theme.emojis.wave}`
  );
  process.exit(0);
};
/**
 * Publish public attestation using Github Gist.
 * @dev the contributor must have agreed to provide 'gist' access during the execution of the 'auth' command.
 * @param accessToken <string> - the contributor access token.
 * @param publicAttestation <string> - the public attestation.
 * @param ceremonyTitle <string> - the ceremony title.
 * @param ceremonyPrefix <string> - the ceremony prefix.
 * @returns <Promise<string>> - the url where the gist has been published.
 */
const publishGist = async (token, content, ceremonyTitle, ceremonyPrefix) => {
  // Make request.
  const response = await request('POST /gists', {
    description: `Attestation for ${ceremonyTitle} MPC Phase 2 Trusted Setup ceremony`,
    public: true,
    files: {
      [`${ceremonyPrefix}_${commonTerms.foldersAndPathsTerms.attestation}.log`]:
        {
          content,
        },
    },
    headers: {
      authorization: `token ${token}`,
    },
  });
  if (response.status !== 201 || !response.data.html_url)
    showError(THIRD_PARTY_SERVICES_ERRORS.GITHUB_GIST_PUBLICATION_FAILED, true);
  return response.data.html_url;
};
/**
 * Generate a custom url that when clicked allows you to compose a tweet ready to be shared.
 * @param hashes <string> - the contribution hashes of the circuits. If there are more than 2 circuits, the other hashes will be omitted
 * @returns <string> - the ready to share tweet url.
 */
const generateCustomUrlToTweetAboutParticipation = (hashes) => {
  const msgHashes = hashes.length > 2 ? hashes.slice(0, 2) : hashes;
  const tweetMessage = msgHashes.join('\n\n');
  const encodedMessage = encodeURIComponent(
    `🌙@nocturne_xyz\n\n${tweetMessage}`
  );
  const tweetURL = `https://twitter.com/intent/tweet/?text=${encodedMessage}`;
  return tweetURL;
};
/**
 * Return a custom progress bar.
 * @param type <ProgressBarType> - the type of the progress bar.
 * @param [message] <string> - additional information to be displayed when downloading/uploading.
 * @returns <SingleBar> - a new custom (single) progress bar.
 */
const customProgressBar = (type, message) => {
  // Formats.
  const uploadFormat = `${
    theme.emojis.arrowUp
  }  Uploading ${message} [${theme.colors.magenta(
    '{bar}'
  )}] {percentage}% | {value}/{total} Chunks`;
  const downloadFormat = `${
    theme.emojis.arrowDown
  }  Downloading ${message} [${theme.colors.magenta(
    '{bar}'
  )}] {percentage}% | {value}/{total} GB`;
  // Define a progress bar showing percentage of completion and chunks downloaded/uploaded.
  return new SingleBar(
    {
      format: type === ProgressBarType.DOWNLOAD ? downloadFormat : uploadFormat,
      hideCursor: true,
      clearOnComplete: true,
    },
    Presets.legacy
  );
};
/**
 * Download an artifact from the ceremony bucket.
 * @dev this method request a pre-signed url to make a GET request to download the artifact.
 * @param cloudFunctions <Functions> - the instance of the Firebase cloud functions for the application.
 * @param bucketName <string> - the name of the ceremony artifacts bucket (AWS S3).
 * @param storagePath <string> - the storage path that locates the artifact to be downloaded in the bucket.
 * @param localPath <string> - the local path where the artifact will be downloaded.
 */
const downloadCeremonyArtifact = async (
  cloudFunctions,
  bucketName,
  storagePath,
  localPath
) => {
  const spinner = customSpinner(
    `Preparing for downloading the contribution...`,
    `clock`
  );
  spinner.start();
  // Request pre-signed url to make GET download request.
  const getPreSignedUrl = await generateGetObjectPreSignedUrl(
    cloudFunctions,
    bucketName,
    storagePath
  );
  // Make fetch to get info about the artifact.
  // @ts-ignore
  const response = await fetch(getPreSignedUrl);
  if (response.status !== 200 && !response.ok)
    showError(
      CORE_SERVICES_ERRORS.AWS_CEREMONY_BUCKET_CANNOT_DOWNLOAD_GET_PRESIGNED_URL,
      true
    );
  // Extract and prepare data.
  const content = response.body;
  const contentLength = Number(response.headers.get('content-length'));
  const contentLengthInGB = convertBytesOrKbToGb(contentLength, true);
  // Prepare stream.
  const writeStream = createWriteStream(localPath);
  spinner.stop();
  // Prepare custom progress bar.
  const progressBar = customProgressBar(
    ProgressBarType.DOWNLOAD,
    `last contribution`
  );
  const progressBarStep = contentLengthInGB / 100;
  let chunkLengthWritingProgress = 0;
  let completedProgress = progressBarStep;
  // Bootstrap the progress bar.
  progressBar.start(
    contentLengthInGB < 0.01
      ? 0.01
      : parseFloat(contentLengthInGB.toFixed(2)).valueOf(),
    0
  );
  // Write chunk by chunk.
  for await (const chunk of content) {
    // Write chunk.
    writeStream.write(chunk);
    // Update current progress.
    chunkLengthWritingProgress += convertBytesOrKbToGb(chunk.length, true);
    // Display the current progress.
    while (chunkLengthWritingProgress >= completedProgress) {
      // Store new completed progress step by step.
      completedProgress += progressBarStep;
      // Display accordingly in the progress bar.
      progressBar.update(
        contentLengthInGB < 0.01
          ? 0.01
          : parseFloat(completedProgress.toFixed(2)).valueOf()
      );
    }
  }
  await sleep(2000); // workaround to show bar for small artifacts.
  progressBar.stop();
};
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
const handleContributionComputation = async (
  lastZkeyLocalFilePath,
  nextZkeyLocalFilePath,
  entropyOrBeacon,
  contributorOrCoordinatorIdentifier,
  averageComputingTime,
  transcriptLogger,
  isFinalizing
) => {
  // Prepare timer (statistics only).
  const computingTimer = new Timer({
    label: 'COMPUTING' /* ParticipantContributionStep.COMPUTING */,
  });
  computingTimer.start();
  // Time format.
  const { seconds, minutes, hours, days } =
    getSecondsMinutesHoursFromMillis(averageComputingTime);
  const spinner = customSpinner(
    `${isFinalizing ? `Applying beacon...` : `Computing contribution...`} ${
      averageComputingTime > 0
        ? `${theme.text.bold(
            `(ETA ${theme.text.bold(
              `${convertToDoubleDigits(days)}:${convertToDoubleDigits(
                hours
              )}:${convertToDoubleDigits(minutes)}:${convertToDoubleDigits(
                seconds
              )}`
            )}).\n${
              theme.symbols.warning
            } This may take longer or less time on your machine! Everything's fine, just be patient and do not stop the computation to avoid starting over again`
          )}`
        : ``
    }`,
    `clock`
  );
  spinner.start();
  // Discriminate between contribution finalization or computation.
  if (isFinalizing)
    await zKey.beacon(
      lastZkeyLocalFilePath,
      nextZkeyLocalFilePath,
      contributorOrCoordinatorIdentifier,
      entropyOrBeacon,
      numExpIterations,
      transcriptLogger
    );
  else
    await zKey.contribute(
      lastZkeyLocalFilePath,
      nextZkeyLocalFilePath,
      contributorOrCoordinatorIdentifier,
      entropyOrBeacon,
      transcriptLogger
    );
  computingTimer.stop();
  await sleep(3000); // workaround for file descriptor.
  spinner.stop();
  return computingTimer.ms();
};
/**
 * Return the most up-to-date data about the participant document for the given ceremony.
 * @param firestoreDatabase <Firestore> - the Firestore service instance associated to the current Firebase application.
 * @param ceremonyId <string> - the unique identifier of the ceremony.
 * @param participantId <string> - the unique identifier of the participant.
 * @returns <Promise<DocumentData>> - the most up-to-date participant data.
 */
const getLatestUpdatesFromParticipant = async (
  firestoreDatabase,
  ceremonyId,
  participantId
) => {
  // Fetch participant data.
  const participant = await getDocumentById(
    firestoreDatabase,
    getParticipantsCollectionPath(ceremonyId),
    participantId
  );
  if (!participant.data())
    showError(COMMAND_ERRORS.COMMAND_CONTRIBUTE_NO_PARTICIPANT_DATA, true);
  return participant.data();
};
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
const handleStartOrResumeContribution = async (
  cloudFunctions,
  firestoreDatabase,
  ceremony,
  circuit,
  participant,
  entropyOrBeaconHash,
  contributorOrCoordinatorIdentifier,
  isFinalizing,
  circuitsLength
) => {
  // Extract data.
  const { prefix: ceremonyPrefix } = ceremony.data;
  const {
    waitingQueue,
    avgTimings,
    prefix: circuitPrefix,
    sequencePosition,
  } = circuit.data;
  const { completedContributions } = waitingQueue; // = current progress.
  console.log(
    `${theme.text.bold(
      `\n- Circuit # ${theme.colors.magenta(
        `${sequencePosition}/${circuitsLength}`
      )}`
    )} (Contribution Steps)`
  );
  // Get most up-to-date data from the participant document.
  let participantData = await getLatestUpdatesFromParticipant(
    firestoreDatabase,
    ceremony.id,
    participant.id
  );
  const spinner = customSpinner(
    `${
      participantData.contributionStep ===
      'DOWNLOADING' /* ParticipantContributionStep.DOWNLOADING */
        ? `Preparing to begin the contribution. Please note that the contribution can take a long time depending on the size of the circuits and your internet connection.`
        : `Preparing to resume contribution. Please note that the contribution can take a long time depending on the size of the circuits and your internet connection.`
    }`,
    `clock`
  );
  spinner.start();
  // Compute zkey indexes.
  const lastZkeyIndex = formatZkeyIndex(completedContributions);
  const nextZkeyIndex = formatZkeyIndex(completedContributions + 1);
  // Prepare zKey filenames.
  const lastZkeyCompleteFilename = `${circuitPrefix}_${lastZkeyIndex}.zkey`;
  const nextZkeyCompleteFilename = isFinalizing
    ? `${circuitPrefix}_${finalContributionIndex}.zkey`
    : `${circuitPrefix}_${nextZkeyIndex}.zkey`;
  // Prepare zKey storage paths.
  const lastZkeyStorageFilePath = getZkeyStorageFilePath(
    circuitPrefix,
    lastZkeyCompleteFilename
  );
  const nextZkeyStorageFilePath = getZkeyStorageFilePath(
    circuitPrefix,
    nextZkeyCompleteFilename
  );
  // Prepare zKey local paths.
  const lastZkeyLocalFilePath = isFinalizing
    ? getFinalZkeyLocalFilePath(lastZkeyCompleteFilename)
    : getContributionLocalFilePath(lastZkeyCompleteFilename);
  const nextZkeyLocalFilePath = isFinalizing
    ? getFinalZkeyLocalFilePath(nextZkeyCompleteFilename)
    : getContributionLocalFilePath(nextZkeyCompleteFilename);
  // Generate a custom file logger for contribution transcript.
  const transcriptCompleteFilename = isFinalizing
    ? `${circuit.data.prefix}_${contributorOrCoordinatorIdentifier}_${finalContributionIndex}.log`
    : `${circuit.data.prefix}_${nextZkeyIndex}.log`;
  const transcriptLocalFilePath = isFinalizing
    ? getFinalTranscriptLocalFilePath(transcriptCompleteFilename)
    : getTranscriptLocalFilePath(transcriptCompleteFilename);
  const transcriptLogger = createCustomLoggerForFile(transcriptLocalFilePath);
  // Populate transcript file w/ header.
  transcriptLogger.info(
    `${
      isFinalizing ? `Final` : `Contribution`
    } transcript for ${circuitPrefix} phase 2 contribution.\n${
      isFinalizing
        ? `Coordinator: ${contributorOrCoordinatorIdentifier}`
        : `Contributor # ${Number(nextZkeyIndex)}`
    } (${contributorOrCoordinatorIdentifier})\n`
  );
  // Get ceremony bucket name.
  const bucketName = getBucketName(
    ceremonyPrefix,
    String(process.env.CONFIG_CEREMONY_BUCKET_POSTFIX)
  );
  await sleep(3000); // ~3s.
  spinner.stop();
  // Contribution step = DOWNLOADING.
  if (
    isFinalizing ||
    participantData.contributionStep ===
      'DOWNLOADING' /* ParticipantContributionStep.DOWNLOADING */
  ) {
    // Download the latest contribution from bucket.
    await downloadCeremonyArtifact(
      cloudFunctions,
      bucketName,
      lastZkeyStorageFilePath,
      lastZkeyLocalFilePath
    );
    console.log(
      `${theme.symbols.success} Contribution ${theme.text.bold(
        `#${lastZkeyIndex}`
      )} correctly downloaded`
    );
    await sleep(3000);
    // Advance to next contribution step (COMPUTING) if not finalizing.
    if (!isFinalizing) {
      spinner.text = `Preparing for contribution computation...`;
      spinner.start();
      await progressToNextContributionStep(cloudFunctions, ceremony.id);
      await sleep(1000);
      // Refresh most up-to-date data from the participant document.
      participantData = await getLatestUpdatesFromParticipant(
        firestoreDatabase,
        ceremony.id,
        participant.id
      );
      spinner.stop();
    }
  } else
    console.log(
      `${theme.symbols.success} Contribution ${theme.text.bold(
        `#${lastZkeyIndex}`
      )} already downloaded`
    );
  // Contribution step = COMPUTING.
  if (
    isFinalizing ||
    participantData.contributionStep ===
      'COMPUTING' /* ParticipantContributionStep.COMPUTING */
  ) {
    // Handle the next contribution computation.
    const computingTime = await handleContributionComputation(
      lastZkeyLocalFilePath,
      nextZkeyLocalFilePath,
      entropyOrBeaconHash,
      contributorOrCoordinatorIdentifier,
      avgTimings.contributionComputation,
      transcriptLogger,
      isFinalizing
    );
    // Permanently store on db the contribution hash and computing time.
    spinner.text = `Writing contribution metadata...`;
    spinner.start();
    // Read local transcript file info to get the contribution hash.
    const transcriptContents = readFile(transcriptLocalFilePath);
    const matchContributionHash = transcriptContents.match(
      /Contribution.+Hash.+\n\t\t.+\n\t\t.+\n.+\n\t\t.+\n/
    );
    if (!matchContributionHash)
      showError(
        COMMAND_ERRORS.COMMAND_CONTRIBUTE_FINALIZE_NO_TRANSCRIPT_CONTRIBUTION_HASH_MATCH,
        true
      );
    // Format contribution hash.
    const contributionHash = matchContributionHash
      ?.at(0)
      ?.replace('\n\t\t', '');
    await sleep(500);
    // Make request to cloud functions to permanently store the information.
    await permanentlyStoreCurrentContributionTimeAndHash(
      cloudFunctions,
      ceremony.id,
      computingTime,
      contributionHash
    );
    // Format computing time.
    const {
      seconds: computationSeconds,
      minutes: computationMinutes,
      hours: computationHours,
    } = getSecondsMinutesHoursFromMillis(computingTime);
    spinner.succeed(
      `${
        isFinalizing
          ? 'Contribution'
          : `Contribution ${theme.text.bold(`#${nextZkeyIndex}`)}`
      } computation took ${theme.text.bold(
        `${convertToDoubleDigits(computationHours)}:${convertToDoubleDigits(
          computationMinutes
        )}:${convertToDoubleDigits(computationSeconds)}`
      )}`
    );
    // ensure the previous step is completed
    await sleep(5000);
    // Advance to next contribution step (UPLOADING) if not finalizing.
    if (!isFinalizing) {
      spinner.text = `Preparing for uploading the contribution...`;
      spinner.start();
      await progressToNextContributionStep(cloudFunctions, ceremony.id);
      await sleep(1000);
      // Refresh most up-to-date data from the participant document.
      participantData = await getLatestUpdatesFromParticipant(
        firestoreDatabase,
        ceremony.id,
        participant.id
      );
      spinner.stop();
    }
  } else
    console.log(
      `${theme.symbols.success} Contribution ${theme.text.bold(
        `#${nextZkeyIndex}`
      )} already computed`
    );
  // Contribution step = UPLOADING.
  if (
    isFinalizing ||
    participantData.contributionStep ===
      'UPLOADING' /* ParticipantContributionStep.UPLOADING */
  ) {
    spinner.text = `Uploading ${isFinalizing ? 'final' : 'your'} contribution ${
      !isFinalizing ? theme.text.bold(`#${nextZkeyIndex}`) : ''
    } to storage.\n${
      theme.symbols.warning
    } This step may take a while based on circuit size and your internet speed. Everything's fine, just be patient.`;
    spinner.start();
    const progressBar = customProgressBar(
      ProgressBarType.UPLOAD,
      `your contribution`
    );
    if (!isFinalizing)
      await multiPartUpload(
        cloudFunctions,
        bucketName,
        nextZkeyStorageFilePath,
        nextZkeyLocalFilePath,
        Number(process.env.CONFIG_STREAM_CHUNK_SIZE_IN_MB),
        ceremony.id,
        participantData.tempContributionData,
        progressBar
      );
    else
      await multiPartUpload(
        cloudFunctions,
        bucketName,
        nextZkeyStorageFilePath,
        nextZkeyLocalFilePath,
        Number(process.env.CONFIG_STREAM_CHUNK_SIZE_IN_MB)
      );
    spinner.succeed(
      `${
        isFinalizing
          ? `Contribution`
          : `Contribution ${theme.text.bold(`#${nextZkeyIndex}`)}`
      } correctly saved to storage`
    );
    // small sleep to ensure the previous step is completed
    await sleep(5000);
    // Advance to next contribution step (VERIFYING) if not finalizing.
    if (!isFinalizing) {
      spinner.text = `Preparing for requesting contribution verification...`;
      spinner.start();
      await progressToNextContributionStep(cloudFunctions, ceremony.id);
      await sleep(1000);
      // Refresh most up-to-date data from the participant document.
      participantData = await getLatestUpdatesFromParticipant(
        firestoreDatabase,
        ceremony.id,
        participant.id
      );
      spinner.stop();
    }
  }
  // Contribution step = VERIFYING.
  if (
    isFinalizing ||
    participantData.contributionStep ===
      'VERIFYING' /* ParticipantContributionStep.VERIFYING */
  ) {
    // Format verification time.
    const { seconds, minutes, hours } = getSecondsMinutesHoursFromMillis(
      avgTimings.verifyCloudFunction
    );
    process.stdout.write(
      `${theme.symbols.info} Your contribution is under verification ${
        avgTimings.verifyCloudFunction > 0
          ? `(~ ${theme.text.bold(
              `${convertToDoubleDigits(hours)}:${convertToDoubleDigits(
                minutes
              )}:${convertToDoubleDigits(seconds)}`
            )})\n${
              theme.symbols.warning
            } This step can take up to one hour based on circuit size. Everything's fine, just be patient.`
          : ``
      }`
    );
    try {
      // Execute contribution verification.
      await verifyContribution(
        cloudFunctions,
        ceremony.id,
        circuit,
        bucketName,
        contributorOrCoordinatorIdentifier,
        String(process.env.FIREBASE_CF_URL_VERIFY_CONTRIBUTION)
      );
    } catch (error) {
      process.stdout.write(
        `\n${theme.symbols.error} ${theme.text.bold(
          'Unfortunately there was an error with the contribution verification. Please restart phase2cli and try again. If the problem persists, please contact the ceremony coordinator.'
        )}\n`
      );
    }
  }
};

/**
 * Ask a binary (yes/no or true/false) customizable question.
 * @param question <string> - the question to be answered.
 * @param active <string> - the active option (default yes).
 * @param inactive <string> - the inactive option (default no).
 * @returns <Promise<Answers<string>>>
 */
const askForConfirmation = async (question, active = 'yes', inactive = 'no') =>
  prompts({
    type: 'toggle',
    name: 'confirmation',
    message: theme.text.bold(question),
    initial: false,
    active,
    inactive,
  });
/**
 * Prompt a series of questios to gather input data for the ceremony setup.
 * @param firestore <Firestore> - the instance of the Firestore database.
 * @returns <Promise<CeremonyInputData>> - the necessary information for the ceremony provided by the coordinator.
 */
const promptCeremonyInputData = async (firestore) => {
  // Get ceremonies prefixes already in use.
  const ceremoniesDocs = fromQueryToFirebaseDocumentInfo(
    await getAllCollectionDocs(
      firestore,
      commonTerms.collections.ceremonies.name
    )
  ).sort((a, b) => a.data.sequencePosition - b.data.sequencePosition);
  const prefixesAlreadyInUse =
    ceremoniesDocs.length > 0
      ? ceremoniesDocs.map((ceremony) => ceremony.data.prefix)
      : [];
  // Define questions.
  const questions = [
    {
      type: 'text',
      name: 'title',
      message: theme.text.bold(`Ceremony name`),
      validate: (title) => {
        if (title.length <= 0)
          return theme.colors.red(
            `${theme.symbols.error} Please, enter a non-empty string as the name of the ceremony`
          );
        // Check if the current name matches one of the already used prefixes.
        if (prefixesAlreadyInUse.includes(extractPrefix(title)))
          return theme.colors.red(
            `${theme.symbols.error} The name is already in use for another ceremony`
          );
        return true;
      },
    },
    {
      type: 'text',
      name: 'description',
      message: theme.text.bold(`Short description`),
      validate: (title) =>
        title.length > 0 ||
        theme.colors.red(
          `${theme.symbols.error} Please, enter a non-empty string as the description of the ceremony`
        ),
    },
    {
      type: 'date',
      name: 'startDate',
      message: theme.text.bold(
        `When should the ceremony open for contributions?`
      ),
      validate: (d) =>
        new Date(d).valueOf() > Date.now()
          ? true
          : theme.colors.red(
              `${theme.symbols.error} Please, enter a date subsequent to current date`
            ),
    },
  ];
  // Prompt questions.
  const { title, description, startDate } = await prompts(questions);
  if (!title || !description || !startDate)
    showError(COMMAND_ERRORS.COMMAND_ABORT_PROMPT, true);
  // Prompt for questions that depend on the answers to the previous ones.
  const { endDate } = await prompts({
    type: 'date',
    name: 'endDate',
    message: theme.text.bold(
      `When should the ceremony stop accepting contributions?`
    ),
    validate: (d) =>
      new Date(d).valueOf() > new Date(startDate).valueOf()
        ? true
        : theme.colors.red(
            `${theme.symbols.error} Please, enter a date subsequent to starting date`
          ),
  });
  if (!endDate) showError(COMMAND_ERRORS.COMMAND_ABORT_PROMPT, true);
  process.stdout.write('\n');
  // Prompt for timeout mechanism type selection.
  const { timeoutMechanismType } = await prompts({
    type: 'select',
    name: 'timeoutMechanismType',
    message: theme.text.bold(
      'Select the methodology for deciding to unblock the queue due to contributor disconnection, extreme slow computation, or malicious behavior'
    ),
    choices: [
      {
        title:
          'Dynamic (self-update approach based on latest contribution time)',
        value: 'DYNAMIC' /* CeremonyTimeoutType.DYNAMIC */,
      },
      {
        title: 'Fixed (approach based on a fixed amount of time)',
        value: 'FIXED' /* CeremonyTimeoutType.FIXED */,
      },
    ],
    initial: 0,
  });
  if (
    timeoutMechanismType !== 'DYNAMIC' /* CeremonyTimeoutType.DYNAMIC */ &&
    timeoutMechanismType !== 'FIXED' /* CeremonyTimeoutType.FIXED */
  )
    showError(COMMAND_ERRORS.COMMAND_ABORT_PROMPT, true);
  // Prompt for penalty.
  const { penalty } = await prompts({
    type: 'number',
    name: 'penalty',
    message: theme.text.bold(
      `How long should a user have to attend before they can join the waiting queue again after a detected blocking situation? Please, express the value in minutes`
    ),
    validate: (pnlt) => {
      if (pnlt < 1)
        return theme.colors.red(
          `${theme.symbols.error} Please, enter a penalty at least one minute long`
        );
      return true;
    },
  });
  if (!penalty) showError(COMMAND_ERRORS.COMMAND_ABORT_PROMPT, true);
  return {
    title,
    description,
    startDate,
    endDate,
    timeoutMechanismType,
    penalty,
  };
};
/**
 * Prompt a series of questios to gather input about the Circom compiler.
 * @returns <Promise<CircomCompilerData>> - the necessary information for the Circom compiler used for the circuits.
 */
const promptCircomCompiler = async () => {
  const questions = [
    {
      type: 'text',
      name: 'version',
      message: theme.text.bold(`Circom compiler version (x.y.z)`),
      validate: (version) => {
        if (version.length <= 0 || !version.match(/^[0-9].[0-9.].[0-9]$/))
          return theme.colors.red(
            `${theme.symbols.error} Please, provide a valid Circom compiler version (e.g., 2.0.5)`
          );
        return true;
      },
    },
    {
      type: 'text',
      name: 'commitHash',
      message: theme.text.bold(
        `The commit hash of the version of the Circom compiler`
      ),
      validate: (commitHash) =>
        commitHash.length === 40 ||
        theme.colors.red(
          `${theme.symbols.error} Please,enter a 40-character commit hash (e.g., b7ad01b11f9b4195e38ecc772291251260ab2c67)`
        ),
    },
  ];
  const { version, commitHash } = await prompts(questions);
  if (!version || !commitHash)
    showError(COMMAND_ERRORS.COMMAND_ABORT_PROMPT, true);
  return {
    version,
    commitHash,
  };
};
/**
 * Shows a list of circuits for a single option selection.
 * @dev the circuit names are derived from local R1CS files.
 * @param options <Array<string>> - an array of circuits names.
 * @returns Promise<string> - the name of the choosen circuit.
 */
const promptCircuitSelector = async (options) => {
  const { circuitFilename } = await prompts({
    type: 'select',
    name: 'circuitFilename',
    message: theme.text.bold(
      'Select the R1CS file related to the circuit you want to add to the ceremony'
    ),
    choices: options.map((option) => ({ title: option, value: option })),
    initial: 0,
  });
  if (!circuitFilename) showError(COMMAND_ERRORS.COMMAND_ABORT_SELECTION, true);
  return circuitFilename;
};
/**
 * Shows a list of standard EC2 VM instance types for a single option selection.
 * @notice the suggested VM configuration type is calculated based on circuit constraint size.
 * @param constraintSize <number> - the amount of circuit constraints
 * @returns Promise<string> - the name of the choosen VM type.
 */
const promptVMTypeSelector = async (constraintSize) => {
  let suggestedConfiguration = 0;
  // Suggested configuration based on circuit constraint size.
  if (constraintSize >= 0 && constraintSize <= 1000000)
    suggestedConfiguration = 1; // t3_large.
  else if (constraintSize > 1000000 && constraintSize <= 2000000)
    suggestedConfiguration = 2; // t3_2xlarge.
  else if (constraintSize > 2000000 && constraintSize <= 5000000)
    suggestedConfiguration = 3; // c5a_8xlarge.
  else if (constraintSize > 5000000 && constraintSize <= 30000000)
    suggestedConfiguration = 4; // c6id_32xlarge.
  else if (constraintSize > 30000000) suggestedConfiguration = 5; // m6a_32xlarge.
  const options = [
    {
      title: `${vmConfigurationTypes.t3_large.type} (RAM ${vmConfigurationTypes.t3_large.ram} + VCPUs ${vmConfigurationTypes.t3_large.vcpu} = ${vmConfigurationTypes.t3_large.pricePerHour}$ x hour)`,
      value: vmConfigurationTypes.t3_large.type,
    },
    {
      title: `${vmConfigurationTypes.t3_2xlarge.type} (RAM ${vmConfigurationTypes.t3_2xlarge.ram} + VCPUs ${vmConfigurationTypes.t3_2xlarge.vcpu} = ${vmConfigurationTypes.t3_2xlarge.pricePerHour}$ x hour)`,
      value: vmConfigurationTypes.t3_2xlarge.type,
    },
    {
      title: `${vmConfigurationTypes.c5_9xlarge.type} (RAM ${vmConfigurationTypes.c5_9xlarge.ram} + VCPUs ${vmConfigurationTypes.c5_9xlarge.vcpu} = ${vmConfigurationTypes.c5_9xlarge.pricePerHour}$ x hour)`,
      value: vmConfigurationTypes.c5_9xlarge.type,
    },
    {
      title: `${vmConfigurationTypes.c5_18xlarge.type} (RAM ${vmConfigurationTypes.c5_18xlarge.ram} + VCPUs ${vmConfigurationTypes.c5_18xlarge.vcpu} = ${vmConfigurationTypes.c5_18xlarge.pricePerHour}$ x hour)`,
      value: vmConfigurationTypes.c5_18xlarge.type,
    },
    {
      title: `${vmConfigurationTypes.c5a_8xlarge.type} (RAM ${vmConfigurationTypes.c5a_8xlarge.ram} + VCPUs ${vmConfigurationTypes.c5a_8xlarge.vcpu} = ${vmConfigurationTypes.c5a_8xlarge.pricePerHour}$ x hour)`,
      value: vmConfigurationTypes.c5a_8xlarge.type,
    },
    {
      title: `${vmConfigurationTypes.c6id_32xlarge.type} (RAM ${vmConfigurationTypes.c6id_32xlarge.ram} + VCPUs ${vmConfigurationTypes.c6id_32xlarge.vcpu} = ${vmConfigurationTypes.c6id_32xlarge.pricePerHour}$ x hour)`,
      value: vmConfigurationTypes.c6id_32xlarge.type,
    },
    {
      title: `${vmConfigurationTypes.m6a_32xlarge.type} (RAM ${vmConfigurationTypes.m6a_32xlarge.ram} + VCPUs ${vmConfigurationTypes.m6a_32xlarge.vcpu} = ${vmConfigurationTypes.m6a_32xlarge.pricePerHour}$ x hour)`,
      value: vmConfigurationTypes.m6a_32xlarge.type,
    },
  ];
  const { vmType } = await prompts({
    type: 'select',
    name: 'vmType',
    message: theme.text.bold(
      'Choose your VM type based on your needs (suggested option at first)'
    ),
    choices: options,
    initial: suggestedConfiguration,
  });
  if (!vmType) showError(COMMAND_ERRORS.COMMAND_ABORT_SELECTION, true);
  return vmType;
};
/**
 * Shows a list of disk types for selected VM.
 * @returns Promise<DiskTypeForVM> - the selected disk type.
 */
const promptVMDiskTypeSelector = async () => {
  const options = [
    {
      title: 'GP2',
      value: 'gp2' /* DiskTypeForVM.GP2 */,
    },
    {
      title: 'GP3',
      value: 'gp3' /* DiskTypeForVM.GP3 */,
    },
    {
      title: 'IO1',
      value: 'io1' /* DiskTypeForVM.IO1 */,
    },
    {
      title: 'SC1',
      value: 'sc1' /* DiskTypeForVM.SC1 */,
    },
    {
      title: 'ST1',
      value: 'st1' /* DiskTypeForVM.ST1 */,
    },
  ];
  const { vmDiskType } = await prompts({
    type: 'select',
    name: 'vmDiskType',
    message: theme.text.bold(
      'Choose your VM disk (volume) type based on your needs (nb. the disk size is automatically computed based on OS + verification minimal space requirements)'
    ),
    choices: options,
    initial: 0,
  });
  if (!vmDiskType) showError(COMMAND_ERRORS.COMMAND_ABORT_SELECTION, true);
  return vmDiskType;
};
/**
 * Show a series of questions about the circuits.
 * @param constraintSize <number> - the amount of circuit constraints.
 * @param timeoutMechanismType <CeremonyTimeoutType> - the choosen timeout mechanism type for the ceremony.
 * @param needPromptCircomCompiler <boolean> - a boolean value indicating if the questions related to the Circom compiler version and commit hash must be asked.
 * @param enforceVM <boolean> - a boolean value indicating if the contribution verification could be supported by VM-only approach or not.
 * @returns Promise<Array<Circuit>> - circuit info prompted by the coordinator.
 */
const promptCircuitInputData = async (
  constraintSize,
  timeoutMechanismType,
  sameCircomCompiler,
  enforceVM
) => {
  // State data.
  let circuitConfigurationValues = [];
  let dynamicTimeoutThreshold = 0;
  let fixedTimeoutTimeWindow = 0;
  let circomVersion = '';
  let circomCommitHash = '';
  let circuitInputData;
  let cfOrVm;
  let vmDiskType;
  let vmConfigurationType = '';
  const questions = [
    {
      type: 'text',
      name: 'description',
      message: theme.text.bold(`Short description`),
      validate: (title) =>
        title.length > 0 ||
        theme.colors.red(
          `${theme.symbols.error} Please, enter a non-empty string as the description of the circuit`
        ),
    },
    {
      name: 'externalReference',
      type: 'text',
      message: theme.text.bold(`The external link to the circuit`),
      validate: (value) =>
        value.length > 0 && value.match(/(https?:\/\/[^\s]+\.circom$)/g)
          ? true
          : theme.colors.red(
              `${theme.symbols.error} Please, provide a valid link to the circuit (e.g., https://github.com/iden3/circomlib/blob/master/circuits/poseidon.circom)`
            ),
    },
    {
      name: 'templateCommitHash',
      type: 'text',
      message: theme.text.bold(`The commit hash of the circuit`),
      validate: (commitHash) =>
        commitHash.length === 40 ||
        theme.colors.red(
          `${theme.symbols.error} Please, provide a valid commit hash (e.g., b7ad01b11f9b4195e38ecc772291251260ab2c67)`
        ),
    },
  ];
  // Prompt for circuit data.
  const { description, externalReference, templateCommitHash } = await prompts(
    questions
  );
  if (!description || !externalReference || !templateCommitHash)
    showError(COMMAND_ERRORS.COMMAND_ABORT_PROMPT, true);
  // Ask for circuit configuration.
  const { confirmation: needConfiguration } = await askForConfirmation(
    `Did the circuit template require configuration with parameters?`,
    `Yes`,
    `No`
  );
  if (needConfiguration === undefined)
    showError(COMMAND_ERRORS.COMMAND_ABORT_PROMPT, true);
  if (needConfiguration) {
    // Ask for values if needed config.
    const { circuitValues } = await prompts({
      name: 'circuitValues',
      type: 'text',
      message: theme.text.bold(
        `Circuit template configuration in a comma-separated list of values`
      ),
      validate: (value) =>
        (value.split(',').length === 1 && !!value) ||
        (value.split(`,`).length > 1 && value.includes(',')) ||
        theme.colors.red(
          `${theme.symbols.error} Please, provide a correct comma-separated list of values (e.g., 10,2,1,2)`
        ),
    });
    if (circuitValues === undefined)
      showError(COMMAND_ERRORS.COMMAND_ABORT_PROMPT, true);
    circuitConfigurationValues = circuitValues.split(',');
  }
  // Prompt for Circom compiler info (if needed).
  if (!sameCircomCompiler) {
    const { version, commitHash } = await promptCircomCompiler();
    circomVersion = version;
    circomCommitHash = commitHash;
  }
  // Ask for prefered contribution verification method (CF vs VM).
  if (!enforceVM) {
    const { confirmation } = await askForConfirmation(
      `The contribution verification can be performed using Cloud Functions (CF, cheaper for small contributions but limited to 1M constraints) or custom virtual machines (expensive but could scale up to 30M constraints). Be aware about VM costs and if you wanna learn more, please visit the documentation to have a complete overview about cost estimation of the two mechanisms.\nChoose the contribution verification mechanism`,
      `CF`, // eq. true.
      `VM` // eq. false.
    );
    cfOrVm = confirmation
      ? 'CF' /* CircuitContributionVerificationMechanism.CF */
      : 'VM' /* CircuitContributionVerificationMechanism.VM */;
  } else {
    cfOrVm = 'VM' /* CircuitContributionVerificationMechanism.VM */;
  }
  if (cfOrVm === undefined)
    showError(COMMAND_ERRORS.COMMAND_ABORT_PROMPT, true);
  if (cfOrVm === 'VM' /* CircuitContributionVerificationMechanism.VM */) {
    // Ask for selecting the specific VM configuration type.
    vmConfigurationType = await promptVMTypeSelector(constraintSize);
    // Ask for selecting the specific VM disk (volume) type.
    vmDiskType = await promptVMDiskTypeSelector();
  }
  // Ask for dynamic timeout mechanism data.
  if (timeoutMechanismType === 'DYNAMIC' /* CeremonyTimeoutType.DYNAMIC */) {
    const { dynamicThreshold } = await prompts({
      type: 'number',
      name: 'dynamicThreshold',
      message: theme.text.bold(
        `The dynamic timeout requires an acceptance threshold (expressed in %) to avoid disqualifying too many contributors for non-critical issues.\nFor example, suppose we set a threshold at 20%. If the average contribution is 10 minutes, the next contributor has 12 minutes to complete download, computation, and upload (verification is NOT included).\nTherefore, assuming it took 11:30 minutes, the next contributor will have (10 + 11:30) / 2 = 10:45 + 20% = 2:15 + 10:45 = 13 minutes total.\nPlease, set your threshold`
      ),
      validate: (value) => {
        if (value === undefined || value < 0 || value > 100)
          return theme.colors.red(
            `${theme.symbols.error} Please, provide a valid threshold selecting a value between [0-100]%. We suggest at least 25%.`
          );
        return true;
      },
    });
    if (
      dynamicThreshold === undefined ||
      dynamicThreshold < 0 ||
      dynamicThreshold > 100
    )
      showError(COMMAND_ERRORS.COMMAND_ABORT_PROMPT, true);
    dynamicTimeoutThreshold = dynamicThreshold;
    circuitInputData = {
      description,
      dynamicThreshold: dynamicTimeoutThreshold,
      compiler: {
        version: circomVersion,
        commitHash: circomCommitHash,
      },
      template: {
        source: externalReference,
        commitHash: templateCommitHash,
        paramsConfiguration: circuitConfigurationValues,
      },
      verification: {
        cfOrVm,
        vm: {
          vmConfigurationType,
          vmDiskType,
        },
      },
    };
  } else {
    // Ask for fixed timeout mechanism data.
    const { fixedTimeWindow } = await prompts({
      type: 'number',
      name: `fixedTimeWindow`,
      message: theme.text.bold(
        `The fixed timeout requires a fixed time window for contribution. Your time window in minutes`
      ),
      validate: (value) => {
        if (value <= 0)
          return theme.colors.red(
            `${theme.symbols.error} Please, provide a time window greater than zero`
          );
        return true;
      },
    });
    if (fixedTimeWindow === undefined || fixedTimeWindow <= 0)
      showError(COMMAND_ERRORS.COMMAND_ABORT_PROMPT, true);
    fixedTimeoutTimeWindow = fixedTimeWindow;
    circuitInputData = {
      description,
      fixedTimeWindow: fixedTimeoutTimeWindow,
      compiler: {
        version: circomVersion,
        commitHash: circomCommitHash,
      },
      template: {
        source: externalReference,
        commitHash: templateCommitHash,
        paramsConfiguration: circuitConfigurationValues,
      },
      verification: {
        cfOrVm,
        vm: {
          vmConfigurationType,
          vmDiskType,
        },
      },
    };
  }
  return circuitInputData;
};
/**
 * Prompt for asking if the same circom compiler version has been used for all circuits of the ceremony.
 * @returns <Promise<boolean>>
 */
const promptSameCircomCompiler = async () => {
  const { confirmation: sameCircomCompiler } = await askForConfirmation(
    'Did the circuits of the ceremony were compiled with the same version of circom?',
    'Yes',
    'No'
  );
  if (sameCircomCompiler === undefined)
    showError(COMMAND_ERRORS.COMMAND_ABORT_PROMPT, true);
  return sameCircomCompiler;
};
/**
 * Prompt for asking if the coordinator wanna use a pre-computed zKey for the given circuit.
 * @returns <Promise<boolean>>
 */
const promptPreComputedZkey = async () => {
  const { confirmation: wannaUsePreComputedZkey } = await askForConfirmation(
    'Would you like to use a pre-computed zKey for this circuit?',
    'Yes',
    'No'
  );
  if (wannaUsePreComputedZkey === undefined)
    showError(COMMAND_ERRORS.COMMAND_ABORT_PROMPT, true);
  return wannaUsePreComputedZkey;
};
/**
 * Prompt for asking if the coordinator wants to add a new circuit to the ceremony.
 * @returns <Promise<boolean>>
 */
const promptCircuitAddition = async () => {
  const { confirmation: wannaAddNewCircuit } = await askForConfirmation(
    'Want to add another circuit for the ceremony?',
    'Yes',
    'No'
  );
  if (wannaAddNewCircuit === undefined)
    showError(COMMAND_ERRORS.COMMAND_ABORT_PROMPT, true);
  return wannaAddNewCircuit;
};
/**
 * Shows a list of pre-computed zKeys for a single option selection.
 * @dev the names are derived from local zKeys files.
 * @param options <Array<string>> - an array of pre-computed zKeys names.
 * @returns Promise<string> - the name of the choosen pre-computed zKey.
 */
const promptPreComputedZkeySelector = async (options) => {
  const { preComputedZkeyFilename } = await prompts({
    type: 'select',
    name: 'preComputedZkeyFilename',
    message: theme.text.bold(
      'Select the pre-computed zKey file related to the circuit'
    ),
    choices: options.map((option) => ({ title: option, value: option })),
    initial: 0,
  });
  if (!preComputedZkeyFilename)
    showError(COMMAND_ERRORS.COMMAND_ABORT_SELECTION, true);
  return preComputedZkeyFilename;
};
/**
 * Prompt asking to the coordinator to choose the desired PoT file for the zKey for the circuit.
 * @param suggestedSmallestNeededPowers <number> - the minimal number of powers necessary for circuit zKey generation.
 * @returns Promise<number> - the selected amount of powers.
 */
const promptNeededPowersForCircuit = async (suggestedSmallestNeededPowers) => {
  const question = {
    name: 'choosenPowers',
    type: 'number',
    message: theme.text.bold(
      `Specify the amount of Powers of Tau used to generate the pre-computed zKey`
    ),
    validate: (value) =>
      value >= suggestedSmallestNeededPowers && value <= 28
        ? true
        : theme.colors.red(
            `${theme.symbols.error} Please, provide a valid amount of powers selecting a value between [${suggestedSmallestNeededPowers}-28].  ${suggestedSmallestNeededPowers}`
          ),
  };
  // Prompt for circuit data.
  const { choosenPowers } = await prompts(question);
  if (
    choosenPowers === undefined ||
    Number(choosenPowers) < suggestedSmallestNeededPowers
  )
    showError(COMMAND_ERRORS.COMMAND_ABORT_PROMPT, true);
  return choosenPowers;
};
/**
 * Shows a list of PoT files for a single option selection.
 * @dev the names are derived from local PoT files.
 * @param options <Array<string>> - an array of PoT file names.
 * @returns Promise<string> - the name of the choosen PoT.
 */
const promptPotSelector = async (options) => {
  const { potFilename } = await prompts({
    type: 'select',
    name: 'potFilename',
    message: theme.text.bold(
      'Select the Powers of Tau file choosen for the circuit'
    ),
    choices: options.map((option) => {
      console.log(option);
      return { title: option, value: option };
    }),
    initial: 0,
  });
  if (!potFilename) showError(COMMAND_ERRORS.COMMAND_ABORT_SELECTION, true);
  return potFilename;
};
/**
 * Prompt for asking about ceremony selection.
 * @dev this method is used to show a list of ceremonies to be selected for both the computation of a contribution and the finalization of a ceremony.
 * @param ceremoniesDocuments <Array<FirebaseDocumentInfo>> - the list of ceremonies Firestore documents.
 * @param isFinalizing <boolean> - true when the coordinator must select a ceremony for finalization; otherwise false (participant selects a ceremony for contribution).
 * @returns Promise<FirebaseDocumentInfo> - the Firestore document of the selected ceremony.
 */
const promptForCeremonySelection = async (
  ceremoniesDocuments,
  isFinalizing
) => {
  // Prepare state.
  const choices = [];
  // Prepare choices x ceremony.
  // Data to be shown for selection.
  // nb. when is not finalizing, extract info to compute the amount of days left for contribute (86400000 ms x day).
  for (const ceremonyDocument of ceremoniesDocuments)
    choices.push({
      title: ceremonyDocument.data.title,
      description: `${ceremonyDocument.data.description} ${
        !isFinalizing
          ? `(${theme.colors.magenta(
              Math.ceil(
                Math.abs(Date.now() - ceremonyDocument.data.endDate) / 86400000
              )
            )} days left)`
          : ''
      }`,
      value: ceremonyDocument,
    });
  // Prompt for selection.
  const { ceremony } = await prompts({
    type: 'select',
    name: 'ceremony',
    message: theme.text.bold(
      !isFinalizing
        ? 'Which ceremony would you like to contribute to?'
        : 'Which ceremony would you like to finalize?'
    ),
    choices,
    initial: 0,
  });
  if (!ceremony || ceremony === undefined)
    showError(COMMAND_ERRORS.COMMAND_ABORT_PROMPT, true);
  return ceremony;
};
/**
 * Prompt the participant to type the entropy or the coordinator to type the beacon.
 * @param isEntropy <boolean> - true when prompting for typing entropy; otherwise false.
 * @returns <Promise<string>> - the entropy or beacon value.
 */
const promptToTypeEntropyOrBeacon = async (isEntropy = true) => {
  // Prompt for entropy or beacon.
  const { entropyOrBeacon } = await prompts({
    type: 'text',
    name: 'entropyOrBeacon',
    style: `${isEntropy ? `password` : `text`}`,
    message: theme.text.bold(
      `Enter ${
        isEntropy ? `entropy (toxic waste)` : `finalization public beacon`
      }`
    ),
    validate: (value) =>
      value.length > 0 ||
      theme.colors.red(
        `${theme.symbols.error} Please, provide a valid value for the ${
          isEntropy ? `entropy (toxic waste)` : `finalization public beacon`
        }`
      ),
  });
  if (!entropyOrBeacon || entropyOrBeacon === undefined)
    showError(COMMAND_ERRORS.COMMAND_ABORT_PROMPT, true);
  return entropyOrBeacon;
};
/**
 * Prompt for entropy generation or insertion.
 * @return <Promise<string>> - the entropy.
 */
const promptForEntropy = async () => {
  // Prompt for entropy generation prefered method.
  const { confirmation } = await askForConfirmation(
    `Would you like to automatically sample your entropy or manually type it in?`,
    'Manually',
    'Automatically'
  );
  if (confirmation === undefined)
    showError(COMMAND_ERRORS.COMMAND_ABORT_PROMPT, true);
  // Auto-generate entropy.
  if (!confirmation) return autoGenerateEntropy();
  // Prompt for manual entropy input.
  return promptToTypeEntropyOrBeacon();
};

const packagePath$2 = `${dirname(fileURLToPath(import.meta.url))}`;
dotenv.config({
  path: packagePath$2.includes(`src/lib`)
    ? `${dirname(fileURLToPath(import.meta.url))}/../../.env`
    : `${dirname(fileURLToPath(import.meta.url))}/.env`,
});
/**
 * Bootstrap services and configs is needed for a new command execution and related services.
 * @returns <Promise<FirebaseServices>>
 */
const bootstrapCommandExecutionAndServices = async () => {
  // Clean terminal window.
  clear();
  // Print header.
  console.log(
    theme.colors.magenta(figlet.textSync('Phase 2 cli', { font: 'Ogre' }))
  );
  // Check configs.
  if (!process.env.AUTH_GITHUB_CLIENT_ID)
    showError(CONFIG_ERRORS.CONFIG_GITHUB_ERROR, true);
  if (
    !process.env.FIREBASE_API_KEY ||
    !process.env.FIREBASE_AUTH_DOMAIN ||
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_MESSAGING_SENDER_ID ||
    !process.env.FIREBASE_APP_ID ||
    !process.env.FIREBASE_CF_URL_VERIFY_CONTRIBUTION
  )
    showError(CONFIG_ERRORS.CONFIG_FIREBASE_ERROR, true);
  if (
    !process.env.CONFIG_STREAM_CHUNK_SIZE_IN_MB ||
    !process.env.CONFIG_CEREMONY_BUCKET_POSTFIX ||
    !process.env.CONFIG_PRESIGNED_URL_EXPIRATION_IN_SECONDS
  )
    showError(CONFIG_ERRORS.CONFIG_OTHER_ERROR, true);
  // Initialize and return Firebase services instances (App, Firestore, Functions)
  return initializeFirebaseCoreServices(
    String(process.env.FIREBASE_API_KEY),
    String(process.env.FIREBASE_AUTH_DOMAIN),
    String(process.env.FIREBASE_PROJECT_ID),
    String(process.env.FIREBASE_MESSAGING_SENDER_ID),
    String(process.env.FIREBASE_APP_ID)
  );
};
/**
 * Execute the sign in to Firebase using OAuth credentials.
 * @dev wrapper method to handle custom errors.
 * @param firebaseApp <FirebaseApp> - the configured instance of the Firebase App in use.
 * @param credentials <OAuthCredential> - the OAuth credential generated from token exchange.
 * @returns <Promise<void>>
 */
const signInToFirebase = async (firebaseApp, credentials) => {
  try {
    // Sign in with credentials to Firebase.
    await signInToFirebaseWithCredentials(firebaseApp, credentials);
  } catch (error) {
    // Error handling by parsing error message.
    if (
      error
        .toString()
        .includes(
          'Firebase: Unsuccessful check authorization response from Github'
        )
    ) {
      showError(
        CORE_SERVICES_ERRORS.FIREBASE_TOKEN_EXPIRED_REMOVED_PERMISSIONS,
        false
      );
      // Clean expired access token from local storage.
      deleteLocalAccessToken();
      // Inform user.
      console.log(
        `${theme.symbols.info} We have successfully removed your local token to make you able to repeat the authorization process once again. Please, run the auth command again whenever you are ready and complete the association with the CLI application.`
      );
      // Gracefully exit.
      process.exit(0);
    }
    if (error.toString().includes('Firebase: Error (auth/user-disabled)'))
      showError(CORE_SERVICES_ERRORS.FIREBASE_USER_DISABLED, true);
    if (
      error
        .toString()
        .includes(
          'Firebase: Remote site 5XX from github.com for VERIFY_CREDENTIAL (auth/invalid-credential)'
        )
    )
      showError(
        CORE_SERVICES_ERRORS.FIREBASE_FAILED_CREDENTIALS_VERIFICATION,
        true
      );
    if (
      error.toString().includes('Firebase: Error (auth/network-request-failed)')
    )
      showError(CORE_SERVICES_ERRORS.FIREBASE_NETWORK_ERROR, true);
    if (
      error
        .toString()
        .includes('HttpError: The authorization request was denied')
    )
      showError(
        THIRD_PARTY_SERVICES_ERRORS.GITHUB_ACCOUNT_ASSOCIATION_REJECTED,
        true
      );
    if (
      error
        .toString()
        .includes(
          'HttpError: request to https://github.com/login/device/code failed, reason: connect ETIMEDOUT'
        )
    )
      showError(THIRD_PARTY_SERVICES_ERRORS.GITHUB_SERVER_TIMEDOUT, true);
  }
};
/**
 * Ensure that the callee is an authenticated user.
 * @notice The token will be passed as parameter.
 * @dev This method can be used within GitHub actions or other CI/CD pipelines.
 * @param firebaseApp <FirebaseApp> - the configured instance of the Firebase App in use.
 * @param token <string> - the token to be used for authentication.
 * @returns <Promise<AuthUser>> - a custom object containing info about the authenticated user, the token and github handle.
 */
const authWithToken = async (firebaseApp, token) => {
  // Get credentials.
  const credentials = exchangeGithubTokenForCredentials(token);
  // Sign in to Firebase using credentials.
  await signInToFirebase(firebaseApp, credentials);
  // Get current authenticated user.
  const user = getCurrentFirebaseAuthUser(firebaseApp);
  // Get Github unique identifier (handle-id).
  const providerUserId = await getGithubProviderUserId(String(token));
  // Greet the user.
  console.log(
    `Greetings, @${theme.text.bold(
      getUserHandleFromProviderUserId(providerUserId)
    )} ${theme.emojis.wave}\n`
  );
  return {
    user,
    token,
    providerUserId,
  };
};
/**
 * Ensure that the callee is an authenticated user.
 * @dev This method MUST be executed before each command to avoid authentication errors when interacting with the command.
 * @returns <Promise<AuthUser>> - a custom object containing info about the authenticated user, the token and github handle.
 */
const checkAuth = async (firebaseApp) => {
  // Check for local token.
  const isLocalTokenStored = checkLocalAccessToken();
  if (!isLocalTokenStored)
    showError(THIRD_PARTY_SERVICES_ERRORS.GITHUB_NOT_AUTHENTICATED, true);
  // Retrieve local access token.
  const token = String(getLocalAccessToken());
  // Get credentials.
  const credentials = exchangeGithubTokenForCredentials(token);
  console.log(credentials);
  console.log(firebaseApp);

  // Sign in to Firebase using credentials.
  await signInToFirebase(firebaseApp, credentials);
  // Get current authenticated user.
  console.log('------------------------22');

  const user = getCurrentFirebaseAuthUser(firebaseApp);
  // Get Github unique identifier (handle-id).
  const providerUserId = await getGithubProviderUserId(String(token));
  // Greet the user.
  console.log(
    `Greetings, @${theme.text.bold(
      getUserHandleFromProviderUserId(providerUserId)
    )} ${theme.emojis.wave}\n`
  );
  return {
    user,
    token,
    providerUserId,
  };
};

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
const getInputDataToAddCircuitToCeremony = async (
  choosenCircuitFilename,
  matchingWasmFilename,
  ceremonyTimeoutMechanismType,
  sameCircomCompiler,
  circuitSequencePosition,
  sharedCircomCompilerData
) => {
  // Extract name and prefix.
  const circuitName = choosenCircuitFilename.substring(
    0,
    choosenCircuitFilename.indexOf('.')
  );
  const circuitPrefix = extractPrefix(circuitName);
  // R1CS file path.
  const r1csCWDFilePath = getCWDFilePath(process.cwd(), choosenCircuitFilename);
  const spinner = customSpinner(`Looking for circuit metadata...`, 'clock');
  spinner.start();
  // Read R1CS and store metadata locally.
  const metadata = getR1CSInfo(r1csCWDFilePath);
  await sleep(2000); // Sleep 2s to avoid unexpected termination (file descriptor close).
  spinner.succeed(`Circuit metadata read and saved correctly`);
  // Prompt for circuit input data.
  const circuitInputData = await promptCircuitInputData(
    metadata.constraints,
    ceremonyTimeoutMechanismType,
    sameCircomCompiler,
    !(metadata.constraints <= 1000000) // nb. we assume after our dry-runs that CF works fine for up to one million circuit constraints.
  );
  process.stdout.write('\n');
  // Return updated data.
  return {
    ...circuitInputData,
    metadata,
    compiler: {
      commitHash:
        !circuitInputData.compiler.commitHash && sameCircomCompiler
          ? sharedCircomCompilerData.commitHash
          : circuitInputData.compiler.commitHash,
      version:
        !circuitInputData.compiler.version && sameCircomCompiler
          ? sharedCircomCompilerData.version
          : circuitInputData.compiler.version,
    },
    compilationArtifacts: {
      r1csFilename: choosenCircuitFilename,
      wasmFilename: matchingWasmFilename,
    },
    name: circuitName,
    prefix: circuitPrefix,
    sequencePosition: circuitSequencePosition,
  };
};
/**
 * Handle the addition of one or more circuits to the ceremony.
 * @param options <Array<string>> - list of possible circuits that can be added to the ceremony.
 * @param ceremonyTimeoutMechanismType <CeremonyTimeoutType> - the type of ceremony timeout mechanism.
 * @returns <Promise<Array<CircuitInputData>>> - the input data for each circuit that has been added to the ceremony.
 */
const handleAdditionOfCircuitsToCeremony = async (
  r1csOptions,
  wasmOptions,
  ceremonyTimeoutMechanismType
) => {
  // Prepare data.
  const inputDataForCircuits = []; // All circuits interactive data.
  let circuitSequencePosition = 1; // The circuit's position for contribution.
  let readyToSummarizeCeremony = false; // Boolean flag to check whether the coordinator has finished to add circuits to the ceremony.
  let wannaAddAnotherCircuit = true; // Loop flag.
  const sharedCircomCompilerData = { version: '', commitHash: '' };
  // Prompt if the circuits to be added were compiled with the same version of Circom.
  // nb. CIRCOM compiler version/commit-hash is a declaration useful for later verifiability and avoid bugs.
  const sameCircomCompiler = await promptSameCircomCompiler();
  if (sameCircomCompiler) {
    // Prompt for Circom compiler.
    const { version, commitHash } = await promptCircomCompiler();
    sharedCircomCompilerData.version = version;
    sharedCircomCompilerData.commitHash = commitHash;
  }
  while (wannaAddAnotherCircuit) {
    // Gather information about the ceremony circuits.
    console.log(
      theme.text.bold(
        `\n- Circuit # ${theme.colors.magenta(`${circuitSequencePosition}`)}\n`
      )
    );
    // Select one circuit among cwd circuits identified by R1CS files.
    const choosenCircuitFilename = await promptCircuitSelector(r1csOptions);
    // Update list of possible options for next selection (if, any).
    r1csOptions = r1csOptions.filter(
      (circuitFilename) => circuitFilename !== choosenCircuitFilename
    );
    // Select the wasm file accordingly to circuit R1CS filename.
    const matchingWasms = wasmOptions.filter(
      (wasmFilename) =>
        choosenCircuitFilename.split(`.r1cs`)[0] ===
        wasmFilename.split(`.${commonTerms.foldersAndPathsTerms.wasm}`)[0]
    );
    if (matchingWasms.length !== 1)
      showError(COMMAND_ERRORS.COMMAND_SETUP_MISMATCH_R1CS_WASM, true);
    // Get input data for choosen circuit.
    const circuitInputData = await getInputDataToAddCircuitToCeremony(
      choosenCircuitFilename,
      matchingWasms[0],
      ceremonyTimeoutMechanismType,
      sameCircomCompiler,
      circuitSequencePosition,
      sharedCircomCompilerData
    );
    // Store circuit data.
    inputDataForCircuits.push(circuitInputData);
    // Check if any circuit is left for potentially addition to ceremony.
    if (r1csOptions.length !== 0) {
      // Prompt for selection.
      const wannaAddNewCircuit = await promptCircuitAddition();
      if (wannaAddNewCircuit === false)
        readyToSummarizeCeremony = true; // Terminate circuit addition.
      else circuitSequencePosition += 1; // Continue with next one.
    } else readyToSummarizeCeremony = true; // No more circuit to add.
    // Summarize the ceremony.
    if (readyToSummarizeCeremony) wannaAddAnotherCircuit = false;
  }
  return inputDataForCircuits;
};
/**
 * Print ceremony and related circuits information.
 * @param ceremonyInputData <CeremonyInputData> - the input data of the ceremony.
 * @param circuits <Array<CircuitDocument>> - the circuit documents associated to the circuits of the ceremony.
 */
const displayCeremonySummary = (ceremonyInputData, circuits) => {
  // Prepare ceremony summary.
  let summary = `${`${theme.text.bold(
    ceremonyInputData.title
  )}\n${theme.text.italic(ceremonyInputData.description)}`}
        \n${`Opening: ${theme.text.bold(
          theme.text.underlined(
            new Date(ceremonyInputData.startDate)
              .toUTCString()
              .replace('GMT', 'UTC')
          )
        )}\nEnding: ${theme.text.bold(
          theme.text.underlined(
            new Date(ceremonyInputData.endDate)
              .toUTCString()
              .replace('GMT', 'UTC')
          )
        )}`}
        \n${theme.text.bold(
          ceremonyInputData.timeoutMechanismType ===
            'DYNAMIC' /* CeremonyTimeoutType.DYNAMIC */
            ? `Dynamic`
            : `Fixed`
        )} Timeout / ${theme.text.bold(ceremonyInputData.penalty)}m Penalty`;
  for (const circuit of circuits) {
    // Append circuit summary.
    summary += `\n\n${theme.text.bold(
      `- CIRCUIT # ${theme.text.bold(
        theme.colors.magenta(`${circuit.sequencePosition}`)
      )}`
    )}
      \n${`${theme.text.bold(circuit.name)}\n${theme.text.italic(
        circuit.description
      )}
      \nCurve: ${theme.text.bold(
        circuit.metadata?.curve
      )}\nCompiler: ${theme.text.bold(
        `${circuit.compiler.version}`
      )} (${theme.text.bold(
        circuit.compiler.commitHash.slice(0, 7)
      )})\nVerification: ${theme.text.bold(
        `${circuit.verification.cfOrVm}`
      )} ${theme.text.bold(
        circuit.verification.cfOrVm ===
          'VM' /* CircuitContributionVerificationMechanism.VM */
          ? `(${circuit.verification.vm.vmConfigurationType} / ${circuit.verification.vm.vmDiskType} volume)`
          : ''
      )}\nSource: ${theme.text.bold(
        circuit.template.source.split(`/`).at(-1)
      )}(${theme.text.bold(circuit.template.paramsConfiguration)})\n${
        ceremonyInputData.timeoutMechanismType ===
        'DYNAMIC' /* CeremonyTimeoutType.DYNAMIC */
          ? `Threshold: ${theme.text.bold(circuit.dynamicThreshold)}%`
          : `Max Contribution Time: ${theme.text.bold(
              circuit.fixedTimeWindow
            )}m`
      }
      \n# Wires: ${theme.text.bold(
        circuit.metadata?.wires
      )}\n# Constraints: ${theme.text.bold(
        circuit.metadata?.constraints
      )}\n# Private Inputs: ${theme.text.bold(
        circuit.metadata?.privateInputs
      )}\n# Public Inputs: ${theme.text.bold(
        circuit.metadata?.publicInputs
      )}\n# Labels: ${theme.text.bold(
        circuit.metadata?.labels
      )}\n# Outputs: ${theme.text.bold(
        circuit.metadata?.outputs
      )}\n# PoT: ${theme.text.bold(circuit.metadata?.pot)}`}`;
  }
  // Display complete summary.
  console.log(
    boxen(summary, {
      title: theme.colors.magenta(`CEREMONY SUMMARY`),
      titleAlignment: 'center',
      textAlignment: 'left',
      margin: 1,
      padding: 1,
    })
  );
};
/**
 * Check if the smallest Powers of Tau has already been downloaded/stored in the correspondent local path
 * @dev we are downloading the Powers of Tau file from Hermez Cryptography Phase 1 Trusted Setup.
 * @param powers <string> - the smallest amount of powers needed for the given circuit (should be in a 'XY' stringified form).
 * @param ptauCompleteFilename <string> - the complete file name of the powers of tau file to be downloaded.
 * @returns <Promise<void>>
 */
const checkAndDownloadSmallestPowersOfTau = async (
  powers,
  ptauCompleteFilename
) => {
  // Get already downloaded ptau files.
  const alreadyDownloadedPtauFiles = await getDirFilesSubPaths(localPaths.pot);
  // Get the required smallest ptau file.
  const smallestPtauFileForGivenPowers = alreadyDownloadedPtauFiles
    .filter((dirent) => extractPoTFromFilename(dirent.name) === Number(powers))
    .map((dirent) => dirent.name);
  // Check if already downloaded or not.
  if (smallestPtauFileForGivenPowers.length === 0) {
    const spinner = customSpinner(
      `Downloading the ${theme.text.bold(
        `#${powers}`
      )} smallest PoT file needed from the Hermez Cryptography Phase 1 Trusted Setup...`,
      `clock`
    );
    spinner.start();
    // Download smallest Powers of Tau file from remote server.
    const streamPipeline = promisify(pipeline);
    // Make the call.
    const response = await fetch$1(
      `${potFileDownloadMainUrl}${ptauCompleteFilename}`
    );
    // Handle errors.
    if (!response.ok && response.status !== 200)
      showError(COMMAND_ERRORS.COMMAND_SETUP_DOWNLOAD_PTAU, true);
    // Write the file locally
    else
      await streamPipeline(
        response.body,
        createWriteStream(getPotLocalFilePath(ptauCompleteFilename))
      );
    spinner.succeed(
      `Powers of tau ${theme.text.bold(`#${powers}`)} downloaded successfully`
    );
  } else
    console.log(
      `${theme.symbols.success} Smallest Powers of Tau ${theme.text.bold(
        `#${powers}`
      )} already downloaded`
    );
};
/**
 * Handle the needs in terms of Powers of Tau for the selected pre-computed zKey.
 * @notice in case there are no Powers of Tau file suitable for the pre-computed zKey (i.e., having a
 * number of powers greater than or equal to the powers needed by the zKey), the coordinator will be asked
 * to provide a number of powers manually, ranging from the smallest possible to the largest.
 * @param neededPowers <number> - the smallest amount of powers needed by the zKey.
 * @returns Promise<string, string> - the information about the choosen Powers of Tau file for the pre-computed zKey
 * along with related powers.
 */
const handlePreComputedZkeyPowersOfTauSelection = async (neededPowers) => {
  let doubleDigitsPowers = ''; // The amount of stringified powers in a double-digits format (XY).
  let potCompleteFilename = ''; // The complete filename of the Powers of Tau file selected for the pre-computed zKey.
  let usePreDownloadedPoT = false; // Boolean flag to check if the coordinator is going to use a pre-downloaded PoT file or not.
  // Check for PoT file associated to selected pre-computed zKey.
  const spinner = customSpinner('Looking for Powers of Tau files...', 'clock');
  spinner.start();
  // Get local `.ptau` files.
  const potFilePaths = await filterDirectoryFilesByExtension(
    process.cwd(),
    `.ptau`
  );
  // Filter based on suitable amount of powers.
  const potOptions = potFilePaths
    .filter((dirent) => extractPoTFromFilename(dirent.name) >= neededPowers)
    .map((dirent) => dirent.name);
  if (potOptions.length <= 0) {
    spinner.warn(
      `There is no already downloaded Powers of Tau file suitable for this zKey`
    );
    // Ask coordinator to input the amount of powers.
    const choosenPowers = await promptNeededPowersForCircuit(neededPowers);
    // Convert to double digits powers (e.g., 9 -> 09).
    doubleDigitsPowers = convertToDoubleDigits(choosenPowers);
    potCompleteFilename = `${potFilenameTemplate}${doubleDigitsPowers}.ptau`;
  } else {
    spinner.stop();
    // Prompt for Powers of Tau selection among already downloaded ones.
    potCompleteFilename = await promptPotSelector(potOptions);
    // Convert to double digits powers (e.g., 9 -> 09).
    doubleDigitsPowers = convertToDoubleDigits(
      extractPoTFromFilename(potCompleteFilename)
    );
    usePreDownloadedPoT = true;
  }
  return {
    doubleDigitsPowers,
    potCompleteFilename,
    usePreDownloadedPoT,
  };
};
/**
 * Generate a brand new zKey from scratch.
 * @param r1csLocalPathAndFileName <string> - the local complete path of the R1CS selected file.
 * @param potLocalPathAndFileName <string> - the local complete path of the PoT selected file.
 * @param zkeyLocalPathAndFileName <string> - the local complete path of the pre-computed zKey selected file.
 */
const handleNewZkeyGeneration = async (
  r1csLocalPathAndFileName,
  potLocalPathAndFileName,
  zkeyLocalPathAndFileName
) => {
  console.log(
    `${
      theme.symbols.info
    } The computation of your brand new zKey is starting soon.\n${theme.text.bold(
      `${theme.symbols.warning} Be careful, stopping the process will result in the loss of all progress achieved so far.`
    )}`
  );
  // Generate zKey.
  await zKey.newZKey(
    r1csLocalPathAndFileName,
    potLocalPathAndFileName,
    zkeyLocalPathAndFileName,
    console
  );
  console.log(
    `\n${theme.symbols.success} Generation of genesis zKey completed successfully`
  );
};
/**
 * Manage the creation of a ceremony file storage bucket.
 * @param firebaseFunctions <Functions> - the Firebase Cloud Functions instance connected to the current application.
 * @param ceremonyPrefix <string> - the prefix of the ceremony.
 * @returns <Promise<string>> - the ceremony bucket name.
 */
const handleCeremonyBucketCreation = async (
  firebaseFunctions,
  ceremonyPrefix
) => {
  // Compose bucket name using the ceremony prefix.
  const bucketName = getBucketName(
    ceremonyPrefix,
    process.env.CONFIG_CEREMONY_BUCKET_POSTFIX
  );
  const spinner = customSpinner(
    `Getting ready for ceremony files and data storage...`,
    `clock`
  );
  spinner.start();
  try {
    // Make the call to create the bucket.
    await createS3Bucket(firebaseFunctions, bucketName);
  } catch (error) {
    const errorBody = JSON.parse(JSON.stringify(error));
    showError(
      `[${errorBody.code}] ${error.message} ${
        !errorBody.details ? '' : `\n${errorBody.details}`
      }`,
      true
    );
  }
  spinner.succeed(`Ceremony bucket has been successfully created`);
  return bucketName;
};
/**
 * Upload a circuit artifact (r1cs, WASM, ptau) to the ceremony storage.
 * @dev this method uses a multi part upload to upload the file in chunks.
 * @param firebaseFunctions <Functions> - the Firebase Cloud Functions instance connected to the current application.
 * @param bucketName <string> - the ceremony bucket name.
 * @param storageFilePath <string> - the storage (bucket) path where the file should be uploaded.
 * @param localPathAndFileName <string> - the local file path where is located.
 * @param completeFilename <string> - the complete filename.
 */
const handleCircuitArtifactUploadToStorage = async (
  firebaseFunctions,
  bucketName,
  storageFilePath,
  localPathAndFileName,
  completeFilename
) => {
  const spinner = customSpinner(
    `Uploading ${theme.text.bold(
      completeFilename
    )} file to ceremony storage...`,
    `clock`
  );
  spinner.start();
  await multiPartUpload(
    firebaseFunctions,
    bucketName,
    storageFilePath,
    localPathAndFileName,
    Number(process.env.CONFIG_STREAM_CHUNK_SIZE_IN_MB)
  );
  spinner.succeed(
    `Upload of (${theme.text.bold(
      completeFilename
    )}) file completed successfully`
  );
};
/**
 * Setup command.
 * @notice The setup command allows the coordinator of the ceremony to prepare the next ceremony by interacting with the CLI.
 * @dev For proper execution, the command must be run in a folder containing the R1CS files related to the circuits
 * for which the coordinator wants to create the ceremony. The command will download the necessary Tau powers
 * from Hermez's ceremony Phase 1 Reliable Setup Ceremony.
 * @param cmd? <any> - the path to the ceremony setup file.
 */
const setup = async (cmd) => {
  // Setup command state.
  const circuits = []; // Circuits.
  let ceremonyId = ''; // The unique identifier of the ceremony.
  const { firebaseApp, firebaseFunctions, firestoreDatabase } =
    await bootstrapCommandExecutionAndServices();
  // Check for authentication.
  const { user, providerUserId } = cmd.auth
    ? await authWithToken(firebaseApp, cmd.auth)
    : await checkAuth(firebaseApp);
  // Preserve command execution only for coordinators.
  if (!(await isCoordinator(user)))
    showError(COMMAND_ERRORS.COMMAND_NOT_COORDINATOR, true);
  // Get current working directory.
  const cwd = process.cwd();
  console.log(
    `${theme.symbols.warning} To setup a zkSNARK Groth16 Phase 2 Trusted Setup ceremony you need to have the Rank-1 Constraint System (R1CS) file for each circuit in your working directory`
  );
  console.log(
    `\n${
      theme.symbols.info
    } Your current working directory is ${theme.text.bold(
      theme.text.underlined(process.cwd())
    )}\n`
  );
  // Prepare local directories.
  checkAndMakeNewDirectoryIfNonexistent(localPaths.output);
  cleanDir(localPaths.setup);
  cleanDir(localPaths.pot);
  cleanDir(localPaths.zkeys);
  cleanDir(localPaths.wasm);
  // if there is the file option, then set up the non interactively
  if (cmd.template) {
    // 1. parse the file
    // tmp data - do not cleanup files as we need them
    const spinner = customSpinner(
      `Parsing ${theme.text.bold(cmd.template)} setup configuration file...`,
      `clock`
    );
    spinner.start();
    const setupCeremonyData = await parseCeremonyFile(cmd.template);
    spinner.succeed(
      `Parsing of ${theme.text.bold(
        cmd.template
      )} setup configuration file completed successfully`
    );
    // final setup data
    const ceremonySetupData = setupCeremonyData;
    // create a new bucket
    const bucketName = await handleCeremonyBucketCreation(
      firebaseFunctions,
      ceremonySetupData.ceremonyPrefix
    );
    console.log(
      `\n${theme.symbols.success} Ceremony bucket name: ${theme.text.bold(
        bucketName
      )}`
    );
    // loop through each circuit
    for await (const circuit of setupCeremonyData.circuits) {
      // Local paths.
      const index = ceremonySetupData.circuits.indexOf(circuit);
      const r1csLocalPathAndFileName = `./${circuit.name}.r1cs`;
      const wasmLocalPathAndFileName = `./${circuit.name}.wasm`;
      const potLocalPathAndFileName = getPotLocalFilePath(
        circuit.files.potFilename
      );
      const zkeyLocalPathAndFileName = getZkeyLocalFilePath(
        circuit.files.initialZkeyFilename
      );
      // 2. download the pot and wasm files
      await checkAndDownloadSmallestPowersOfTau(
        convertToDoubleDigits(circuit.metadata?.pot),
        circuit.files.potFilename
      );
      // 3. generate the zKey
      const spinner = customSpinner(
        `Generating genesis zKey for circuit ${theme.text.bold(
          circuit.name
        )}...`,
        `clock`
      );
      spinner.start();
      await zKey.newZKey(
        r1csLocalPathAndFileName,
        getPotLocalFilePath(circuit.files.potFilename),
        zkeyLocalPathAndFileName,
        undefined
      );
      spinner.succeed(
        `Generation of the genesis zKey for citcui ${theme.text.bold(
          circuit.name
        )} completed successfully`
      );
      // 4. calculate the hashes
      const wasmBlake2bHash = await blake512FromPath(wasmLocalPathAndFileName);
      const potBlake2bHash = await blake512FromPath(
        getPotLocalFilePath(circuit.files.potFilename)
      );
      const initialZkeyBlake2bHash = await blake512FromPath(
        zkeyLocalPathAndFileName
      );
      // 5. upload the artifacts
      // Upload zKey to Storage.
      await handleCircuitArtifactUploadToStorage(
        firebaseFunctions,
        bucketName,
        circuit.files.initialZkeyStoragePath,
        zkeyLocalPathAndFileName,
        circuit.files.initialZkeyFilename
      );
      // Check if PoT file has been already uploaded to storage.
      const alreadyUploadedPot = await checkIfObjectExist(
        firebaseFunctions,
        bucketName,
        circuit.files.potStoragePath
      );
      // If it wasn't uploaded yet, upload it.
      if (!alreadyUploadedPot) {
        // Upload PoT to Storage.
        await handleCircuitArtifactUploadToStorage(
          firebaseFunctions,
          bucketName,
          circuit.files.potStoragePath,
          potLocalPathAndFileName,
          circuit.files.potFilename
        );
      }
      // Upload r1cs to Storage.
      await handleCircuitArtifactUploadToStorage(
        firebaseFunctions,
        bucketName,
        circuit.files.r1csStoragePath,
        r1csLocalPathAndFileName,
        circuit.files.r1csFilename
      );
      // Upload wasm to Storage.
      await handleCircuitArtifactUploadToStorage(
        firebaseFunctions,
        bucketName,
        circuit.files.wasmStoragePath,
        r1csLocalPathAndFileName,
        circuit.files.wasmFilename
      );
      // 6 update the setup data object
      ceremonySetupData.circuits[index].files = {
        ...circuit.files,
        potBlake2bHash: potBlake2bHash,
        wasmBlake2bHash: wasmBlake2bHash,
        initialZkeyBlake2bHash: initialZkeyBlake2bHash,
      };
      ceremonySetupData.circuits[index].zKeySizeInBytes = getFileStats(
        zkeyLocalPathAndFileName
      ).size;
    }
    // 7. setup the ceremony
    const ceremonyId = await setupCeremony(
      firebaseFunctions,
      ceremonySetupData.ceremonyInputData,
      ceremonySetupData.ceremonyPrefix,
      ceremonySetupData.circuits
    );
    console.log(
      `Congratulations, the setup of ceremony ${theme.text.bold(
        ceremonySetupData.ceremonyInputData.title
      )} (${`UID: ${theme.text.bold(
        ceremonyId
      )}`}) has been successfully completed ${
        theme.emojis.tada
      }. You will be able to find all the files and info respectively in the ceremony bucket and database document.`
    );
    terminate(providerUserId);
  }
  // Look for R1CS files.
  const r1csFilePaths = await filterDirectoryFilesByExtension(cwd, `.r1cs`);
  // Look for WASM files.
  const wasmFilePaths = await filterDirectoryFilesByExtension(cwd, `.wasm`);
  // Look for pre-computed zKeys references (if any).
  const localPreComputedZkeysFilenames = await filterDirectoryFilesByExtension(
    cwd,
    `.zkey`
  );
  if (!r1csFilePaths.length)
    showError(COMMAND_ERRORS.COMMAND_SETUP_NO_R1CS, true);
  if (!wasmFilePaths.length)
    showError(COMMAND_ERRORS.COMMAND_SETUP_NO_WASM, true);
  if (wasmFilePaths.length !== r1csFilePaths.length)
    showError(COMMAND_ERRORS.COMMAND_SETUP_MISMATCH_R1CS_WASM, true);
  // Prompt the coordinator for gather ceremony input data.
  const ceremonyInputData = await promptCeremonyInputData(firestoreDatabase);
  const ceremonyPrefix = extractPrefix(ceremonyInputData.title);
  // Add circuits to ceremony.
  const circuitsInputData = await handleAdditionOfCircuitsToCeremony(
    r1csFilePaths.map((dirent) => dirent.name),
    wasmFilePaths.map((dirent) => dirent.name),
    ceremonyInputData.timeoutMechanismType
  );
  // Move input data to circuits.
  circuitsInputData.forEach((data) => circuits.push(data));
  // Display ceremony summary.
  displayCeremonySummary(ceremonyInputData, circuits);
  // Prepare data.
  let wannaGenerateNewZkey = true; // New zKey generation flag.
  let wannaUsePreDownloadedPoT = false; // Local PoT file usage flag.
  let bucketName = ''; // The name of the bucket.
  // Ask for confirmation.
  const { confirmation } = await askForConfirmation(
    'Do you want to continue with the ceremony setup?',
    'Yes',
    'No'
  );
  if (confirmation) {
    await simpleLoader(
      `Looking for any pre-computed zkey file...`,
      `clock`,
      1000
    );
    // Simulate pre-computed zkeys search.
    let leftPreComputedZkeys = localPreComputedZkeysFilenames;
    /** Circuit-based setup */
    for (let i = 0; i < circuits.length; i += 1) {
      const circuit = circuits[i];
      console.log(
        theme.text.bold(
          `\n- Setup for Circuit # ${theme.colors.magenta(
            `${circuit.sequencePosition}`
          )}\n`
        )
      );
      // Convert to double digits powers (e.g., 9 -> 09).
      let doubleDigitsPowers = convertToDoubleDigits(circuit.metadata?.pot);
      let smallestPowersOfTauCompleteFilenameForCircuit = `${potFilenameTemplate}${doubleDigitsPowers}.ptau`;
      // Rename R1Cs and zKey based on circuit name and prefix.
      const r1csCompleteFilename = `${circuit.name}.r1cs`;
      const wasmCompleteFilename = `${circuit.name}.wasm`;
      const firstZkeyCompleteFilename = `${circuit.prefix}_${genesisZkeyIndex}.zkey`;
      let preComputedZkeyCompleteFilename = ``;
      // Local paths.
      const r1csLocalPathAndFileName = getCWDFilePath(
        cwd,
        r1csCompleteFilename
      );
      const wasmLocalPathAndFileName = getCWDFilePath(
        cwd,
        wasmCompleteFilename
      );
      let potLocalPathAndFileName = getPotLocalFilePath(
        smallestPowersOfTauCompleteFilenameForCircuit
      );
      let zkeyLocalPathAndFileName = getZkeyLocalFilePath(
        firstZkeyCompleteFilename
      );
      // Storage paths.
      const r1csStorageFilePath = getR1csStorageFilePath(
        circuit.prefix,
        r1csCompleteFilename
      );
      const wasmStorageFilePath = getWasmStorageFilePath(
        circuit.prefix,
        wasmCompleteFilename
      );
      let potStorageFilePath = getPotStorageFilePath(
        smallestPowersOfTauCompleteFilenameForCircuit
      );
      const zkeyStorageFilePath = getZkeyStorageFilePath(
        circuit.prefix,
        firstZkeyCompleteFilename
      );
      if (leftPreComputedZkeys.length <= 0)
        console.log(
          `${theme.symbols.warning} No pre-computed zKey was found. Therefore, a new zKey from scratch will be generated.`
        );
      else {
        // Prompt if coordinator wanna use a pre-computed zKey for the circuit.
        const wannaUsePreComputedZkey = await promptPreComputedZkey();
        if (wannaUsePreComputedZkey) {
          // Prompt for pre-computed zKey selection.
          const preComputedZkeyOptions = leftPreComputedZkeys.map(
            (dirent) => dirent.name
          );
          preComputedZkeyCompleteFilename = await promptPreComputedZkeySelector(
            preComputedZkeyOptions
          );
          // Switch to pre-computed zkey path.
          zkeyLocalPathAndFileName = getCWDFilePath(
            cwd,
            preComputedZkeyCompleteFilename
          );
          // Handle the selection for the PoT file to associate w/ the selected pre-computed zKey.
          const {
            doubleDigitsPowers: selectedDoubleDigitsPowers,
            potCompleteFilename: selectedPotCompleteFilename,
            usePreDownloadedPoT,
          } = await handlePreComputedZkeyPowersOfTauSelection(
            circuit.metadata?.pot
          );
          // Update state.
          doubleDigitsPowers = selectedDoubleDigitsPowers;
          smallestPowersOfTauCompleteFilenameForCircuit =
            selectedPotCompleteFilename;
          wannaUsePreDownloadedPoT = usePreDownloadedPoT;
          // Update paths.
          potLocalPathAndFileName = getPotLocalFilePath(
            smallestPowersOfTauCompleteFilenameForCircuit
          );
          potStorageFilePath = getPotStorageFilePath(
            smallestPowersOfTauCompleteFilenameForCircuit
          );
          // Check (and download) the smallest Powers of Tau for circuit.
          if (!wannaUsePreDownloadedPoT)
            await checkAndDownloadSmallestPowersOfTau(
              doubleDigitsPowers,
              smallestPowersOfTauCompleteFilenameForCircuit
            );
          // Update flag for zKey generation accordingly.
          wannaGenerateNewZkey = false;
          // Update paths.
          renameSync(
            getCWDFilePath(cwd, preComputedZkeyCompleteFilename),
            firstZkeyCompleteFilename
          ); // the pre-computed zKey become the new first (genesis) zKey.
          zkeyLocalPathAndFileName = getCWDFilePath(
            cwd,
            firstZkeyCompleteFilename
          );
          // Remove the pre-computed zKey from the list of possible pre-computed options.
          leftPreComputedZkeys = leftPreComputedZkeys.filter(
            (dirent) => dirent.name !== preComputedZkeyCompleteFilename
          );
        }
      }
      // Check (and download) the smallest Powers of Tau for circuit.
      if (!wannaUsePreDownloadedPoT)
        await checkAndDownloadSmallestPowersOfTau(
          doubleDigitsPowers,
          smallestPowersOfTauCompleteFilenameForCircuit
        );
      if (wannaGenerateNewZkey)
        await handleNewZkeyGeneration(
          r1csLocalPathAndFileName,
          potLocalPathAndFileName,
          zkeyLocalPathAndFileName
        );
      // Create a bucket for ceremony if it has not yet been created.
      if (!bucketName)
        bucketName = await handleCeremonyBucketCreation(
          firebaseFunctions,
          ceremonyPrefix
        );
      // Upload zKey to Storage.
      await handleCircuitArtifactUploadToStorage(
        firebaseFunctions,
        bucketName,
        zkeyStorageFilePath,
        zkeyLocalPathAndFileName,
        firstZkeyCompleteFilename
      );
      // Check if PoT file has been already uploaded to storage.
      const alreadyUploadedPot = await checkIfObjectExist(
        firebaseFunctions,
        bucketName,
        getPotStorageFilePath(smallestPowersOfTauCompleteFilenameForCircuit)
      );
      if (!alreadyUploadedPot) {
        // Upload PoT to Storage.
        await handleCircuitArtifactUploadToStorage(
          firebaseFunctions,
          bucketName,
          potStorageFilePath,
          potLocalPathAndFileName,
          smallestPowersOfTauCompleteFilenameForCircuit
        );
      } else
        console.log(
          `${theme.symbols.success} The Powers of Tau (${theme.text.bold(
            smallestPowersOfTauCompleteFilenameForCircuit
          )}) file is already saved in the storage`
        );
      // Upload R1CS to Storage.
      await handleCircuitArtifactUploadToStorage(
        firebaseFunctions,
        bucketName,
        r1csStorageFilePath,
        r1csLocalPathAndFileName,
        r1csCompleteFilename
      );
      // Upload WASM to Storage.
      await handleCircuitArtifactUploadToStorage(
        firebaseFunctions,
        bucketName,
        wasmStorageFilePath,
        wasmLocalPathAndFileName,
        wasmCompleteFilename
      );
      process.stdout.write(`\n`);
      const spinner = customSpinner(
        `Preparing the ceremony data (this may take a while)...`,
        `clock`
      );
      spinner.start();
      // Computing file hash (this may take a while).
      const r1csBlake2bHash = await blake512FromPath(r1csLocalPathAndFileName);
      const wasmBlake2bHash = await blake512FromPath(wasmLocalPathAndFileName);
      const potBlake2bHash = await blake512FromPath(potLocalPathAndFileName);
      const initialZkeyBlake2bHash = await blake512FromPath(
        zkeyLocalPathAndFileName
      );
      spinner.stop();
      // Prepare circuit data for writing to the DB.
      const circuitFiles = {
        r1csFilename: r1csCompleteFilename,
        wasmFilename: wasmCompleteFilename,
        potFilename: smallestPowersOfTauCompleteFilenameForCircuit,
        initialZkeyFilename: firstZkeyCompleteFilename,
        r1csStoragePath: r1csStorageFilePath,
        wasmStoragePath: wasmStorageFilePath,
        potStoragePath: potStorageFilePath,
        initialZkeyStoragePath: zkeyStorageFilePath,
        r1csBlake2bHash,
        wasmBlake2bHash,
        potBlake2bHash,
        initialZkeyBlake2bHash,
      };
      // nb. these will be populated after the first contribution.
      const circuitTimings = {
        contributionComputation: 0,
        fullContribution: 0,
        verifyCloudFunction: 0,
      };
      circuits[i] = {
        ...circuit,
        files: circuitFiles,
        avgTimings: circuitTimings,
        zKeySizeInBytes: getFileStats(zkeyLocalPathAndFileName).size,
      };
      // Reset flags.
      wannaGenerateNewZkey = true;
      wannaUsePreDownloadedPoT = false;
    }
    const spinner = customSpinner(`Writing ceremony data...`, `clock`);
    spinner.start();
    try {
      // Call the Cloud Function for writing ceremony data on Firestore DB.
      ceremonyId = await setupCeremony(
        firebaseFunctions,
        ceremonyInputData,
        ceremonyPrefix,
        circuits
      );
    } catch (error) {
      const errorBody = JSON.parse(JSON.stringify(error));
      showError(
        `[${errorBody.code}] ${error.message} ${
          !errorBody.details ? '' : `\n${errorBody.details}`
        }`,
        true
      );
    }
    await sleep(5000); // Cloud function unexpected termination workaround.
    spinner.succeed(
      `Congratulations, the setup of ceremony ${theme.text.bold(
        ceremonyInputData.title
      )} (${`UID: ${theme.text.bold(
        ceremonyId
      )}`}) has been successfully completed ${
        theme.emojis.tada
      }. You will be able to find all the files and info respectively in the ceremony bucket and database document.`
    );
  }
  terminate(providerUserId);
};

const packagePath$1 = `${dirname(fileURLToPath(import.meta.url))}`;
dotenv.config({
  path: packagePath$1.includes(`src/lib`)
    ? `${dirname(fileURLToPath(import.meta.url))}/../../.env`
    : `${dirname(fileURLToPath(import.meta.url))}/.env`,
});
/**
 * Custom countdown which throws an error when expires.
 * @param expirationInSeconds <number> - the expiration time in seconds.
 */
const expirationCountdownForGithubOAuth = (expirationInSeconds) => {
  // Prepare data.
  let secondsCounter = expirationInSeconds <= 60 ? expirationInSeconds : 60;
  const interval = 1; // 1s.
  setInterval(() => {
    if (expirationInSeconds !== 0) {
      // Update time and seconds counter.
      expirationInSeconds -= interval;
      secondsCounter -= interval;
      if (secondsCounter % 60 === 0) secondsCounter = 0;
      // Notify user.
      process.stdout.write(
        `${theme.symbols.warning} Expires in ${theme.text.bold(
          theme.colors.magenta(
            `00:${Math.floor(expirationInSeconds / 60)}:${secondsCounter}`
          )
        )}\r`
      );
    } else {
      process.stdout.write(`\n\n`); // workaround to \r.
      showError(GENERIC_ERRORS.GENERIC_COUNTDOWN_EXPIRATION, true);
    }
  }, interval * 1000); // ms.
};
/**
 * Callback to manage the data requested for Github OAuth2.0 device flow.
 * @param verification <Verification> - the data from Github OAuth2.0 device flow.
 */
const onVerification = async (verification) => {
  // Copy code to clipboard.
  clipboard.writeSync(verification.user_code);
  clipboard.readSync();
  // Display data.
  console.log(
    `${theme.symbols.warning} Visit ${theme.text.bold(
      theme.text.underlined(verification.verification_uri)
    )} on this device to generate a new token and authenticate\n`
  );
  console.log(
    theme.colors.magenta(
      figlet.textSync('Code is Below', { font: 'ANSI Shadow' })
    ),
    '\n'
  );
  console.log(
    `${theme.symbols.info} Your auth code: ${theme.text.bold(
      verification.user_code
    )} has been copied to your clipboard (${theme.emojis.clipboard} ${
      theme.symbols.success
    })\n`
  );
  const spinner = customSpinner(`Redirecting to Github...`, `clock`);
  spinner.start();
  await sleep(10000); // ~10s to make users able to read the CLI.
  // Automatically open the page (# Step 2).
  await open(verification.verification_uri);
  spinner.stop();
  // Countdown for time expiration.
  expirationCountdownForGithubOAuth(verification.expires_in);
};
/**
 * Return the Github OAuth 2.0 token using manual Device Flow authentication process.
 * @param clientId <string> - the client id for the CLI OAuth app.
 * @returns <string> the Github OAuth 2.0 token.
 */
const executeGithubDeviceFlow = async (clientId) => {
  /**
   * Github OAuth 2.0 Device Flow.
   * # Step 1: Request device and user verification codes and gets auth verification uri.
   * # Step 2: The app prompts the user to enter a user verification code at https://github.com/login/device.
   * # Step 3: The app polls/asks for the user authentication status.
   */
  const clientType = 'oauth-app';
  const tokenType = 'oauth';
  // # Step 1.
  const auth = createOAuthDeviceAuth({
    clientType,
    clientId,
    scopes: ['gist'],
    onVerification,
  });
  // # Step 3.
  const { token } = await auth({
    type: tokenType,
  });
  return token;
};
/**
 * Auth command.
 * @notice The auth command allows a user to make the association of their Github account with the CLI by leveraging OAuth 2.0 as an authentication mechanism.
 * @dev Under the hood, the command handles a manual Device Flow following the guidelines in the Github documentation.
 */
const auth = async () => {
  const { firebaseApp } = await bootstrapCommandExecutionAndServices();
  // Console more context for the user.
  console.log(
    `${theme.symbols.info} ${theme.text.bold(
      `You are about to authenticate on this CLI using your Github account (device flow - OAuth 2.0 mechanism).\n${
        theme.symbols.warning
      } Please, note that only read and write permission for ${theme.text.italic(
        `gists`
      )} will be required in order to publish your contribution transcript!`
    )}\n`
  );
  const spinner = customSpinner(`Checking authentication token...`, `clock`);
  spinner.start();
  await sleep(5000);
  // Manage OAuth Github token.
  // const isLocalTokenStored = checkLocalAccessToken();
  // if (!isLocalTokenStored) {
  spinner.fail(`No local authentication token found\n`);
  // Generate a new access token using Github Device Flow (OAuth 2.0).
  const newToken = await executeGithubDeviceFlow(
    String(process.env.AUTH_GITHUB_CLIENT_ID)
  );
  // Store the new access token.
  console.log(newToken);
  setLocalAccessToken(newToken);
  // }
  // else
  //     spinner.succeed(`Local authentication token found\n`);
  // Get access token from local store.
  const token = getLocalAccessToken();
  // Exchange token for credential.
  const credentials = exchangeGithubTokenForCredentials(String(token));
  spinner.text = `Authenticating...`;
  spinner.start();
  // Sign-in to Firebase using credentials.
  await signInToFirebase(firebaseApp, credentials);
  // Get Github handle.
  const providerUserId = await getGithubProviderUserId(String(token));
  spinner.succeed(
    `You are authenticated as ${theme.text.bold(
      `@${getUserHandleFromProviderUserId(providerUserId)}`
    )} and now able to interact with zk-SNARK Phase2 Trusted Setup ceremonies`
  );
  spinner.succeed(`providerUserId: ${theme.text.bold(`@${providerUserId}`)}`);
  // Console more context for the user.
  console.log(
    `\n${
      theme.symbols.warning
    } You can always log out by running the ${theme.text.bold(
      `phase2cli logout`
    )} command`
  );

  terminate(providerUserId);

  spinner.succeed(
    `See you providerUserId: ${theme.text.bold(`@${providerUserId}`)}`
  );
};

/**
 * Return the verification result for latest contribution.
 * @param firestoreDatabase <Firestore> - the Firestore service instance associated to the current Firebase application.
 * @param ceremonyId <string> - the unique identifier of the ceremony.
 * @param circuitId <string> - the unique identifier of the circuit.
 * @param participantId <string> - the unique identifier of the contributor.
 */
const getLatestVerificationResult = async (
  firestoreDatabase,
  ceremonyId,
  circuitId,
  participantId
) => {
  // Clean cursor.
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  const spinner = customSpinner(
    `Getting info about the verification of your contribution...`,
    `clock`
  );
  spinner.start();
  // Get circuit contribution from contributor.
  const circuitContributionsFromContributor =
    await getCircuitContributionsFromContributor(
      firestoreDatabase,
      ceremonyId,
      circuitId,
      participantId
    );
  const contribution = circuitContributionsFromContributor.at(0);
  spinner.stop();
  console.log(
    `${
      contribution?.data.valid ? theme.symbols.success : theme.symbols.error
    } Your contribution is ${contribution?.data.valid ? `correct` : `wrong`}`
  );
};
/**
 * Generate a ready-to-share tweet on public attestation.
 * @param ceremonyTitle <string> - the title of the ceremony.
 * @param gistUrl <string> - the Github public attestation gist url.
 */
const handleTweetGeneration = async (hashes) => {
  // Generate a ready to share custom url to tweet about ceremony participation.
  const tweetUrl = generateCustomUrlToTweetAboutParticipation(hashes);
  console.log(
    `${
      theme.symbols.info
    } 🌙 Tweet about your contribution: \n\n${theme.text.underlined(tweetUrl)}`
  );
  // Automatically open a webpage with the tweet.
  await open(tweetUrl);
};
/**
 * Display if a set of contributions computed for a circuit is valid/invalid.
 * @param contributionsWithValidity <Array<ContributionValidity>> - list of contributor contributions together with contribution validity.
 */
const displayContributionValidity = (contributionsWithValidity) => {
  // Circuit index position.
  let circuitSequencePosition = 1; // nb. incremental value is enough because the contributions are already sorted x circuit sequence position.
  for (const contributionWithValidity of contributionsWithValidity) {
    // Display.
    console.log(
      `${
        contributionWithValidity.valid
          ? theme.symbols.success
          : theme.symbols.error
      } ${theme.text.bold(`Circuit`)} ${theme.text.bold(
        theme.colors.magenta(circuitSequencePosition)
      )}`
    );
    // Increment circuit position.
    circuitSequencePosition += 1;
  }
};
/**
 * Display and manage data necessary when participant has already made the contribution for all circuits of a ceremony.
 * @param firestoreDatabase <Firestore> - the Firestore service instance associated to the current Firebase application.
 * @param circuits <Array<FirebaseDocumentInfo>> - the array of ceremony circuits documents.
 * @param ceremonyId <string> - the unique identifier of the ceremony.
 * @param participantId <string> - the unique identifier of the contributor.
 */
const handleContributionValidity = async (
  firestoreDatabase,
  circuits,
  ceremonyId,
  participantId
) => {
  // Get contributors' contributions validity.
  const contributionsWithValidity =
    await getContributionsValidityForContributor(
      firestoreDatabase,
      circuits,
      ceremonyId,
      participantId,
      false
    );
  // Filter only valid contributions.
  const validContributions = contributionsWithValidity.filter(
    (contributionWithValidity) => contributionWithValidity.valid
  );
  if (!validContributions.length)
    console.log(
      `\n${theme.symbols.error} You have provided ${theme.text.bold(
        theme.colors.magenta(circuits.length)
      )} out of ${theme.text.bold(
        theme.colors.magenta(circuits.length)
      )} invalid contributions ${theme.emojis.upsideDown}`
    );
  else {
    console.log(
      `\nYou have provided ${theme.colors.magenta(
        theme.text.bold(validContributions.length)
      )} out of ${theme.colors.magenta(
        theme.text.bold(circuits.length)
      )} valid contributions ${theme.emojis.tada}`
    );
    // Display (in)valid contributions per circuit.
    displayContributionValidity(contributionsWithValidity);
  }
};
/**
 * Display and manage data necessary when participant would like to contribute but there is still an on-going timeout.
 * @param firestoreDatabase <Firestore> - the Firestore service instance associated to the current Firebase application.
 * @param ceremonyId <string> - the unique identifier of the ceremony.
 * @param participantId <string> - the unique identifier of the contributor.
 * @param participantContributionProgress <number> - the progress in the contribution of the various circuits of the ceremony.
 * @param wasContributing <boolean> - flag to discriminate between participant currently contributing (true) or not (false).
 */
const handleTimedoutMessageForContributor = async (
  firestoreDatabase,
  participantId,
  ceremonyId,
  participantContributionProgress,
  wasContributing
) => {
  // Check if the participant was contributing when timeout happened.
  if (!wasContributing)
    console.log(
      theme.text.bold(
        `\n- Circuit # ${theme.colors.magenta(participantContributionProgress)}`
      )
    );
  // Display timeout message.
  console.log(
    `\n${theme.symbols.error} ${
      wasContributing
        ? `Your contribution took longer than the estimated time and you were removed as current contributor. You should wait for a timeout to expire before you can rejoin for contribution.`
        : `The waiting time (timeout) to retry the contribution has not yet expired.`
    }\n\n${
      theme.symbols.warning
    } Note that the timeout could be triggered due to network latency, disk availability issues, un/intentional crashes, limited hardware capabilities.`
  );
  // nb. workaround to attend timeout to be written on the database.
  /// @todo use listeners instead (when possible).
  await simpleLoader(`Getting timeout expiration...`, `clock`, 5000);
  // Retrieve latest updated active timeouts for contributor.
  const activeTimeouts = await getCurrentActiveParticipantTimeout(
    firestoreDatabase,
    ceremonyId,
    participantId
  );
  if (activeTimeouts.length !== 1)
    showError(
      COMMAND_ERRORS.COMMAND_CONTRIBUTE_NO_UNIQUE_ACTIVE_TIMEOUTS,
      true
    );
  // Get active timeout.
  const activeTimeout = activeTimeouts.at(0);
  if (!activeTimeout.data)
    showError(COMMAND_ERRORS.COMMAND_CONTRIBUTE_NO_ACTIVE_TIMEOUT_DATA, true);
  // Extract data.
  const { endDate } = activeTimeout.data;
  const { seconds, minutes, hours, days } = getSecondsMinutesHoursFromMillis(
    Number(endDate) - Timestamp.now().toMillis()
  );
  console.log(
    `${theme.symbols.info} Your timeout will end in ${theme.text.bold(
      `${convertToDoubleDigits(days)}:${convertToDoubleDigits(
        hours
      )}:${convertToDoubleDigits(minutes)}:${convertToDoubleDigits(seconds)}`
    )} (dd/hh/mm/ss)`
  );
};
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
const handleDiskSpaceRequirementForNextContribution = async (
  cloudFunctions,
  ceremonyId,
  circuitSequencePosition,
  circuitZkeySizeInBytes,
  isResumingAfterTimeout,
  providerUserId
) => {
  let wannaContributeOrHaveEnoughMemory = false; // true when the contributor has enough memory or wants to contribute in any case; otherwise false.
  // Custom spinner.
  const spinner = customSpinner(
    `Checking disk space requirement for next contribution...`,
    `clock`
  );
  spinner.start();
  // Compute disk space requirement to support circuit contribution (zKey size * 2).
  const contributionDiskSpaceRequirement = convertBytesOrKbToGb(
    circuitZkeySizeInBytes * 2,
    true
  );
  // Get participant available disk space.
  const participantFreeDiskSpace = convertBytesOrKbToGb(
    estimateParticipantFreeGlobalDiskSpace(),
    false
  );
  // Check.
  if (participantFreeDiskSpace < contributionDiskSpaceRequirement) {
    spinner.fail(
      `You may not have enough memory to calculate the contribution for the Circuit ${theme.colors.magenta(
        `${circuitSequencePosition}`
      )}.\n\n${theme.symbols.info} The required amount of disk space is ${
        contributionDiskSpaceRequirement < 0.01
          ? theme.text.bold(`< 0.01`)
          : theme.text.bold(contributionDiskSpaceRequirement)
      } GB but you only have ${
        participantFreeDiskSpace > 0
          ? theme.text.bold(participantFreeDiskSpace.toFixed(2))
          : theme.text.bold(0)
      } GB available memory \nThe estimate ${theme.text.bold(
        'may not be 100% correct'
      )} since is based on the aggregate free memory on your disks but some may not be detected!\n`
    );
    const { confirmation } = await askForConfirmation(
      `Please, we kindly ask you to continue with the contribution if you have noticed the estimate is wrong and you have enough memory in your machine`,
      'Continue',
      'Exit'
    );
    wannaContributeOrHaveEnoughMemory = !!confirmation;
    if (circuitSequencePosition > 1) {
      console.log(
        `${theme.symbols.info} Please note, you have time until ceremony ends to free up your memory and complete remaining contributions`
      );
      // Asks the contributor if their wants to terminate contributions for the ceremony.
      const { confirmation } = await askForConfirmation(
        `Please note, this action is irreversible! Do you want to end your contributions for the ceremony?`
      );
      return !!confirmation;
    }
  } else wannaContributeOrHaveEnoughMemory = true;
  if (wannaContributeOrHaveEnoughMemory) {
    spinner.succeed(
      `Memory requirement to contribute to ${theme.text.bold(
        `Circuit ${theme.colors.magenta(`${circuitSequencePosition}`)}`
      )} satisfied`
    );
    // Memory requirement for next contribution met.
    if (!isResumingAfterTimeout) {
      spinner.text = 'Progressing to next circuit for contribution...';
      spinner.start();
      // Progress the participant to the next circuit making it ready for contribution.
      await progressToNextCircuitForContribution(cloudFunctions, ceremonyId);
    } else {
      spinner.text = 'Resuming your contribution after timeout expiration...';
      spinner.start();
      // Resume contribution after timeout expiration (same circuit).
      await resumeContributionAfterTimeoutExpiration(
        cloudFunctions,
        ceremonyId
      );
    }
    spinner.info(
      `Joining the ${theme.text.bold(
        `Circuit ${theme.colors.magenta(`${circuitSequencePosition}`)}`
      )} waiting queue for contribution (this may take a while)`
    );
    return false;
  }
  terminate(providerUserId);
  return false;
};
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
const generatePublicAttestation = async (
  firestoreDatabase,
  circuits,
  ceremonyId,
  participantId,
  participantContributions,
  contributorIdentifier,
  ceremonyName
) => {
  // Display contribution validity.
  await handleContributionValidity(
    firestoreDatabase,
    circuits,
    ceremonyId,
    participantId
  );
  await sleep(3000);
  // Get only valid contribution hashes.
  return generateValidContributionsAttestation(
    firestoreDatabase,
    circuits,
    ceremonyId,
    participantId,
    participantContributions,
    contributorIdentifier,
    ceremonyName,
    false
  );
};
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
const handlePublicAttestation = async (
  firestoreDatabase,
  circuits,
  ceremonyId,
  participantId,
  participantContributions,
  contributorIdentifier,
  ceremonyName,
  ceremonyPrefix,
  participantAccessToken
) => {
  await simpleLoader(`Generating your public attestation...`, `clock`, 3000);
  // Generate attestation with valid contributions.
  const [publicAttestation, hashes] = await generatePublicAttestation(
    firestoreDatabase,
    circuits,
    ceremonyId,
    participantId,
    participantContributions,
    contributorIdentifier,
    ceremonyName
  );
  // Write public attestation locally.
  writeFile(
    getAttestationLocalFilePath(
      `${ceremonyPrefix}_${commonTerms.foldersAndPathsTerms.attestation}.log`
    ),
    Buffer.from(publicAttestation)
  );
  await sleep(1000); // workaround for file descriptor unexpected close.
  const gistUrl = await publishGist(
    participantAccessToken,
    publicAttestation,
    ceremonyName,
    ceremonyPrefix
  );
  console.log(
    `\n${
      theme.symbols.info
    } Your public attestation has been successfully posted as Github Gist (${theme.text.bold(
      theme.text.underlined(gistUrl)
    )})`
  );
  // Prepare a ready-to-share tweet.
  await handleTweetGeneration(hashes);
};
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
const listenToCeremonyCircuitDocumentChanges = (
  firestoreDatabase,
  ceremonyId,
  participantId,
  circuit
) => {
  console.log(
    `${theme.text.bold(
      `\n- Circuit # ${theme.colors.magenta(
        `${circuit.data.sequencePosition}`
      )}`
    )} (Waiting Queue)`
  );
  let cachedLatestPosition = 0;
  const unsubscribeToCeremonyCircuitListener = onSnapshot(
    circuit.ref,
    async (changedCircuit) => {
      // Check data.
      if (!circuit.data || !changedCircuit.data())
        showError(COMMAND_ERRORS.COMMAND_CONTRIBUTE_NO_CIRCUIT_DATA, true);
      // Extract data.
      const { avgTimings, waitingQueue } = changedCircuit.data();
      const { fullContribution, verifyCloudFunction } = avgTimings;
      const { currentContributor } = waitingQueue;
      const circuitCurrentContributor = await getDocumentById(
        firestoreDatabase,
        getParticipantsCollectionPath(ceremonyId),
        currentContributor
      );
      // Check data.
      if (!circuitCurrentContributor.data())
        showError(
          COMMAND_ERRORS.COMMAND_CONTRIBUTE_NO_CURRENT_CONTRIBUTOR_DATA,
          true
        );
      // Get participant position in the waiting queue of the circuit.
      const latestParticipantPositionInQueue =
        waitingQueue.contributors.indexOf(participantId) + 1;
      // Compute time estimation based on latest participant position in the waiting queue.
      const newEstimatedWaitingTime =
        fullContribution <= 0 && verifyCloudFunction <= 0
          ? 0
          : (fullContribution + verifyCloudFunction) *
            (latestParticipantPositionInQueue - 1);
      // Extract time.
      const { seconds, minutes, hours, days } =
        getSecondsMinutesHoursFromMillis(newEstimatedWaitingTime);
      // Check if the participant is now the new current contributor for the circuit.
      if (latestParticipantPositionInQueue === 1) {
        console.log(
          `\n${theme.symbols.info} Your contribution will begin shortly ${theme.emojis.tada}`
        );
        // Unsubscribe from updates.
        unsubscribeToCeremonyCircuitListener();
        // eslint-disable no-unused-vars
      } else if (latestParticipantPositionInQueue !== cachedLatestPosition) {
        // Display updated position and waiting time.
        console.log(
          `${theme.symbols.info} ${`You will have to wait for ${theme.text.bold(
            theme.colors.magenta(latestParticipantPositionInQueue - 1)
          )} contributors`} (~${
            newEstimatedWaitingTime > 0
              ? `${theme.text.bold(
                  `${convertToDoubleDigits(days)}:${convertToDoubleDigits(
                    hours
                  )}:${convertToDoubleDigits(minutes)}:${convertToDoubleDigits(
                    seconds
                  )}`
                )}`
              : `no time`
          } (dd/hh/mm/ss))`
        );
        cachedLatestPosition = latestParticipantPositionInQueue;
      }
    }
  );
};
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
const listenToParticipantDocumentChanges = async (
  firestoreDatabase,
  cloudFunctions,
  participant,
  ceremony,
  entropy,
  providerUserId,
  accessToken
) => {
  // Listen to participant document changes.
  // nb. this listener encapsulates the core business logic of the contribute command.
  // the `changedParticipant` is the updated version (w/ newest changes) of the participant's document.
  const unsubscribe = onSnapshot(
    participant.ref,
    async (changedParticipant) => {
      // Check data.
      if (!participant.data() || !changedParticipant.data())
        showError(COMMAND_ERRORS.COMMAND_CONTRIBUTE_NO_PARTICIPANT_DATA, true);
      // Extract data.
      const {
        contributionProgress: prevContributionProgress,
        status: prevStatus,
        contributions: prevContributions,
        contributionStep: prevContributionStep,
        tempContributionData: prevTempContributionData,
      } = participant.data();
      const {
        contributionProgress: changedContributionProgress,
        status: changedStatus,
        contributionStep: changedContributionStep,
        contributions: changedContributions,
        tempContributionData: changedTempContributionData,
        verificationStartedAt: changedVerificationStartedAt,
      } = changedParticipant.data();
      // Get latest updates from ceremony circuits.
      const circuits = await getCeremonyCircuits(
        firestoreDatabase,
        ceremony.id
      );
      // Step (1).
      // Handle disk space requirement check for first contribution.
      if (
        changedStatus === 'WAITING' /* ParticipantStatus.WAITING */ &&
        !changedContributionStep &&
        !changedContributions.length &&
        !changedContributionProgress
      ) {
        // Get circuit by sequence position among ceremony circuits.
        const circuit = getCircuitBySequencePosition(
          circuits,
          changedContributionProgress + 1
        );
        // Extract data.
        const { sequencePosition, zKeySizeInBytes } = circuit.data;
        // Check participant disk space availability for next contribution.
        await handleDiskSpaceRequirementForNextContribution(
          cloudFunctions,
          ceremony.id,
          sequencePosition,
          zKeySizeInBytes,
          false,
          providerUserId
        );
      }
      // Step (2).
      if (
        changedContributionProgress > 0 &&
        changedContributionProgress <= circuits.length
      ) {
        // Step (3).
        // Get circuit for which the participant wants to contribute.
        const circuit = circuits[changedContributionProgress - 1];
        // Check data.
        if (!circuit.data)
          showError(COMMAND_ERRORS.COMMAND_CONTRIBUTE_NO_CIRCUIT_DATA, true);
        // Extract circuit data.
        const { waitingQueue } = circuit.data;
        // Define pre-conditions for different scenarios.
        const isWaitingForContribution =
          changedStatus === 'WAITING'; /* ParticipantStatus.WAITING */
        const isCurrentContributor =
          changedStatus ===
            'CONTRIBUTING' /* ParticipantStatus.CONTRIBUTING */ &&
          waitingQueue.currentContributor === participant.id;
        const isResumingContribution =
          changedContributionStep === prevContributionStep &&
          changedContributionProgress === prevContributionProgress;
        const noStatusChanges = changedStatus === prevStatus;
        const progressToNextContribution =
          changedContributionStep ===
          'COMPLETED'; /* ParticipantContributionStep.COMPLETED */
        const completedContribution =
          progressToNextContribution &&
          changedStatus === 'CONTRIBUTED'; /* ParticipantStatus.CONTRIBUTED */
        const timeoutTriggeredWhileContributing =
          changedStatus === 'TIMEDOUT' /* ParticipantStatus.TIMEDOUT */ &&
          changedContributionStep !==
            'COMPLETED'; /* ParticipantContributionStep.COMPLETED */
        const timeoutExpired =
          changedStatus === 'EXHUMED'; /* ParticipantStatus.EXHUMED */
        const alreadyContributedToEveryCeremonyCircuit =
          changedStatus === 'DONE' /* ParticipantStatus.DONE */ &&
          changedContributionStep ===
            'COMPLETED' /* ParticipantContributionStep.COMPLETED */ &&
          changedContributionProgress === circuits.length &&
          changedContributions.length === circuits.length;
        const noTemporaryContributionData =
          !prevTempContributionData && !changedTempContributionData;
        const samePermanentContributionData =
          (!prevContributions && !changedContributions) ||
          prevContributions.length === changedContributions.length;
        const downloadingStep =
          changedContributionStep ===
          'DOWNLOADING'; /* ParticipantContributionStep.DOWNLOADING */
        const computingStep =
          changedContributionStep ===
          'COMPUTING'; /* ParticipantContributionStep.COMPUTING */
        const uploadingStep =
          changedContributionStep ===
          'UPLOADING'; /* ParticipantContributionStep.UPLOADING */
        const hasResumableStep =
          downloadingStep || computingStep || uploadingStep;
        const resumingContribution =
          prevContributionStep === changedContributionStep &&
          prevStatus === changedStatus &&
          prevContributionProgress === changedContributionProgress;
        const resumingContributionButAdvancedToAnotherStep =
          prevContributionStep !== changedContributionStep;
        const resumingAfterTimeoutExpiration =
          prevStatus === 'EXHUMED'; /* ParticipantStatus.EXHUMED */
        const neverResumedContribution = !prevContributionStep;
        const resumingWithSameTemporaryData =
          !!prevTempContributionData &&
          !!changedTempContributionData &&
          JSON.stringify(Object.keys(prevTempContributionData).sort()) ===
            JSON.stringify(Object.keys(changedTempContributionData).sort()) &&
          JSON.stringify(Object.values(prevTempContributionData).sort()) ===
            JSON.stringify(Object.values(changedTempContributionData).sort());
        const startingOrResumingContribution =
          // Pre-condition W => contribute / resume when contribution step = DOWNLOADING.
          (isCurrentContributor &&
            downloadingStep &&
            (resumingContribution ||
              resumingContributionButAdvancedToAnotherStep ||
              resumingAfterTimeoutExpiration ||
              neverResumedContribution)) ||
          // Pre-condition X => contribute / resume when contribution step = COMPUTING.
          (computingStep &&
            resumingContribution &&
            samePermanentContributionData) ||
          // Pre-condition Y => contribute / resume when contribution step = UPLOADING without any pre-uploaded chunk.
          (uploadingStep &&
            resumingContribution &&
            noTemporaryContributionData) ||
          // Pre-condition Z => contribute / resume when contribution step = UPLOADING w/ some pre-uploaded chunk.
          (!noTemporaryContributionData && resumingWithSameTemporaryData);
        // Scenario (3.B).
        if (
          isCurrentContributor &&
          hasResumableStep &&
          startingOrResumingContribution
        ) {
          // Communicate resume / start of the contribution to participant.
          await simpleLoader(
            `${
              changedContributionStep ===
              'DOWNLOADING' /* ParticipantContributionStep.DOWNLOADING */
                ? `Starting`
                : `Resuming`
            } your contribution...`,
            `clock`,
            3000
          );
          // Start / Resume the contribution for the participant.
          await handleStartOrResumeContribution(
            cloudFunctions,
            firestoreDatabase,
            ceremony,
            circuit,
            participant,
            entropy,
            providerUserId,
            false, // not finalizing.
            circuits.length
          );
        }
        // Scenario (3.A).
        else if (isWaitingForContribution)
          listenToCeremonyCircuitDocumentChanges(
            firestoreDatabase,
            ceremony.id,
            participant.id,
            circuit
          );
        // Scenario (3.C).
        // Pre-condition: current contributor + resuming from verification step.
        if (
          isCurrentContributor &&
          isResumingContribution &&
          changedContributionStep ===
            'VERIFYING' /* ParticipantContributionStep.VERIFYING */
        ) {
          const spinner = customSpinner(
            `Getting info about your current contribution...`,
            `clock`
          );
          spinner.start();
          // Get current and next index.
          const currentZkeyIndex = formatZkeyIndex(changedContributionProgress);
          const nextZkeyIndex = formatZkeyIndex(
            changedContributionProgress + 1
          );
          // Get average verification time (Cloud Function).
          const avgVerifyCloudFunctionTime =
            circuit.data.avgTimings.verifyCloudFunction;
          // Compute estimated time left for this contribution verification.
          const estimatedTimeLeftForVerification =
            Date.now() -
            changedVerificationStartedAt -
            avgVerifyCloudFunctionTime;
          // Format time.
          const { seconds, minutes, hours } = getSecondsMinutesHoursFromMillis(
            estimatedTimeLeftForVerification
          );
          spinner.stop();
          console.log(
            `${theme.text.bold(
              `\n- Circuit # ${theme.colors.magenta(
                `${circuit.data.sequencePosition}`
              )}`
            )} (Contribution Steps)`
          );
          console.log(
            `${theme.symbols.success} Contribution ${theme.text.bold(
              `#${currentZkeyIndex}`
            )} downloaded`
          );
          console.log(
            `${theme.symbols.success} Contribution ${theme.text.bold(
              `#${nextZkeyIndex}`
            )} computed`
          );
          console.log(
            `${theme.symbols.success} Contribution ${theme.text.bold(
              `#${nextZkeyIndex}`
            )} saved on storage`
          );
          /// @todo resuming a contribution verification could potentially lead to no verification at all #18.
          console.log(
            `${
              theme.symbols.info
            } Contribution verification in progress (~ ${theme.text.bold(
              `${convertToDoubleDigits(hours)}:${convertToDoubleDigits(
                minutes
              )}:${convertToDoubleDigits(seconds)}`
            )})`
          );
        }
        // Scenario (3.D).
        // Pre-condition: contribution has been verified and,
        // contributor status: DONE if completed all contributions or CONTRIBUTED if just completed the last one (not all).
        if (
          progressToNextContribution &&
          noStatusChanges &&
          (changedStatus === 'DONE' /* ParticipantStatus.DONE */ ||
            changedStatus === 'CONTRIBUTED') /* ParticipantStatus.CONTRIBUTED */
        )
          // Get latest contribution verification result.
          await getLatestVerificationResult(
            firestoreDatabase,
            ceremony.id,
            circuit.id,
            participant.id
          );
        // Scenario (3.E).
        if (timeoutTriggeredWhileContributing) {
          await handleTimedoutMessageForContributor(
            firestoreDatabase,
            participant.id,
            ceremony.id,
            changedContributionProgress,
            true
          );
          terminate(providerUserId);
        }
        // Scenario (3.F).
        if (completedContribution || timeoutExpired) {
          // Show data about latest contribution verification
          if (completedContribution)
            // Get latest contribution verification result.
            await getLatestVerificationResult(
              firestoreDatabase,
              ceremony.id,
              circuit.id,
              participant.id
            );
          // Get next circuit for contribution.
          const nextCircuit = timeoutExpired
            ? getCircuitBySequencePosition(
                circuits,
                changedContributionProgress
              )
            : getCircuitBySequencePosition(
                circuits,
                changedContributionProgress + 1
              );
          // Check disk space requirements for participant.
          const wannaGenerateAttestation =
            await handleDiskSpaceRequirementForNextContribution(
              cloudFunctions,
              ceremony.id,
              nextCircuit.data.sequencePosition,
              nextCircuit.data.zKeySizeInBytes,
              timeoutExpired,
              providerUserId
            );
          // Check if the participant would like to generate a new attestation.
          if (wannaGenerateAttestation) {
            // Handle public attestation generation and operations.
            await handlePublicAttestation(
              firestoreDatabase,
              circuits,
              ceremony.id,
              participant.id,
              changedContributions,
              providerUserId,
              ceremony.data.title,
              ceremony.data.prefix,
              accessToken
            );
            console.log(
              `\nThank you for participating and securing the ${ceremony.data.title} ceremony ${theme.emojis.pray}`
            );
            // Unsubscribe from listener.
            unsubscribe();
            // Gracefully exit.
            terminate(providerUserId);
          }
        }
        // Scenario (3.G).
        if (alreadyContributedToEveryCeremonyCircuit) {
          // Get latest contribution verification result.
          await getLatestVerificationResult(
            firestoreDatabase,
            ceremony.id,
            circuit.id,
            participant.id
          );
          // Handle public attestation generation and operations.
          await handlePublicAttestation(
            firestoreDatabase,
            circuits,
            ceremony.id,
            participant.id,
            changedContributions,
            providerUserId,
            ceremony.data.title,
            ceremony.data.prefix,
            accessToken
          );
          console.log(
            `\nThank you for participating and securing the ${ceremony.data.title} ceremony ${theme.emojis.pray}`
          );
          // Unsubscribe from listener.
          unsubscribe();
          // Gracefully exit.
          terminate(providerUserId);
        }
      }
    }
  );
};
/**
 * Contribute command.
 * @notice The contribute command allows an authenticated user to become a participant (contributor) to the selected ceremony by providing the
 * entropy (toxic waste) for the contribution.
 * @dev For proper execution, the command requires the user to be authenticated with Github account (run auth command first) in order to
 * handle sybil-resistance and connect to Github APIs to publish the gist containing the public attestation.
 */
const contribute = async (opt) => {
  const { firebaseApp, firebaseFunctions, firestoreDatabase } =
    await bootstrapCommandExecutionAndServices();
  // Get options.
  const ceremonyOpt = opt.ceremony;
  const entropyOpt = opt.entropy;
  const auth = opt.auth;
  // Check for authentication.
  const { user, providerUserId, token } = auth
    ? await authWithToken(firebaseApp, auth)
    : await checkAuth(firebaseApp);
  // Prepare data.
  let selectedCeremony;
  // Retrieve the opened ceremonies.
  const ceremoniesOpenedForContributions = await getOpenedCeremonies(
    firestoreDatabase
  );
  // Gracefully exit if no ceremonies are opened for contribution.
  if (!ceremoniesOpenedForContributions.length)
    showError(COMMAND_ERRORS.COMMAND_CONTRIBUTE_NO_OPENED_CEREMONIES, true);
  console.log(
    `${theme.symbols.warning} ${theme.text.bold(
      `The contribution process is based on a parallel waiting queue mechanism allowing one contributor at a time per circuit with a maximum time upper-bound. Each contribution may require the bulk of your computing resources and memory based on the size of the circuit (ETAs could vary!). If you stop your contribution at any step, you have to restart the step from scratch (except for uploading).`
    )}\n`
  );
  if (ceremonyOpt) {
    // Check if the input ceremony title match with an opened ceremony.
    const selectedCeremonyDocument = ceremoniesOpenedForContributions.filter(
      (openedCeremony) => openedCeremony.data.prefix === ceremonyOpt
    );
    if (selectedCeremonyDocument.length !== 1) {
      // Notify user about error.
      console.log(
        `${theme.symbols.error} ${COMMAND_ERRORS.COMMAND_CONTRIBUTE_WRONG_OPTION_CEREMONY}`
      );
      // Show potential ceremonies
      console.log(
        `${theme.symbols.info} Currently, you can contribute to the following ceremonies: `
      );
      for (const openedCeremony of ceremoniesOpenedForContributions)
        console.log(`- ${theme.text.bold(openedCeremony.data.prefix)}\n`);
      terminate(providerUserId);
    } else selectedCeremony = selectedCeremonyDocument.at(0);
  } else {
    // Prompt the user to select a ceremony from the opened ones.
    selectedCeremony = await promptForCeremonySelection(
      ceremoniesOpenedForContributions,
      false
    );
  }
  // Get selected ceremony circuit(s) documents.
  const circuits = await getCeremonyCircuits(
    firestoreDatabase,
    selectedCeremony.id
  );
  const spinner = customSpinner(
    `Verifying your participant status...`,
    `clock`
  );
  spinner.start();
  // Check that the user's document is created
  const userDoc = await getDocumentById(
    firestoreDatabase,
    commonTerms.collections.users.name,
    user.uid
  );
  const userData = userDoc.data();
  if (!userData) {
    spinner.fail(
      `Unfortunately we could not find a user document with your information. This likely means that you did not pass the GitHub reputation checks and therefore are not elegible to contribute to any ceremony. If you believe you pass the requirements, it might be possible that your profile is private and we were not able to fetch your real statistics, in this case please consider making your profile public for the duration of the contribution. Please contact the coordinator if you believe this to be an error.`
    );
    process.exit(0);
  }
  // Check the user's current participant readiness for contribution status (eligible, already contributed, timed out).
  const canParticipantContributeToCeremony = await checkParticipantForCeremony(
    firebaseFunctions,
    selectedCeremony.id
  );
  await sleep(2000); // wait for CF execution.
  // Get updated participant data.
  const participant = await getDocumentById(
    firestoreDatabase,
    getParticipantsCollectionPath(selectedCeremony.id),
    user.uid
  );
  const participantData = participant.data();
  if (!participantData)
    showError(COMMAND_ERRORS.COMMAND_CONTRIBUTE_NO_PARTICIPANT_DATA, true);
  if (canParticipantContributeToCeremony) {
    spinner.succeed(`Great, you are qualified to contribute to the ceremony`);
    let entropy = ''; // toxic waste.
    // Prepare local directories.
    checkAndMakeNewDirectoryIfNonexistent(localPaths.output);
    checkAndMakeNewDirectoryIfNonexistent(localPaths.contribute);
    checkAndMakeNewDirectoryIfNonexistent(localPaths.contributions);
    checkAndMakeNewDirectoryIfNonexistent(localPaths.attestations);
    checkAndMakeNewDirectoryIfNonexistent(localPaths.transcripts);
    // Extract participant data.
    const { contributionProgress, contributionStep } = participantData;
    // Check if the participant can input the entropy
    if (
      contributionProgress < circuits.length ||
      (contributionProgress === circuits.length &&
        contributionStep <
          'UPLOADING') /* ParticipantContributionStep.UPLOADING */
    ) {
      if (entropyOpt) entropy = entropyOpt;
      /// @todo should we preserve entropy between different re-run of the command? (e.g., resume after timeout).
      // Prompt for entropy generation.
      else entropy = await promptForEntropy();
    }
    // Listener to following the core contribution workflow.
    await listenToParticipantDocumentChanges(
      firestoreDatabase,
      firebaseFunctions,
      participant,
      selectedCeremony,
      entropy,
      providerUserId,
      token
    );
  } else {
    // Extract participant data.
    const { status, contributionStep, contributionProgress } = participantData;
    // Check whether the participant has already contributed to all circuits.
    if (
      (!canParticipantContributeToCeremony &&
        status === 'DONE') /* ParticipantStatus.DONE */ ||
      status === 'FINALIZED' /* ParticipantStatus.FINALIZED */
    ) {
      spinner.info(
        `You have already made the contributions for the circuits in the ceremony`
      );
      // await handleContributionValidity(firestoreDatabase, circuits, selectedCeremony.id, participant.id)
      spinner.text = 'Checking your public attestation gist...';
      spinner.start();
      // Check whether the user has published the Github Gist about the public attestation.
      const publishedPublicAttestationGist = await getPublicAttestationGist(
        token,
        `${selectedCeremony.data.prefix}_${commonTerms.foldersAndPathsTerms.attestation}.log`
      );
      if (!publishedPublicAttestationGist) {
        spinner.stop();
        await handlePublicAttestation(
          firestoreDatabase,
          circuits,
          selectedCeremony.id,
          participant.id,
          participantData?.contributions,
          providerUserId,
          selectedCeremony.data.title,
          selectedCeremony.data.prefix,
          token
        );
      } else {
        // Extract url from raw.
        const gistUrl = publishedPublicAttestationGist.raw_url.substring(
          0,
          publishedPublicAttestationGist.raw_url.indexOf('/raw/')
        );
        spinner.stop();
        process.stdout.write(`\n`);
        console.log(
          `${
            theme.symbols.success
          } Your public attestation has been successfully posted as Github Gist (${theme.text.bold(
            theme.text.underlined(gistUrl)
          )})`
        );
        // Prepare a ready-to-share tweet.
        const [, hashes] = await generateValidContributionsAttestation(
          firestoreDatabase,
          circuits,
          selectedCeremony.id,
          participant.id,
          participantData?.contributions,
          providerUserId,
          selectedCeremony.data.title,
          false
        );
        await handleTweetGeneration(hashes);
      }
      console.log(
        `\nThank you for participating and securing the ${selectedCeremony.data.title} ceremony ${theme.emojis.pray}`
      );
    }
    // Check if there's a timeout still in effect for the participant.
    if (
      status === 'TIMEDOUT' /* ParticipantStatus.TIMEDOUT */ &&
      contributionStep !==
        'COMPLETED' /* ParticipantContributionStep.COMPLETED */
    ) {
      spinner.warn(
        `Oops, you are not allowed to continue your contribution due to current timeout`
      );
      await handleTimedoutMessageForContributor(
        firestoreDatabase,
        participant.id,
        selectedCeremony.id,
        contributionProgress,
        false
      );
    }
    // Exit gracefully.
    terminate(providerUserId);
  }
};

/**
 * Clean cursor lines from current position back to root (default: zero).
 * @param currentCursorPos - the current position of the cursor.
 * @returns <number>
 */
const cleanCursorPosBackToRoot = (currentCursorPos) => {
  while (currentCursorPos < 0) {
    // Get back and clean line by line.
    readline.cursorTo(process.stdout, 0);
    readline.clearLine(process.stdout, 0);
    readline.moveCursor(process.stdout, -1, -1);
    currentCursorPos += 1;
  }
  return currentCursorPos;
};
/**
 * Show the latest updates for the given circuit.
 * @param firestoreDatabase <Firestore> - the Firestore database to query from.
 * @param ceremony <FirebaseDocumentInfo> - the Firebase document containing info about the ceremony.
 * @param circuit <FirebaseDocumentInfo> - the Firebase document containing info about the circuit.
 * @returns Promise<number> return the current position of the cursor (i.e., number of lines displayed).
 */
const displayLatestCircuitUpdates = async (
  firestoreDatabase,
  ceremony,
  circuit
) => {
  let observation = theme.text.bold(
    `- Circuit # ${theme.colors.magenta(circuit.data.sequencePosition)}`
  ); // Observation output.
  let cursorPos = -1; // Current cursor position (nb. decrease every time there's a new line!).
  const { waitingQueue } = circuit.data;
  // Get info from circuit.
  const { currentContributor } = waitingQueue;
  const { completedContributions } = waitingQueue;
  if (!currentContributor) {
    observation += `\n> Nobody's currently waiting to contribute ${theme.emojis.eyes}`;
    cursorPos -= 1;
  } else {
    // Search for currentContributor' contribution.
    const contributions = await getCircuitContributionsFromContributor(
      firestoreDatabase,
      ceremony.id,
      circuit.id,
      currentContributor
    );
    if (!contributions.length) {
      // The contributor is currently contributing.
      observation += `\n> Participant ${theme.text.bold(
        `#${completedContributions + 1}`
      )} (${theme.text.bold(currentContributor)}) is currently contributing ${
        theme.emojis.fire
      }`;
      cursorPos -= 1;
    } else {
      // The contributor has contributed.
      observation += `\n> Participant ${theme.text.bold(
        `#${completedContributions}`
      )} (${theme.text.bold(
        currentContributor
      )}) has completed the contribution ${theme.emojis.tada}`;
      cursorPos -= 1;
      // The contributor has finished the contribution.
      const contributionData = contributions.at(0)?.data;
      if (!contributionData)
        showError(GENERIC_ERRORS.GENERIC_ERROR_RETRIEVING_DATA, true);
      // Convert times to seconds.
      const {
        seconds: contributionTimeSeconds,
        minutes: contributionTimeMinutes,
        hours: contributionTimeHours,
      } = getSecondsMinutesHoursFromMillis(
        contributionData?.contributionComputationTime
      );
      const {
        seconds: verificationTimeSeconds,
        minutes: verificationTimeMinutes,
        hours: verificationTimeHours,
      } = getSecondsMinutesHoursFromMillis(
        contributionData?.verificationComputationTime
      );
      observation += `\n> The ${theme.text.bold(
        'computation'
      )} took ${theme.text.bold(
        `${convertToDoubleDigits(
          contributionTimeHours
        )}:${convertToDoubleDigits(
          contributionTimeMinutes
        )}:${convertToDoubleDigits(contributionTimeSeconds)}`
      )}`;
      observation += `\n> The ${theme.text.bold(
        'verification'
      )} took ${theme.text.bold(
        `${convertToDoubleDigits(
          verificationTimeHours
        )}:${convertToDoubleDigits(
          verificationTimeMinutes
        )}:${convertToDoubleDigits(verificationTimeSeconds)}`
      )}`;
      observation += `\n> Contribution ${
        contributionData?.valid
          ? `${theme.text.bold('VALID')} ${theme.symbols.success}`
          : `${theme.text.bold('INVALID')} ${theme.symbols.error}`
      }`;
      cursorPos -= 3;
    }
  }
  // Show observation for circuit.
  process.stdout.write(`${observation}\n\n`);
  cursorPos -= 1;
  return cursorPos;
};
/**
 * Observe command.
 */
const observe = async () => {
  // @todo to be moved as command configuration parameter.
  const observationWaitingTimeInMillis = 3000;
  try {
    // Initialize services.
    const { firebaseApp, firestoreDatabase } =
      await bootstrapCommandExecutionAndServices();
    // Handle current authenticated user sign in.
    const { user } = await checkAuth(firebaseApp);
    // Preserve command execution only for coordinators].
    if (!(await isCoordinator(user)))
      showError(COMMAND_ERRORS.COMMAND_NOT_COORDINATOR, true);
    // Get running cerimonies info (if any).
    const runningCeremoniesDocs = await getOpenedCeremonies(firestoreDatabase);
    // Ask to select a ceremony.
    const ceremony = await promptForCeremonySelection(
      runningCeremoniesDocs,
      false
    );
    console.log(
      `${logSymbols.info} Refresh rate set to ~3 seconds for waiting queue updates\n`
    );
    let cursorPos = 0; // Keep track of current cursor position.
    const spinner = customSpinner(`Getting ready...`, 'clock');
    spinner.start();
    // Get circuit updates every 3 seconds.
    setInterval(async () => {
      // Clean cursor position back to root.
      cursorPos = cleanCursorPosBackToRoot(cursorPos);
      spinner.stop();
      spinner.text = `Updating...`;
      spinner.start();
      // Get updates from circuits.
      const circuits = await getCeremonyCircuits(
        firestoreDatabase,
        ceremony.id
      );
      await sleep(observationWaitingTimeInMillis / 10); // Just for a smoother UX/UI experience.
      spinner.stop();
      // Observe changes for each circuit
      for await (const circuit of circuits)
        cursorPos += await displayLatestCircuitUpdates(
          firestoreDatabase,
          ceremony,
          circuit
        );
      process.stdout.write(`Press CTRL+C to exit`);
      await sleep(1000); // Just for a smoother UX/UI experience.
    }, observationWaitingTimeInMillis);
    await sleep(observationWaitingTimeInMillis); // Wait until the first update.
    spinner.stop();
  } catch (err) {
    showError(`Something went wrong: ${err.toString()}`, true);
  }
};

/**
 * Export and store on the ceremony bucket the verification key for the given final contribution.
 * @param cloudFunctions <Functions> - the instance of the Firebase cloud functions for the application.
 * @param bucketName <string> - the name of the ceremony bucket.
 * @param finalZkeyLocalFilePath <string> - the local file path of the final zKey.
 * @param verificationKeyLocalFilePath <string> - the local file path of the verification key.
 * @param verificationKeyStorageFilePath <string> - the storage file path of the verification key.
 */
const handleVerificationKey = async (
  cloudFunctions,
  bucketName,
  finalZkeyLocalFilePath,
  verificationKeyLocalFilePath,
  verificationKeyStorageFilePath
) => {
  const spinner = customSpinner(`Exporting the verification key...`, 'clock');
  spinner.start();
  // Export the verification key.
  const vKey = await exportVkey(finalZkeyLocalFilePath);
  spinner.text = 'Writing verification key...';
  // Write the verification key locally.
  writeLocalJsonFile(verificationKeyLocalFilePath, vKey);
  await sleep(3000); // workaound for file descriptor.
  // Upload verification key to storage.
  await multiPartUpload(
    cloudFunctions,
    bucketName,
    verificationKeyStorageFilePath,
    verificationKeyLocalFilePath,
    Number(process.env.CONFIG_STREAM_CHUNK_SIZE_IN_MB)
  );
  spinner.succeed(`Verification key correctly saved on storage`);
};
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
const handleCircuitFinalization = async (
  cloudFunctions,
  firestoreDatabase,
  ceremony,
  circuit,
  participant,
  beacon,
  coordinatorIdentifier,
  circuitsLength
) => {
  // Step (1).
  await handleStartOrResumeContribution(
    cloudFunctions,
    firestoreDatabase,
    ceremony,
    circuit,
    participant,
    computeSHA256ToHex(beacon),
    coordinatorIdentifier,
    true,
    circuitsLength
  );
  await sleep(2000); // workaound for descriptors.
  // Extract data.
  const { prefix: circuitPrefix } = circuit.data;
  const { prefix: ceremonyPrefix } = ceremony.data;
  // Prepare local paths.
  const finalZkeyLocalFilePath = getFinalZkeyLocalFilePath(
    `${circuitPrefix}_${finalContributionIndex}.zkey`
  );
  const verificationKeyLocalFilePath = getVerificationKeyLocalFilePath(
    `${circuitPrefix}_${verificationKeyAcronym}.json`
  );
  // const verifierContractLocalFilePath = getVerifierContractLocalFilePath(
  //     `${circuitPrefix}_${verifierSmartContractAcronym}.sol`
  // )
  // Prepare storage paths.
  const verificationKeyStorageFilePath = getVerificationKeyStorageFilePath(
    circuitPrefix,
    `${circuitPrefix}_${verificationKeyAcronym}.json`
  );
  // const verifierContractStorageFilePath = getVerifierContractStorageFilePath(
  //     circuitPrefix,
  //     `${circuitPrefix}_${verifierSmartContractAcronym}.sol`
  // )
  // Get ceremony bucket.
  const bucketName = getBucketName(
    ceremonyPrefix,
    String(process.env.CONFIG_CEREMONY_BUCKET_POSTFIX)
  );
  // Step (2 & 4).
  await handleVerificationKey(
    cloudFunctions,
    bucketName,
    finalZkeyLocalFilePath,
    verificationKeyLocalFilePath,
    verificationKeyStorageFilePath
  );
  // Step (3 & 4).
  // await handleVerifierSmartContract(
  //     cloudFunctions,
  //     bucketName,
  //     finalZkeyLocalFilePath,
  //     verifierContractLocalFilePath,
  //     verifierContractStorageFilePath
  // )
  // Step (5).
  const spinner = customSpinner(
    `Wrapping up the finalization of the circuit...`,
    `clock`
  );
  spinner.start();
  // Finalize circuit contribution.
  await finalizeCircuit(
    cloudFunctions,
    ceremony.id,
    circuit.id,
    bucketName,
    beacon
  );
  await sleep(2000);
  spinner.succeed(`Circuit has been finalized correctly`);
};
/**
 * Finalize command.
 * @notice The finalize command allows a coordinator to finalize a Trusted Setup Phase 2 ceremony by providing the final beacon,
 * computing the final zKeys and extracting the Verifier Smart Contract + Verification Keys per each ceremony circuit.
 * anyone could use the final zKey to create a proof and everyone else could verify the correctness using the
 * related verification key (off-chain) or Verifier smart contract (on-chain).
 * @dev For proper execution, the command requires the coordinator to be authenticated with a GitHub account (run auth command first) in order to
 * handle sybil-resistance and connect to GitHub APIs to publish the gist containing the final public attestation.
 */
const finalize = async (opt) => {
  const { firebaseApp, firebaseFunctions, firestoreDatabase } =
    await bootstrapCommandExecutionAndServices();
  // Check for authentication.
  const auth = opt.auth;
  const {
    user,
    providerUserId,
    token: coordinatorAccessToken,
  } = auth
    ? await authWithToken(firebaseApp, auth)
    : await checkAuth(firebaseApp);
  // Preserve command execution only for coordinators.
  if (!(await isCoordinator(user)))
    showError(COMMAND_ERRORS.COMMAND_NOT_COORDINATOR, true);
  // Retrieve the closed ceremonies (ready for finalization).
  const ceremoniesClosedForFinalization = await getClosedCeremonies(
    firestoreDatabase
  );
  // Gracefully exit if no ceremonies are closed and ready for finalization.
  if (!ceremoniesClosedForFinalization.length)
    showError(COMMAND_ERRORS.COMMAND_FINALIZED_NO_CLOSED_CEREMONIES, true);
  console.log(
    `${theme.symbols.warning} The computation of the final contribution could take the bulk of your computational resources and memory based on the size of the circuit ${theme.emojis.fire}\n`
  );
  // Prompt for ceremony selection.
  const selectedCeremony = await promptForCeremonySelection(
    ceremoniesClosedForFinalization,
    true
  );
  // Get coordinator participant document.
  console.log('getting coordinator participant document');
  let participant = await getDocumentById(
    firestoreDatabase,
    getParticipantsCollectionPath(selectedCeremony.id),
    user.uid
  );
  console.log('got coordinator participant document');
  const isCoordinatorReadyForCeremonyFinalization =
    await checkAndPrepareCoordinatorForFinalization(
      firebaseFunctions,
      selectedCeremony.id
    );
  console.log(
    'checked and prepared coordinator for finalization:',
    isCoordinatorReadyForCeremonyFinalization
  );
  if (!isCoordinatorReadyForCeremonyFinalization)
    showError(
      COMMAND_ERRORS.COMMAND_FINALIZED_NOT_READY_FOR_FINALIZATION,
      true
    );
  // Prompt for beacon.
  const beacon = await promptToTypeEntropyOrBeacon(false);
  // Compute hash
  const beaconHash = computeSHA256ToHex(beacon);
  // Display.
  console.log(
    `${theme.symbols.info} Beacon SHA256 hash ${theme.text.bold(beaconHash)}`
  );
  // Clean directories.
  checkAndMakeNewDirectoryIfNonexistent(localPaths.output);
  checkAndMakeNewDirectoryIfNonexistent(localPaths.finalize);
  checkAndMakeNewDirectoryIfNonexistent(localPaths.finalZkeys);
  checkAndMakeNewDirectoryIfNonexistent(localPaths.finalPot);
  checkAndMakeNewDirectoryIfNonexistent(localPaths.finalAttestations);
  checkAndMakeNewDirectoryIfNonexistent(localPaths.verificationKeys);
  // checkAndMakeNewDirectoryIfNonexistent(localPaths.verifierContracts)
  // Get ceremony circuits.
  const circuits = await getCeremonyCircuits(
    firestoreDatabase,
    selectedCeremony.id
  );
  // Handle finalization for each ceremony circuit.
  for await (const circuit of circuits)
    await handleCircuitFinalization(
      firebaseFunctions,
      firestoreDatabase,
      selectedCeremony,
      circuit,
      participant,
      beacon,
      providerUserId,
      circuits.length
    );
  process.stdout.write(`\n`);
  const spinner = customSpinner(
    `Wrapping up the finalization of the ceremony...`,
    'clock'
  );
  spinner.start();
  // Finalize the ceremony.
  await finalizeCeremony(firebaseFunctions, selectedCeremony.id);
  spinner.succeed(
    `Great, you have completed the finalization of the ${theme.text.bold(
      selectedCeremony.data.title
    )} ceremony ${theme.emojis.tada}\n`
  );
  // Get updated coordinator participant document.
  participant = await getDocumentById(
    firestoreDatabase,
    getParticipantsCollectionPath(selectedCeremony.id),
    user.uid
  );
  // Extract updated data.
  const { contributions } = participant.data();
  const { prefix, title: ceremonyName } = selectedCeremony.data;
  // Generate attestation with final contributions.
  const [publicAttestation, hashes] =
    await generateValidContributionsAttestation(
      firestoreDatabase,
      circuits,
      selectedCeremony.id,
      participant.id,
      contributions,
      providerUserId,
      ceremonyName,
      true
    );
  // Write public attestation locally.
  writeFile(
    getFinalAttestationLocalFilePath(
      `${prefix}_${finalContributionIndex}_${commonTerms.foldersAndPathsTerms.attestation}.log`
    ),
    Buffer.from(publicAttestation)
  );
  await sleep(3000); // workaround for file descriptor unexpected close.
  const gistUrl = await publishGist(
    coordinatorAccessToken,
    publicAttestation,
    ceremonyName,
    prefix
  );
  console.log(
    `\n${
      theme.symbols.info
    } Your public final attestation has been successfully posted as Github Gist (${theme.text.bold(
      theme.text.underlined(gistUrl)
    )})`
  );
  // Generate a ready to share custom url to tweet about ceremony participation.
  const tweetUrl = generateCustomUrlToTweetAboutParticipation(hashes);
  console.log(
    `${
      theme.symbols.info
    } We encourage you to tweet about the ceremony finalization by clicking the link below\n\n${theme.text.underlined(
      tweetUrl
    )}`
  );
  // Automatically open a webpage with the tweet.
  await open(tweetUrl);
  terminate(providerUserId);
};

/**
 * Clean command.
 */
const clean = async () => {
  try {
    // Initialize services.
    await bootstrapCommandExecutionAndServices();
    const spinner = customSpinner(`Cleaning up...`, 'clock');
    if (directoryExists(localPaths.output)) {
      console.log(
        theme.text.bold(
          `${theme.symbols.warning} Be careful, this action is irreversible!`
        )
      );
      const { confirmation } = await askForConfirmation(
        'Are you sure you want to continue with the clean up?',
        'Yes',
        'No'
      );
      if (confirmation) {
        spinner.start();
        // Do the clean up.
        deleteDir(localPaths.output);
        // nb. simulate waiting time for 1s.
        await sleep(1000);
        spinner.succeed(
          `Cleanup was successfully completed ${theme.emojis.broom}`
        );
      }
    } else {
      console.log(
        `${theme.symbols.info} There is nothing to clean ${theme.emojis.eyes}`
      );
    }
  } catch (err) {
    showError(`Something went wrong: ${err.toString()}`, true);
  }
};

/**
 * Logout command.
 */
const logout = async () => {
  try {
    // Initialize services.
    const { firebaseApp } = await bootstrapCommandExecutionAndServices();
    // Check for authentication.
    const { providerUserId } = await checkAuth(firebaseApp);
    // Inform the user about deassociation in Github and re run auth
    console.log(
      `${
        theme.symbols.warning
      } The logout could sign you out from Firebase and will delete the access token saved locally on this machine. Therefore, you have to run ${theme.text.bold(
        'phase2cli auth'
      )} to authenticate again.\n${
        theme.symbols.info
      } Remember, we cannot revoke the authorization from your Github account from this CLI! You can do this manually as reported in the official Github documentation ${
        theme.emojis.pointDown
      }\n\n${theme.text.bold(
        theme.text.underlined(
          `https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/reviewing-your-authorized-applications-oauth`
        )
      )}\n`
    );
    // Ask for confirmation.
    const { confirmation } = await askForConfirmation(
      'Are you sure you want to log out from this machine?',
      'Yes',
      'No'
    );
    if (confirmation) {
      const spinner = customSpinner(`Logging out...`, 'clock');
      spinner.start();
      // Sign out.
      const auth = getAuth();
      await signOut(auth);
      // Delete local token.
      deleteLocalAccessToken();
      await sleep(3000); // ~3s.
      spinner.stop();
      console.log(`${theme.symbols.success} Logout successfully completed`);
    } else terminate(providerUserId);
  } catch (err) {
    showError(`Something went wrong: ${err.toString()}`, true);
  }
};

/**
 * Validate ceremony setup command.
 */
const validate = async (cmd) => {
  try {
    // parse the file and cleanup after
    const parsedFile = await parseCeremonyFile(cmd.template, true);
    // check whether we have a constraints option otherwise default to 1M
    const constraints = cmd.constraints || 1000000;
    for await (const circuit of parsedFile.circuits) {
      if (circuit.metadata.constraints > constraints) {
        console.log(false);
        process.exit(0);
      }
    }
    console.log(true);
  } catch (err) {
    showError(`${err.toString()}`, false);
    // we want to exit with a non-zero exit code
    process.exit(1);
  }
};

/**
 * Validate ceremony setup command.
 */
const listCeremonies = async () => {
  try {
    // bootstrap command execution and services
    const { firestoreDatabase } = await bootstrapCommandExecutionAndServices();
    // get all ceremonies
    const ceremonies = await getAllCollectionDocs(
      firestoreDatabase,
      commonTerms.collections.ceremonies.name
    );
    // store all names
    const names = [];
    // loop through all ceremonies
    for (const ceremony of ceremonies) names.push(ceremony.data().prefix);
    // print them to the console
    console.log(names.join(', '));
    process.exit(0);
  } catch (err) {
    showError(`${err.toString()}`, false);
    // we want to exit with a non-zero exit code
    process.exit(1);
  }
};

// Get pkg info (e.g., name, version).
const packagePath = `${dirname(fileURLToPath(import.meta.url))}/..`;
const { description, version, name } = JSON.parse(
  readFileSync(`${packagePath}/package.json`, 'utf8')
);
const program = createCommand();
// Entry point.
program.name(name).description(description).version(version);
// User commands.
program
  .command('auth')
  .description('authenticate yourself using your Github account (OAuth 2.0)')
  .action(auth);
program
  .command('contribute')
  .description(
    'compute contributions for a Phase2 Trusted Setup ceremony circuits'
  )
  .option(
    '-c, --ceremony <string>',
    'the prefix of the ceremony you want to contribute for',
    ''
  )
  .option(
    '-e, --entropy <string>',
    'the entropy (aka toxic waste) of your contribution',
    ''
  )
  .option('-a, --auth <string>', 'the Github OAuth 2.0 token', '')
  .action(contribute);
program
  .command('clean')
  .description(
    'clean up output generated by commands from the current working directory'
  )
  .action(clean);
program
  .command('list')
  .description('List all ceremonies prefixes')
  .action(listCeremonies);
program
  .command('logout')
  .description(
    'sign out from Firebae Auth service and delete Github OAuth 2.0 token from local storage'
  )
  .action(logout);
program
  .command('validate')
  .description('Validate that a Ceremony Setup file is correct')
  .requiredOption(
    '-t, --template <path>',
    'The path to the ceremony setup template',
    ''
  )
  .option(
    '-c, --constraints <number>',
    'The number of constraints to check against'
  )
  .action(validate);
// Only coordinator commands.
const ceremony = program
  .command('coordinate')
  .description('commands for coordinating a ceremony');
ceremony
  .command('setup')
  .description(
    'setup a Groth16 Phase 2 Trusted Setup ceremony for zk-SNARK circuits'
  )
  .option(
    '-t, --template <path>',
    'The path to the ceremony setup template',
    ''
  )
  .option('-a, --auth <string>', 'The Github OAuth 2.0 token', '')
  .action(setup);
ceremony
  .command('observe')
  .description(
    'observe in real-time the waiting queue of each ceremony circuit'
  )
  .action(observe);
ceremony
  .command('finalize')
  .description(
    'finalize a Phase2 Trusted Setup ceremony by applying a beacon, exporting verification key and verifier contract'
  )
  .option('-a, --auth <string>', 'the Github OAuth 2.0 token', '')
  .action(finalize);
program.parseAsync(process.argv);
