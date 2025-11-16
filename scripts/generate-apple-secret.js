/**
 * Generate Apple Sign In Client Secret (JWT)
 *
 * Usage:
 * 1. Place your .p8 key file in the project root (or update KEY_FILE path)
 * 2. Update the configuration values below
 * 3. Run: node generate-apple-secret.js
 */

import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

const KEY_ID = 'AT38N733LP';           // From Step 3 (10-character string)
const TEAM_ID = '8RSPLFN63L';         // From Step 4 (10-character string)
const CLIENT_ID = 'com.thomasscheiber.finance.si'; // Your Services ID
const KEY_FILE = './AuthKey_AT38N733LP.p8';       // Path to your downloaded .p8 file

// ============================================
// GENERATION
// ============================================

try {
  // Check if key file exists
  if (!fs.existsSync(KEY_FILE)) {
    console.error('❌ Error: Key file not found!');
    console.error(`   Looking for: ${path.resolve(KEY_FILE)}`);
    console.error('\n📝 Instructions:');
    console.error('   1. Download your .p8 key file from Apple Developer Portal');
    console.error('   2. Place it in the project root');
    console.error('   3. Update KEY_FILE path in this script');
    process.exit(1);
  }

  // Validate configuration
  if (KEY_ID === 'YOUR_KEY_ID_HERE' || TEAM_ID === 'YOUR_TEAM_ID_HERE') {
    console.error('❌ Error: Please update KEY_ID and TEAM_ID in the script!');
    process.exit(1);
  }

  // Read the private key
  const privateKey = fs.readFileSync(KEY_FILE);

  // Calculate timestamps
  const now = Math.floor(Date.now() / 1000);
  const expiration = now + 15777000; // 6 months (max allowed)

  // Generate JWT
  const token = jwt.sign(
    {
      iss: TEAM_ID,
      iat: now,
      exp: expiration,
      aud: 'https://appleid.apple.com',
      sub: CLIENT_ID,
    },
    privateKey,
    {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: KEY_ID,
      },
    }
  );

  console.log('\n✅ Apple Client Secret Generated!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Add this to your .env.local file:\n');
  console.log(`APPLE_CLIENT_SECRET=${token}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 Full configuration:');
  console.log(`   APPLE_CLIENT_ID=${CLIENT_ID}`);
  console.log(`   APPLE_CLIENT_SECRET=${token}`);
  console.log(`   APPLE_APP_BUNDLE_IDENTIFIER=com.thomasscheiber.finance\n`);
  console.log('⏰ This token expires in 6 months.');
  console.log('   Regenerate before expiration using this script.\n');

} catch (error) {
  console.error('❌ Error generating JWT:', error.message);
  if (error.message.includes('ENOENT')) {
    console.error('\n💡 Make sure the .p8 key file path is correct!');
  } else if (error.message.includes('PEM')) {
    console.error('\n💡 Make sure the .p8 file is valid and not corrupted!');
  }
  process.exit(1);
}

