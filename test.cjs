#!/usr/bin/env node
/*
 * Self-contained test harness for notepad-calc.html.
 * Extracts the <script> from the sibling HTML, loads it as a CommonJS module
 * (the UI code is guarded by `typeof document`), and asserts engine output.
 *
 *   node test.cjs
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const htmlPath = path.join(__dirname, "notepad-calc.html");
const html = fs.readFileSync(htmlPath, "utf8");
const code = html.match(/<script>([\s\S]*)<\/script>/)[1];
const enginePath = path.join(os.tmpdir(), "notepad-calc-engine.cjs");
fs.writeFileSync(enginePath, code);
const eng = require(enginePath);

let pass = 0, fail = 0;
function evalStr(line){
  const r = eng.evaluateDoc(line)[0];
  if (r.type === "error") return "ERR: " + r.msg;
  if (r.type === "comment") return "(comment)";
  return r.str;
}
function check(line, expect){
  const got = evalStr(line);
  const ok = got === expect;
  ok ? pass++ : fail++;
  console.log((ok ? "ok   " : "FAIL ") + JSON.stringify(line) + " => " + got + (ok ? "" : "   (expected " + expect + ")"));
}
function assert(label, cond){
  cond ? pass++ : fail++;
  console.log((cond ? "ok   " : "FAIL ") + label);
}
const section = s => console.log("\n--- " + s + " ---");

section("numbers");
check("0xff + 0b1010", "265");
check("1 000 000 / 12", "83,333.3333333");
check("1.5e3 + 2.5e3", "4,000");
check("2.4e-6 * 1000", "0.0024");
check(".5 + .25", "0.75");

section("arithmetic & constants");
check("2 pi", "6.28318530718");
check("e", "2.71828182846");
check("7 div 2", "3");
check("7 mod 2", "1");
check("2^10", "1,024");
check("2^-1", "0.5");
check("2^3^2", "512");
check("-5 + 3", "-2");
check("2 + 3 * 4", "14");
check("(2+3)*4", "20");

section("percent");
check("200 + 10%", "220");
check("200 - 10%", "180");
check("10% of 200", "20");
check("100 - 5% - 5%", "90.25");
check("50%", "50%");

section("functions (radians)");
check("sin(pi/2)", "1");
check("sin(90 deg)", "1");
check("ln(e^3)", "3");
check("sqrt(16)", "4");
check("sin(30 deg)", "0.5");
check("log(1000)", "3");
check("tg(0)", "0");
check("abs(-7)", "7");
check("asin(1) in deg", "90 °");

section("times (h:mm:ss)");
check("9:30:00 - 8:15:30", "1:14:30");
check("0:45:00 * 3", "2:15:00");
check("1:30:00 + 45 min", "2:15:00");
check("0:00:01.5 * 2", "0:00:03");
check("9:30:00", "9:30:00");
check("5:30:00 in min", "330 min");

section("single units auto-convert to SI");
check("100 ft", "30.48 m");
check("5 km", "5,000 m");
check("3 km", "3,000 m");
check("20 C", "293.15 K");
check("2 h", "7,200 s");
check("90 min", "5,400 s");
check("1 lb", "0.45359237 kg");

section("compound units -> SI");
check("100 ft/s", "30.48 m/s");
check("5 km * 3 km", "15,000,000 m²");
check("9.8 m/s^2", "9.8 m/s²");
check("10 km / 2 h", "1.38888888889 m/s");
check("1/2 m", "0.5 m⁻¹");
check("1/s", "1 s⁻¹");
check("1 / s^2", "1 s⁻²");

section("conversions");
check("100 ft in m", "30.48 m");
check("100 ft in ft", "100 ft");
check("1 day in h", "24 h");
check("(5 km + 300 m) in m", "5,300 m");
check("90 km/h in m/s", "25 m/s");
check("75 kg in lb", "165.346696639 lb");
check("20 C in F", "68 °F");
check("100 km in miles", "62.1371192237 mi");
check("2 h in s", "7,200 s");
check("1 L in mL", "1,000 mL");
check("60 mph in kmh", "96.56064 km/h");
check("12 ft^2 in m^2", "1.11483648 m^2");
check("5 ft + 3 inch", "1.6002 m");

section("number bases");
check("255 in hex", "0xff");
check("0b1011 in dec", "11");
check("3 + 4 in hex", "0x7");
check("1e3 in bin", "0b1111101000");

section("bare SI prefixes");
check("100M", "100,000,000");
check("2000k", "2,000,000");
check("100M - 2000k in M", "98M");
check("100M - 2000k", "98,000,000");
check("5000000 in M", "5M");
check("1500 in k", "1.5k");
check("3G in M", "3,000M");
check("100M / 4", "25,000,000");
check("2.5G", "2,500,000,000");

section("data defaults to bytes");
check("100 MB", "100,000,000 B");
check("8 bit", "1 B");
check("1 byte in bit", "8 bit");
check("1 kB in bit", "8,000 bit");
check("1 GB in MB", "1,000 MB");
check("1024 B in KiB", "1 KiB");
check("100 Mb in MB", "12.5 MB");
check("1 GiB in MiB", "1,024 MiB");

section("variables & lists");
check("hours = 37.5", "37.5");
const doc = eng.evaluateDoc("rate = 85\nhours = 37.5\nrate * hours");
assert('"rate * hours" (uses variables) => 3,187.5', doc[2].str === "3,187.5");
const list = eng.evaluateDoc("12.50\n8.00\n4.25");
assert('column 12.50/8.00/4.25 => Σ 24.75', list[2].sumStr === "24.75");

section("datetimes & epoch (UTC)");
check('"2024-01-15 12:00:00"', "1705320000");        // quoted datetime -> epoch seconds
check('"2024-01-15"', "1705276800");
check("1705320000 ep", "2024-01-15 12:00:00 UTC");   // epoch -> datetime
check("1705320000 epoch", "2024-01-15 12:00:00 UTC");
check("1705320000 in epoch", "2024-01-15 12:00:00 UTC");
check("1705320000000 ep", "2024-01-15 12:00:00 UTC");// millis auto-detected
check("0 ep", "1970-01-01 00:00:00 UTC");
check("'2024-01-15 12:00:00'", "1705320000");        // single quotes work too
check('"2024-01-15T12:00:00Z"', "1705320000");       // ISO with Z
check('"2024-01-15T12:00:00+0200"', "1705312800");   // tz offset -> UTC
check('"2024-01-15T12:00:00+02:00"', "1705312800");
check('"2024-01-15T12:00:00-0500"', "1705338000");
check("'2024-01-15T12:00:00+0200' in epoch", "2024-01-15 10:00:00 UTC");
check('"2024-01-15 12:00:00" + 3d', "1705579200");   // datetime + period = datetime (epoch view)
check('("2024-01-15 12:00:00" + 3d) in epoch', "2024-01-18 12:00:00 UTC");
check('"2024-01-15 12:00:00" - 90 min in epoch', "2024-01-15 10:30:00 UTC");
check('"2024-01-20" - "2024-01-15"', "5d 00:00:00"); // datetime difference = period
check('"2024-01-15 18:30:00" - "2024-01-15 12:00:00"', "6:30:00");
check('("2024-01-15 18:30:00" - "2024-01-15 12:00:00") in h', "6.5 h");
check('"2024-01-15" + "2024-01-16"', "ERR: Cannot add two datetimes");
check('"nope"', 'ERR: Not a datetime: "nope"');

section("periods with days");
check("2d 03:04:05", "2d 03:04:05");
check("2d 03:04:05 + 1d", "3d 03:04:05");
check("25:00:00", "1d 01:00:00");
check("100000 in clock", "1d 03:46:40");
check("90 min in clock", "1:30:00");
const nowStr = evalStr("now");
assert('"now" formats as a UTC datetime (' + nowStr + ")", /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC$/.test(nowStr));

section("syntax highlighting");
const hl = text => eng.highlightToHtml(text, eng.scanAssignedVars(text), eng.evaluateDoc(text));
assert("assigned name shadows unit -> t-var", hl("hours = 37.5\nhours * 2").includes('<span class="t-var">hours</span>'));
assert("unit when not assigned -> t-unit", hl("2 h").includes('<span class="t-unit">h</span>'));
assert("comment line -> t-comment", hl("# a note").includes('<span class="t-comment"># a note</span>'));
assert("function -> t-fn, constant -> t-const", hl("sin(pi)").includes('class="t-fn">sin') && hl("sin(pi)").includes('class="t-const">pi'));
assert("html is escaped", hl("a < b").includes("&lt;"));
assert("quoted datetime -> t-num", hl('"2024-01-15"').includes('<span class="t-num">"2024-01-15"</span>'));
assert("single-quoted datetime -> t-num", hl("'2024-01-15'").includes('<span class="t-num">\'2024-01-15\'</span>'));
assert("day-period -> t-num", hl("2d 03:04:05").includes('<span class="t-num">2d 03:04:05</span>'));
assert('"now" -> t-const', hl("now").includes('class="t-const">now'));
assert('"ep" -> t-unit', hl("5 ep").includes('class="t-unit">ep'));

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
