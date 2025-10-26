-- Create waitlist signups table
CREATE TABLE public.waitlist_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email_or_phone TEXT NOT NULL,
  country TEXT NOT NULL,
  language TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'provider', 'partner')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert (public waitlist)
CREATE POLICY "Anyone can join waitlist" 
ON public.waitlist_signups 
FOR INSERT 
WITH CHECK (true);

-- Create policy for reading (only for authenticated users - future admin access)
CREATE POLICY "Authenticated users can view signups" 
ON public.waitlist_signups 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create index for efficient queries
CREATE INDEX idx_waitlist_created_at ON public.waitlist_signups(created_at DESC);
CREATE INDEX idx_waitlist_role ON public.waitlist_signups(role);