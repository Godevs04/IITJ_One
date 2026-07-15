import dotenv from 'dotenv';
import path from 'path';
import { config } from '../config';
import { connectDb, collections, disconnectDb } from '../db';
import { loadTransportFromFile } from '../services/parsers';
import type { TransportDoc } from '../types';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function verify() {
  console.log('--- Transport Sunday & Holiday Verification ---');
  
  // 1. Parser verification
  console.log('\n[1/3] Parsing markdown source schedule...');
  const parsed = loadTransportFromFile(config.docsRoot);
  
  const parsedSunDep = parsed.routes.find(r => r.weekday === 'sun-holiday' && r.direction === 'departure')?.trips ?? [];
  const parsedSunArr = parsed.routes.find(r => r.weekday === 'sun-holiday' && r.direction === 'arrival')?.trips ?? [];
  
  console.log(`Parsed Sunday & Holiday Departures: ${parsedSunDep.length}`);
  console.log(`Parsed Sunday & Holiday Arrivals: ${parsedSunArr.length}`);
  
  // 2. Database verification
  console.log('\n[2/3] Connecting to MongoDB and fetching transport doc...');
  const connected = await connectDb();
  if (!connected) {
    console.error('Could not connect to MongoDB');
    return;
  }
  
  const dbDoc = await collections.transport().findOne({ campusId: config.campusId }) as unknown as TransportDoc | null;
  if (!dbDoc) {
    console.error('No transport document found in database for campus:', config.campusId);
    await disconnectDb();
    return;
  }
  
  const dbSunDep = dbDoc.routes.find(r => r.weekday === 'sun-holiday' && r.direction === 'departure')?.trips ?? [];
  const dbSunArr = dbDoc.routes.find(r => r.weekday === 'sun-holiday' && r.direction === 'arrival')?.trips ?? [];
  
  console.log(`Database Sunday & Holiday Departures: ${dbSunDep.length}`);
  console.log(`Database Sunday & Holiday Arrivals: ${dbSunArr.length}`);
  
  // 3. Detailed field validation
  console.log('\n[3/3] Performing detailed field checks...');
  
  const expectedDep = [
    { bus: 'B1', startTime: '10:00 AM', from: 'Old Mess', endTime: '11:00 AM', to: 'MBM', route: 'Paota → Riktiya Bheruji Circle → MBM', direction: 'departure' },
    { bus: 'B2', startTime: '11:30 AM', from: 'Old Mess', endTime: '12:30 PM', to: 'MBM', route: 'Paota → MBM', direction: 'departure' },
    { bus: 'B1', startTime: '4:45 PM', from: 'Old Mess', endTime: '5:45 PM', to: 'MBM', route: 'Paota → MBM → Riktiya Bheruji Circle', direction: 'departure' },
    { bus: 'B2', startTime: '5:45 PM', from: 'Old Mess', endTime: '6:45 PM', to: 'MBM', route: 'Paota → MBM → Riktiya Bheruji Circle', direction: 'departure' }
  ];
  
  const expectedArr = [
    { bus: 'B1', startTime: '1:00 PM', from: 'Gate 1: MBM', endTime: '2:00 PM', to: 'IITJ', route: 'MBM College → Paota → IITJ', direction: 'arrival' },
    { bus: 'B2', startTime: '4:00 PM', from: 'Gate 1: MBM', endTime: '5:00 PM', to: 'IITJ', route: 'MBM → Paota → Mandore → IITJ', direction: 'arrival' },
    { bus: 'B1', startTime: '9:00 PM', from: 'Gate 1: MBM', endTime: '10:00 PM', to: 'IITJ', route: 'MBM → Railway Station → Paota', direction: 'arrival' },
    { bus: 'B2', startTime: '9:00 PM', from: 'Gate 1: MBM', endTime: '10:00 PM', to: 'IITJ', route: '—', direction: 'arrival' }
  ];
  
  const checkTrips = (type: string, actual: any[], expected: any[]) => {
    let passed = true;
    if (actual.length !== expected.length) {
      console.error(`❌ Mismatched count for ${type}: expected ${expected.length}, got ${actual.length}`);
      passed = false;
    }
    
    expected.forEach((exp, idx) => {
      const act = actual[idx];
      if (!act) {
        console.error(`❌ Missing trip at index ${idx} for ${type}`);
        passed = false;
        return;
      }
      
      const checkField = (field: string, expVal: any, actVal: any) => {
        if (expVal !== actVal) {
          console.error(`❌ ${type} trip #${idx + 1} field '${field}' mismatch: expected '${expVal}', got '${actVal}'`);
          passed = false;
        }
      };
      
      checkField('bus', exp.bus, act.bus);
      checkField('startTime', exp.startTime, act.startTime);
      checkField('from', exp.from, act.from);
      checkField('endTime', exp.endTime, act.endTime);
      checkField('to', exp.to, act.to);
      checkField('route', exp.route, act.route);
      checkField('direction', exp.direction, act.direction);
    });
    
    if (passed) {
      console.log(`✅ All ${type} fields match the source schedule perfectly!`);
    }
  };
  
  console.log('\n--- Checking Parsed Data ---');
  checkTrips('Parsed Departure', parsedSunDep, expectedDep);
  checkTrips('Parsed Arrival', parsedSunArr, expectedArr);
  
  console.log('\n--- Checking Database Data ---');
  checkTrips('Database Departure', dbSunDep, expectedDep);
  checkTrips('Database Arrival', dbSunArr, expectedArr);
  
  await disconnectDb();
  console.log('\nVerification complete.');
}

verify().catch(console.error);
