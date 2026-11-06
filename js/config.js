/**
 * Docs Manager - Central Application Configuration
 * 
 * Set your Google OAuth 2.0 Web Client ID here once.
 * This enables 1-click "Connect Drive" without needing to type or paste credentials
 * across all devices, incognito windows, or friends' phones!
 */

export const APP_CONFIG = {
  // Google OAuth 2.0 Web Client ID (from Google Cloud Console -> Credentials -> OAuth 2.0 Client IDs)
  // Example: '123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com'
  GOOGLE_CLIENT_ID: '137207085979-n6gasnki3skr9br375qunq54nsjrtptk.apps.googleusercontent.com',

  // The default root folder name on Google Drive (Google Colab style)
  // When you sign in, the app automatically finds this folder in your Drive,
  // or creates it automatically if it doesn't exist yet!
  ROOT_FOLDER_NAME: 'Docs Manager',

  // Default starter subfolders created when a new root folder is initialized on Google Drive
  STARTER_SUBFOLDERS: [
    '01_Personal_IDs',
    '02_Finance_Banking',
    '03_Property_Legal',
    '04_Education_Career',
    '05_Medical_Insurance'
  ]
};
