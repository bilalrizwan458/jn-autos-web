import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAHfcje5Jqf2lQlSxf79JNGGu-zQj6WQcE',
  authDomain: 'jn-autos-complete-website.firebaseapp.com',
  databaseURL: 'https://jn-autos-complete-website-default-rtdb.firebaseio.com',
  projectId: 'jn-autos-complete-website',
  storageBucket: 'jn-autos-complete-website.firebasestorage.app',
  messagingSenderId: '834766075823',
  appId: '1:834766075823:web:40ae514fe4c575895c215a',
  measurementId: 'G-QT8R4HYWF5'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const databaseName = 'jnautos-catalog';
const productStoreName = 'products';
const catalogStorageKey = 'jnautos-catalog-options';
const defaultCatalogOptions = {
  categories: ['Engine Parts', 'Brakes', 'Suspension', 'Electrical', 'Body Parts', 'Accessories'],
  makes: ['Toyota', 'Honda', 'Suzuki', 'Nissan', 'Mitsubishi', 'Universal'],
  models: [],
  customCategories: [],
  customMakes: [],
  customModels: []
};

let currentProfile = null;

function openProductDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(productStoreName, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open the product inventory.'));
  });
}

async function updateProducts(update) {
  const database = await openProductDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(productStoreName, 'readwrite');
    const store = transaction.objectStore(productStoreName);
    const request = store.getAll();
    let result;
    request.onsuccess = () => {
      try {
        const products = request.result;
        result = update(products);
        store.clear();
        products.forEach(product => store.put(product));
      } catch (error) {
        transaction.abort();
        reject(error);
      }
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('Could not update the product inventory.'));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error('Could not update the product inventory.'));
    };
  });
}

function loadCatalogOptions() {
  const raw = localStorage.getItem(catalogStorageKey);
  if (raw === null) return { ...defaultCatalogOptions };
  let saved;
  try {
    saved = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Could not read saved catalog options: ${error.message}`);
  }
  return { ...defaultCatalogOptions, ...saved };
}

function uniqueValues(values) {
  return [...new Map(values.filter(Boolean).map(value => [String(value).toLowerCase(), String(value)])).values()];
}

async function requireStaffAccess(user, requireVerifiedEmail = true) {
  if (!user.email) throw new Error('Your account does not have an email address.');
  if (requireVerifiedEmail && !user.emailVerified) {
    throw new Error('Verify your email address before signing in to the staff portal.');
  }
  const access = await getDoc(doc(db, 'staffAccess', user.email.toLowerCase()));
  if (!access.exists() || access.data().active !== true) {
    throw new Error('This email is not approved for staff access. Contact the JN Autos administrator.');
  }
}

async function loadOrCreateProfile(user, fullName = user.displayName || '') {
  const profileRef = doc(db, 'staffProfiles', user.uid);
  const snapshot = await getDoc(profileRef);
  if (snapshot.exists()) {
    currentProfile = { uid: user.uid, email: user.email, ...snapshot.data() };
    return currentProfile;
  }
  const profile = {
    email: user.email,
    fullName: fullName.trim() || user.email,
    createdAt: serverTimestamp()
  };
  await setDoc(profileRef, profile);
  currentProfile = { uid: user.uid, email: user.email, fullName: profile.fullName };
  return currentProfile;
}

async function authenticate(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  try {
    await credential.user.getIdToken(true);
    await requireStaffAccess(credential.user);
    return await loadOrCreateProfile(credential.user);
  } catch (error) {
    await signOut(auth);
    currentProfile = null;
    throw error;
  }
}

export const StoreManager = {
  isFirebaseConfigured() {
    return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
  },

  async initializeAuth() {
    const user = auth.currentUser || await new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, currentUser => {
        unsubscribe();
        resolve(currentUser);
      }, reject);
    });
    if (!user) {
      currentProfile = null;
      return;
    }
    try {
      await requireStaffAccess(user);
      await loadOrCreateProfile(user);
    } catch (error) {
      await signOut(auth);
      currentProfile = null;
      throw error;
    }
  },

  async getCurrentUser() {
    const user = auth.currentUser;
    if (!user) return null;
    if (!currentProfile || currentProfile.uid !== user.uid) {
      await requireStaffAccess(user);
      await loadOrCreateProfile(user);
    }
    return currentProfile;
  },

  loginUser(email, password) {
    return authenticate(email, password);
  },

  async registerUser(fullName, email, password) {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    try {
      await requireStaffAccess(credential.user, false);
      await updateProfile(credential.user, { displayName: fullName.trim() });
      await sendEmailVerification(credential.user);
      await signOut(auth);
      currentProfile = null;
    } catch (error) {
      try {
        await deleteUser(credential.user);
      } catch {
        await signOut(auth);
        throw new Error(`${error.message} The new account could not be removed automatically; contact the administrator.`);
      }
      currentProfile = null;
      throw error;
    }
  },

  async sendPasswordReset(email) {
    await sendPasswordResetEmail(auth, email.trim());
  },

  async logoutUser() {
    currentProfile = null;
    await signOut(auth);
  },

  async changePassword(currentPassword, newPassword) {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('Sign in again before changing your password.');
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
    await updatePassword(user, newPassword);
  },

  async clearLocalStaffData() {
    const email = auth.currentUser?.email;
    if (!email) throw new Error('Sign in again before clearing creator labels.');
    await updateProducts(products => {
      products.forEach(product => {
        if (product.createdBy === email) product.createdBy = 'Staff';
      });
    });
  },

  async getProducts() {
    const database = await openProductDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(productStoreName, 'readonly');
      const request = transaction.objectStore(productStoreName).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not read the product inventory.'));
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => {
        database.close();
        reject(transaction.error || new Error('Could not read the product inventory.'));
      };
    });
  },

  async addProduct(product) {
    await updateProducts(products => {
      products.push({ ...product, id: crypto.randomUUID(), price: Number(product.price) });
    });
  },

  async deleteProduct(id) {
    await updateProducts(products => {
      const index = products.findIndex(product => String(product.id) === String(id));
      if (index !== -1) products.splice(index, 1);
    });
  },

  async updateProductPrice(id, price) {
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      throw new Error('Enter a valid non-negative price.');
    }
    await updateProducts(products => {
      const product = products.find(item => String(item.id) === String(id));
      if (!product) throw new Error('That product is no longer in the inventory.');
      product.price = numericPrice;
    });
  },

  async bulkAddProducts(newProducts) {
    const prepared = newProducts.map(product => ({
      ...product,
      id: crypto.randomUUID(),
      price: Number(product.price)
    }));
    await updateProducts(products => products.push(...prepared));
    return prepared.length;
  },

  getCatalogOptions() {
    return loadCatalogOptions();
  },

  addCatalogOption(type, value) {
    const key = `custom${type[0].toUpperCase()}${type.slice(1)}`;
    const options = loadCatalogOptions();
    if (!Object.hasOwn(options, key)) throw new Error('Unsupported catalog option.');
    const cleanValue = value.trim();
    if (!cleanValue) throw new Error('Enter a value before adding it.');
    options[key] = uniqueValues([...options[key], cleanValue]);
    localStorage.setItem(catalogStorageKey, JSON.stringify(options));
  },

  removeCatalogOption(type, value) {
    const key = `custom${type[0].toUpperCase()}${type.slice(1)}`;
    const options = loadCatalogOptions();
    if (!Object.hasOwn(options, key)) throw new Error('Unsupported catalog option.');
    options[key] = options[key].filter(option => option !== value);
    localStorage.setItem(catalogStorageKey, JSON.stringify(options));
  }
};
