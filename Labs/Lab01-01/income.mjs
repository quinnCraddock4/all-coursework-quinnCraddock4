import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { totalmem } from 'node:os';

const rl = readline.createInterface({ input, output });

const status = await rl.question('married or single? ');
const income = await rl.question('Enter your total income: ')

function calculateIncomeTaxSingle(income){

   if(income <= 11925){
    return income * .1;
   }else if(income <=48475){
    return 1192.5 + (income * .12);
   }
   else if(income <= 103350){
    return 5578.50 + (income * .22);
   }
   else if(income <= 197300){
    return 17651 + (income * .24);
   }
   else if(income <= 250525){
    return 40199 + (income * .32);
   }
   else if(income <= 626350){
    return 57231 + (income * .35);
   }
   else{
    return 188769.75 + (income * .37);
   }


}

function calculateIncomeTaxMarried(income){ 
    //income brackets 
   if(income <= 23850){
    return income * .1;
   }else if(income <=96950){
    return 2385 + (income * .12);
   }
   else if(income <= 206700){
    return 11157 + (income * .22);
   }
   else if(income <= 394600){
    return 35302 + (income * .24);
   }
   else if(income <= 501050){
    return 80398 + (income * .32);
   }
   else if(income <= 751600){
    return 114462 + (income * .35);
   }
   else{
    return 202154.50 + (income * .37);
   }

}

if(status.toLowerCase() === 'single'){
    const tax = calculateIncomeTaxSingle(Number(income));
   console.log(`Your estimated tax is $${tax.toFixed(2)}`);
}
else if(status.toLowerCase() === 'married'){
    const tax = calculateIncomeTaxMarried(Number(income));
   console.log(`Your estimated tax is $${tax.toFixed(2)}`);
}

rl.close();