import axios from 'axios';
import { PrismaClient } from '../generated/prisma/index.js';
import fs from 'fs';

const prisma = new PrismaClient();

// Read env or defaults
const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const TEST_SESSION_ID = process.env.TEST_SESSION_ID || 1; // set an existing session id
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'testuser@example.com';

async function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

async function run(){
  console.log('Starting E2E test against', API_BASE);
  try{
    // 1. Create checkout (client call)
    const createRes = await axios.post(`${API_BASE}/api/payments/create-checkout`, { sessionId: TEST_SESSION_ID, email: TEST_USER_EMAIL });
    console.log('create-checkout response:', createRes.data);
    const paymentUrl = createRes.data.payment_url || createRes.data.checkoutUrl || createRes.data.paymentUrl;
    if(!paymentUrl) throw new Error('No payment_url returned');

    // 2. Simulate provider webhook: find registration by registrationId if returned
    const registrationId = createRes.data.registrationId;
    if(!registrationId){
      console.warn('create-checkout did not return registrationId. Searching DB for pending registration...');
      const reg = await prisma.registration.findFirst({ where: { user: { email: TEST_USER_EMAIL }, paymentStatus: 'pending' } });
      if(!reg) throw new Error('No pending registration found for test user');
      console.log('Found registration', reg.id);
    }

    // Build webhook payload similar to Uddokta docs
    const payload = {
      full_name: 'Test User',
      email: TEST_USER_EMAIL,
      amount: '100.00',
      charged_amount: '100.00',
      fee: '0.00',
      invoice_id: 'TESTINVOICE123',
      metadata: { registrationId: registrationId || undefined },
      payment_method: 'bkash',
      sender_number: '01300000000',
      transaction_id: 'TESTTRANS123',
      date: new Date().toISOString(),
      status: 'COMPLETED'
    };

    // Send webhook request (provider would send rt-uddoktapay-api-key header)
    const headers = { 'Content-Type': 'application/json' };
    if(process.env.UDDOKTA_API_KEY) headers['rt-uddoktapay-api-key'] = process.env.UDDOKTA_API_KEY;

    console.log('Posting simulated webhook to /api/payments/webhook');
    const hookRes = await axios.post(`${API_BASE}/api/payments/webhook`, payload, { headers });
    console.log('webhook response status:', hookRes.status, 'data:', hookRes.data || '(no json)');

    // Wait a moment then read DB
    await sleep(1000);

    const regIdToCheck = registrationId || (await prisma.registration.findFirst({ where: { user: { email: TEST_USER_EMAIL } }, orderBy: { createdAt: 'desc' } })).id;
    const updated = await prisma.registration.findUnique({ where: { id: Number(regIdToCheck) }, include: { session: true, user: true } });
    console.log('Registration after webhook:', JSON.stringify(updated, null, 2));

    // Check email flag
    console.log('isEmailSent:', updated.isEmailSent);

    console.log('E2E test complete. Clean up not performed.');
  }catch(err){
    console.error('E2E test failed:', err?.response?.data || err.message || err);
  }finally{
    await prisma.$disconnect();
  }
}

run();
