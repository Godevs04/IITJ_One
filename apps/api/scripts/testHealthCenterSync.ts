import { runSync } from '../src/services/healthCenterSync';
import { getHealthCenter } from '../src/store';

async function main() {
  await runSync('iitj');
  const doc = await getHealthCenter('iitj');
  console.log(JSON.stringify(doc, null, 2));
}

void main();
