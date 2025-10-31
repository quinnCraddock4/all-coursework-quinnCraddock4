import Joi from 'joi';

const formatErrorDetails = (details) => {
    return details.map((detail) => ({
        message: detail.message,
        path: detail.path,
        type: detail.type,
    }));
};

const validate = (schema, options = {}) => {
    const { location = 'body' } = options;

    return (req, res, next) => {
        const data = req[location] ?? {};
        const { value, error } = schema.validate(data, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: formatErrorDetails(error.details),
            });
        }

        if (location === 'query' || location === 'params') {
            const target = req[location] ?? {};
            Object.keys(target).forEach((key) => {
                if (!(key in value)) {
                    delete target[key];
                }
            });
            Object.assign(target, value);
        } else {
            req[location] = value;
        }
        return next();
    };
};

export default validate;

