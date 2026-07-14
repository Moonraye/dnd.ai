# Google OAuth setup (Supabase)

The **code is done** — a "Continue with Google" button on `/login` and `/signup`, plus the `/auth/callback` route. Because this app uses **hosted Supabase**, the Google credentials live in the **Supabase Dashboard**, not in `.env`. Three short config steps remain — all of them handle your OAuth secret, so they're yours to do:

Project ref: **`lpybwauikqovbymbexbm`**

---

## 1. Google Cloud Console — your existing OAuth client
Open your OAuth 2.0 Client ID → and add:

- **Authorized redirect URIs**
  ```
  https://lpybwauikqovbymbexbm.supabase.co/auth/v1/callback
  ```
- **Authorized JavaScript origins**
  ```
  http://localhost:3000
  ```
  (add your production origin too, e.g. `https://yourapp.com`)

Save, then copy the **Client ID** and **Client Secret**.

## 2. Supabase Dashboard — enable the provider
Dashboard → your project → **Authentication → Providers → Google**:
- Toggle **Enable**
- Paste the **Client ID** and **Client Secret** from step 1
- **Save**

## 3. Supabase Dashboard — allow the redirect back to the app
Dashboard → **Authentication → URL Configuration**:
- **Site URL**: your prod URL (or `http://localhost:3000` for now)
- **Redirect URLs** — add:
  ```
  http://localhost:3000/**
  https://yourapp.com/**        (when you deploy)
  ```
  This whitelists `redirectTo = <origin>/auth/callback`.

---

## Done — the flow
`Continue with Google` → Google consent → Supabase (`/auth/v1/callback`) → app `/auth/callback` → session picked up → **/lobby**.

## Notes
- **No `.env` changes are required.** The client uses your existing `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY`.
- **Username:** email/password signups store a `username` in user metadata; Google accounts won't have one, so the header shows the Google account's **email** instead (already handled — `user_metadata.username ?? email`).
- **Same-account linking:** if a user signed up with email/password and later uses Google on the *same* email, Supabase links them only when "Link accounts" / matching-email behavior is enabled; otherwise it may create/complain. Default hosted behavior is usually fine for first-time Google sign-ins.
- **Testing locally:** run the dev server and click "Continue with Google" on `/login`. Until steps 1–3 are done, Supabase returns a "provider is not enabled" error (surfaced under the button).
