-- Fix ambiguous column reference in user_has_permission function

CREATE OR REPLACE FUNCTION user_has_permission(
    check_user_id UUID,
    context_type TEXT,
    context_id UUID,
    permission_name TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = check_user_id
        AND ur.context_type = $2  -- Use parameter reference instead
        AND (ur.context_id = $3 OR (ur.context_type = 'global' AND ur.context_id IS NULL))
        AND p.name = $4
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    );
END;
$$;