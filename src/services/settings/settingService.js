import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/firestore"; // Adjust to your firebase config path

// Constant for the document ID that will store the settings
const SETTINGS_DOC_ID = "school";

/**
 * Fetch current school settings from Firestore
 * @returns {Promise<Object|null>} - settings object or null if not found
 */
export const getSettings = async () => {
  try {
    const docRef = doc(db, "settings", SETTINGS_DOC_ID);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data();
    }
    return null; // no settings found
  } catch (error) {
    console.error("Error fetching settings:", error);
    return null;
  }
};

/**
 * Update school settings in Firestore
 * @param {Object} data - object containing the settings to update
 * @returns {Promise<void>}
 */
export const updateSettings = async (data) => {
  try {
    const docRef = doc(db, "settings", SETTINGS_DOC_ID);
    // Merge: only update the fields provided, keep existing fields intact
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    throw error;
  }
};
