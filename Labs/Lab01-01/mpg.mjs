import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({ input, output });

const milesInput = await rl.question('How many miles were driven? ');
const gallonsInput = await rl.question('How many gallons of gas were used? ');

const miles = Number(milesInput);
const gallonsUsed = Number(gallonsInput);

if (isNaN(miles) || miles <= 0) {
	console.log('Invalid miles. Please enter a positive numeric value.');
} else if (isNaN(gallonsUsed) || gallonsUsed <= 0) {
	console.log('Invalid gallons. Please enter a positive numeric value.');
} else {
	const mpg = miles / gallonsUsed;
	console.log(`Your car's fuel efficiency is ${mpg} miles per gallon.`);
}

rl.close();