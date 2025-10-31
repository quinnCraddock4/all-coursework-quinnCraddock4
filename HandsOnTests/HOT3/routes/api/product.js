import express from 'express';
import Joi from 'joi';

import hasRole from '../../middleware/hasRole.js';
import isAuthenticated from '../../middleware/isAuthenticated.js';
import validate from '../../middleware/validate.js';
import validId from '../../middleware/validId.js';
import {
    deleteProduct,
    findProductById,
    findProductByName,
    insertProduct,
    searchProducts,
    updateProduct,
} from '../../database.js';

const router = express.Router();

const newProductSchema = Joi.object({
    name: Joi.string().trim().min(1).required(),
    description: Joi.string().trim().allow('').default(''),
    category: Joi.string().trim().min(1).required(),
    price: Joi.number().min(0).required(),
});

const updateProductSchema = Joi.object({
    name: Joi.string().trim().min(1),
    description: Joi.string().trim().allow(''),
    category: Joi.string().trim().min(1),
    price: Joi.number().min(0),
}).min(1);

const searchSchema = Joi.object({
    keywords: Joi.string().trim().allow('').empty('').optional(),
    category: Joi.string().trim().allow('').empty('').optional(),
    maxPrice: Joi.number().min(0).optional(),
    minPrice: Joi.number().min(0).optional(),
    sortBy: Joi.string()
        .valid('name', 'category', 'lowestPrice', 'newest')
        .default('name'),
    pageSize: Joi.number().integer().min(1).max(100).default(5),
    pageNumber: Joi.number().integer().min(1).default(1),
});

router.get(
    '/',
    validate(searchSchema, { location: 'query' }),
    async (req, res, next) => {
        try {
            const {
                keywords,
                category,
                maxPrice,
                minPrice,
                sortBy,
                pageSize,
                pageNumber,
            } = req.query;

            const result = await searchProducts({
                keywords,
                category,
                maxPrice,
                minPrice,
                sortBy,
                pageSize,
                pageNumber,
            });

            return res.status(200).json(result);
        } catch (err) {
            return next(err);
        }
    }
);

router.get(
    '/name/:productName',
    isAuthenticated(),
    async (req, res, next) => {
        try {
            const { productName } = req.params;
            const product = await findProductByName(productName);

            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            return res.status(200).json(product);
        } catch (err) {
            return next(err);
        }
    }
);

router.get(
    '/:productId',
    validId('productId'),
    isAuthenticated(),
    async (req, res, next) => {
        try {
            const { productId } = req.params;
            const product = await findProductById(productId);

            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            return res.status(200).json(product);
        } catch (err) {
            return next(err);
        }
    }
);

router.post(
    '/',
    isAuthenticated(),
    hasRole('admin'),
    validate(newProductSchema),
    async (req, res, next) => {
        try {
            const created = await insertProduct(req.body);
            return res.status(200).json({ message: 'Created', productId: created._id });
        } catch (err) {
            if (err?.code === 11000) {
                return res.status(400).json({ message: 'Product name must be unique' });
            }
            return next(err);
        }
    }
);

router.patch(
    '/:productId',
    isAuthenticated(),
    hasRole('admin'),
    validId('productId'),
    validate(updateProductSchema),
    async (req, res, next) => {
        try {
            const { productId } = req.params;
            const updated = await updateProduct(productId, req.body);

            if (!updated) {
                return res.status(404).json({ message: 'Product not found' });
            }

            return res.status(200).json({ message: 'Updated', productId });
        } catch (err) {
            if (err?.code === 11000) {
                return res.status(400).json({ message: 'Product name must be unique' });
            }
            return next(err);
        }
    }
);

router.delete(
    '/:productId',
    isAuthenticated(),
    hasRole('admin'),
    validId('productId'),
    async (req, res, next) => {
        try {
            const { productId } = req.params;
            const deleted = await deleteProduct(productId);

            if (!deleted) {
                return res.status(404).json({ message: 'Product not found' });
            }

            return res.status(200).json({ message: 'Deleted', productId });
        } catch (err) {
            return next(err);
        }
    }
);

export default router;


