import fs from 'fs';
import { PDFParse } from 'pdf-parse';

const pdfPath = 'C:/Users/Shams ul Haq/.gemini/antigravity-ide/brain/58322c35-e8e4-4504-8969-1836dde6d9e9/.user_uploaded/media_1790723384633.pdf';
const dataBuffer = fs.readFileSync(pdfPath);

const parser = new PDFParse({ data: dataBuffer });
await parser.load();
const textData = await parser.getText();

let output = '';
textData.pages.forEach((page, idx) => {
  output += `\n======================================================\n`;
  output += `PAGE ${idx + 1}\n`;
  output += `======================================================\n`;
  output += page.text + '\n';
});

fs.writeFileSync('C:/Users/Shams ul Haq/.gemini/antigravity-ide/brain/58322c35-e8e4-4504-8969-1836dde6d9e9/scratch/full_pdf_dump.txt', output, 'utf8');
console.log("Dumped 22 pages of PDF to full_pdf_dump.txt!");
