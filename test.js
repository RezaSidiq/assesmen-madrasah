const admin = require('firebase-admin');

try {
    const serviceAccount = require('./serviceAccountKey.json');
    console.log('File loaded, private_key length:', serviceAccount.private_key?.length);
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://dev-assesment-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
    
    console.log('✅ Firebase initialized successfully!');
} catch (error) {
    console.error('❌ Error:', error.message);
}