/**
 * Script de test pour vérifier la configuration des régions backend
 * Usage: node test-backend-regions.js
 */

const selectors = require('../selectors/subscription-selectors.json');

console.log('🧪 Test de la configuration des régions backend\n');

// Test 1: Vérifier la structure
console.log('📋 Test 1: Structure des régions');
const regions = Object.keys(selectors.planSelection.backendRegions);
console.log(`   Régions disponibles: ${regions.join(', ')}`);
console.log(`   ✅ ${regions.length} région(s) configurée(s)\n`);

// Test 2: Vérifier chaque région
regions.forEach(region => {
  console.log(`🌍 Région: ${region}`);
  const plans = selectors.planSelection.backendRegions[region];
  const planNames = Object.keys(plans);
  
  console.log(`   Plans disponibles: ${planNames.join(', ')}`);
  
  planNames.forEach(planName => {
    const plan = plans[planName];
    console.log(`   - ${planName}:`);
    console.log(`     • Selector: ${plan.selector}`);
    console.log(`     • Plan ID: ${plan.planId}`);
    console.log(`     • Prix: ${plan.price}`);
  });
  console.log('');
});

// Test 3: Vérifier les plans manquants dans USA
console.log('🔍 Test 3: Plans manquants dans USA');
const basicPlans = Object.keys(selectors.planSelection.backendRegions.basic);
const usaPlans = Object.keys(selectors.planSelection.backendRegions.usa);

const missingInUSA = basicPlans.filter(plan => !usaPlans.includes(plan));
console.log(`   Plans dans 'basic' mais pas dans 'usa': ${missingInUSA.join(', ')}`);
console.log(`   ✅ Ces plans seront automatiquement ignorés (étape 3 skipped)\n`);

// Test 4: Vérifier les plans uniques à USA
const uniqueToUSA = usaPlans.filter(plan => !basicPlans.includes(plan));
if (uniqueToUSA.length > 0) {
  console.log('🇺🇸 Test 4: Plans uniques à USA');
  console.log(`   Plans uniquement dans 'usa': ${uniqueToUSA.join(', ')}\n`);
}

// Test 5: Simuler une validation de plan
console.log('✅ Test 5: Simulation de validation');

const testCases = [
  { region: 'basic', plan: 'mobile', shouldPass: true },
  { region: 'basic', plan: 'standard', shouldPass: true },
  { region: 'usa', plan: 'mobile', shouldPass: false },
  { region: 'usa', plan: 'standard', shouldPass: true },
  { region: 'usa', plan: 'standardWithAds', shouldPass: true },
  { region: 'invalid', plan: 'standard', shouldPass: false },
];

testCases.forEach(({ region, plan, shouldPass }) => {
  const regionPlans = selectors.planSelection.backendRegions[region];
  const planExists = regionPlans && regionPlans[plan];
  const result = planExists ? '✅' : '❌';
  const expected = shouldPass ? '✅' : '❌';
  const status = (planExists === shouldPass) ? '✅ PASS' : '❌ FAIL';
  
  console.log(`   ${status} | Region: ${region.padEnd(10)} | Plan: ${plan.padEnd(15)} | Attendu: ${expected} | Résultat: ${result}`);
});

console.log('\n🎉 Tests terminés !');
