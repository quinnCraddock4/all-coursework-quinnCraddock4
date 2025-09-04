import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { totalmem } from 'node:os';

const rl = readline.createInterface({ input, output });

const status = await rl.question('married or single? ');
const income = await rl.question('Enter your total income: ')

function calculateIncomeTaxSingle(income){

   if (income <= 11925) {
      return income * 0.10;
   } else if (income <= 48475) {
      return 1192.5 + (income - 11925) * 0.12;
   } else if (income <= 103350) {
      return 5578.5 + (income - 48475) * 0.22;
   } else if (income <= 197300) {
      return 17651 + (income - 103350) * 0.24;
   } else if (income <= 250525) {
      return 40199 + (income - 197300) * 0.32;
   } else if (income <= 626350) {
      return 57231 + (income - 250525) * 0.35;
   } else {
      return 188769.75 + (income - 626350) * 0.37;
   }


}

function calculateIncomeTaxMarried(income){ 
    //income brackets 
   if (income <= 23850) {
      return income * 0.10;
   } else if (income <= 96950) {
      return 2385 + (income - 23850) * 0.12;
   } else if (income <= 206700) {
      return 11157 + (income - 96950) * 0.22;
   } else if (income <= 394600) {
      return 35302 + (income - 206700) * 0.24;
   } else if (income <= 501050) {
      return 80398 + (income - 394600) * 0.32;
   } else if (income <= 751600) {
      return 114462 + (income - 501050) * 0.35;
   } else {
      return 202154.50 + (income - 751600) * 0.37;
   }

}

const normalizedStatus = status.trim().toLowerCase();
const numericIncome = Number(income);

if (normalizedStatus !== 'single' && normalizedStatus !== 'married') {
   console.log('Invalid status. Please enter "single" or "married".');
} else if (isNaN(numericIncome) || numericIncome < 0) {
   console.log('Invalid income. Please enter a non-negative numeric value.');
} else {
   let tax;
   if (normalizedStatus === 'single') {
      tax = calculateIncomeTaxSingle(numericIncome);
   } else {
      tax = calculateIncomeTaxMarried(numericIncome);
   }
   console.log(`Your estimated tax is $${tax.toFixed(2)}`);
}

rl.close();