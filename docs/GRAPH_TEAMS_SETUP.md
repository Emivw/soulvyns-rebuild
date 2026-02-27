# Microsoft Graph & Teams Meeting Setup

Common errors and fixes:

- **"Insufficient privileges"** → API permissions and/or application access policy (sections 1 and 2 below).
- **"AADSTS500014: The service principal for resource '...' is disabled"** → The app (Enterprise Application) is disabled in the tenant; see [Service principal disabled](#service-principal-disabled-aadsts500014) below.

---

## Service principal disabled (AADSTS500014)

This error means the **service principal** (Enterprise Application) for your app is **disabled** in the tenant. Tokens cannot be issued until it is enabled.

**Fix:**

1. Go to **Microsoft Entra (Azure) Portal** → **Enterprise applications** (not App registrations).
2. Find your app (search by name or paste your **Application (client) ID** – the same as `GRAPH_CLIENT_ID`).
3. Open the app → **Properties**.
4. Set **Enabled for users to sign-in?** to **Yes** (if it was No).
5. If you see a **Status** or “Disabled” anywhere, enable the application and save.

**If the app was disabled due to a lapsed subscription:** Renew or restore the tenant’s Microsoft 365 / Azure subscription. An admin may have disabled the app when a trial ended; re-enable the Enterprise Application as above after the subscription is active.

---

## 1. Application permissions (Azure Portal)

1. Go to **Microsoft Entra (Azure) Portal** → **App registrations** → your app (the one whose **Application (client) ID** is in `GRAPH_CLIENT_ID`).
2. Open **API permissions** → **Add a permission**.
3. Choose **Microsoft Graph** → **Application permissions**.
4. Add these **Application** permissions (not Delegated):
   - **OnlineMeetings.ReadWrite.All** – create online meetings on behalf of users
   - **User.Read.All** – read any user by email (needed to resolve the organizer’s object ID; **User.Read** delegated is not enough for app-only calls)
5. Click **Grant admin consent for [your tenant]**.

---

## 2. Application access policy (required for creating meetings on behalf of a user)

Graph application permissions alone are not enough. The tenant admin must allow your **app** to create online meetings **on behalf of** the organizer user (e.g. **admin@soulvyns.co.za**) by creating and granting an **application access policy** in **Skype for Business Online / Teams PowerShell**.

**There is no Azure portal or Graph API for this.** The policy lives in the Teams/Skype backend; Microsoft only supports creating and granting it via the Teams PowerShell module (`New-CsApplicationAccessPolicy`, `Grant-CsApplicationAccessPolicy`).

### Step A: Get IDs

- **App ID**: same as `GRAPH_CLIENT_ID` (Application (client) ID in App registration).
- **User object ID** for the organizer (e.g. admin@soulvyns.co.za):  
  **Entra Portal** → **Users** → open the user → copy **Object ID**.

### Step B: Use Windows PowerShell 5.1 (not PowerShell 7)

If you don’t have it:

```powershell
Install-Module -Name MicrosoftTeams -Force
```

Open **Windows PowerShell** (Win + X → Windows PowerShell). Use a **work/school account** (e.g. Admin@soulvyns.co.za), not a personal Microsoft account. Then run:

```powershell
Connect-MicrosoftTeams
```

If you get "You must call the Connect-MicrosoftTeams cmdlet before calling any other cmdlets" even after connecting in the same window (or as Administrator), the Cs\* cmdlets run in a nested module that often only sees the session when everything runs in one go. Try these in order:

1. **One-line run (try this first)**  
   Paste and run the **entire line below as a single command** (one Enter). Sign in in the browser when it opens; wait for the prompt to return before the next part runs. Do **not** run `Connect-MicrosoftTeams` on one line and the policy commands on another.
   ```powershell
   Import-Module MicrosoftTeams -Force; Connect-MicrosoftTeams; New-CsApplicationAccessPolicy -Identity "Soulvyns-Meetings" -AppIds "7ba6dbba-d01e-44c4-80c9-a29b1781e923" -Description "Soulvyns create Teams meetings"; Grant-CsApplicationAccessPolicy -PolicyName "Soulvyns-Meetings" -Identity "ce5c3573-2370-4933-b9de-362eefac861c"
   ```
   Replace the AppId and Identity (user Object ID) if yours differ.

2. **Update the module, then retry the one-liner**  
   Run `Update-Module MicrosoftTeams -Force`, **close and reopen** Windows PowerShell, then run the one-line command above again.

3. **Confirm shell**  
   Use **Windows PowerShell 5.1** (Win + X → Windows PowerShell). Check with `$PSVersionTable.PSVersion` (major should be 5).

If it still fails, the Cs\* cmdlets have known session quirks in some tenants; you can open a support request with Microsoft or try from another machine in the same tenant.

### Step C: Create a policy that includes your app

Replace `YOUR_APP_CLIENT_ID` with your actual `GRAPH_CLIENT_ID` (e.g. `ddb80e06-92f3-4978-bc22-a0eee85e6a9e`):

```powershell
New-CsApplicationAccessPolicy -Identity "Soulvyns-Meetings" -AppIds "YOUR_APP_CLIENT_ID" -Description "Allows Soulvyns app to create Teams meetings on behalf of organizers"
```

### Step D: Grant the policy to the organizer user

Replace `ADMIN_USER_OBJECT_ID` with the **Object ID** of **admin@soulvyns.co.za** (from Step A). Example for admin@soulvyns.co.za (Object ID `ce5c3573-2370-4933-b9de-362eefac861c`):

```powershell
Grant-CsApplicationAccessPolicy -PolicyName "Soulvyns-Meetings" -Identity "ce5c3573-2370-4933-b9de-362eefac861c"
```

To allow the app to create meetings on behalf of **all users** in the tenant (optional):

```powershell
Grant-CsApplicationAccessPolicy -PolicyName "Soulvyns-Meetings" -Global
```

### Step E: Wait

Changes can take **up to 30 minutes** to apply. Then try again: **Create test meeting** on `/dev` or **Test Webhook** with a booking.

---

## Summary checklist

- [ ] In App registration: **Application** permissions **OnlineMeetings.ReadWrite.All** and **User.Read.All** added
- [ ] **Admin consent** granted for those permissions
- [ ] **Application access policy** created with your app’s client ID
- [ ] Policy **granted** to the organizer user (admin@soulvyns.co.za’s Object ID) or Global
- [ ] Waited up to 30 minutes after granting the policy

---

## References

- [Configure application access policy for online meetings – Microsoft Learn](https://learn.microsoft.com/en-us/graph/cloud-communication-online-meeting-application-access-policy)
- [Create onlineMeeting (application) – Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/application-post-onlinemeetings)
