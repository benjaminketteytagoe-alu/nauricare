/*
  # Add Admin Authentication

  1. Changes
    - Enable auth.users table access for admin users
    - Add admin_users table to track admin accounts
    - Set up RLS policies for admin access to waitlist_signups
  
  2. Security
    - Only authenticated admin users can view all waitlist signups
    - Admin status is stored securely in admin_users table
    - RLS ensures proper access control
*/

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their own record"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all waitlist signups"
  ON waitlist_signups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );
