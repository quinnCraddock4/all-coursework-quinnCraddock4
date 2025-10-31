const hasRole = (...roles) => {
    const requiredRoles = roles.flat();

    return (req, res, next) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const userRoles = Array.isArray(user.roles)
            ? user.roles
            : typeof user.roles === 'string'
                ? [user.roles]
                : [];

        const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));

        if (!hasRequiredRole) {
            return res.status(403).json({ message: 'Access denied' });
        }

        return next();
    };
};

export default hasRole;

