
-- Add RLS policies for financial_transactions table
-- Allow authenticated users to view financial transactions (for admin reports)
CREATE POLICY "Allow authenticated users to view financial transactions" 
ON public.financial_transactions 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow the system to insert financial transaction records (for triggers)
CREATE POLICY "Allow system to insert financial transactions" 
ON public.financial_transactions 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow the system to update financial transaction records if needed
CREATE POLICY "Allow system to update financial transactions" 
ON public.financial_transactions 
FOR UPDATE 
TO authenticated 
USING (true);
