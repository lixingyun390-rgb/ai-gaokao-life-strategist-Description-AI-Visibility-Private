import { NextResponse } from "next/server";

import { getAdmissionPlanSource } from "@/lib/admission-plan-data";
import { mockReport } from "@/lib/mock-data";
import { generateLocalReport } from "@/lib/report-engine";
import type { Audience, BasicInfo, InterviewAnswer, Report } from "@/lib/types";

type GenerateReportBody = {
  audience?: Audience;
  basicInfo?: BasicInfo;
  answers?: InterviewAnswer[];
};

export async function POST(request: Request) {
  const body = (await request.json()) as GenerateReportBody;
  const provider = process.env.AI_PROVIDER ?? "openai";

  try {
    const report =
      provider === "ollama"
        ? await generateWithOllama(body)
        : provider === "deepseek"
          ? await generateWithDeepSeek(body)
          : await generateWithOpenAI(body);
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 报告生成失败";
    const fallbackReport = generateLocalReport(body);

    return NextResponse.json(
      fallbackReport,
      {
        headers: {
          "x-ai-fallback": "local",
          "x-ai-error": encodeURIComponent(message).slice(0, 300),
        },
      },
    );
  }
}

async function generateWithDeepSeek(body: GenerateReportBody): Promise<Report> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 DEEPSEEK_API_KEY。请在 .env.local 中配置后再生成报告。");
  }

  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro";
  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: JSON.stringify(withAdmissionPlanContext(body)),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 12000,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "DeepSeek API 请求失败");
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("DeepSeek 没有返回可解析的报告 JSON");
  }
  try {
    return normalizeReport(parseModelJson(text), body);
  } catch {
    try {
      const repaired = await repairDeepSeekJson({ apiKey, baseUrl, model, text });
      return normalizeReport(parseModelJson(repaired), body);
    } catch {
      throw new Error("AI 返回的报告格式不完整，请重新生成一次。");
    }
  }
}

async function repairDeepSeekJson({
  apiKey,
  baseUrl,
  model,
  text,
}: {
  apiKey: string;
  baseUrl: string;
  model: string;
  text: string;
}) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你是 JSON 修复器。只输出一个完整、严格、可解析的 JSON 对象，不要 Markdown。保留原内容，修复缺失的逗号、引号、数组或对象闭合；如果末尾被截断，请补全最少必要内容。",
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 12000,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "DeepSeek 报告 JSON 修复失败");
  }
  const repaired = data?.choices?.[0]?.message?.content;
  if (!repaired) throw new Error("DeepSeek 没有返回修复后的报告 JSON");
  return repaired;
}

async function generateWithOpenAI(body: GenerateReportBody): Promise<Report> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 OPENAI_API_KEY。请在 .env.local 中配置后再生成报告。");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-5.2";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: buildSystemPrompt(),
        },
        {
          role: "user",
          content: JSON.stringify(withAdmissionPlanContext(body)),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "gaokao_life_report",
          strict: true,
          schema: reportSchema,
        },
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "OpenAI API 请求失败");
  }

  const text = extractOpenAIText(data);
  return normalizeReport(parseModelJson(text), body);
}

async function generateWithOllama(body: GenerateReportBody): Promise<Report> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL ?? "qwen2.5:14b";
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: JSON.stringify(withAdmissionPlanContext(body)) },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? "Ollama 请求失败，请确认 Ollama 已启动且模型已安装。");
  }

  return normalizeReport(parseModelJson(data.message.content), body);
}

function parseModelJson(text: string) {
  const cleaned = text
    .replace(/^\uFEFF/, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("模型返回的内容不是有效报告，请重新生成一次。");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function extractOpenAIText(data: any) {
  if (typeof data.output_text === "string") return data.output_text;
  const text = data.output
    ?.flatMap((item: any) => item.content ?? [])
    ?.find((content: any) => content.type === "output_text")?.text;
  if (!text) throw new Error("模型没有返回可解析的报告 JSON");
  return text;
}

function withAdmissionPlanContext(body: GenerateReportBody) {
  const province = body.basicInfo?.province ?? "";
  const source = province ? getAdmissionPlanSource(province) : undefined;
  return {
    ...body,
    backendAdmissionPlan2026: source
      ? {
          province: source.province,
          status: source.status,
          sourceName: source.sourceName,
          sourceUrl: source.sourceUrl,
          note: source.note,
        }
      : {
          province,
          status: "not_started",
          note: "当前省份 2026 招生计划尚未导入后台结构化数据。",
        },
  };
}

function buildSystemPrompt() {
  return `
你是“AI高考人生军师”，不是普通聊天机器人。你的报告是给高考学生和家长看的，不是给开发者看的。

生成规则：
1. 必须输出严格 JSON，不要 Markdown，不要解释 JSON。
1.1 JSON 顶层必须直接包含 summary、mentorConclusion、estimatedRank、recommendedCity、profile、fitTags、cityAdvice、majorAdvice、strategy、lifeRoutes、schoolRecommendations、regrets、nextSteps，不要包一层 report。
1.2 profile 必须生成 7 个具体画像维度，label 只能使用这些清晰名称：风险偏好、独立适应、社交协作、执行力、抗压能力、家庭支持、稳定偏好。禁止写“画像一”“画像二”“画像维度”“性格画像”这种看不懂的标题。
2. 不要出现“需接入”“待核验”“本地规则”“开发者”“模型”“待确认学校”“待确认专业”“需结合执行力判断”等后台词或敷衍词。
3. 可以使用常识和用户输入做推断，但不能编造精确就业率、保研率、推免名额、博士点数量；如果提到往年分数，只能写“约”“需要以省考试院为准”，不要装成官方精确数据。
4. 如果缺少实时官方数据，换成学生能执行的话：例如“去学校官网查近三年就业质量报告，重点看本专业去向”。
5. 推荐必须具体到城市、学校、专业、冲稳保，不允许只写“艺术类专业”“体育类专业”“优质本科”这种空话。
5.1 schoolRecommendations 每一项都必须写 dormCondition、studentExperience、admissionsUrl、dormSearchUrl、transferSearchUrl、experienceSearchUrl。链接可以是学校官网或搜索链接。
5.1.0 schoolRecommendations 每一项还必须写 admissionHistory，固定 3 条，分别对应 2025、2024、2023。每条包含 year、scoreLine、rank、note、source。scoreLine/rank 可以写“约”“区间”“以省考试院为准”，但不能空着；source 要写“省考试院投档表/学校招生网/阳光高考”等数据口径。这里是给学生一眼判断冲稳保用的，不要把“自己去查近三年分数线”放到下一步里。
5.1.00 如果用户输入里有 backendAdmissionPlan2026，必须根据其 status 判断口径：status=imported 时优先按后台招生计划生成学校和专业；status=imported_partial 时只能把已导入批次作为强依据，其他批次仍要说明“需以本省 2026 专业目录最终导入后复核”；status 不是 imported/imported_partial 时，可以推荐具体学校专业，但必须在 dataFreshness 或 reason 中说明“2026 招生计划需以本省专业目录最终导入后复核”，不能假装已经拥有该省完整招生计划。
5.1.1 每所学校的 employmentRate、graduateRate、postgraduateQuota、transferDifficulty、dormCondition、studentExperience、facultyStrength、degreePrograms、researchStrength、dataFreshness 必须围绕“这所学校 + 这个专业 + 这座城市”分别写，六所学校之间不能复制同一句话。不能只写“去官网查”“以官网为准”“重点看就业质量报告”这种通用句，必须先给导师判断，再告诉用户查什么。
5.1.2 对无法保证实时准确的官方数字，不要编造百分比；要写成可执行的核验清单，例如“查 XX大学 XX学院就业质量报告里的对口率、主要就业城市、典型单位”“查教务处转专业文件是否限制 XX专业跨学院转入”。每个字段都要带上学校名或专业名，让用户知道是在查哪一所。
5.2 strategy.reach/match/safe 里必须直接出现具体学校和专业，例如“福州大学 · 视觉传达设计”，不要写“优质本科”“待确认学校”。
5.2.1 schoolRecommendations 固定生成 6 所：2所冲、2所稳、2所保。每个说明字段控制在1-2句话，避免重复和冗长。
5.3 lifeRoutes 必须且只能生成 2 条，并分别绑定 strategy.reach 中前两所“值得冲”的具体学校和专业。两条路径的学校、专业、行业和大学行动不能相同。
5.3.1 每条路线必须包含 school、major、admissionAction、collegePlan、targetIndustry、skillChecklist、jobSearchKeywords。collegePlan 必须写清大一、大二、大三、大四分别做什么；skillChecklist 写招聘岗位常见技能；jobSearchKeywords 给出 3-5 个可直接在招聘网站搜索的岗位关键词。
5.3.2 路线示例：“录取某大学某专业 -> 入学前准备 -> 大一基础与社团/作品 -> 大二项目与证书 -> 大三实习与作品集 -> 大四校招/考研 -> 目标行业”。不要写“需结合执行力判断”，也不要在报告里让学生再补预算、行业偏好、城市范围。
5.3.3 lifeRoutes 每条必须明确毕业后的地域选择建议，至少覆盖“回老家工作 / 去大城市闯荡 / 留在大学所在城市 / 国内读研 / 海外读研或留国外”中的 3 项，并讲清利弊：收入上限、生活成本、家庭支持、行业机会、编制/国企/考公机会、心理适应、长期风险。不能只写“看个人选择”，要给导师判断。例如：家庭资源弱但执行力强，可以建议先去产业强城市积累 3-5 年再决定是否回流；家庭托底强且英语/预算够，可以把中外合办或海外硕士作为备线；若家庭压力大，不建议为了留国外或中外合办牺牲现金流。
5.4 必须综合 basicInfo.gender、familyBudget、majorPreferences、careerPreferences、avoidedMajors、subjects、candidateTrack、chineseScore、mathScore、englishScore、subjectScores 和访谈答案来判断专业和学校，不能只按选科或分数模板推荐。
5.4.1 如果用户填写了各科分数，必须在 majorAdvice、mentorConclusion 或 schoolRecommendations.reason 中体现学科强弱判断：例如数学/物理强可考虑工科、计算机、电子信息；语文/英语/政治/历史强可考虑法学、师范、新闻传播、外语、公共管理；化学/生物强可考虑医学、药学、生物、食品、农学等。不能机械决定专业，要结合兴趣、抗压、就业和家庭预算一起判断。
5.4.2 如果家长版答案显示家庭有能力支持中外合办或海外读研，报告可以把中外合办、本科后海外硕士、国际化课程作为备选路线；如果经济压力较大，要明确提醒不要为了“国际化”牺牲家庭现金流和保底质量。
5.4.2.1 如果学生版答案显示家庭有能力且本人愿意走中外合办/海外读研路线，也要纳入路线推演；如果本人愿意但家庭压力大，要明确给出替代路径，例如国内强专业、低成本公办本科、本科先就业再读在职/国内硕士，不要诱导高学费冒险。
5.4.3 必须认真分析家庭因素：家庭氛围、父母控制/支持方式、生活习惯是否一致、家庭资源水平、能否托底、毕业后是否需要尽快自立。不要只写“家庭支持一般”。如果学生家庭压力大、资源少、需要早点独立，要体现“家贫走四方”的理性逻辑：可以考虑去产业更强、就业机会更多、生活成本可控的城市，但必须避开高学费、低就业确定性和只靠情怀的专业；如果家庭资源强，可以考虑更长线的考研、国际化、中外合办或试错空间。
5.5 性别只能用于分析现实就业环境、行业友好度、岗位强度、城市机会和长期风险，不能写成刻板判断；如果某专业对女生/男生就业环境不友好，要给替代路径，而不是简单否定。
5.6 majorAdvice 和 schoolRecommendations.reason 必须解释为什么这个专业适合/不适合：性格、执行力、抗压、家庭预算、就业质量、考研必要性、转专业风险都要至少覆盖其中 3 项。
5.7 employmentRate 不能只写“去查报告”，要先给出导师判断，例如“就业面宽但两极分化”“就业稳定但收入上限一般”“学校宣传就业率需看本专业去向”，再说明如何核验就业质量报告。
6. 如果用户写“沿海城市”，要按沿海城市池推荐，如厦门、福州、广州、深圳、杭州、宁波、青岛、大连等，再结合考生类型和分数层级取舍。
7. 艺考生必须结合 artScore，优先推荐艺术类/设计类/传媒类/音乐类/师范艺术方向，并说明专业路线。
7.1 艺考生必须先判断填报主线：艺术综合分主线、文化分普通批主线，还是艺术批和普通批兼报。报告必须明确写出“主线”和“备线”，并结合专业方向、美术/音乐/传媒/表演类别、作品集/证书/教师资格证、学费承受能力和就业波动风险给建议。
8. 体考生必须结合 sportsScore，优先推荐体育教育、运动训练、运动康复、社会体育指导等方向。
8.1 体考生必须先判断填报主线：体育综合分主线、文化分普通批主线，还是体育批和普通批兼报。报告必须明确写出“主线”和“备线”，并结合专项基础、伤病风险、教师资格证/编制、运动康复证书、青训/健身行业和普通批备选给建议。
9. 所有 schoolRecommendations 的学校名称必须是正规高校：优先推荐能在教育部“全国高等学校名单”官方查询入口 https://hudong.moe.gov.cn/qggxmd/ 查到的学校；军队院校还必须能通过军队招生主管部门或阳光高考等官方渠道交叉核验。严禁推荐任何“国防、军事、警官、司法”擦边命名但教育部/官方渠道查不到的野鸡大学。
9.1 每所学校的 dataFreshness 必须明确写“先到教育部全国高校名单核验学校名称，再查学校招生章程/省考试院/官方军队招生信息”。如果学校无法核验，直接从推荐中剔除，不要写进报告。
10. 如果 basicInfo.candidateTrack 是 police 或 police_military，必须按警校提前批逻辑判断：先分析政审、体检、体测、视力、身高、面试、选科、纪律化管理、公安联考/入警政策风险，再推荐公安类院校、司法警官类院校或政法类普通院校备选。不要混入军校院校。
10.1 警校方向要引导具体专业：侦查学、治安学、公安管理学、公安情报学、刑事科学技术、网络安全与执法、交通管理工程、警务指挥与战术、司法警察学、监狱学。不得只写“警校专业”。
10.2 警校方向的 regrets 必须提醒：只看稳定不看体检政审、只看制服荣誉不看纪律化管理、只填提前批不留普通批备选、误把普通政法专业当成公安入警专业。
11. 如果 basicInfo.candidateTrack 是 military，必须按军校提前批逻辑判断：先分析政审、军检、体能、视力、身高、面试、选科、训练强度、服从分配、军种岗位不确定性，再推荐军队院校或普通批工科/医学/信息安全备选。不要混入警校院校。
11.1 军校方向要引导具体专业方向：指挥类、信息通信、网络空间安全、电子工程、航空航天、兵器工程、无人系统、雷达工程、军医、后勤保障、管理科学与工程。不得只写“军校专业”。
11.2 军校方向的 regrets 必须提醒：只看免费和稳定不看军检政审、只看军校名气不看专业和军种、低估训练纪律和服从分配、没有普通批备选。
12. 普通类考生不要混入艺考、体考、警校、军校建议；艺考生不要混入体考、警校、军校建议；体考生不要混入艺考、警校、军校建议；警校方向不要混入军校建议；军校方向不要混入警校建议。
13. 家长版必须用“您”和“孩子”来表达，强调家庭资源、学费成本、城市距离、就业风险、孩子适应能力，禁止把家长当成考生说“你适合”；学生版要更像导师和朋友。
14. 报告口吻要像一个认真负责的志愿导师：具体、直白、有取舍，不要套话。
15. regrets 必须根据这个学生的具体分数、性格、家庭预算、城市偏好、专业偏好和两条人生路线生成 3-5 条个性化后悔风险。每条都要说清“什么选择 -> 为什么可能后悔 -> 如何避免”，禁止写任何考生都适用的空话。
16. nextSteps 只能写报告生成后的执行动作：保存报告、对比本页学校卡片里的近三年录取参考、打开卡片里的官方招生/转专业/宿舍链接、生成海报或关注博主获取完整解读。禁止写“使用百度/夸克/搜索引擎自行查询”这种把问题甩给用户的话，也不要再要求用户自己重新查近三年录取分数线。
`;
}

function normalizeReport(value: any, body?: GenerateReportBody): Report {
  if (value?.summary) {
    const schools = coerceSchools(value.schoolRecommendations ?? flattenStrategySchools(value.strategy));
    return {
      ...mockReport,
      summary: coerceText(value.summary, mockReport.summary),
      mentorConclusion: coerceText(value.mentorConclusion, mockReport.mentorConclusion),
      estimatedRank: coerceText(value.estimatedRank, mockReport.estimatedRank),
      recommendedCity: coerceText(value.recommendedCity, mockReport.recommendedCity),
      profile: coerceProfile(value.profile, body),
      fitTags: coerceStringArray(value.fitTags, mockReport.fitTags),
      cityAdvice: coerceText(value.cityAdvice, mockReport.cityAdvice),
      majorAdvice: coerceText(value.majorAdvice, mockReport.majorAdvice),
      strategy: coerceStrategy(value.strategy, schools),
      lifeRoutes: coerceLifeRoutes(value.lifeRoutes, schools),
      schoolRecommendations: schools,
      regrets: coerceStringArray(value.regrets, mockReport.regrets),
      nextSteps: coerceNextSteps(value.nextSteps, schools),
    } as Report;
  }

  const nested = value?.report;
  if (nested) {
    const recommendations = Array.isArray(nested.recommendations) ? nested.recommendations : [];
    const schoolRecommendations = recommendations.map((item: any) => ({
      school: String(item.school ?? "请以同分段院校池重新生成具体学校"),
      city: String(item.city ?? "优先按目标省份和沿海/省会偏好筛选城市"),
      major: String(item.major ?? "按考生类型重新生成具体专业"),
      level: parseLevel(String(item.type ?? "")),
      reason: String(item.reason ?? "这所学校需要结合你的分数、专业分和城市偏好进一步确认。"),
      admissionHistory: coerceAdmissionHistory(item.admissionHistory ?? item.admissionReference, {
        school: String(item.school ?? "候选学校"),
        major: String(item.major ?? "候选专业"),
        level: parseLevel(String(item.type ?? "")),
      }),
      employmentRate: "这个方向就业质量容易分化：学校宣传就业率只能当参考，重点看本专业毕业生去了哪些城市、行业和岗位。",
      graduateRate: "升学空间要看学院去向和考研/专升本案例，不只看全校平均数据。",
      postgraduateQuota: "本科看推免公示；专科看专升本去向和合作本科渠道。",
      transferDifficulty: "查招生章程和教务处转专业文件，尤其注意艺体类能否跨专业。",
      facultyStrength: "查学院教师作品、项目、工作室、校企合作和学生获奖。",
      degreePrograms: "本科看硕士点/博士点；高职看重点专业、实训基地和双高计划。",
      researchStrength: "艺术类重点看作品展、比赛、工作室和行业合作。",
      dataFreshness: "先到教育部全国高等学校名单核验学校名称，再查学校招生章程、省考试院投档数据和学院最新就业质量报告。",
      dormCondition: String(item.dormCondition ?? "重点看宿舍人数、是否独卫、是否有空调、校区位置和到学院通勤时间。"),
      studentExperience: String(item.studentExperience ?? "重点看在读学生对课程强度、宿舍、食堂、实习机会和管理风格的反馈。"),
      admissionsUrl: String(item.admissionsUrl ?? searchUrl(`${item.school ?? ""} 招生章程 招生网`)),
      dormSearchUrl: String(item.dormSearchUrl ?? searchUrl(`${item.school ?? ""} 宿舍 条件 校区`)),
      transferSearchUrl: String(item.transferSearchUrl ?? searchUrl(`${item.school ?? ""} 转专业 政策 教务处`)),
      experienceSearchUrl: String(item.experienceSearchUrl ?? searchUrl(`${item.school ?? ""} 就读体验 贴吧 小红书 知乎`)),
    }));

    return {
      ...mockReport,
      summary: String(nested.greeting ?? nested.title ?? mockReport.summary),
      mentorConclusion: String(nested.closing ?? mockReport.mentorConclusion),
      estimatedRank: String(nested.evaluation?.compositeScoreApprox ?? mockReport.estimatedRank),
      recommendedCity: buildCityFromRecommendations(schoolRecommendations),
      profile: coerceProfile(nested.profile, body),
      fitTags: ["AI深度生成", "按考生类型分析", "按城市偏好筛选", "需最终查官方数据"],
      cityAdvice: buildCityFromRecommendations(schoolRecommendations),
      majorAdvice: String(nested.evaluation?.track ?? mockReport.majorAdvice),
      strategy: {
        reach: schoolRecommendations
          .filter((item: any) => item.level === "冲")
          .map((item: any) => `${item.school} · ${item.major}`),
        match: schoolRecommendations
          .filter((item: any) => item.level === "稳")
          .map((item: any) => `${item.school} · ${item.major}`),
        safe: schoolRecommendations
          .filter((item: any) => item.level === "保")
          .map((item: any) => `${item.school} · ${item.major}`),
      },
      lifeRoutes: coerceLifeRoutes(nested.lifeRoutes ?? nested.routes, schoolRecommendations),
      schoolRecommendations,
      regrets: [
        "只看城市漂亮，不看专业是否能积累作品和实习。",
        "只看综合分能不能上，不看学校作品资源、工作室和就业去向。",
        "把保底学校随便填，最后录取了才发现专业和城市都不适合。",
      ],
      nextSteps: coerceNextSteps(nested.actionList, schoolRecommendations),
    };
  }

  throw new Error("模型返回的报告结构无法解析，请重试一次。");
}

const profileDimensions = [
  { key: "risk", label: "风险偏好", fallback: "能接受一定风险，但志愿表里仍然需要看得见的退路。" },
  { key: "independence", label: "独立适应", fallback: "离家、城市变化和大学生活都需要提前评估适应成本。" },
  { key: "sociability", label: "社交协作", fallback: "更适合有明确小团队、项目或师长支持的成长环境。" },
  { key: "execution", label: "执行力", fallback: "目标越清楚，大学四年的课程、作品、实习越容易持续推进。" },
  { key: "pressure", label: "抗压能力", fallback: "可以承受阶段性压力，但长期高压行业要谨慎取舍。" },
  { key: "familyResource", label: "家庭支持", fallback: "家庭预算、观念和资源会影响城市、民办/中外合办、考研等选择。" },
  { key: "stability", label: "稳定偏好", fallback: "需要在冲刺机会和稳定出口之间留好梯度。" },
];

function coerceProfile(profile: any, body?: GenerateReportBody) {
  if (Array.isArray(profile)) {
    return profileDimensions.map((dimension, index) => {
      const item = findProfileMetric(profile, dimension, index);
      return {
        key: dimension.key,
        label: dimension.label,
        score: clampProfileScore(item?.score, body, dimension.key),
        level: coerceText(item?.level, "中"),
        reading: coerceText(item?.reading ?? item?.value ?? item?.description, dimension.fallback),
      };
    });
  }
  if (profile && typeof profile === "object") {
    return profileDimensions.map((dimension) => {
      const value =
        profile[dimension.key] ??
        profile[dimension.label] ??
        profile[profileLabel(dimension.key)];
      return {
        key: dimension.key,
        label: dimension.label,
        score: clampProfileScore(typeof value === "object" ? value?.score : undefined, body, dimension.key),
        level: coerceText(typeof value === "object" ? value?.level : undefined, "中"),
        reading: coerceText(typeof value === "object" ? value?.reading ?? value?.value : value, dimension.fallback),
      };
    });
  }
  return mockReport.profile;
}

function findProfileMetric(profile: any[], dimension: (typeof profileDimensions)[number], index: number) {
  const byKey = profile.find((item) => item?.key === dimension.key);
  if (byKey) return byKey;
  const byLabel = profile.find((item) => item?.label === dimension.label);
  if (byLabel) return byLabel;
  return profile[index];
}

function clampProfileScore(value: unknown, body?: GenerateReportBody, key?: string) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : heuristicProfileScore(body, key);
}

function heuristicProfileScore(body?: GenerateReportBody, key = "risk") {
  const text = [
    body?.basicInfo?.familyBudget,
    body?.basicInfo?.majorPreferences,
    body?.basicInfo?.careerPreferences,
    body?.basicInfo?.avoidedMajors,
    ...(body?.answers ?? []).flatMap((answer) => [answer.question, answer.answer]),
  ].join(" ");

  const count = (words: string[]) => words.reduce((total, word) => total + (text.includes(word) ? 1 : 0), 0);
  const signals: Record<string, number> = {
    risk: 52 + count(["风险", "高薪", "创业", "挑战", "冲", "一线", "新行业"]) * 6 - count(["稳定", "编制", "保守", "离家近"]) * 5,
    independence: 52 + count(["远", "离家", "外省", "独立", "兴奋", "大城市", "早点自立", "四方"]) * 6 - count(["不安", "离家近", "家里", "照顾", "被影响"]) * 5,
    sociability: 52 + count(["社交", "团队", "表达", "沟通", "朋友", "组织"]) * 6 - count(["独处", "安静", "内向", "少社交"]) * 4,
    execution: 54 + count(["计划", "坚持", "自律", "作品", "项目", "证书"]) * 5 - count(["拖延", "迷茫", "不确定"]) * 5,
    pressure: 52 + count(["高压", "竞争", "加班", "训练", "纪律", "抗压"]) * 5 - count(["压力小", "轻松", "不接受高压"]) * 6,
    familyResource: 52 + count(["支持", "预算", "中外", "留学", "资源", "家庭能", "托底", "人脉"]) * 5 - count(["学费敏感", "预算有限", "不支持", "压力大", "家里很辛苦", "尽快自立"]) * 6,
    stability: 52 + count(["稳定", "编制", "公务员", "教师", "国企", "体制"]) * 6 - count(["高薪", "风险", "创业", "波动"]) * 4,
  };
  return Math.min(88, Math.max(32, Math.round(signals[key] ?? 58)));
}

function profileLabel(key: string, index = 0) {
  const labels: Record<string, string> = {
    base: "基础画像",
    strengths: "优势",
    weaknesses: "风险点",
    risk: "风险偏好",
    independence: "独立适应",
    sociability: "社交协作",
    execution: "执行力",
    pressure: "抗压能力",
    familyResource: "家庭支持",
    stability: "稳定偏好",
  };
  return labels[key] ?? profileDimensions[index]?.label ?? "综合画像";
}

function coerceStrategy(strategy: any, schools: Report["schoolRecommendations"]) {
  const bySchool = {
    reach: schools.filter((item) => item.level === "冲").map((item) => `${item.school} · ${item.major}`),
    match: schools.filter((item) => item.level === "稳").map((item) => `${item.school} · ${item.major}`),
    safe: schools.filter((item) => item.level === "保").map((item) => `${item.school} · ${item.major}`),
  };

  const reach = coerceStrategyItems(strategy?.reach ?? strategy?.["冲"], bySchool.reach);
  const match = coerceStrategyItems(strategy?.match ?? strategy?.["稳"], bySchool.match);
  const safe = coerceStrategyItems(strategy?.safe ?? strategy?.["保"], bySchool.safe);

  return {
    reach: reach.length ? reach : mockReport.strategy.reach,
    match: match.length ? match : mockReport.strategy.match,
    safe: safe.length ? safe : mockReport.strategy.safe,
  };
}

function coerceStrategyItems(items: any, fallback: string[]) {
  if (!Array.isArray(items)) return fallback;
  return items.map((item) => {
    if (typeof item === "string") return item;
    return `${item.school ?? item.name ?? "学校"} · ${item.major ?? "专业"}${item.reason ? `：${item.reason}` : ""}`;
  });
}

function coerceLifeRoutes(routes: any, schools: Report["schoolRecommendations"]) {
  const targets = Array.from(
    new Map(
      [...schools.filter((item) => item.level === "冲"), ...schools].map((item) => [
        `${item.school}-${item.major}`,
        item,
      ]),
    ).values(),
  ).slice(0, 2);
  const source = Array.isArray(routes) ? routes.slice(0, 2) : [];

  return [0, 1].map((index) => {
    const item = source[index];
    const target = targets[index];
    const school = target?.school ?? coerceText(item?.school, `第${index + 1}所冲刺院校`);
    const major = target?.major ?? coerceText(item?.major, "重点推荐专业");
    const duplicatePlan =
      index === 1 &&
      item?.collegePlan != null &&
      JSON.stringify(item.collegePlan) === JSON.stringify(source[0]?.collegePlan);
    const duplicateIndustry =
      index === 1 &&
      item?.targetIndustry != null &&
      coerceText(item.targetIndustry, "") === coerceText(source[0]?.targetIndustry, "");
    const targetIndustry = coerceText(
      duplicateIndustry ? undefined : item?.targetIndustry,
      index === 0 ? "专业对口企业、行业头部公司和城市重点产业" : "区域重点企业、公共服务机构或专业服务公司",
    );
    const defaultPlan = [
      `大一：学好 ${major} 基础课，加入一个专业社团或实验室，完成第一个可展示项目。`,
      "大二：确定细分方向，完成2-3个课程外项目，补齐软件、数据、表达或行业证书能力。",
      `大三：按“${targetIndustry}”招聘要求准备作品集/项目集，争取一段对口实习。`,
      "大四：秋招、考研或考公只保留一条主线和一条备选线，用真实岗位要求修改简历并集中投递。",
    ];
    const path = coerceText(
      typeof item === "string" ? item : item?.path ?? item?.route,
      `${school} -> ${major} -> 大学项目与实习 -> ${targetIndustry}`,
    );

    return {
      title: `路径${index === 0 ? "A" : "B"}：${school} · ${major}`,
      school,
      major,
      path: index === 1 && path === coerceText(source[0]?.path ?? source[0]?.route, "")
        ? `${school} -> ${major} -> 差异化项目与实习 -> ${targetIndustry}`
        : path,
      probability: coerceText(item?.probability, "中等，取决于大学四年的持续投入"),
      admissionAction: coerceText(
        item?.admissionAction,
        `录取后先核对 ${major} 的培养方案、核心课程和转专业政策，再按岗位要求确定第一学期学习清单。`,
      ),
      collegePlan: coerceStringArray(duplicatePlan ? undefined : item?.collegePlan, defaultPlan).slice(0, 4),
      targetIndustry,
      skillChecklist: coerceStringArray(item?.skillChecklist, [
        `${major} 核心课程对应的专业能力`,
        "至少2-3个能在面试中讲清楚的项目或作品",
        "一段对口实习、行业竞赛或真实协作经历",
        "简历表达、面试沟通和基础办公/数据工具能力",
      ]),
      jobSearchKeywords: coerceStringArray(item?.jobSearchKeywords, [major, `${major} 实习`, targetIndustry]).slice(0, 5),
      upside: coerceText(item?.upside, "学校、专业和就业方向能够形成连续积累。"),
      risk: coerceText(item?.risk, "如果大学期间没有项目、作品或实习，专业名称本身不能保证就业质量。"),
      mentorNote: coerceText(item?.mentorNote ?? item?.note, "每学期都用真实招聘岗位反查自己还缺什么，而不是等到大四才看就业。"),
    };
  });
}

function coerceSchools(items: any): Report["schoolRecommendations"] {
  if (!Array.isArray(items)) return mockReport.schoolRecommendations;
  const seen = createSchoolFieldSeen();
  return items.map((item, index) => {
    const city = String(item.city ?? "优先按目标省份和沿海/省会偏好筛选城市");
    const major = String(item.major ?? item.recommendedMajor ?? item.program ?? "视觉传达设计 / 数字媒体艺术");
    const level = parseLevel(String(item.level ?? item.type ?? ""));
    const rawSchool = String(item.school ?? item.name ?? "");
    const school = isPlaceholderSchoolName(rawSchool) ? fallbackSchoolName(index, major, level) : rawSchool;
    const context = { school, city, major, level, index };

    return {
      school,
      city,
      major,
      level,
      reason: schoolFieldText(
        seen,
        "reason",
        item.reason,
        `${school} 放在“${level}”档，主要看 ${city} 的城市机会、${major} 的就业出口，以及你的分数是否能接受调剂风险。`,
        context,
      ),
      admissionHistory: coerceAdmissionHistory(item.admissionHistory ?? item.admissionReference, { school, major, level }),
      employmentRate: schoolFieldText(
        seen,
        "employmentRate",
        item.employmentRate,
        `${school} 的 ${major} 不只看全校就业率，重点查该学院就业质量报告里的对口就业率、主要就业城市和典型岗位；如果岗位多集中在 ${city} 或周边产业，这所学校的地域价值会更高。`,
        context,
      ),
      graduateRate: schoolFieldText(
        seen,
        "graduateRate",
        item.graduateRate,
        `${school} 的升学价值要看 ${major} 所属学院近三年考研、专升本或出国去向；重点看是否有学生进入更高层次院校，而不是只看学校整体升学宣传。`,
        context,
      ),
      postgraduateQuota: schoolFieldText(
        seen,
        "postgraduateQuota",
        item.postgraduateQuota,
        `${school} 如果是本科院校，查推免公示里 ${major} 所属学院是否有名额、名额是否稳定；如果是高职或民办本科，就改查专升本、考研和合作升学通道。`,
        context,
      ),
      transferDifficulty: schoolFieldText(
        seen,
        "transferDifficulty",
        item.transferDifficulty,
        `${school} 的转专业要直接查教务处文件：${major} 是否允许转入、是否限制选科/绩点/面试、是否能跨学院；如果只能同学院内调整，保底志愿就不能押转专业。`,
        context,
      ),
      dormCondition: schoolFieldText(
        seen,
        "dormCondition",
        item.dormCondition,
        `${school} 要查 ${major} 通常在哪个校区，宿舍是几人间、是否独卫和空调，以及从宿舍到学院/实训楼的通勤时间；同一学校不同校区体验可能差很多。`,
        context,
      ),
      studentExperience: schoolFieldText(
        seen,
        "studentExperience",
        item.studentExperience,
        `${school} 的真实体验建议搜“${school} ${major} 就读体验”，重点看课程强度、老师是否放养、实习资源、社团氛围和 ${city} 生活成本。`,
        context,
      ),
      facultyStrength: schoolFieldText(
        seen,
        "facultyStrength",
        item.facultyStrength,
        `${school} 的师资不要只看教授数量，要看 ${major} 所属学院教师方向、行业项目、竞赛指导和校企合作；应用型专业尤其要看老师是否有真实项目资源。`,
        context,
      ),
      degreePrograms: schoolFieldText(
        seen,
        "degreePrograms",
        item.degreePrograms,
        `${school} 的硕博点要查 ${major} 对应一级学科或专业学位点；有相近硕士点说明课程和导师资源更完整，没有也要看实训平台和就业合作能不能补足。`,
        context,
      ),
      researchStrength: schoolFieldText(
        seen,
        "researchStrength",
        item.researchStrength,
        `${school} 的科研或专业强项要落到 ${major}：查学院重点实验室、工作室、竞赛获奖、横向项目和毕业作品/项目成果，避免只被学校综合排名带偏。`,
        context,
      ),
      dataFreshness: schoolFieldText(
        seen,
        "dataFreshness",
        item.dataFreshness,
        `${school} 这张卡先到教育部全国高等学校名单核验学校名称，再核对 2026 招生章程、所在省考试院投档数据、${major} 所属学院官网和最近一版就业质量报告；军队院校还要交叉核验官方军队招生信息。`,
        context,
      ),
      admissionsUrl: String(item.admissionsUrl ?? searchUrl(`${school} 招生章程 招生网`)),
      dormSearchUrl: String(item.dormSearchUrl ?? searchUrl(`${school} ${major} 宿舍 条件 校区`)),
      transferSearchUrl: String(item.transferSearchUrl ?? searchUrl(`${school} ${major} 转专业 政策 教务处`)),
      experienceSearchUrl: String(item.experienceSearchUrl ?? searchUrl(`${school} ${major} 就读体验 贴吧 小红书 知乎`)),
    };
  });
}

function isPlaceholderSchoolName(value: string) {
  const text = value.trim();
  return (
    !text ||
    text.includes("同分段院校池") ||
    text.includes("重新生成") ||
    text === "推荐院校" ||
    text === "学校"
  );
}

function fallbackSchoolName(index: number, major: string, level: string) {
  const policeMajor = major.includes("侦查") || major.includes("公安") || major.includes("司法") || major.includes("警");
  const militaryMajor =
    major.includes("指挥") ||
    major.includes("军") ||
    major.includes("航空") ||
    major.includes("航天") ||
    major.includes("雷达") ||
    major.includes("兵器") ||
    major.includes("后勤");
  if (policeMajor) {
    const policeSchools = [
      "省级警察学院",
      "中央司法警官学院",
      "司法警官职业学院",
      "政法类普通本科",
      "本省公办本科",
      "公安司法类高职",
    ];
    return policeSchools[index] ?? `${level}档公安司法方向院校`;
  }
  if (militaryMajor) {
    const militarySchools = [
      "国防科技大学",
      "陆军工程大学",
      "海军工程大学",
      "空军工程大学",
      "普通批强工科院校",
      "本省公办本科",
    ];
    return militarySchools[index] ?? `${level}档军校或工科备选院校`;
  }
  return `${level}档候选院校${index + 1}`;
}

function createSchoolFieldSeen() {
  return {
    reason: new Set<string>(),
    employmentRate: new Set<string>(),
    graduateRate: new Set<string>(),
    postgraduateQuota: new Set<string>(),
    transferDifficulty: new Set<string>(),
    dormCondition: new Set<string>(),
    studentExperience: new Set<string>(),
    facultyStrength: new Set<string>(),
    degreePrograms: new Set<string>(),
    researchStrength: new Set<string>(),
    dataFreshness: new Set<string>(),
  };
}

function schoolFieldText(
  seen: ReturnType<typeof createSchoolFieldSeen>,
  key: keyof ReturnType<typeof createSchoolFieldSeen>,
  value: unknown,
  fallback: string,
  context: { school: string; major: string; city: string; level: string; index: number },
) {
  const raw = coerceText(value, "").trim();
  const cleanedRaw = replacePlaceholderSchool(raw, "请以同分段院校池重新生成具体学校", context.school);
  const text = cleanedRaw && !seen[key].has(cleanedRaw) && !isWeakSchoolField(cleanedRaw) ? cleanedRaw : fallback;
  const specificText = text.includes(context.school) || text.includes(context.major)
    ? text
    : `${context.school} · ${context.major}：${text}`;
  seen[key].add(specificText);
  return specificText;
}

function replacePlaceholderSchool(text: string, placeholder: string, school: string) {
  return text
    .replaceAll(placeholder, school)
    .replaceAll("请以同分段院校池重新生成具体学校", school)
    .replaceAll("推荐院校", school);
}

function isWeakSchoolField(text: string) {
  const weakPhrases = ["以学校官网为准", "以官网为准", "需核验", "待核验", "建议查询", "建议查", "去官网查"];
  return text.length < 18 || weakPhrases.some((phrase) => text === phrase || text.startsWith(phrase));
}

function flattenStrategySchools(strategy: any) {
  if (!strategy || typeof strategy !== "object") return [];
  return [
    ...(Array.isArray(strategy.reach) ? strategy.reach : []),
    ...(Array.isArray(strategy.match) ? strategy.match : []),
    ...(Array.isArray(strategy.safe) ? strategy.safe : []),
    ...(Array.isArray(strategy["冲"]) ? strategy["冲"] : []),
    ...(Array.isArray(strategy["稳"]) ? strategy["稳"] : []),
    ...(Array.isArray(strategy["保"]) ? strategy["保"] : []),
  ];
}

function coerceStringArray(value: any, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value.map((item) => coerceText(item, "")).filter(Boolean);
  return items.length ? items : fallback;
}

function coerceNextSteps(value: any, schools: Report["schoolRecommendations"]) {
  const firstSchool = schools[0];
  const secondSchool = schools[1];
  const fallback = [
    firstSchool
      ? `先看本页 ${firstSchool.school} · ${firstSchool.major} 的近三年录取参考，判断你的分数/位次是冲刺、贴线还是余量较大。`
      : "先看本页学校卡片里的近三年录取参考，判断冲稳保是否合理。",
    secondSchool
      ? `再打开 ${secondSchool.school} 的招生网、转专业和宿舍入口，确认专业组、校区、转专业条件和住宿体验。`
      : "再打开学校卡片里的招生网、转专业和宿舍入口，确认专业组、校区和住宿体验。",
    "把两条人生路线保存下来，按报告里的岗位关键词去看企业真实招聘要求，反推大学四年要补的技能。",
    "生成海报或保存报告，方便和家人一起复盘，不需要一开始登录或留手机号。",
  ];
  const rawItems = coerceStringArray(value, fallback);
  const cleaned = rawItems
    .map((item) =>
      item
        .replaceAll("百度", "本页学校卡片")
        .replaceAll("夸克", "官方入口")
        .replaceAll("搜索引擎", "官方入口")
        .replaceAll("自己去查", "对照本页数据区确认")
        .replaceAll("逐个查招生章程和近三年录取分", "逐个对照本页近三年录取参考和招生章程")
        .replaceAll("自行查询", "对照本页数据区和官方入口确认"),
    )
    .filter((item) => !/百度|夸克|搜索引擎|自己去查/.test(item));
  return cleaned.length ? cleaned.slice(0, 4) : fallback;
}

function coerceAdmissionHistory(
  value: any,
  context: { school: string; major: string; level: "冲" | "稳" | "保" },
) {
  const rows = Array.isArray(value) ? value : [];
  const normalized = rows
    .map((item, index) => ({
      year: coerceText(item?.year, String(2025 - index)),
      scoreLine: coerceText(item?.scoreLine ?? item?.score ?? item?.line, ""),
      rank: coerceText(item?.rank ?? item?.position ?? item?.lowestRank, ""),
      note: coerceText(item?.note ?? item?.remark, ""),
      source: coerceText(item?.source, ""),
    }))
    .filter((item) => item.scoreLine || item.rank || item.note)
    .slice(0, 3);

  if (normalized.length === 3) return normalized;

  const levelHint =
    context.level === "冲"
      ? "通常要看是否接近近年最低投档位次，属于有机会但不能押满的冲刺档。"
      : context.level === "稳"
        ? "通常应接近或略优于近年最低投档位次，属于需要重点比较专业组的稳妥档。"
        : "通常应明显优于近年最低投档位次，作为保底要优先确认专业是否能接受。";

  return ["2025", "2024", "2023"].map((year) => ({
    year,
    scoreLine: `${context.school} · ${context.major}：待接入本省考试院精确投档线`,
    rank: "先按你的位次与该校近年最低投档位次对照",
    note: levelHint,
    source: "省考试院投档表 / 学校招生网 / 阳光高考",
  }));
}

function coerceText(value: any, fallback: string): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const text = value.map((item) => coerceText(item, "")).filter(Boolean).join("；");
    return text || fallback;
  }
  if (value && typeof value === "object") {
    for (const key of ["text", "content", "value", "summary", "advice", "conclusion", "description"]) {
      if (value[key] != null) return coerceText(value[key], fallback);
    }
    const text = Object.values(value)
      .map((item) => coerceText(item, ""))
      .filter(Boolean)
      .join("；");
    return text || fallback;
  }
  return fallback;
}

function parseLevel(text: string): "冲" | "稳" | "保" {
  const normalized = text.toLowerCase();
  if (normalized.includes("保") || normalized.includes("safe") || normalized.includes("safety")) return "保";
  if (normalized.includes("稳") || normalized.includes("match") || normalized.includes("target")) return "稳";
  return "冲";
}

function buildCityFromRecommendations(schools: Array<{ city: string }>) {
  const cities = Array.from(new Set(schools.map((item) => item.city).filter(Boolean)));
  if (!cities.length) return mockReport.recommendedCity;
  return `这次建议优先看 ${cities.slice(0, 6).join("、")}。这些城市和你的目标地区、考生类型、专业方向更匹配。`;
}

function searchUrl(query: string) {
  return `https://www.baidu.com/s?wd=${encodeURIComponent(query.trim())}`;
}

const reportSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "mentorConclusion",
    "estimatedRank",
    "recommendedCity",
    "profile",
    "fitTags",
    "cityAdvice",
    "majorAdvice",
    "strategy",
    "lifeRoutes",
    "schoolRecommendations",
    "regrets",
    "nextSteps",
  ],
  properties: {
    summary: { type: "string" },
    mentorConclusion: { type: "string" },
    estimatedRank: { type: "string" },
    recommendedCity: { type: "string" },
    profile: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "label", "score", "level", "reading"],
        properties: {
          key: { type: "string" },
          label: { type: "string" },
          score: { type: "number" },
          level: { type: "string" },
          reading: { type: "string" },
        },
      },
    },
    fitTags: { type: "array", items: { type: "string" } },
    cityAdvice: { type: "string" },
    majorAdvice: { type: "string" },
    strategy: {
      type: "object",
      additionalProperties: false,
      required: ["reach", "match", "safe"],
      properties: {
        reach: { type: "array", items: { type: "string" } },
        match: { type: "array", items: { type: "string" } },
        safe: { type: "array", items: { type: "string" } },
      },
    },
    lifeRoutes: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "school",
          "major",
          "path",
          "probability",
          "admissionAction",
          "collegePlan",
          "targetIndustry",
          "skillChecklist",
          "jobSearchKeywords",
          "upside",
          "risk",
          "mentorNote",
        ],
        properties: {
          title: { type: "string" },
          school: { type: "string" },
          major: { type: "string" },
          path: { type: "string" },
          probability: { type: "string" },
          admissionAction: { type: "string" },
          collegePlan: { type: "array", items: { type: "string" } },
          targetIndustry: { type: "string" },
          skillChecklist: { type: "array", items: { type: "string" } },
          jobSearchKeywords: { type: "array", items: { type: "string" } },
          upside: { type: "string" },
          risk: { type: "string" },
          mentorNote: { type: "string" },
        },
      },
    },
    schoolRecommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "school",
          "city",
          "major",
          "level",
          "reason",
          "admissionHistory",
          "employmentRate",
          "graduateRate",
          "postgraduateQuota",
          "transferDifficulty",
          "facultyStrength",
          "degreePrograms",
          "researchStrength",
          "dataFreshness",
          "dormCondition",
          "studentExperience",
          "admissionsUrl",
          "dormSearchUrl",
          "transferSearchUrl",
          "experienceSearchUrl",
        ],
        properties: {
          school: { type: "string" },
          city: { type: "string" },
          major: { type: "string" },
          level: { type: "string", enum: ["冲", "稳", "保"] },
          reason: { type: "string" },
          admissionHistory: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["year", "scoreLine", "rank", "note", "source"],
              properties: {
                year: { type: "string" },
                scoreLine: { type: "string" },
                rank: { type: "string" },
                note: { type: "string" },
                source: { type: "string" },
              },
            },
          },
          employmentRate: { type: "string" },
          graduateRate: { type: "string" },
          postgraduateQuota: { type: "string" },
          transferDifficulty: { type: "string" },
          facultyStrength: { type: "string" },
          degreePrograms: { type: "string" },
          researchStrength: { type: "string" },
          dataFreshness: { type: "string" },
          dormCondition: { type: "string" },
          studentExperience: { type: "string" },
          admissionsUrl: { type: "string" },
          dormSearchUrl: { type: "string" },
          transferSearchUrl: { type: "string" },
          experienceSearchUrl: { type: "string" },
        },
      },
    },
    regrets: { type: "array", items: { type: "string" } },
    nextSteps: { type: "array", items: { type: "string" } },
  },
};
