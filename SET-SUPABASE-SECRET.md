# Setting Supabase Edge Function Secrets

## Quick Method: Using npx (No Installation Required)

Since Supabase CLI cannot be installed globally via npm, use `npx` to run commands:

### Step 1: Login to Supabase

```powershell
npx supabase login
```

This will open your browser to authenticate.

### Step 2: Link Your Project

```powershell
npx supabase link --project-ref <your-project-ref>
```

You can find your project ref in your Supabase dashboard URL:
- Example: `https://supabase.com/dashboard/project/abcdefghijklmnop`
- Your project ref is: `abcdefghijklmnop`

### Step 3: Set the N8N_SECRET

```powershell
npx supabase secrets set N8N_SECRET=your-secure-secret-key-here
```

**Generate a secure secret:**
```powershell
# Using PowerShell to generate a random string
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Or use an online generator or create a strong password manually.

### Step 4: Verify the Secret

```powershell
npx supabase secrets list
```

## Alternative Installation Methods (Optional)

If you prefer a permanent installation:

### Option A: Install Scoop (Windows Package Manager)

1. Install Scoop:
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   irm get.scoop.sh | iex
   ```

2. Install Supabase CLI:
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

### Option B: Download Binary from GitHub

1. Go to: https://github.com/supabase/cli/releases
2. Download the Windows binary
3. Add it to your PATH

## Using npx (Recommended for Now)

For now, just use `npx` before each command:

```powershell
# Login
npx supabase login

# Link project
npx supabase link --project-ref <your-project-ref>

# Set secret
npx supabase secrets set N8N_SECRET=your-secret-here

# List secrets
npx supabase secrets list

# Deploy function
npx supabase functions deploy get-all-credentials
```

## Troubleshooting

- **"command not found"**: Make sure you're using `npx supabase` instead of just `supabase`
- **Login issues**: Make sure you're authenticated in your browser
- **Project link issues**: Verify your project ref is correct
