import axios from 'axios';
import robotsParser from 'robots-parser';

export default async function getRobotParser(url: string) {
  const baseUrl = new URL(url);
  const robotsUrl = new URL('robots.txt', baseUrl);
  const context = await getContext(robotsUrl.href);
  const parser = robotsParser(robotsUrl.href, context);
  return parser;
}

async function getContext(url: string): Promise<string> {
  const response = await axios.get(url);
  let context = '';
  if (response.status === 200) {
    context = response.data;
  } else {
    console.warn(
      `robots.txt not found for ${url} (status: ${response.status}). Treating as fully allowed.`,
    );
  }
  return context;
}
