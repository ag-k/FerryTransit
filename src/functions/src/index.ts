import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { getTimetable, getTimetableFromStorage } from "./timetable";

// Initialize Firebase Admin
admin.initializeApp();

// Connect to emulators in development
if (process.env.FUNCTIONS_EMULATOR === "true") {
  try {
    admin.firestore().settings({
      host: "localhost:8095",
      ssl: false,
    });
    logger.info(
      "🔥 Functions: Connected to Firestore emulator on localhost:8095"
    );
  } catch (error) {
    logger.warn("⚠️ Functions: Firestore emulator connection failed:", error);
  }
}

// Export functions
export {
  getTimetable as getTimetableData,
  getTimetableFromStorage as getTimetableStorage,
};

// Export admin functions
export * from "./admin";
