const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const tens = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function convertTwoDigits(num: number): string {
  if (num < 20) return ones[num];
  const ten = Math.floor(num / 10);
  const one = num % 10;
  return `${tens[ten]}${one ? ` ${ones[one]}` : ""}`.trim();
}

function convertThreeDigits(num: number): string {
  if (num === 0) return "";
  const hundred = Math.floor(num / 100);
  const remainder = num % 100;
  const hundredPart = hundred ? `${ones[hundred]} Hundred` : "";
  const remainderPart = remainder ? convertTwoDigits(remainder) : "";
  return [hundredPart, remainderPart].filter(Boolean).join(" ");
}

export function numberToIndianWords(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  const parts: string[] = [];

  if (crore) parts.push(`${convertTwoDigits(crore)} Crore`);
  if (lakh) parts.push(`${convertTwoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${convertTwoDigits(thousand)} Thousand`);
  if (hundred) parts.push(convertThreeDigits(hundred));

  let result = `${parts.join(" ")} Rupees`;
  if (paise > 0) {
    result += ` and ${convertTwoDigits(paise)} Paise`;
  }
  return `${result} Only`;
}
