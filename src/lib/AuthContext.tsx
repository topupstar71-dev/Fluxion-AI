import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment,
  onSnapshot,
  collection,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction
} from 'firebase/firestore';
import { auth, db } from './firebase';

interface UserProfile {
  uid: string;
  name: string;
  birthday: string;
  plan: 'free' | 'standard' | 'customizable' | 'extended';
  credits: number;
  expire_date: string | null;
  role: 'user' | 'admin';
  photoUrl?: string;
  last_login?: string;
  createdAt?: string;
  referral_code?: string;
  referred_by?: string;
  level?: number;
  xp?: number;
  projectsCreated?: number;
  messagesSent?: number;
  imagesGenerated?: number;
}

interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  files: Record<string, string>;
  mainFile: string;
  createdAt: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  useCredit: (amount?: number) => Promise<boolean>;
  upgradePlan: (planId: number) => Promise<void>;
  submitPaymentRequest: (planId: number, method: string, transactionId: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string, birthday: string, referralCode?: string) => Promise<void>;
  signIn: (email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  claimDailyCredits: () => Promise<boolean>;
  resetSystem: () => Promise<boolean>;
  getCreditLogs: () => Promise<any[]>;
  saveProject: (name: string, files: Record<string, string>, mainFile: string, description?: string) => Promise<string>;
  getProjects: () => Promise<Project[]>;
  deleteProject: (projectId: string) => Promise<void>;
  shareProject: (projectId: string, isPublic: boolean) => Promise<void>;
  getSharedProjects: () => Promise<any[]>;
  updateUserStats: (type: 'message' | 'image' | 'project') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleOnline = () => console.log("App is online");
    const handleOffline = () => console.warn("App is offline - Network requests will fail");
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let unsubscribeProfile: (() => void) | null = null;

    // Safety timeout to prevent indefinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn("Auth initialization timed out. Forcing loading to false.");
        setLoading(false);
      }
    }, 8000);

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser ? "User logged in" : "No user");
      setUser(firebaseUser);
      
      // Cleanup previous profile subscription if any
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen for real-time profile updates
        unsubscribeProfile = onSnapshot(userDocRef, async (snapshot) => {
          console.log("Profile snapshot received");
          if (snapshot.exists()) {
            const data = snapshot.data() as UserProfile;
            
            // Check for expiration
            if (data.expire_date && new Date(data.expire_date) < new Date()) {
              await updateDoc(userDocRef, {
                plan: 'free',
                credits: 100,
                expire_date: null
              });
            } else {
              setProfile(data);
            }
          } else {
            // Create profile if it doesn't exist
            console.log("Creating new user profile...");
            const isAdminEmail = firebaseUser.email === 'topupstar71@gmail.com' || 
                               firebaseUser.email === 'saifulislam.20100409@fluxion.ai';
            
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'User',
                birthday: '', // Will be set during signup
                plan: 'free',
                credits: 100,
                expire_date: null,
                role: (firebaseUser.displayName?.toLowerCase() === 'admin' || isAdminEmail) ? 'admin' : 'user',
                referral_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
                last_login: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                level: 1,
                xp: 0,
                projectsCreated: 0,
                messagesSent: 0,
                imagesGenerated: 0
              };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          }
          clearTimeout(timeoutId);
          setLoading(false);
        }, (error) => {
          console.error("Profile subscription error:", error);
          clearTimeout(timeoutId);
          setLoading(false);
        });
      } else {
        setProfile(null);
        clearTimeout(timeoutId);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(timeoutId);
    };
  }, []);

  const signUp = async (email: string, pass: string, name: string, birthday: string, referralCode?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    
    const userDocRef = doc(db, 'users', cred.user.uid);
    const isAdminEmail = email === 'topupstar71@gmail.com' || 
                         email === 'saifulislam.20100409@fluxion.ai';

    const newProfile: UserProfile = {
      uid: cred.user.uid,
      name: name,
      birthday: birthday,
      plan: 'free',
      credits: 100,
      expire_date: null,
      role: (name.toLowerCase() === 'admin' || isAdminEmail) ? 'admin' : 'user',
      referral_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      referred_by: referralCode || null,
      last_login: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      level: 1,
      xp: 0,
      projectsCreated: 0,
      messagesSent: 0,
      imagesGenerated: 0
    };
    await setDoc(userDocRef, newProfile);
  };

  const signIn = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const claimDailyCredits = async () => {
    if (!user || !profile) return false;
    
    const now = new Date();
    const lastLogin = profile.last_login ? new Date(profile.last_login) : null;
    
    if (!lastLogin || now.toDateString() !== lastLogin.toDateString()) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          credits: increment(100), // Give 100 credits daily
          last_login: now.toISOString()
        });
        
        // Log credit addition
        await setDoc(doc(collection(db, 'credit_logs')), {
          userId: user.uid,
          amount: 100,
          reason: 'Daily Claim',
          timestamp: now.toISOString()
        });

        return true;
      } catch (error) {
        console.error("Error claiming daily credits:", error);
        return false;
      }
    }
    return false;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const useCredit = async (amount: number = 1) => {
    if (!user || !profile) {
      console.error("useCredit: No user or profile found");
      return false;
    }
    
    const path = `users/${user.uid}`;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const logRef = doc(collection(db, 'credit_logs'));
      
      const success = await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          throw new Error("User document does not exist");
        }

        const currentCredits = userDoc.data().credits || 0;
        
        if (currentCredits < amount) {
          return false;
        }

        const newCredits = Math.max(0, currentCredits - amount);

        // Update user credits
        transaction.update(userDocRef, {
          credits: newCredits
        });

        // Log credit usage (inside transaction for atomicity)
        transaction.set(logRef, {
          userId: user.uid,
          amount: -amount,
          reason: 'AI Usage',
          timestamp: new Date().toISOString()
        });

        return true;
      });

      if (!success) {
        console.warn("Insufficient credits (transaction)");
        return false;
      }

      return true;
    } catch (error: any) {
      console.error("Error deducting credit:", error);
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
      return false;
    }
  };

  const upgradePlan = async (planId: number) => {
    if (!user) return;
    
    const plans = {
      1: { name: 'standard', credits: 1000 },
      2: { name: 'customizable', credits: 3000 },
      3: { name: 'extended', credits: 6000 }
    };
    
    const selectedPlan = plans[planId as keyof typeof plans];
    if (!selectedPlan) return;

    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 30);

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        plan: selectedPlan.name as any,
        credits: selectedPlan.credits,
        expire_date: expireDate.toISOString()
      });

      // Log credit addition from plan
      await setDoc(doc(collection(db, 'credit_logs')), {
        userId: user.uid,
        amount: selectedPlan.credits,
        reason: `Plan Upgrade: ${selectedPlan.name}`,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Upgrade plan error:", error);
      if (error.code === 'permission-denied') {
        throw new Error("Firestore Permission Denied: Please update your Security Rules to allow user updates.");
      }
      throw error;
    }
  };

  const submitPaymentRequest = async (planId: number, method: string, transactionId: string) => {
    if (!user || !profile) return;
    
    const plans = {
      1: { name: 'standard', price: 200 },
      2: { name: 'customizable', price: 400 },
      3: { name: 'extended', price: 600 }
    };
    
    const selectedPlan = plans[planId as keyof typeof plans];
    if (!selectedPlan) return;

    try {
      // Save payment request for admin verification
      const requestRef = doc(collection(db, 'payment_requests'));
      await setDoc(requestRef, {
        userId: user.uid,
        userName: profile.name,
        userEmail: user.email,
        planId,
        planName: selectedPlan.name,
        price: selectedPlan.price,
        method,
        transactionId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Payment request error:", error);
      if (error.code === 'permission-denied') {
        throw new Error("Firestore Permission Denied: Please update your Security Rules to allow creating payment requests.");
      }
      throw error;
    }
  };

  const resetSystem = async () => {
    if (!user || profile?.role !== 'admin') return;
    
    try {
      // 1. Delete all users except current admin
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userDeletes = usersSnapshot.docs
        .filter(d => d.id !== user.uid)
        .map(d => deleteDoc(doc(db, 'users', d.id)));
      
      // 2. Delete all chats
      const chatsSnapshot = await getDocs(collection(db, 'chats'));
      const chatDeletes = chatsSnapshot.docs.map(d => deleteDoc(doc(db, 'chats', d.id)));
      
      // 3. Delete all messages
      const messagesSnapshot = await getDocs(collection(db, 'messages'));
      const messageDeletes = messagesSnapshot.docs.map(d => deleteDoc(doc(db, 'messages', d.id)));
      
      // 4. Delete all payment requests
      const paymentsSnapshot = await getDocs(collection(db, 'payment_requests'));
      const paymentDeletes = paymentsSnapshot.docs.map(d => deleteDoc(doc(db, 'payment_requests', d.id)));

      // 5. Delete all credit logs
      const logsSnapshot = await getDocs(collection(db, 'credit_logs'));
      const logDeletes = logsSnapshot.docs.map(d => deleteDoc(doc(db, 'credit_logs', d.id)));
      
      await Promise.all([...userDeletes, ...chatDeletes, ...messageDeletes, ...paymentDeletes, ...logDeletes]);
      return true;
    } catch (error) {
      console.error("System reset error:", error);
      throw error;
    }
  };

  const getCreditLogs = async () => {
    if (!user) return [];
    const path = 'credit_logs';
    try {
      const logsSnapshot = await getDocs(query(collection(db, path), where('userId', '==', user.uid)));
      const logs: any[] = [];
      logsSnapshot.forEach(doc => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  };

  const saveProject = async (name: string, files: Record<string, string>, mainFile: string, description?: string) => {
    if (!user) throw new Error("User not authenticated");
    const path = 'projects';
    try {
      const projectRef = doc(collection(db, path));
      const newProject = {
        userId: user.uid,
        name,
        description: description || '',
        files,
        mainFile,
        createdAt: new Date().toISOString()
      };
      await setDoc(projectRef, newProject);
      await updateUserStats('project');
      return projectRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  };

  const getProjects = async () => {
    if (!user) return [];
    const path = 'projects';
    try {
      const q = query(collection(db, path), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const projects: Project[] = [];
      snapshot.forEach(doc => {
        projects.push({ id: doc.id, ...doc.data() } as Project);
      });
      return projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!user) return;
    const path = `projects/${projectId}`;
    try {
      await deleteDoc(doc(db, 'projects', projectId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const shareProject = async (projectId: string, isPublic: boolean) => {
    if (!user) return;
    const path = `projects/${projectId}`;
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        isPublic,
        authorName: profile?.name || 'Anonymous',
        authorPhoto: profile?.photoUrl || ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const getSharedProjects = async () => {
    try {
      const q = query(
        collection(db, 'projects'),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'shared-projects');
      return [];
    }
  };

  const updateUserStats = async (type: 'message' | 'image' | 'project') => {
    if (!user || !profile) return;
    const path = `users/${user.uid}`;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const updates: any = {};
      
      if (type === 'message') updates.messagesSent = increment(1);
      if (type === 'image') updates.imagesGenerated = increment(1);
      if (type === 'project') updates.projectsCreated = increment(1);
      
      // Add XP
      const xpGain = type === 'project' ? 50 : type === 'image' ? 10 : 2;
      updates.xp = increment(xpGain);
      
      // Check for level up (simple: every 100 XP is a level)
      const currentXp = (profile.xp || 0) + xpGain;
      const newLevel = Math.floor(currentXp / 100) + 1;
      if (newLevel > (profile.level || 1)) {
        updates.level = newLevel;
        // Optional: Give bonus credits on level up
        updates.credits = increment(50);
      }
      
      await updateDoc(userDocRef, updates);
    } catch (error) {
      console.error("Error updating user stats:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, signOut, useCredit, upgradePlan, 
      submitPaymentRequest, signUp, signIn, signInWithGoogle, 
      claimDailyCredits, resetSystem, getCreditLogs,
      saveProject, getProjects, deleteProject, shareProject, getSharedProjects, updateUserStats
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
