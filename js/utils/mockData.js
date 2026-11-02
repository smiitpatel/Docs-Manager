/**
 * Docs Manager - Realistic Family Demo Data
 * Allows immediate exploration in Live Server with real sample document previews,
 * offline synchronization testing, and PDF merging even before configuring Google Cloud.
 */

// Generate a valid minimal PDF base64 string
const SAMPLE_PDF_BASE64 = 
  "JVBERi0xLjcKCjEgMCBvYmogICUgw6DFxdPzCiAgPDwKICAgIC9UeXBlIC9DYXRhbG9nCiAgICAv" +
  "UGFnZXMgMiAwIFIKICA+PgplbmRvYmoKCjIgMCBvYmogCiAgPDwKICAgIC9UeXBlIC9QYWdlcwog" +
  "ICAgL0tpZHMgWzMgMCBSXQogICAgL0NvdW50IDEKICA+PgplbmRvYmoKCjMgMCBvYmogCiAgPDwK" +
  "ICAgIC9UeXBlIC9QYWdlCiAgICAvUGFyZW50IDIgMCBSCiAgICAvTWVkaWFCb3ggWzAgMCA2MTIg" +
  "NzkyXQogICAgL1Jlc291cmNlcyA8PAogICAgICAvRm9udCA8PAogICAgICAgIC9GMSA0IDAgUgot" +
  "ICAgID4+CiAgICA+PgogICAgL0NvbnRlbnRzIDUgMCBSCiAgPj4KZW5kb2JqCgo0IDAgb2JqCiAg" +
  "PDwKICAgIC9UeXBlIC9Gb250CiAgICAvU3VidHlwZSAvVHlwZTEKICAgIC9CYXNlRm9udCAvSGVs" +
  "dmV0aWNhCiAgPj4KZW5kb2JqCgo1IDAgb2JqCiAgPDwKICAgIC9MZW5ndGggMTI4CiAgPj4Kc3Ry" +
  "ZWFtCkJUCi9GMSAxOCBUZgoxMDAgNzUwIFRkCihET0NTIE1BTkFHRVIgLSBGT1JNQUwgU0FNUExF" +
  "IERPQ1VNRU5UKSBUagowIC0zMCBUZAovRjEgMTIgVGYKKFRoaXMgaXMgYSB2ZXJpZmllZCBzYW1w" +
  "bGUgZmFtaWx5IGRvY3VtZW50IGluIERvY3MgTWFuYWdlci4pIFRqCkVUCmVuZHN0cmVhbQplbmRv" +
  "YmoKCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAw" +
  "MDAwMDgyIDAwMDAwIG4gCjAwMDAwMDAxNDQgMDAwMDAgbiAKMDAwMDAwMDI3MSAwMDAwMCBuIAow" +
  "MDAwMDAwMzU1IDAwMDAwIG4gCnRyYWlsZXIKICA8PAogICAgL1Jvb3QgMSAwIFIKICAgIC9TaXpl" +
  "IDYKICA+PgpzdGFydHhyZWYKNTM4CiUlRU9G";

// Generate an SVG data URL for sample ID documents (Aadhar, PAN, License)
function createCardDataUrl(title, subtitle, color = '#2563EB') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
    <rect width="600" height="380" rx="20" fill="#0F172A" stroke="${color}" stroke-width="4"/>
    <rect x="20" y="20" width="560" height="60" rx="10" fill="${color}" opacity="0.2"/>
    <text x="40" y="58" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#F8FAFC">${title}</text>
    <rect x="40" y="110" width="120" height="150" rx="8" fill="#1E293B" stroke="#475569" stroke-width="2"/>
    <circle cx="100" cy="160" r="32" fill="#64748B"/>
    <path d="M60 230 C60 200, 140 200, 140 230 Z" fill="#64748B"/>
    <text x="190" y="140" font-family="Arial, sans-serif" font-size="16" fill="#94A3B8">DOCUMENT HOLDER</text>
    <text x="190" y="170" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#F8FAFC">${subtitle}</text>
    <text x="190" y="210" font-family="Courier, monospace" font-size="18" fill="#38BDF8">XXXX - XXXX - 9821</text>
    <rect x="40" y="290" width="520" height="60" rx="8" fill="#1E293B"/>
    <text x="60" y="325" font-family="Arial, sans-serif" font-size="14" fill="#10B981">✓ VERIFIED FAMILY RECORD - DOCS MANAGER SECURE STORAGE</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export const MOCK_ROOT_FOLDER_ID = 'mock_root_family_docs_12345';

export const INITIAL_MOCK_TREE = {
  id: MOCK_ROOT_FOLDER_ID,
  name: 'Docs Manager',
  mimeType: 'application/vnd.google-apps.folder',
  parents: [],
  folders: [
    {
      id: 'folder_papa',
      name: 'Papa',
      mimeType: 'application/vnd.google-apps.folder',
      parentId: MOCK_ROOT_FOLDER_ID,
      folders: [
        {
          id: 'folder_papa_personal',
          name: 'Personal',
          mimeType: 'application/vnd.google-apps.folder',
          parentId: 'folder_papa',
          files: [
            {
              id: 'file_papa_aadhar',
              name: 'Aadhar_Card_Papa.jpg',
              mimeType: 'image/jpeg',
              size: 245000,
              modifiedTime: '2026-08-15T10:30:00.000Z',
              dataUrl: createCardDataUrl('GOVERNMENT OF INDIA - AADHAAR', 'PAPA SMITH', '#2563EB'),
              category: 'Personal',
              parentId: 'folder_papa_personal',
              path: 'Papa / Personal'
            },
            {
              id: 'file_papa_pan',
              name: 'PAN_Card_Papa.png',
              mimeType: 'image/png',
              size: 198000,
              modifiedTime: '2026-07-20T14:15:00.000Z',
              dataUrl: createCardDataUrl('INCOME TAX DEPARTMENT - PAN', 'PAPA SMITH', '#10B981'),
              category: 'Personal',
              parentId: 'folder_papa_personal',
              path: 'Papa / Personal'
            }
          ]
        },
        {
          id: 'folder_papa_banking',
          name: 'Banking',
          mimeType: 'application/vnd.google-apps.folder',
          parentId: 'folder_papa',
          files: [
            {
              id: 'file_papa_bank_statement',
              name: 'HDFC_Bank_Statement.pdf',
              mimeType: 'application/pdf',
              size: 450000,
              modifiedTime: '2026-10-01T09:00:00.000Z',
              pdfBase64: SAMPLE_PDF_BASE64,
              category: 'Banking',
              parentId: 'folder_papa_banking',
              path: 'Papa / Banking'
            }
          ]
        },
        {
          id: 'folder_papa_property',
          name: 'Property',
          mimeType: 'application/vnd.google-apps.folder',
          parentId: 'folder_papa',
          files: [
            {
              id: 'file_papa_house_deed',
              name: 'House_Registry_Deed.pdf',
              mimeType: 'application/pdf',
              size: 1250000,
              modifiedTime: '2026-05-12T11:45:00.000Z',
              pdfBase64: SAMPLE_PDF_BASE64,
              category: 'Property',
              parentId: 'folder_papa_property',
              path: 'Papa / Property'
            }
          ]
        },
        {
          id: 'folder_papa_insurance',
          name: 'Insurance',
          mimeType: 'application/vnd.google-apps.folder',
          parentId: 'folder_papa',
          files: [
            {
              id: 'file_papa_lic',
              name: 'Life_Insurance_Policy.pdf',
              mimeType: 'application/pdf',
              size: 680000,
              modifiedTime: '2026-04-18T16:20:00.000Z',
              pdfBase64: SAMPLE_PDF_BASE64,
              category: 'Insurance',
              parentId: 'folder_papa_insurance',
              path: 'Papa / Insurance'
            }
          ]
        }
      ]
    },
    {
      id: 'folder_my_docs',
      name: 'My Documents',
      mimeType: 'application/vnd.google-apps.folder',
      parentId: MOCK_ROOT_FOLDER_ID,
      folders: [
        {
          id: 'folder_my_personal',
          name: 'Personal',
          mimeType: 'application/vnd.google-apps.folder',
          parentId: 'folder_my_docs',
          files: [
            {
              id: 'file_my_license',
              name: 'Driving_License.png',
              mimeType: 'image/png',
              size: 320000,
              modifiedTime: '2026-09-10T12:00:00.000Z',
              dataUrl: createCardDataUrl('TRANSPORT DEPARTMENT - DRIVING LICENSE', 'MY ACCOUNT', '#F59E0B'),
              category: 'Personal',
              parentId: 'folder_my_personal',
              path: 'My Documents / Personal'
            }
          ]
        },
        {
          id: 'folder_my_education',
          name: 'Education',
          mimeType: 'application/vnd.google-apps.folder',
          parentId: 'folder_my_docs',
          files: [
            {
              id: 'file_my_degree',
              name: 'BTech_Degree_Certificate.pdf',
              mimeType: 'application/pdf',
              size: 890000,
              modifiedTime: '2026-06-25T15:30:00.000Z',
              pdfBase64: SAMPLE_PDF_BASE64,
              category: 'Education',
              parentId: 'folder_my_education',
              path: 'My Documents / Education'
            }
          ]
        },
        {
          id: 'folder_my_banking',
          name: 'Banking',
          mimeType: 'application/vnd.google-apps.folder',
          parentId: 'folder_my_docs',
          files: [
            {
              id: 'file_my_form16',
              name: 'Form16_Annual_Tax.pdf',
              mimeType: 'application/pdf',
              size: 540000,
              modifiedTime: '2026-07-30T10:10:00.000Z',
              pdfBase64: SAMPLE_PDF_BASE64,
              category: 'Banking',
              parentId: 'folder_my_banking',
              path: 'My Documents / Banking'
            }
          ]
        }
      ]
    },
    {
      id: 'folder_shared',
      name: 'Shared',
      mimeType: 'application/vnd.google-apps.folder',
      parentId: MOCK_ROOT_FOLDER_ID,
      folders: [
        {
          id: 'folder_shared_family',
          name: 'Family',
          mimeType: 'application/vnd.google-apps.folder',
          parentId: 'folder_shared',
          files: [
            {
              id: 'file_family_health',
              name: 'Family_Health_Checkup.pdf',
              mimeType: 'application/pdf',
              size: 720000,
              modifiedTime: '2026-09-02T13:40:00.000Z',
              pdfBase64: SAMPLE_PDF_BASE64,
              category: 'Medical',
              parentId: 'folder_shared_family',
              path: 'Shared / Family'
            }
          ]
        },
        {
          id: 'folder_shared_important',
          name: 'Important',
          mimeType: 'application/vnd.google-apps.folder',
          parentId: 'folder_shared',
          files: [
            {
              id: 'file_vehicle_rc',
              name: 'Vehicle_RC_Book.pdf',
              mimeType: 'application/pdf',
              size: 430000,
              modifiedTime: '2026-03-14T08:20:00.000Z',
              pdfBase64: SAMPLE_PDF_BASE64,
              category: 'Government',
              parentId: 'folder_shared_important',
              path: 'Shared / Important'
            }
          ]
        }
      ]
    }
  ]
};

/**
 * Convert base64 sample PDF to ArrayBuffer for testing offline encryption & PDF merging
 */
export function getSamplePdfArrayBuffer() {
  const binaryString = atob(SAMPLE_PDF_BASE64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
