# Supabase Database Setup for Teach.sg

This guide helps you set up the authentication and usage tracking database for your Teach.sg platform.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/login and create a new project
3. Choose a database password
4. Wait for the project to be ready

## 2. Database Schema

Run these SQL commands in the Supabase SQL Editor:

### Create user profiles table
```sql
-- User profiles for additional user data
CREATE TABLE user_profiles (
    user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'student', 'premium')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();
```

### Create usage tracking table
```sql
-- Daily usage tracking
CREATE TABLE user_usage (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    date DATE DEFAULT CURRENT_DATE,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own usage
CREATE POLICY "Users can view own usage" ON user_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON user_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON user_usage
    FOR UPDATE USING (auth.uid() = user_id);

-- Index for better performance
CREATE INDEX idx_user_usage_user_date ON user_usage(user_id, date);
```

## 3. Environment Variables

Add these to your Cloudflare Pages environment variables:

1. Go to Cloudflare Dashboard → Pages → teach-sg-cloudflare → Settings → Environment variables

2. Add production variables:
   - `SUPABASE_URL`: Your Supabase project URL (found in Project Settings → API)
   - `SUPABASE_ANON_KEY`: Your Supabase anon/public key (found in Project Settings → API)

## 4. Authentication Configuration

In Supabase Dashboard → Authentication → Settings:

1. **Site URL**: `https://teach-sg-cloudflare.pages.dev`
2. **Redirect URLs**:
   - `https://teach-sg-cloudflare.pages.dev`
   - `https://teach-sg-cloudflare.pages.dev/auth.html`

## 5. Usage Limits

The system implements these daily limits:

- **Free**: 10 AI questions per day
- **Student**: 100 AI questions per day
- **Premium**: Unlimited questions

## 6. Testing

1. Deploy your changes to Cloudflare Pages
2. Visit your site and try to sign up
3. Check the Supabase dashboard to see if users are being created
4. Test the chat functionality with usage limits

## 7. Optional: Email Templates

In Supabase Dashboard → Authentication → Email Templates, customize:

- **Confirm signup**: Welcome message for new users
- **Magic Link**: For passwordless login (optional)
- **Change Email Address**: Email change confirmation

## Usage Flow

1. User signs up → `user_profiles` record created automatically
2. User asks AI question → Check `user_usage` for today's count
3. If under limit → Allow question and increment count
4. If over limit → Show upgrade message

Your authentication system is now ready! 🎉