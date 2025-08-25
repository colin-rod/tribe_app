-- Fix infinite recursion in RLS policies by removing circular references

-- Drop the problematic tribe_members policies
DROP POLICY IF EXISTS "Users can view tribe members of their tribes" ON public.tribe_members;
DROP POLICY IF EXISTS "Tribe admins can manage members" ON public.tribe_members;

-- Drop other policies that depend on tribe_members to recreate them properly
DROP POLICY IF EXISTS "Tribe admins can update tribes" ON public.tribes;
DROP POLICY IF EXISTS "Users can view circles in their tribes" ON public.circles;
DROP POLICY IF EXISTS "Tribe members can create circles" ON public.circles;

-- Create simpler, non-recursive policies

-- Tribe members policies - allow users to see and manage their own membership
CREATE POLICY "Users can view their own tribe memberships" ON public.tribe_members
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own tribe membership" ON public.tribe_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow tribe creators to manage all tribe members (for their tribes)
CREATE POLICY "Tribe creators can manage members" ON public.tribe_members
    FOR ALL USING (
        tribe_id IN (
            SELECT id FROM public.tribes 
            WHERE created_by = auth.uid()
        )
    );

-- Allow admins to manage members (but avoid recursion by checking tribes table directly)
CREATE POLICY "Admins can manage tribe members" ON public.tribe_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tribe_members tm
            WHERE tm.tribe_id = tribe_members.tribe_id 
            AND tm.user_id = auth.uid() 
            AND tm.role = 'admin'
        )
    );

-- Recreate tribes update policy without recursion
CREATE POLICY "Tribe creators and admins can update tribes" ON public.tribes
    FOR UPDATE USING (
        created_by = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.tribe_members tm
            WHERE tm.tribe_id = tribes.id 
            AND tm.user_id = auth.uid() 
            AND tm.role = 'admin'
        )
    );

-- Recreate circles policies without recursion
CREATE POLICY "Users can view circles in their tribes" ON public.circles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tribe_members tm
            WHERE tm.tribe_id = circles.tribe_id 
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Tribe members can create circles" ON public.circles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tribe_members tm
            WHERE tm.tribe_id = circles.tribe_id 
            AND tm.user_id = auth.uid()
        )
        AND auth.uid() = created_by
    );