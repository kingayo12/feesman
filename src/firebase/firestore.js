import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from "firebase/firestore";

// import { getFirestore } from "firebase/firestore";
import { app } from "./firebase.config";

// export const db = getFirestore(app);

// firestore.js — replace your current db initialization

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
