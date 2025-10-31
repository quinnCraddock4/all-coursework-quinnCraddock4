import { ObjectId } from '../database.js';

const validId = (paramName) => (req, res, next) => {
    const value = req.params[paramName];

    if (!value || !ObjectId.isValid(value)) {
        return res.status(400).json({ message: `Invalid value for parameter ${paramName}` });
    }

    return next();
};

export default validId;

