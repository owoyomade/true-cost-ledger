// Demo data for a small candle and soap shop, so new users can explore before adding their own.
// Every record is flagged `sample: true`: it doesn't count towards the free trial and
// "Clear sample data" removes exactly these. Dates are relative to today so the charts look current.

export const SAMPLE_LINES = [
  { id: "candles", name: "Candles", active: true },
  { id: "soaps", name: "Soaps", active: true },
  { id: "gifts", name: "Gift sets", active: true }
];

export const sampleSettings = () => ({ name: "Juniper Candle Co. (sample)", lines: SAMPLE_LINES, registered: false, onboarded: true });

/** Returns a YYYY-MM-DD date `back` months before `today`, on `day`, never later than today. */
function dateBack(today, back, day) {
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(y, m - 1 - back, 1);
  const dd = back === 0 ? Math.min(day, d) : Math.min(day, 28);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

function daysAhead(today, n) {
  const [y, m, d] = today.split("-").map(Number);
  return new Date(y, m - 1, d + n).toLocaleDateString("en-CA");
}

export function sampleRecords(today) {
  const at = (back, day) => dateBack(today, back, day);
  const paid = { status: "paid", account: "bank", sample: true };

  const orders = [
    { id: "sample_o1", date: at(4, 3), line: "candles", item: "Soy candles, 120 units", supplier: "Northwick Wholesale", ref: "NW-2231",
      units: 120, product: 960, shipping: 140, duties: 48, importTax: 0, brokerage: 35, other: 12, price: 28 },
    { id: "sample_o2", date: at(3, 10), line: "soaps", item: "Handmade soap bars, 200 units", supplier: "Meadow Soapworks", ref: "MS-118",
      units: 200, product: 700, shipping: 90, duties: 0, importTax: 0, brokerage: 0, other: 0, price: 9 },
    { id: "sample_o3", date: at(1, 5), line: "gifts", item: "Gift boxes, 60 sets", supplier: "Harbour Packaging", ref: "HP-0457",
      units: 60, product: 540, shipping: 75, duties: 27, importTax: 0, brokerage: 20, other: 0, price: 45,
      status: "unpaid", due: daysAhead(today, 20) }
  ].map(o => ({ ...paid, kind: "order", ...o }));

  // [months back, day, line, purchase, units, price each, channel, customer]
  const sales = [
    [4, 12, "candles", "sample_o1", 14, 28, "Etsy", ""],
    [4, 26, "candles", "sample_o1", 9, 28, "Market", ""],
    [3, 8, "candles", "sample_o1", 18, 28, "Website", ""],
    [3, 21, "soaps", "sample_o2", 35, 9, "Etsy", ""],
    [2, 4, "soaps", "sample_o2", 40, 8.5, "Market", ""],
    [2, 15, "candles", "sample_o1", 22, 27, "Etsy", ""],
    [2, 27, "soaps", "sample_o2", 24, 9, "Instagram", ""],
    [1, 9, "gifts", "sample_o3", 12, 45, "Website", ""],
    [1, 18, "candles", "sample_o1", 16, 28, "Etsy", ""],
    [1, 24, "gifts", "sample_o3", 10, 42, "Wholesale", "Bramble & Co. Boutique"],
    [0, 3, "soaps", "sample_o2", 30, 9, "Etsy", ""],
    [0, 6, "gifts", "sample_o3", 8, 45, "Instagram", ""]
  ].map(([back, day, line, orderId, units, each, channel, party], i) => {
    const amount = Math.round(units * each * 100) / 100;
    const wholesale = channel === "Wholesale";
    return {
      ...paid, kind: "sale", id: `sample_s${i + 1}`, date: at(back, day), line, orderId, units, amount, channel, party,
      desc: `${units} × ${line === "gifts" ? "gift set" : line === "soaps" ? "soap bar" : "candle"}`,
      fees: channel === "Market" || wholesale ? 0 : Math.round(amount * 0.065 * 100) / 100,
      shipping: channel === "Etsy" || channel === "Website" ? Math.round(units * 1.8 * 100) / 100 : 0,
      ...(wholesale ? { status: "unpaid", due: daysAhead(today, 10), ref: "INV-014" } : {})
    };
  });

  // [months back, day, category, description, paid to, amount, repeats]
  const costs = [
    [4, 2, "Website & hosting", "Online shop plan", "Shopfront", 39, "Monthly"],
    [3, 2, "Website & hosting", "Online shop plan", "Shopfront", 39, "Monthly"],
    [2, 2, "Website & hosting", "Online shop plan", "Shopfront", 39, "Monthly"],
    [1, 2, "Website & hosting", "Online shop plan", "Shopfront", 39, "Monthly"],
    [4, 6, "Packaging & shipping supplies", "Mailer boxes and tissue", "Packwell", 86, "One-time"],
    [3, 14, "Advertising & marketing", "Instagram ads", "Meta", 120, "One-time"],
    [2, 9, "Rent & utilities", "Weekend market stall", "Riverside Market", 60, "Monthly"],
    [1, 11, "Rent & utilities", "Weekend market stall", "Riverside Market", 60, "Monthly"],
    [1, 20, "Equipment & tools", "Label printer", "OfficeHub", 145, "One-time"]
  ].map(([back, day, category, desc, party, amount, repeat], i) =>
    ({ ...paid, kind: "cost", id: `sample_c${i + 1}`, date: at(back, day), category, desc, party, amount, repeat, line: "all" }));
  costs.push({ ...paid, kind: "cost", id: "sample_c10", date: at(0, 1), category: "Legal & professional", desc: "Bookkeeping check-in",
    party: "Clearview Accounting", amount: 150, repeat: "Quarterly", line: "all", status: "unpaid", due: daysAhead(today, 14) });

  const transfers = [
    { id: "sample_t1", date: at(4, 1), type: "owner_in", amount: 2500, desc: "Starting money from owner" },
    { id: "sample_t2", date: at(1, 28), type: "owner_out", amount: 300, desc: "Owner drawing" }
  ].map(t => ({ ...paid, kind: "transfer", ...t }));

  return [...orders, ...sales, ...costs, ...transfers];
}
