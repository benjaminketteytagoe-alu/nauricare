/*
  # Fix Waitlist RLS Policy

  1. Changes
    - Drop the insecure policy with `WITH CHECK (true)`
    - Create a new restrictive policy that validates data
    - Ensure only valid signups can be inserted
  
  2. Security
    - New policy checks that required fields are not empty
    - Validates role is one of the allowed values
    - More restrictive than using `WITH CHECK (true)`
*/

DROP POLICY IF EXISTS "Anyone can join waitlist" ON waitlist_signups;

CREATE POLICY "Public can submit valid waitlist signups"
  ON waitlist_signups
  FOR INSERT
  TO public
  WITH CHECK (
    name IS NOT NULL AND 
    trim(name) != '' AND
    email_or_phone IS NOT NULL AND 
    trim(email_or_phone) != '' AND
    country IS NOT NULL AND 
    trim(country) != '' AND
    language IS NOT NULL AND 
    trim(language) != '' AND
    role IN ('user', 'provider', 'partner')
  );
