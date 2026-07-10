# Integrate Google Gemini Web App via Tauri WebviewWindow

The goal of this feature is to allow users to click an "S" icon in the UI, which will open a new Tauri window loading the official Google Gemini web app (`https://gemini.google.com/`). This allows users with a Google Pro subscription to use Gemini Advanced features directly alongside the main application.

## User Review Required

> [!WARNING]
> This plan relies on spoofing the User-Agent to bypass Google's "insecure browser" login blocks. While this generally works, Google occasionally updates their detection methods. If the login process ever breaks in the future, we may need to update the User-Agent string.

## Open Questions

> [!NOTE]
> 1. Where exactly should the "S" icon be placed in the current layout? (e.g., in the `Sidebar.tsx` near the user profile, or floating in `App.tsx`?)
> 2. Should the new Gemini window have a fixed size, or should it open maximized?
> 3. Do we want to persist the login session for the new window across app restarts? (Tauri WebView2 generally handles this automatically, but we might want to configure a specific data directory).

## Proposed Changes

We will create a new Tauri command or directly use the Tauri WebView API from the frontend to launch the window.

### Frontend (React)

#### [MODIFY] [App.tsx](file:///d:/PythonProjects/Apkirota/src/App.tsx)
- Import the Tauri `WebviewWindow` API.
- Add an `openGeminiWeb` function that creates a new window:
  ```typescript
  import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

  const openGeminiWeb = async () => {
    const webview = new WebviewWindow('gemini-web', {
      url: 'https://gemini.google.com/',
      title: 'Google Gemini',
      width: 1024,
      height: 768,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    
    webview.once('tauri://error', function (e) {
      console.error('Error creating webview:', e);
    });
  };
  ```
- Integrate the `openGeminiWeb` function into the "S" icon `onClick` handler.

### Backend (Rust/Tauri) (If needed)

#### [MODIFY] [src-tauri/tauri.conf.json](file:///d:/PythonProjects/Apkirota/src-tauri/tauri.conf.json)
- Ensure that the application has permissions to create new windows dynamically if we are using Tauri v2.
- Example permissions needed in capabilities: `window:create`, `webview:create`.

## Verification Plan

### Manual Verification
- Click the "S" icon in the main UI.
- Verify a new window titled "Google Gemini" opens.
- Navigate the Google Login flow inside this new window.
- Confirm that the login succeeds without the "This browser or app may not be secure" error.
- Verify that Google Pro features (Gemini Advanced) are accessible once logged in.
- Close the window and reopen it to ensure the session persists properly.
