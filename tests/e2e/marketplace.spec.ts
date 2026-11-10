/**
 * End-to-end marketplace journey in a real browser against a production build and the
 * isolated test database (prepared with the real airport data and the real bundle import).
 */
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { futureDate, grantRole, inlineAction, PDF, pickAirport, PNG, RUN, selectByText, signIn, signUp } from './helpers';

const customer = { name: 'Asha Rao', email: `asha.${RUN}@example.com` };
const operatorUser = { name: 'Sandeep Mishra', email: `ops.${RUN}@example.com` };
const admin = { name: 'Admin Tester', email: `admin.${RUN}@example.com` };
const intruder = { name: 'Other Customer', email: `other.${RUN}@example.com` };

let customerCtx: BrowserContext;
let operatorCtx: BrowserContext;
let adminCtx: BrowserContext;
let c: Page;
let o: Page;
let a: Page;
let firstTripUrl = '';
let tripUrl = '';
let bookingRef = '';

async function ctx(browser: Browser) {
  const context = await browser.newContext();
  return { context, page: await context.newPage() };
}

test.describe.serial('ThePrivate marketplace', () => {
  test.beforeAll(async ({ browser }) => {
    ({ context: customerCtx, page: c } = await ctx(browser));
    ({ context: operatorCtx, page: o } = await ctx(browser));
    ({ context: adminCtx, page: a } = await ctx(browser));
  });
  test.afterAll(async () => {
    await Promise.all([customerCtx.close(), operatorCtx.close(), adminCtx.close()]);
  });

  test('1. customer registers, signs out and signs back in', async () => {
    await signUp(c, customer.name, customer.email);
    await expect(c.getByRole('heading', { name: /Hello, Asha/ })).toBeVisible();
    await c.getByRole('button', { name: 'Sign out' }).click();
    await c.waitForURL('**/');
    await signIn(c, customer.email);
    await expect(c.getByRole('heading', { name: /Hello, Asha/ })).toBeVisible();
  });

  test('2–3. charter search is honest about missing supply, and the RFQ goes to the ops desk', async () => {
    await c.goto('/');
    await pickAirport(c, 'From', 'Mumbai', 'BOM');
    await pickAirport(c, 'To', 'Delhi', 'DEL');
    await c.getByLabel('Depart').fill(futureDate(10));
    await c.getByLabel('Passengers').fill('4');
    await expect(c.getByText(/Direct distance/)).toBeVisible();
    await c.getByRole('button', { name: 'Show aircraft' }).click();
    await c.waitForURL('**/charter?**');
    await expect(c.getByRole('heading', { name: /No aircraft listed for this journey/ })).toBeVisible();
    await expect(c.getByText('We will find one for you')).toBeVisible();
    await c.getByRole('link', { name: 'Send a flight request' }).click();
    await c.waitForURL('**/charter/request?**');
    await c.getByRole('button', { name: 'Continue' }).click();
    await c.getByRole('button', { name: 'Continue' }).click();
    await c.getByRole('button', { name: 'Send request' }).click();
    await c.waitForURL('**/account/trips/TP-*');
    await expect(c.getByText(/No flight partner has a suitable aircraft/)).toBeVisible();
    firstTripUrl = new URL(c.url()).pathname;
  });

  test('4. operator signs up and claims an existing regulator-listed profile (no access yet)', async () => {
    await signUp(o, operatorUser.name, operatorUser.email);
    await o.goto('/operator');
    await o.waitForURL('**/operator/onboarding');
    await o.getByLabel('Company name', { exact: true }).fill('Aerokalinga');
    await o.getByRole('button', { name: 'Search' }).click();
    await o.getByRole('link', { name: 'Claim' }).first().click();
    await expect(o.getByRole('heading', { name: /Claim Aerokalinga/ })).toBeVisible();
    await o.getByLabel('Your role').fill('Director');
    await o.getByLabel('Work e-mail').fill(operatorUser.email);
    await o.getByRole('button', { name: 'Submit claim' }).click();
    await expect(o.getByText(/Claim submitted/)).toBeVisible();
    await o.goto('/operator');
    await o.waitForURL('**/operator/onboarding'); // a claim alone grants nothing
  });

  test('17a. admin approves the claim (operator moves DISCOVERED → CLAIMED)', async () => {
    await signUp(a, admin.name, admin.email);
    grantRole(admin.email, 'SUPER_ADMIN');
    await signIn(a, admin.email, '/admin');
    await a.goto('/admin/claims');
    await a.getByRole('link', { name: /Aerokalinga/ }).first().click();
    await inlineAction(a, 'Approve claim');
    await expect(a.getByRole('main').getByText('Approved', { exact: true })).toBeVisible();
  });

  test('12. operator completes verification; admin verifies, issues agreement; operator signs; admin activates', async () => {
    await o.goto('/operator/verification');
    for (const title of ['Operating certificate', 'Company registration', 'Insurance certificate']) {
      const card = o.locator('li').filter({ hasText: title });
      await card.locator('input[type=file]').setInputFiles(PDF);
      await card.locator('button[type=submit]').click();
      await expect(card.getByText('Submitted', { exact: true })).toBeVisible();
    }
    await o.getByRole('button', { name: 'Submit for verification' }).click();
    await expect(o.getByText(/Our team is reviewing your documents/)).toBeVisible();

    await a.goto('/admin/operators?q=Aerokalinga');
    await a.getByRole('link', { name: 'Aerokalinga Aviation Pvt. Ltd.' }).click();
    for (let i = 3; i > 0; i--) {
      await expect(a.getByRole('button', { name: 'Accept', exact: true })).toHaveCount(i);
      await a.getByRole('button', { name: 'Accept', exact: true }).first().click();
    }
    await expect(a.getByRole('button', { name: 'Accept', exact: true })).toHaveCount(0);
    await inlineAction(a, 'Move to verified');
    await expect(a.getByRole('main').getByText('Verified', { exact: true }).first()).toBeVisible();
    await a.reload();
    await a.getByLabel('Fee (bps)').fill('800');
    await a.getByRole('button', { name: 'Issue agreement' }).click();
    await expect(a.getByText(/Agreement issued/)).toBeVisible();

    await o.goto('/operator/agreement');
    await o.getByLabel(/I have read the agreement/).check();
    await o.getByLabel(/Type your full name/).fill(operatorUser.name);
    await o.getByRole('button', { name: 'Sign agreement' }).click();
    await expect(o.getByText(/Signed agreement · version 1/)).toBeVisible();

    await a.reload();
    await inlineAction(a, 'Move to active');
    await expect(a.getByRole('main').getByText('Active', { exact: true }).first()).toBeVisible();
  });

  test('11. operator confirms an imported aircraft and submits it; admin approves for charter', async () => {
    await o.goto('/operator/fleet');
    await expect(o.getByText(/imported from public records/)).toBeVisible();
    await o.getByRole('link', { name: 'VT-OXL' }).click();
    await expect(o.getByText('Imported from a public record')).toBeVisible();
    await pickAirport(o, 'Home base', 'VABB', 'BOM');
    await o.getByRole('button', { name: 'Confirm & save' }).click();
    await expect(o.getByText('Saved.')).toBeVisible();
    await o.reload();
    await inlineAction(o, 'Submit for review');
    await expect(o.getByRole('main').getByText('Submitted', { exact: true }).first()).toBeVisible();
    // operator sets a confidential rate
    await o.getByLabel('Rate per block hour').fill('300000');
    await o.getByRole('button', { name: 'Save rate' }).click();
    await expect(o.getByText(/Rate saved/)).toBeVisible();

    await a.goto('/admin/aircraft?queue=1');
    await a.getByRole('link', { name: 'VT-OXL' }).click();
    await a.getByRole('button', { name: 'Approve aircraft' }).click();
    await expect(a.getByRole('main').getByText('Approved', { exact: true }).first()).toBeVisible();
    await expect(a.getByText('Verified by ThePrivate').first()).toBeVisible();
  });

  test('2–3 again. search now finds the verified aircraft; RFQ auto-routes to the operator', async () => {
    await c.goto('/charter');
    await pickAirport(c, 'From', 'Mumbai', 'BOM');
    await pickAirport(c, 'To', 'Delhi', 'DEL');
    await c.getByLabel('Depart').fill(futureDate(12));
    await c.getByLabel('Passengers').fill('4');
    await c.getByRole('button', { name: 'Show aircraft' }).click();
    await expect(c.getByRole('heading', { name: /1 aircraft for your journey/ })).toBeVisible();
    await expect(c.getByText('VT-OXL')).toBeVisible();
    await expect(c.getByText('Availability on request')).toBeVisible(); // no declared window ⇒ never "available"
    await expect(c.getByText('Price on request')).toBeVisible(); // no sourced cruise speed ⇒ no indicative price
    await c.getByRole('link', { name: 'Request this aircraft', exact: true }).click();
    await c.waitForURL('**/charter/request?**');
    await expect(c.getByLabel(/Anything we should know/)).toHaveValue(/VT-OXL/);
    await c.getByRole('button', { name: 'Continue' }).click();
    await c.getByRole('button', { name: 'Continue' }).click();
    await c.getByRole('button', { name: 'Send request' }).click();
    await c.waitForURL('**/account/trips/TP-*');
    await expect(c.getByText(/Sent to 1 flight partner/)).toBeVisible();
    tripUrl = new URL(c.url()).pathname;
  });

  test('5–6. operator reviews the RFQ and submits a quote', async () => {
    await o.goto('/operator/requests');
    await o.getByRole('link', { name: /^TP-/ }).first().click();
    await selectByText(o, 'Aircraft', 'VT-OXL');
    await o.getByLabel(/Your price/).fill('450000');
    await o.getByRole('button', { name: 'Send quote' }).click();
    await expect(o.getByText('₹4,86,000')).toBeVisible(); // 450,000 + 8 % platform fee
  });

  test('7–9. customer compares and accepts the quote; a booking is created (not paid)', async () => {
    await c.goto(tripUrl);
    await expect(c.getByText('Offers ready')).toBeVisible();
    await expect(c.getByLabel('₹4,86,000')).toBeVisible();
    await expect(c.getByText('450000')).toHaveCount(0); // operator payout never reaches the customer
    await inlineAction(c, 'Choose this offer');
    await c.waitForURL('**/account/bookings/BK-*');
    bookingRef = c.url().match(/BK-[A-Z0-9]+/)![0];
    await expect(c.getByText('Awaiting confirmation').first()).toBeVisible();
    await expect(c.getByText('Not paid')).toBeVisible();
  });

  test('9. double acceptance is impossible', async () => {
    await c.goto(tripUrl);
    await expect(c.getByRole('button', { name: 'Choose this offer' })).toHaveCount(0);
    await expect(c.getByText(/You chose an offer/)).toBeVisible();
  });

  test('10. operator confirms; staff records verified settlement; customer sees the paid trip', async () => {
    await o.goto(`/operator/bookings/${bookingRef}`);
    await inlineAction(o, 'Confirm booking');
    await expect(o.getByText('Confirmed · payment pending').first()).toBeVisible();

    await a.goto(`/admin/bookings/${bookingRef}`);
    await a.getByLabel(/Amount received/).fill('486000.00');
    await a.getByLabel('Bank / UTR reference').fill(`UTR${RUN}`);
    await a.getByLabel('How was it verified?').fill('Matched against bank statement line on settlement account.');
    await a.getByRole('button', { name: 'Record settlement' }).click();
    await expect(a.getByRole('main').getByText('Paid', { exact: true }).first()).toBeVisible();

    await c.goto(`/account/bookings/${bookingRef}`);
    await expect(c.getByText('Paid', { exact: true }).first()).toBeVisible();
    await c.goto('/account');
    await expect(c.getByText('BOM → DEL').first()).toBeVisible();
  });

  test('13. operator publishes a genuine empty leg; it is discoverable and enquirable', async () => {
    await o.goto('/operator/empty-legs');
    await selectByText(o, 'Aircraft', 'VT-OXL');
    await pickAirport(o, 'From', 'Delhi', 'DEL');
    await pickAirport(o, 'To', 'Bengaluru', 'BLR');
    await o.getByLabel('Date (local)').fill(futureDate(5));
    await o.getByLabel('Earliest departure').fill('10:00');
    await o.getByLabel('Latest departure').fill('14:00');
    await o.getByLabel('Seats offered').fill('6');
    await o.getByLabel(/Your price/).fill('200000');
    await o.getByRole('button', { name: 'Publish empty leg' }).click();
    await expect(o.getByText('Empty leg published.')).toBeVisible();

    await c.goto('/empty-legs');
    await c.getByRole('link', { name: /DEL.*BLR/ }).first().click();
    await expect(c.getByText('₹2,16,000 for the aircraft')).toBeVisible();
    await c.getByLabel('Passengers').fill('2');
    await c.getByRole('button', { name: 'Send enquiry' }).click();
    await expect(c.getByText(/Enquiry sent to the operator/)).toBeVisible();
  });

  test('14–16. aircraft sale: submission, review, publication, buyer enquiry (seller contact private)', async ({ browser }) => {
    await c.goto('/sell-aircraft');
    await c.getByLabel('Category').selectOption('SUPER_MIDSIZE_JET');
    await c.getByLabel('Manufacturer').fill('Dassault');
    await c.getByLabel('Model', { exact: true }).fill('Falcon 2000LX');
    await c.getByLabel('Year of manufacture').fill('2012');
    await c.getByLabel('Current location').fill('Mumbai (VABB)');
    await c.getByLabel('Asking price').fill('18500000');
    await c.getByLabel('Headline').fill('Single-owner Falcon 2000LX, enrolled on engine programme');
    await c.getByLabel('Description').fill('Well maintained Falcon 2000LX with complete records, engines on programme, recent interior refurbishment and EASy II avionics.');
    await c.getByLabel(/Photos/).setInputFiles(PNG);
    await c.getByRole('button', { name: 'Submit for review' }).click();
    await c.waitForURL('**/account/listings**');
    await expect(c.getByText('Under review')).toBeVisible();

    const anon = await browser.newContext();
    const p = await anon.newPage();
    await p.goto('/aircraft-for-sale');
    await expect(p.getByText('Falcon 2000LX')).toHaveCount(0); // not public before review

    await a.goto('/admin/sales');
    await a.getByRole('link', { name: /Dassault Falcon 2000LX/ }).click();
    await inlineAction(a, 'Approve & publish');
    await expect(a.getByRole('main').getByText('Live', { exact: true }).first()).toBeVisible();

    await p.goto('/aircraft-for-sale');
    await p.getByRole('link', { name: /Dassault Falcon 2000LX/ }).click();
    await expect(p.getByRole('heading', { name: 'Dassault Falcon 2000LX' })).toBeVisible();
    await expect(p.getByText(customer.email)).toHaveCount(0); // seller contact never public
    await p.getByLabel('Name').fill('Buyer Person');
    await p.getByLabel('E-mail').fill(`buyer.${RUN}@example.com`);
    await p.getByLabel('Message').fill('Please share the maintenance status and engine programme details.');
    await p.getByRole('button', { name: 'Send enquiry' }).click();
    await expect(p.getByText(/Our sales desk will connect you/)).toBeVisible();
    await anon.close();
  });

  test('17b. admin workflows: data review queues and audit trail are live', async () => {
    await a.goto('/admin');
    await expect(a.getByRole('heading', { name: 'Operations overview' })).toBeVisible();
    await a.goto('/admin/data/conflicts');
    await expect(a.getByText('REG:A6-RJC')).toBeVisible();
    await a.goto('/admin/data/matches');
    await expect(a.getByText(/Global Vectra Helicorp/).first()).toBeVisible();
    await a.goto('/admin/audit?action=quote.accept');
    await expect(a.getByText('quote.accept').first()).toBeVisible();
    // the unmatched first RFQ is visible to ops for manual routing
    await a.goto('/admin/requests?status=MATCHING');
    await expect(a.getByText(firstTripUrl.split('/').pop()!)).toBeVisible();
  });

  test('18. unauthorised access is refused server-side', async ({ browser }) => {
    // customer → admin, operator workspace
    await c.goto('/admin');
    await c.waitForURL('**/forbidden');
    await c.goto('/operator');
    await c.waitForURL('**/operator/onboarding');
    // operator cannot open the customer's trip
    const r = await o.goto(tripUrl);
    expect(r?.status()).toBe(404);
    // another customer cannot open this booking
    const other = await browser.newContext();
    const p = await other.newPage();
    await signUp(p, intruder.name, intruder.email);
    expect((await p.goto(`/account/bookings/${bookingRef}`))?.status()).toBe(404);
    expect((await p.goto(tripUrl))?.status()).toBe(404);
    await other.close();
    // anonymous → sign-in, private documents hidden
    const anon = await browser.newContext();
    const q = await anon.newPage();
    await q.goto('/account');
    await q.waitForURL('**/sign-in?next=%2Faccount');
    await a.goto('/admin/operators?q=Aerokalinga');
    await a.getByRole('link', { name: 'Aerokalinga Aviation Pvt. Ltd.' }).click();
    const docHref = await a.getByRole('link', { name: 'certificate.pdf' }).first().getAttribute('href');
    expect((await q.request.get(docHref!)).status()).toBe(404);
    await anon.close();
  });
});
