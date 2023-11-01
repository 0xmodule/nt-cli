#!/usr/bin/env node
import { FirebaseDocumentInfo } from "@nocturne-xyz/p0tion-actions";
import { Firestore } from "firebase/firestore";
/**
 * Clean cursor lines from current position back to root (default: zero).
 * @param currentCursorPos - the current position of the cursor.
 * @returns <number>
 */
export declare const cleanCursorPosBackToRoot: (currentCursorPos: number) => number;
/**
 * Show the latest updates for the given circuit.
 * @param firestoreDatabase <Firestore> - the Firestore database to query from.
 * @param ceremony <FirebaseDocumentInfo> - the Firebase document containing info about the ceremony.
 * @param circuit <FirebaseDocumentInfo> - the Firebase document containing info about the circuit.
 * @returns Promise<number> return the current position of the cursor (i.e., number of lines displayed).
 */
export declare const displayLatestCircuitUpdates: (firestoreDatabase: Firestore, ceremony: FirebaseDocumentInfo, circuit: FirebaseDocumentInfo) => Promise<number>;
/**
 * Observe command.
 */
declare const observe: () => Promise<void>;
export default observe;
