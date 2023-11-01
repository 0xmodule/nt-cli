/// <reference types="node" />
import { Dirent, Stats } from "fs";
/**
 * Check a directory path.
 * @param directoryPath <string> - the local path of the directory.
 * @returns <boolean> true if the directory at given path exists, otherwise false.
 */
export declare const directoryExists: (directoryPath: string) => boolean;
/**
 * Write a new file locally.
 * @param localFilePath <string> - the local path of the file.
 * @param data <Buffer> - the content to be written inside the file.
 */
export declare const writeFile: (localFilePath: string, data: Buffer) => void;
/**
 * Read a new file from local folder.
 * @param localFilePath <string> - the local path of the file.
 */
export declare const readFile: (localFilePath: string) => string;
/**
 * Get back the statistics of the provided file.
 * @param localFilePath <string> - the local path of the file.
 * @returns <Stats> - the metadata of the file.
 */
export declare const getFileStats: (localFilePath: string) => Stats;
/**
 * Return the sub-paths for each file stored in the given directory.
 * @param directoryLocalPath <string> - the local path of the directory.
 * @returns <Promise<Array<Dirent>>> - the list of sub-paths of the files contained inside the directory.
 */
export declare const getDirFilesSubPaths: (directoryLocalPath: string) => Promise<Array<Dirent>>;
/**
 * Filter all files in a directory by returning only those that match the given extension.
 * @param directoryLocalPath <string> - the local path of the directory.
 * @param fileExtension <string> - the file extension.
 * @returns <Promise<Array<Dirent>>> - return the filenames of the file that match the given extension, if any
 */
export declare const filterDirectoryFilesByExtension: (directoryLocalPath: string, fileExtension: string) => Promise<Array<Dirent>>;
/**
 * Delete a directory specified at a given path.
 * @param directoryLocalPath <string> - the local path of the directory.
 */
export declare const deleteDir: (directoryLocalPath: string) => void;
/**
 * Clean a directory specified at a given path.
 * @param directoryLocalPath <string> - the local path of the directory.
 */
export declare const cleanDir: (directoryLocalPath: string) => void;
/**
 * Create a new directory in a specified path if not exist in that path.
 * @param directoryLocalPath <string> - the local path of the directory.
 */
export declare const checkAndMakeNewDirectoryIfNonexistent: (directoryLocalPath: string) => void;
/**
 * Write data a local JSON file at a given path.
 * @param localFilePath <string> - the local path of the file.
 * @param data <JSON> - the JSON content to be written inside the file.
 */
export declare const writeLocalJsonFile: (filePath: string, data: JSON) => void;
/**
 * Return the local current project directory name.
 * @returns <string> - the local project (e.g., dist/) directory name.
 */
export declare const getLocalDirname: () => string;
