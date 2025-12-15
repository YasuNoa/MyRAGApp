import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
        try {
            // Debug logging to help identify parsing issues (without leaking full key)
            console.log(`[FirebaseAdmin] Found FIREBASE_SERVICE_ACCOUNT_KEY. Length: ${serviceAccountKey.length}`);
            console.log(`[FirebaseAdmin] First 20 chars: ${serviceAccountKey.substring(0, 20)}`);

            // Remove any potential wrapping quotes that might have been included by mistake
            let jsonString = serviceAccountKey.trim();
            if (jsonString.startsWith("'") && jsonString.endsWith("'")) {
                jsonString = jsonString.slice(1, -1);
            } else if (jsonString.startsWith('"') && jsonString.endsWith('"')) {
                jsonString = jsonString.slice(1, -1);
            }

            const serviceAccount = JSON.parse(jsonString);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("[FirebaseAdmin] Initialized successfully with Service Account");
        } catch (e: any) {
            console.error('[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e.message);
            // CRITICAL: Do not continue if we have a key but failed to use it.
            // This prevents the confusing "Default app does not exist" error later.
            throw new Error(`Firebase Admin Config Error: ${e.message}`);
        }
    } else {
        // Fallback/Local Development (ADC)
        console.log("[FirebaseAdmin] No FIREBASE_SERVICE_ACCOUNT_KEY found. Attempting ADC/Local init...");
        admin.initializeApp();
    }
}

// Access services *after* passing the initialization check
const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { admin, adminAuth, adminDb };
