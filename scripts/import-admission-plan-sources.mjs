import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const sources = [
  { province: "北京", url: "https://www.bjeea.cn/" },
  { province: "天津", url: "https://www.zhaokao.net/" },
  { province: "河北", url: "https://www.hebeea.edu.cn/" },
  { province: "山西", url: "https://www.sxkszx.cn/" },
  { province: "内蒙古", url: "https://www.nm.zsks.cn/" },
  { province: "辽宁", url: "https://www.lnzsks.com/" },
  { province: "吉林", url: "https://www.jleea.edu.cn/" },
  { province: "黑龙江", url: "https://www.lzk.hl.cn/" },
  { province: "上海", url: "https://www.shmeea.edu.cn/" },
  { province: "江苏", url: "https://www.jseea.cn/" },
  { province: "浙江", url: "https://www.zjzs.net/" },
  { province: "安徽", url: "https://www.ahzsks.cn/" },
  { province: "福建", url: "https://www.eeafj.cn/" },
  { province: "江西", url: "https://www.jxeea.cn/" },
  { province: "山东", url: "https://www.sdzk.cn/" },
  { province: "河南", url: "https://www.haeea.cn/" },
  { province: "湖北", url: "https://www.hbea.edu.cn/" },
  { province: "湖南", url: "https://jyt.hunan.gov.cn/sjyt/hnsjyksy/" },
  { province: "广东", url: "https://eea.gd.gov.cn/tzgg/" },
  { province: "广西", url: "https://www.gxeea.cn/" },
  { province: "海南", url: "https://ea.hainan.gov.cn/" },
  { province: "重庆", url: "https://www.cqksy.cn/" },
  { province: "四川", url: "https://www.sceea.cn/" },
  { province: "贵州", url: "https://zsksy.guizhou.gov.cn/" },
  { province: "云南", url: "https://www.ynzs.cn/" },
  { province: "西藏", url: "https://zsks.edu.xizang.gov.cn/" },
  { province: "陕西", url: "https://www.sneea.cn/" },
  { province: "甘肃", url: "https://www.ganseea.cn/" },
  { province: "青海", url: "https://www.qhjyks.com/" },
  { province: "宁夏", url: "https://www.nxjyks.cn/" },
  { province: "新疆", url: "https://www.xjzk.gov.cn/" },
];

const keywords = [
  "2026",
  "招生计划",
  "招生专业目录",
  "专业目录",
  "普通高校招生计划",
  "填报志愿",
];

function absolutize(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return "";
  }
}

function stripTags(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLinks(html, baseUrl) {
  const links = [];
  const anchorPattern = /<a\b[^>]*href=["']?([^"'\s>]+)["']?[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(html))) {
    const href = absolutize(match[1], baseUrl);
    const title = stripTags(match[2]);
    const haystack = `${title} ${href}`;
    if (href && keywords.some((keyword) => haystack.includes(keyword))) {
      links.push({ title: title || href, url: href });
    }
  }
  return Array.from(new Map(links.map((item) => [item.url, item])).values()).slice(0, 20);
}

async function fetchSource(source) {
  try {
    const response = await fetch(source.url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; AI-Gaokao-Life-Strategist/0.1; admission-plan-import)",
      },
    });
    const html = await response.text();
    return {
      ...source,
      status: response.ok ? "fetched" : "http_error",
      httpStatus: response.status,
      matchedLinks: response.ok ? extractLinks(html, source.url) : [],
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ...source,
      status: "fetch_failed",
      error: error instanceof Error ? error.message : String(error),
      matchedLinks: [],
      fetchedAt: new Date().toISOString(),
    };
  }
}

const outputDir = path.join(process.cwd(), "data", "admission-plans");
await mkdir(outputDir, { recursive: true });
const results = [];
for (const source of sources) {
  results.push(await fetchSource(source));
}

await writeFile(
  path.join(outputDir, "source-discovery-2026.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
  "utf8",
);

console.log(`Wrote ${results.length} province source discovery records.`);
