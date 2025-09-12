const express = require('express');
const debug = require('debug')('app:server');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5010;

app.use(express.json());

app.post('/api/mpg/calc', (req, res) => {
    const { milesDriven, gallonsUsed } = req.body;

    const miles = parseFloat(milesDriven);
    const gallons = parseFloat(gallonsUsed);

    if (isNaN(miles) || miles <= 0) {
        return res.status(400).send('Invalid milesDriven value.');
    }

    if (isNaN(gallons) || gallons <= 0) {
        return res.status(400).send('Invalid gallonsUsed value.');
    }

    const mpg = (miles / gallons).toFixed(2);
    debug(`Calculated MPG: ${mpg}`);
    res.json({ mpg });
});

app.post('/api/temperature/convert', (req, res) => {
    const { mode, temp } = req.body;

    const temperature = parseFloat(temp);

    if (mode !== 'FtoC' && mode !== 'CtoF') {
        return res.status(400).send('Invalid mode. Use "FtoC" or "CtoF".');
    }

    if (isNaN(temperature)) {
        return res.status(400).send('Invalid temp value.');
    }

    let convertedTemp;
    if (mode === 'FtoC') {
        convertedTemp = ((temperature - 32) * (5 / 9)).toFixed(2);
    } else {
        convertedTemp = ((temperature * (9 / 5)) + 32).toFixed(2);
    }

    debug(`Converted Temperature: ${convertedTemp}`);
    res.json({ convertedTemp });
});

app.post('/api/income-tax/calc', (req, res) => {
    const { mode, income } = req.body;

    const annualIncome = parseFloat(income);

    if (mode !== 'Single' && mode !== 'Married') {
        return res.status(400).send('Invalid mode. Use "Single" or "Married".');
    }

    if (isNaN(annualIncome) || annualIncome <= 0) {
        return res.status(400).send('Invalid income value.');
    }

    // Im bored so i made a diffrent solution than last time.
    const taxBrackets = {
        Single: [
            { rate: 0.10, threshold: 0 },
            { rate: 0.12, threshold: 11925 },
            { rate: 0.22, threshold: 48475 },
            { rate: 0.24, threshold: 103350 },
            { rate: 0.32, threshold: 197300 },
            { rate: 0.35, threshold: 250525 },
            { rate: 0.37, threshold: 626350 }
        ],
        Married: [
            { rate: 0.10, threshold: 0 },
            { rate: 0.12, threshold: 23850 },
            { rate: 0.22, threshold: 96950 },
            { rate: 0.24, threshold: 206700 },
            { rate: 0.32, threshold: 394600 },
            { rate: 0.35, threshold: 501050 },
            { rate: 0.37, threshold: 751600 }
        ]
    };

    const brackets = taxBrackets[mode];
    let tax = 0;
    let remainingIncome = annualIncome;

    for (let i = 0; i < brackets.length; i++) {
        const currentBracket = brackets[i];
        const nextBracket = brackets[i + 1];

        if (remainingIncome > currentBracket.threshold) {
            const upperLimit = nextBracket ? nextBracket.threshold : remainingIncome;
            const taxableInThisBracket = Math.min(remainingIncome, upperLimit) - currentBracket.threshold;

            if (taxableInThisBracket > 0) {
                tax += taxableInThisBracket * currentBracket.rate;
            }
        }
    }

    const totalTax = Math.ceil(tax);
    debug(`Calculated Income Tax: ${totalTax}`);
    res.json({ totalTax });
});

app.post('/api/interest/calc', (req, res) => {
    const { principal, interestRate, years } = req.body;

    const p = parseFloat(principal);
    const r = parseFloat(interestRate);
    const t = parseFloat(years);

    if (isNaN(p) || p <= 0) {
        return res.status(400).send('Invalid principal value.');
    }

    if (isNaN(r) || r <= 0 || r > 100) {
        return res.status(400).send('Invalid interestRate value.');
    }

    if (isNaN(t) || t <= 0 || t > 50) {
        return res.status(400).send('Invalid years value.');
    }

    const finalAmount = (p * ((1 + r / 100 / 12) ** (t * 12))).toFixed(2);
    debug(`Calculated Final Amount: ${finalAmount}`);
    res.json({ finalAmount });
});

// Start server
app.listen(PORT, () => {
    debug(`Server is running on port ${PORT}`);
});
