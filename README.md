# Docs Manager

> **A Secure, Google Drive-Powered Family Document Management Progressive Web Application (PWA)**  
> *Private In-Browser Offline Storage • WebCrypto AES-GCM 256-bit • In-Browser Smart PDF Builder • 100% Static & Free on GitHub Pages*

---

## 🌟 Overview

**Docs Manager** is a production-grade Progressive Web Application designed for families to securely organize, access, preview, and combine important documents (Aadhar, PAN, Passports, Bank Statements, Property Deeds, Insurance Policies, Degrees, Medical Records) using **Google Drive as the primary and actual cloud storage provider**.

### 🔒 Key Architectural Pillars

1. **Zero Mandatory Paid Infrastructure**: Deploys as a 100% static web app directly on **GitHub Pages** or runs locally via **VS Code Live Server**. No backend servers, Cloudflare Workers, Supabase, or Firebase required.
2. **Google Drive Integration (API v3 + GIS)**: Connects directly to existing shared Google Drive folders (e.g. Papa's shared family documents folder) through your authenticated Google account.
3. **Smart Offline Sync (IndexedDB + WebCrypto)**: "Keep Offline" downloads documents into private, browser-sandboxed IndexedDB encrypted with **AES-GCM 256-bit**. Files are **NEVER** dumped into public device Downloads folders.
4. **Long-Term Offline Access (6+ Months Inactivity)**: Encryption key lifecycles are completely decoupled from transient Google OAuth tokens. If your Google session expires months later, **all previously synchronized offline documents remain 100% viewable and searchable offline**.
5. **Document Collection & Smart PDF Builder**: Select multiple IDs and PDFs across different Google Drive folders and combine them into a single, merged PDF locally in your browser using `pdf-lib`. Download the PDF or save it back to Google Drive.

---

## 🚀 Quick Start with VS Code Live Server (Zero Node.js Required!)

Because Docs Manager is engineered with modern browser-native ES Modules:
1. Open this project folder in VS Code or Antigravity IDE.
2. Right-click [`index.html`](file:///s:/Antigravity%20Projects/Docs%20Manager/index.html) and select **"Open with Live Server"** (or click "Go Live" on the bottom status bar).
3. The app opens at `http://127.0.0.1:5500/index.html`.
4. You are greeted by the **Interactive Demo Mode** populated with realistic sample family documents (Aadhar, PAN, Bank Statements, Degrees). You can preview documents, test Keep Offline, and generate merged PDFs immediately!

---

## ☁️ Google Cloud & OAuth Configuration (Free Setup)

To connect your real Google Drive account, follow these one-time steps in the [Google Cloud Console](https://console.cloud.google.com/):

### Step 1: Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top and select **New Project**. Name it `Docs-Manager-Family`.

### Step 2: Enable Google Drive API v3
1. In the left navigation, go to **APIs & Services** > **Library**.
2. Search for **Google Drive API**.
3. Click **Enable**.

### Step 3: Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**.
2. Select User Type: **External** (or **Internal** if using Google Workspace).
3. Fill in:
   - App name: `Docs Manager`
   - User support email: `your-email@gmail.com`
   - Developer contact email: `your-email@gmail.com`
4. Under **Scopes**, click **Add or Remove Scopes** and add:
   - `https://www.googleapis.com/auth/drive` (Required to discover and manage existing shared family folders created by Papa).
5. Under **Test Users**, add your family Google account email addresses.

### Step 4: Create OAuth 2.0 Web Client ID
1. Go to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. Application Type: **Web application**.
4. Name: `Docs Manager Web Client`.
5. Under **Authorized JavaScript origins**, add:
   - `http://127.0.0.1:5500` (for VS Code Live Server)
   - `http://localhost:5500`
   - `https://<your-github-username>.github.io` (for GitHub Pages)
6. Click **Create**. Copy your **Client ID** (looks like `123456789-abcdef.apps.googleusercontent.com`).
7. Paste this Client ID into `js/config.js` inside `APP_CONFIG.GOOGLE_CLIENT_ID`. This makes your app work instantly on any device (your phone, your friend's phone, laptop) without having to re-enter it!

---

## 📁 Google Colab-Style Automatic Folder Setup

Just like **Google Colab** automatically creates a `Colab Notebooks` folder in Google Drive:

1. **Automatic Detection & Creation**:
   - When you click **Connect Drive** and log in with your Google Account, Docs Manager automatically checks if a folder named `Docs Manager` exists in your Google Drive.
   - **If it exists**: It connects immediately and displays all your family documents!
   - **If it does NOT exist**: Docs Manager automatically creates a brand new `Docs Manager` folder in your Google Drive with organized starter subfolders (`01_Personal_IDs`, `02_Finance_Banking`, `03_Property_Legal`, `04_Education_Career`, `05_Medical_Insurance`)!
   - **Zero manual link pasting required!**

2. **Shared Family Folders (Papa & You)**:
   - If Papa created the `Docs Manager` folder in his Drive and shared it with you (Editor permission), Docs Manager automatically finds it via Google Drive API search.
   - You can also optionally paste any custom shared folder link in the Setup/Settings modal anytime.

---

## 🛡️ Security & Privacy Architecture

### 1. Scope Evaluation (`drive` vs `drive.file`)
Google's restricted `drive.file` scope only grants access to files *created by the application itself*. It cannot discover or list pre-existing shared family folders created by someone else (e.g. Papa's folder). Therefore, Docs Manager uses the `https://www.googleapis.com/auth/drive` scope so all pre-existing family records can be discovered recursively. To ensure privacy, Docs Manager enforces **client-side root folder boundary validation**—no operation is ever permitted outside your configured root folder.

### 2. Private In-App Storage vs Device Downloads
- **Keep Offline**: Encrypts the raw file buffer using **WebCrypto AES-GCM 256-bit** and stores it in the browser's private **IndexedDB sandbox**. Documents are **NEVER** exported to Android/Desktop `Downloads` or file managers. Offline previews are rendered safely in-app.
- **Download**: An intentional export action only triggered when the user explicitly clicks the Download button.

### 3. Long-Term Offline Key Lifecycle
Unlike naive implementations that tie file decryption to the Google OAuth access token (which expires after 1 hour), Docs Manager uses a browser-bound WebCrypto vault key stored in IndexedDB. If the user does not open the app for 6 months and the Google session has lapsed, **all previously synchronized offline documents remain 100% readable offline**.

### 4. Browser Encryption Limitations Disclosures
Client-side WebCrypto encryption protects stored records on your physical disk from file-system scraping and unauthorized web workers. However, users should maintain device passcodes/biometrics because physical access to an unlocked browser profile with developer tools could inspect memory.

### 5. Secure Logout Choices
Docs Manager provides two distinct logout actions in Settings:
1. **Logout (Retain Offline Copies)**: Clears Google OAuth access tokens while preserving your offline documents.
2. **Logout & Wipe All Local Data**: Completely purges IndexedDB encrypted documents, clears encryption keys, wipes metadata cache, and resets app preferences.

---

## 📑 In-Browser Document Collection & Smart PDF Builder

The Collection system allows cross-folder selection without altering Google Drive:
- Select `Aadhar.jpg` from `Papa/Personal/`
- Select `PAN.png` from `My Documents/Personal/`
- Select `BankStatement.pdf` from `Papa/Banking/`
- Reorder them in the Collection workspace.
- Click **Create Combined PDF**:
  - Compiles 100% locally in the browser using `pdf-lib`.
  - Converts images (JPG, PNG, WebP) to PDF pages.
  - Merges existing PDFs preserving original page order.
  - Page size (A4, Letter, Original), orientation, margins, and image fit controls.
  - Preview in-app, **Download to Device**, or **Save to Google Drive**.

---

## 🚢 GitHub Pages Deployment

This repository includes an automated GitHub Actions deployment workflow at [`.github/workflows/deploy.yml`](file:///s:/Antigravity%20Projects/Docs%20Manager/.github/workflows/deploy.yml).

To deploy:
1. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial Docs Manager PWA"
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. In your GitHub repository:
   - Go to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. The workflow runs automatically and your PWA will be live at `https://<your-username>.github.io/<repo-name>/`.
4. Ensure `https://<your-username>.github.io` is added to **Authorized JavaScript origins** in Google Cloud Console!

---

## 📱 PWA Installation

- **Desktop (Chrome/Edge)**: Click the **Install App** button in the header or the install icon in the browser address bar.
- **Android**: Tap the browser menu (three dots) > **Install app** or **Add to Home screen**.
- **iOS (Safari)**: Tap the Share button > **Add to Home Screen**.
