import { getTimetable, getTimetableFromStorage } from "./timetable";
import { ensureAdminApp } from "./utils/adminApp";

// Initialize Firebase Admin (lazy / Secret Manager対応)
ensureAdminApp();

// Export functions
export {
  getTimetable as getTimetableData,
  getTimetableFromStorage as getTimetableStorage,
};

// Export admin functions
export * from "./admin";
