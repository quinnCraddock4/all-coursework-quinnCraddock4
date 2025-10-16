import express from 'express';
import Joi from 'joi';
import {
    findAllProducts,
    findProductById,
    findProductByName,
    insertProduct,
    updateProduct,
    deleteProduct,
} from '../../database.js';

const router = express.Router();

const productSchema = Joi.object({
    name: Joi.string().trim().min(1),
    description: Joi.string().trim().allow(''),
    category: Joi.string().trim().min(1),
    price: Joi.number().min(0),
});


router.get('/', async (req, res, next) => {
    try {
        const products = await findAllProducts();
        res.status(200).json(products);
    } catch (err) {
        next(err);
    }
});


router.get('/:productId', async (req, res, next) => {
    try {
        const { productId } = req.params;
        const product = await findProductById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.status(200).json(product);
    } catch (err) {
        next(err);
    }
});

router.get('/name/:productName', async (req, res, next) => {
    try {
        const { productName } = req.params;
        const product = await findProductByName(productName);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.status(200).json(product);
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const schema = productSchema.fork(['name', 'category', 'price'], (s) => s.required());
        const { value, error } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({ message: 'Validation failed', details: error.details });
        }
        const created = await insertProduct(value);
        res.status(200).json({ message: 'Created', productId: created._id });
    } catch (err) {
        next(err);
    }
});
router.patch('/:productId', async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { value, error } = productSchema.min(1).validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({ message: 'Validation failed', details: error.details });
        }
        const updated = await updateProduct(productId, value);
        if (!updated) return res.status(404).json({ message: 'Product not found' });
        res.status(200).json({ message: 'Updated', productId });
    } catch (err) {
        next(err);
    }
});

router.delete('/:productId', async (req, res, next) => {
    try {
        const { productId } = req.params;
        const ok = await deleteProduct(productId);
        if (!ok) return res.status(404).json({ message: 'Product not found' });
        res.status(200).json({ message: 'Deleted', productId });
    } catch (err) {
        next(err);
    }
});

export default router;


