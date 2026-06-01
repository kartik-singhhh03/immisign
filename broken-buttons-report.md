# Button Audit Report (Phase 4A)

**Status:** Awaiting Manual Browser Verification
**Note:** As per instructions, no item has been marked PASS until verified manually in the browser. 

The following buttons have been identified through static code analysis. Many missing `disabled` or `loading` states have been flagged for manual verification.

## 1. Send Document Flow (`SendDocumentPage.tsx`)
- **"Change Document" Button**:
  - `onClick` works.
  - *Missing*: Loading/Disabled state during file parsing.
  - **Status**: [ ] UNVERIFIED
- **"Choose File" Button**:
  - `onClick` works (triggers hidden input).
  - **Status**: [ ] UNVERIFIED
- **"Assign Signers ->" Button**:
  - `disabled={!uploadedFile}` is correctly set.
  - **Status**: [ ] UNVERIFIED
- **"Add Recipient Signer" Button**:
  - `onClick={addSigner}` works.
  - *Missing*: Disabled state if maximum signers reached.
  - **Status**: [ ] UNVERIFIED
- **"Trash" (Remove Signer) Button**:
  - `disabled={signersList.length <= 1}` is correctly set.
  - **Status**: [ ] UNVERIFIED
- **"Email Customise ->" Button**:
  - `disabled={signersList.some(s => !s.name || !s.email)}` is correctly set.
  - **Status**: [ ] UNVERIFIED
- **"Review Packet ->" Button**:
  - `onClick` works.
  - **Status**: [ ] UNVERIFIED
- **"Sign & Dispatch to Recipients ->" Button**:
  - `onClick={triggerDispatch}` works.
  - *Missing*: Disabled state when `triggerDispatch` is actively running, allowing double submissions!
  - **Status**: [ ] UNVERIFIED (Needs fix for double click prevention)

## 2. Agreement Wizard (`agreement-wizard.tsx`)
- **"Generate Document" / "Send for Signature" Button**:
  - `disabled={saving}` is correctly set.
  - **Status**: [ ] UNVERIFIED
- **"Next Step" Button**:
  - **Status**: [ ] UNVERIFIED

## 3. Settings (`SettingsPage.tsx`)
- **"Save Profile" Button (Agency)**:
  - `onClick` triggers toast.
  - *Missing*: No actual backend saving logic attached yet (`loading` state absent).
  - **Status**: [ ] UNVERIFIED
- **"Save Branding" Button**:
  - `onClick={handleSaveBranding}` present.
  - *Missing*: Missing `disabled={isSaving}` state.
  - **Status**: [ ] UNVERIFIED
- **"Send Invite Link" Button (Team)**:
  - `disabled={inviting}` is correctly set.
  - **Status**: [ ] UNVERIFIED

## 4. Clients (`ClientsPage.tsx` / `ClientDetailPage.tsx`)
- **"Save Client Profile" Button**:
  - Form submit button. 
  - *Missing*: `loading` or `disabled` state during submission.
  - **Status**: [ ] UNVERIFIED

## 5. Other Global Buttons
- **Sidebar Nav Links (as Buttons)**:
  - Verify active/inactive states visually.
  - **Status**: [ ] UNVERIFIED
- **Pagination Buttons**:
  - *Missing*: Often lack `disabled` state on first/last page.
  - **Status**: [ ] UNVERIFIED

## Action Items
1. Add `isSubmitting` state to all form submission buttons.
2. Prevent double-click on dispatch/API buttons.
3. Manually verify hover states and click areas for icon-only buttons.
