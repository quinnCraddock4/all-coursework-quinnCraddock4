import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({ input, output });

const miles = await rl.question('How many miles were driven? ');
const gallonsUsed = await rl.question('How many gallons of gas were used? ');

const mpg = miles / gallonsUsed;
console.log(`Your car's fuel efficiency is ${mpg} miles per gallon.`);

rl.close();