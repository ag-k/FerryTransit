import { getTimetable } from "./timetable";
import { ensureAdminApp } from "./utils/adminApp";

// Initialize Firebase Admin (lazy / Secret Manager対応)
ensureAdminApp();

// Export functions
export {
  getTimetable as getTimetableData,
};

// Export admin functions
export * from "./admin";
