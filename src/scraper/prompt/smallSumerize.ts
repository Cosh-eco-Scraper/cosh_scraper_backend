export function smallSumerize(collection: Record<string, string[]>): string {
  return `
  Here is the small collection of snippets: ${JSON.stringify(collection)}
  
  Please structure your response as a JSON object with the following template:
{
  "type": [],
  "location": [],
  "about": "",
  "retour": "",
  "brands": [],
  "openingHours": []
}

${mainPrompt()}
${timeSummary()}
${summerizeAbout()}
${summarizeRetour()}
${summarizeBrands()}
${summarizeLocation()} 
${summarizeType()}
  `;
}

function mainPrompt() {
  return `translate everything into English.`;
}

function timeSummary() {
  return `
  for opening hours place them as follows:
  <city>
 | day      | open | close | break period |
 | monday   | hh:mm|  hh:mm| hh:mm-hh:mm  |
 | tuesday  | hh:mm|  hh:mm| hh:mm-hh:mm  |
 | wednesday| hh:mm|  hh:mm| hh:mm-hh:mm  |
 | thursday | hh:mm|  hh:mm| hh:mm-hh:mm  |
 | friday   | hh:mm|  hh:mm| hh:mm-hh:mm  |
 | sunday   | hh:mm|  hh:mm| hh:mm-hh:mm  |
  if multiple stores are present, place them under in the next array field under "openingHours"
`;
}

function summerizeAbout() {
  return `
  place all the general information keys under the following field: "about" from around 1000 characters or less.
  `;
}

function summarizeRetour() {
  return `
  summarize everything about retours etc and place it under: "retour" from around 1000 characters or less.
  `;
}

function summarizeBrands() {
  return `
  for brands get all brands and place them under the following field: "brands" and make sure they are sorted alphabetically, unique and start with a capital letter.
  `;
}

function summarizeLocation() {
  return `
  for location get the location and place it under the following field: "locations"
  this will be in an array and will follow the following format:
  <number>,<street>,<postalCode>,<city>,<country>
  `;
}

function summarizeType() {
  return `
  for type get the type and place it under the following field: "type"
  this will be in an array and will follow the following format:
  <type1>,<type2>,<type3>
  `;
}

