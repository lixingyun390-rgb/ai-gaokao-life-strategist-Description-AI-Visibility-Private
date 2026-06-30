import { mockReport } from "@/lib/mock-data";
import type { Audience, BasicInfo, InterviewAnswer, ProfileMetric, Report, SchoolRecommendation } from "@/lib/types";

type GenerateReportInput = {
  audience?: Audience;
  basicInfo?: BasicInfo;
  answers?: InterviewAnswer[];
};

type RawScores = {
  risk: number;
  independence: number;
  sociability: number;
  execution: number;
  pressure: number;
  familyResource: number;
  stability: number;
};

type ScoreBand = "top" | "strong" | "mid" | "low" | "specialist";

const regionCities: Record<string, string[]> = {
  福建: ["福州", "厦门", "泉州", "漳州", "莆田", "三明", "龙岩", "宁德"],
  江苏: ["南京", "苏州", "无锡", "常州", "南通", "徐州"],
  浙江: ["杭州", "宁波", "温州", "金华", "绍兴"],
  广东: ["广州", "深圳", "佛山", "东莞", "珠海"],
  四川: ["成都", "绵阳", "宜宾", "南充"],
};

const coastalCities = ["厦门", "福州", "泉州", "漳州", "广州", "深圳", "珠海", "汕头", "杭州", "宁波", "温州", "南京", "苏州", "青岛", "烟台", "大连"];

export function generateLocalReport(input: GenerateReportInput): Report {
  const basic = input.basicInfo;
  const profile = buildProfile(scoreAnswers(input.answers ?? []));
  const score = Number(basic?.score || 0);
  const scoreBand = getScoreBand(score);
  const targetRegion = detectTargetRegion(basic?.preferredCities || "", basic?.province || "");
  const cityPlan = recommendCity(targetRegion, scoreBand, basic?.candidateTrack ?? "general");
  const estimatedRank = estimateRank(score, basic?.scoreReleased ?? true, basic?.rank);

  const risk = profile.find((item) => item.key === "risk")?.score ?? 50;
  const stability = profile.find((item) => item.key === "stability")?.score ?? 50;
  const execution = profile.find((item) => item.key === "execution")?.score ?? 50;
  const family = profile.find((item) => item.key === "familyResource")?.score ?? 50;
  const isParent = input.audience === "parent";
  const track = basic?.candidateTrack ?? "general";
  const answersText = (input.answers ?? []).map((item) => `${item.question} ${item.answer}`).join(" ");

  const schools = buildSchoolRecommendations(targetRegion, scoreBand, track);

  return {
    ...mockReport,
    profile,
    estimatedRank,
    recommendedCity: cityPlan,
    summary: buildSummary({ basic, targetRegion, scoreBand, cityPlan, estimatedRank, isParent }),
    mentorConclusion: buildMentorConclusion({ risk, stability, execution, family, isParent, scoreBand }),
    fitTags: buildFitTags(profile, scoreBand, track),
    cityAdvice: buildCityAdvice(targetRegion, scoreBand, track),
    majorAdvice: buildMajorAdvice(risk, stability, execution, track, answersText),
    strategy: buildStrategy(scoreBand, track, schools),
    lifeRoutes: buildLifeRoutes(scoreBand, track, risk, stability, execution, targetRegion),
    schoolRecommendations: schools,
    regrets: buildRegrets(track, family),
    nextSteps: buildNextSteps(basic?.scoreReleased === false, track),
  };
}

function getScoreBand(score: number): ScoreBand {
  if (score >= 640) return "top";
  if (score >= 560) return "strong";
  if (score >= 430) return "mid";
  if (score >= 330) return "low";
  return "specialist";
}

function estimateRank(score: number, scoreReleased: boolean, rank?: string) {
  if (scoreReleased && rank) return `已按你填写的位次 ${rank} 作为主判断坐标。`;
  if (!score) return "未填写有效分数，暂不能估算位次。";
  if (score >= 640) return "粗略估算：通常属于高分段，需要按本省一分一段精确确认前段位次。";
  if (score >= 560) return "粗略估算：通常在本科较强竞争区间，可看省内外重点本科和行业特色院校。";
  if (score >= 430) return "粗略估算：通常在普通本科或本科边缘区间，应重视城市、专业和保底。";
  if (score >= 330) return "粗略估算：通常要重点比较民办本科、独立学院、优质高职和专科批次。";
  return "粗略估算：更适合优先看高职专科、职业技术学院和技能型就业路径。";
}

function detectTargetRegion(preferred: string, fallbackProvince: string) {
  const text = `${preferred} ${fallbackProvince}`;
  if (text.includes("沿海")) return "沿海";
  for (const region of Object.keys(regionCities)) {
    if (text.includes(region)) return region;
  }
  for (const [region, cities] of Object.entries(regionCities)) {
    if (cities.some((city) => text.includes(city))) return region;
  }
  return fallbackProvince || "全国";
}

function recommendCity(region: string, band: ScoreBand, track: BasicInfo["candidateTrack"]) {
  const cities = regionCities[region] ?? ["省会城市", "区域中心城市", "产业型地级市"];
  if (track === "art") {
    if (region === "沿海") {
      return "沿海城市方向建议优先看厦门、福州、广州、杭州、宁波、青岛、大连这类有设计、传媒、展演和实习资源的城市。";
    }
    return `${region}方向建议优先看有艺术院校、设计/传媒资源和省会展演机会的城市：${cities.slice(0, 3).join("、")}。`;
  }
  if (track === "sports") {
    return `${region}方向建议优先看有体育院校、师范体育学院、运动康复资源的城市：${cities.slice(0, 3).join("、")}。`;
  }
  if (track === "police" || track === "police_military") {
    return `${region}方向先看提前批警校是否在本省招生，再看省级警察学院、司法警官学院和政法类普通院校备选；城市偏好要让位于政审、体检、体测、选科和入警政策。`;
  }
  if (track === "military") {
    return `${region}方向先看军校提前批招生计划、军检政审、选科和专业方向，再看普通批工科、医学、信息安全等备选；城市偏好要让位于军种、专业和服从分配。`;
  }
  if (band === "top" || band === "strong") {
    if (region === "沿海") return "沿海城市方向可以优先看厦门、福州、广州、杭州、宁波、青岛、大连等城市。";
    return `${region}方向可以优先看省会或强产业城市：${cities.slice(0, 3).join("、")}。`;
  }
  if (band === "mid") {
    return `${region}方向建议重点看省会普通本科、地级市公办本科和专业特色院校：${cities.slice(0, 4).join("、")}。`;
  }
  return `${region}方向建议不要只盯省会，优先看泉州、漳州、莆田这类生活成本相对低、职业院校和应用型院校更多的城市。`;
}

function buildSummary({
  basic,
  targetRegion,
  scoreBand,
  cityPlan,
  estimatedRank,
  isParent,
}: {
  basic?: BasicInfo;
  targetRegion: string;
  scoreBand: ScoreBand;
  cityPlan: string;
  estimatedRank: string;
  isParent: boolean;
}) {
  const role = isParent ? "从家长版信息看" : "从学生版信息看";
  const score = basic?.score || "未填写";
  const trackText =
    basic?.candidateTrack === "art"
      ? "艺考类"
      : basic?.candidateTrack === "sports"
        ? "体考类"
        : basic?.candidateTrack === "police" || basic?.candidateTrack === "police_military"
          ? "警校方向"
          : basic?.candidateTrack === "military"
            ? "军校方向"
            : "普通类";
  const bandText = scoreBandLabel(scoreBand);
  return `${role}，这是一个${trackText}考生，文化分/预估分为 ${score}。${estimatedRank} 你想去的方向是${targetRegion}，${cityPlan} 现在不能再用固定学校模板推荐，必须先按分数层级、考生类型、目标地区三件事筛一遍。当前判断属于：${bandText}。`;
}

function scoreBandLabel(band: ScoreBand) {
  return {
    top: "高分冲刺层，可看高层次本科和强专业",
    strong: "较强本科层，可看省内外重点本科和行业特色院校",
    mid: "普通本科/本科边缘层，城市和专业匹配比名气更重要",
    low: "本科边缘到专科强校层，要防止盲目冲本科导致专业和学校都不理想",
    specialist: "高职专科优先层，应重点看城市、技能专业和就业质量",
  }[band];
}

function buildSchoolRecommendations(region: string, band: ScoreBand, track: BasicInfo["candidateTrack"]) {
  if (track === "art") return artSchools(region, band);
  if (track === "sports") return sportsSchools(region, band);
  if (track === "police" || track === "police_military") return policeSchools(region, band);
  if (track === "military") return militarySchools(region, band);
  if (region === "福建") return fujianGeneralSchools(band);
  return genericSchools(region, band);
}

function fujianGeneralSchools(band: ScoreBand): SchoolRecommendation[] {
  if (band === "top" || band === "strong") {
    return [
      school("厦门大学", "厦门", "经济管理 / 计算机 / 电子信息", "冲", "高分段可关注，但必须按专业组和位次精确核验。"),
      school("福州大学", "福州", "电气 / 计算机 / 机械 / 土木", "稳", "福建省内重点本科，适合想留福建且分数较强的学生。"),
      school("福建师范大学", "福州", "师范类 / 计算机 / 汉语言", "保", "适合重视省内就业、师范和稳定路线的学生。"),
    ];
  }
  if (band === "mid") {
    return [
      school("福建农林大学", "福州", "计算机 / 园林 / 食品 / 经管", "冲", "普通本科层可关注，专业差异较大，需要看具体专业组。"),
      school("闽南师范大学", "漳州", "师范类 / 数据科学 / 经管", "稳", "适合希望留福建、兼顾稳定就业的学生。"),
      school("泉州师范学院", "泉州", "师范类 / 软件工程 / 经管", "保", "泉州区域就业和生活成本相对可控，可作为稳妥选择。"),
    ];
  }
  if (band === "low") {
    return [
      school("厦门工学院", "厦门", "软件工程 / 电子信息 / 财会", "冲", "本科边缘可关注民办本科，但要重点核算学费和家庭成本。"),
      school("福州外语外贸学院", "福州", "财会 / 数字媒体 / 经管", "稳", "适合本科边缘且想留福州的学生，需核验学费和就业质量。"),
      school("泉州信息工程学院", "泉州", "软件工程 / 电子信息 / 机械", "保", "偏应用型路线，适合更重视技能和就业出口的学生。"),
    ];
  }
  return [
    school("黎明职业大学", "泉州", "软件技术 / 机电 / 建筑 / 经贸", "冲", "300分左右想去福建时，应重点看泉州等地优质高职，而不是硬套本科模板。"),
    school("福建信息职业技术学院", "福州", "软件技术 / 电子信息 / 物联网", "稳", "适合技能就业路线，城市资源和专业匹配度较清楚。"),
    school("漳州职业技术学院", "漳州", "机电 / 食品 / 建筑 / 商贸", "保", "适合作为福建方向的稳妥专科选择，需核验当年专业分。"),
  ];
}

function artSchools(region: string, band: ScoreBand): SchoolRecommendation[] {
  if (region === "沿海") {
    if (band === "specialist" || band === "low") {
      return [
        school("厦门演艺职业学院", "厦门", "舞蹈表演 / 音乐表演 / 影视表演", "冲", "想去沿海且文化分不高时，可以重点看艺术类高职，适合希望继续走表演、音乐、舞蹈方向的学生。"),
        school("福建艺术职业学院", "福州", "艺术设计 / 表演艺术 / 服装与服饰设计", "稳", "更适合希望留在沿海省份、走设计或表演技能就业路线的艺考生。"),
        school("广东文艺职业学院", "广州", "视觉传达设计 / 数字媒体艺术设计 / 音乐表演", "保", "广州传媒和设计资源更多，但生活成本也更高，适合能接受外省和大城市节奏的学生。"),
      ];
    }
    return [
      school("厦门理工学院", "厦门", "视觉传达设计 / 环境设计 / 数字媒体艺术", "冲", "沿海城市、应用型设计方向较匹配，适合想把艺考转成设计就业路线的学生。"),
      school("福建师范大学", "福州", "美术学 / 设计学 / 音乐学", "稳", "师范和艺术资源更稳，适合美术教育、音乐教育或继续升学路线。"),
      school("浙江传媒学院", "杭州", "播音主持 / 广播电视编导 / 数字媒体艺术", "保", "如果兴趣偏传媒、镜头表达和内容行业，可以作为沿海/准沿海城市重点关注对象。"),
    ];
  }
  if (region === "福建") {
    return [
      school("福建师范大学", "福州", "美术学 / 设计学 / 音乐学", band === "top" ? "稳" : "冲", "艺考生优先看艺术类专业实力和综合分规则。"),
      school("厦门理工学院", "厦门", "视觉传达设计 / 环境设计", "稳", "适合想去厦门且走设计就业方向的艺考生。"),
      school("泉州师范学院", "泉州", "美术学 / 音乐学 / 设计类", "保", "福建艺考生可作为区域稳妥选择，需按专业分和综合分核验。"),
    ];
  }
  return [
    school("省内艺术类或师范类院校", "目标省份", "美术/设计/音乐/传媒", "冲", "艺考生应优先看专业分、综合分和招生章程。"),
    school("综合大学艺术学院", "目标城市", "设计类 / 传媒类", "稳", "适合希望兼顾城市和艺术专业的考生。"),
    school("应用型本科艺术专业", "区域城市", "视觉传达 / 环境设计", "保", "更适合作为就业导向选择。"),
  ];
}

function sportsSchools(region: string, band: ScoreBand): SchoolRecommendation[] {
  if (region === "福建") {
    return [
      school("福建师范大学", "福州", "体育教育 / 运动训练", band === "top" ? "稳" : "冲", "体考生优先看体育专业实力、综合分和师范就业出口。"),
      school("集美大学", "厦门", "体育教育 / 社会体育指导", "稳", "适合想去厦门且兼顾体育和综合大学资源的考生。"),
      school("泉州师范学院", "泉州", "体育教育", "保", "适合作为福建体育类稳妥选择，需核验当年体育类投档规则。"),
    ];
  }
  return [
    school("省内师范大学体育学院", "目标省份", "体育教育", "冲", "体考生应优先核验体育专业分和综合分公式。"),
    school("综合大学体育学院", "目标城市", "运动训练 / 社会体育", "稳", "适合兼顾城市和体育就业方向。"),
    school("区域师范学院", "区域城市", "体育教育", "保", "适合作为稳妥批次选择。"),
  ];
}

function policeSchools(region: string, band: ScoreBand): SchoolRecommendation[] {
  if (band === "top" || band === "strong") {
    return [
      school("中国人民公安大学", "北京", "公安学类 / 公安技术类", "冲", "警校方向的高层次选择，必须先看本省提前批招生计划、选科、体检体测和政审要求。"),
      school("中国刑事警察学院", "沈阳", "侦查学 / 刑事科学技术 / 网络安全执法", "冲", "适合明确想走公安技术或侦查路线的考生，身体条件和提前批流程是硬门槛。"),
      school("省级警察学院", "本省或目标省份", "公安专业 / 交通管理工程 / 网络安全执法", "稳", "省级警院要重点看是否面向本省招生、入警政策、体测标准和公安专业组。"),
      school("中央司法警官学院", "保定", "监狱学 / 司法警察学 / 法学", "稳", "适合接受纪律化管理、但想保留司法行政系统路线的考生。"),
      school("区域政法大学", "省会或区域中心", "法学 / 政治学 / 公共管理", "保", "如果提前批条件不稳，政法类普通批可作为学科备选，但不等于警校入警路线。"),
      school("本省公安司法类高职", "本省", "法律事务 / 司法警务 / 安全防范技术", "保", "分数或体检条件不够警校本科时，作为就业导向备选，但要看升学和就业真实去向。"),
    ];
  }
  return [
    school("省级警察学院", "本省", "公安类专业", "冲", "警校本科要先看本省提前批计划和身体政审条件，不能只按分数判断。"),
    school("中央司法警官学院", "保定", "监狱学 / 司法警察学", "冲", "司法警官方向也有体检、政审和提前批规则，需要单独核验。"),
    school("司法警官职业学院", "本省或邻省", "司法警务 / 刑事执行 / 安全防范技术", "稳", "更偏职业技能和司法行政系统相关方向，适合本科边缘或专科强校层。"),
    school("政法类普通本科", "省会或区域中心", "法学 / 知识产权 / 行政管理", "稳", "作为警校/军校未录取后的普通批备选，重点看法学实力、考研和公考氛围。"),
    school("本省公办本科", "本省", "法学 / 公共事业管理 / 计算机", "保", "保底要留普通批可接受专业，不能把全部希望押在提前批。"),
    school("优质公办高职", "本省", "司法信息安全 / 法律事务 / 计算机网络技术", "保", "如果分数较低，优先看就业技能、专升本通道和城市实习资源。"),
  ];
}

function militarySchools(region: string, band: ScoreBand): SchoolRecommendation[] {
  if (band === "top" || band === "strong") {
    return [
      school("国防科技大学", "长沙", "计算机类 / 电子信息类 / 航空航天类", "冲", "军校方向的高层次选择，必须先核验军检政审、选科、招生计划和专业类别。"),
      school("陆军工程大学", "南京", "通信工程 / 指挥信息系统工程 / 土木工程", "冲", "适合能接受军校训练和服从安排、同时想走工程技术或指挥信息方向的考生。"),
      school("海军工程大学", "武汉", "电气工程 / 舰船动力 / 信息工程", "稳", "适合对海军装备、电子电气和工程技术感兴趣的考生，需核验军种和身体条件。"),
      school("空军工程大学", "西安", "航空航天工程 / 通信导航 / 雷达工程", "稳", "适合对航空、电子、雷达和空天方向有兴趣的考生，军检和视力要求要提前看。"),
      school("普通批强工科院校", "省会或区域中心", "电子信息 / 计算机 / 自动化", "保", "如果军校提前批不稳，普通批工科可以作为技术成长备选。"),
      school("普通批医学或信息安全院校", "本省或目标区域", "临床医学 / 信息安全 / 网络空间安全", "保", "军医或网络方向不稳时，普通高校同类专业可保留升学和就业出口。"),
    ];
  }
  return [
    school("陆军工程大学", "南京", "通信工程 / 指挥信息系统工程", "冲", "军校要先看本省招生计划、军检政审和专业类别，不能只按分数判断。"),
    school("战略支援部队信息工程大学", "郑州", "信息工程 / 网络空间安全 / 测绘导航", "冲", "适合信息安全、通信和测绘导航方向，但军校管理和服从安排是硬条件。"),
    school("武警工程大学", "西安", "指挥信息系统工程 / 管理科学与工程", "稳", "适合接受纪律化训练和武警系统岗位安排的考生，需核验当年招生省份。"),
    school("普通批政法或工科本科", "省会或区域中心", "法学 / 计算机 / 电子信息", "稳", "作为军校未录取后的普通批备选，重点看专业实力和就业出口。"),
    school("本省公办本科", "本省", "计算机 / 自动化 / 公共管理", "保", "保底不能只填军校，普通批要留可接受的城市和专业。"),
    school("优质公办高职", "本省", "计算机网络技术 / 机电 / 信息安全技术", "保", "分数较低时优先看技能、专升本和就业质量。"),
  ];
}

function genericSchools(region: string, band: ScoreBand): SchoolRecommendation[] {
  if (band === "specialist") {
    return [
      school(`${region}优质职业技术学院`, "区域中心", "软件技术 / 机电 / 护理 / 财会", "冲", "分数较低时优先看专科强校和就业质量。"),
      school(`${region}信息类高职`, "省会或地级市", "计算机网络 / 电子商务", "稳", "技能型专业比学校名气更关键。"),
      school(`${region}应用型高职`, "地级市", "机电 / 建筑 / 商贸", "保", "适合作为低风险保底选择。"),
    ];
  }
  return [
    school(`${region}省属重点或行业特色本科`, "省会", "计算机 / 电气 / 师范 / 财会", "冲", "需按目标省份近三年投档线精确筛选。"),
    school(`${region}普通公办本科`, "区域中心", "应用型工科 / 师范 / 经管", "稳", "适合普通本科层级的稳妥选择。"),
    school(`${region}应用型本科或高职强校`, "地级市", "就业导向专业", "保", "保底必须是真能接受的城市和专业。"),
  ];
}

function school(
  schoolName: string,
  city: string,
  major: string,
  level: SchoolRecommendation["level"],
  reason: string,
): SchoolRecommendation {
  return {
    school: schoolName,
    city,
    major,
    level,
    reason,
    employmentRate: "看学校《毕业生就业质量报告》：重点看本专业去向，不只看全校平均就业率。",
    graduateRate: "看学院升学去向：是否有考研、专升本、出国或进入更高平台的真实案例。",
    postgraduateQuota: "本科院校看推免公示；专科院校看专升本录取情况和合作本科渠道。",
    transferDifficulty: "看招生章程和教务处转专业文件：是否限制艺术/体育类跨专业，绩点门槛高不高。",
    facultyStrength: "看学院官网教师作品、项目、行业合作和学生获奖，不只看学校宣传语。",
    degreePrograms: "本科看硕士点/博士点；高职看省级重点专业、双高计划、实训基地。",
    researchStrength: "艺术类看作品展、竞赛、工作室和校企合作；普通类看实验室和科研平台。",
    dataFreshness: "先到教育部全国高等学校名单核验学校名称，再查学校招生章程、省考试院投档数据和学院最新就业质量报告。",
  };
}

function scoreAnswers(answers: InterviewAnswer[]): RawScores {
  const scores: RawScores = {
    risk: 50,
    independence: 50,
    sociability: 50,
    execution: 50,
    pressure: 50,
    familyResource: 50,
    stability: 50,
  };
  for (const answer of answers) {
    const text = `${answer.question} ${answer.answer}`;
    add(scores, "risk", text, ["月薪15000", "风险", "冲", "高收入", "大城市搏机会"], 7);
    add(scores, "stability", text, ["稳定", "编制", "国企", "本省稳就业", "稳定第一"], 8);
    add(scores, "independence", text, ["离家", "外省", "出去看看", "独立"], 7);
    add(scores, "familyResource", text, ["培训", "考研", "实习", "人脉", "资源"], 7);
    add(scores, "execution", text, ["自己安排", "目标明确", "提前准备", "能坚持"], 7);
    add(scores, "pressure", text, ["能扛", "高压", "愿意拼", "跟着卷"], 7);
    add(scores, "sociability", text, ["社交", "组织", "外向", "适应快"], 6);
    add(scores, "pressure", text, ["崩", "撑不住", "压力大", "身心健康"], -7);
  }
  Object.keys(scores).forEach((key) => {
    const metric = key as keyof RawScores;
    scores[metric] = Math.max(0, Math.min(100, scores[metric]));
  });
  return scores;
}

function add(scores: RawScores, key: keyof RawScores, text: string, needles: string[], delta: number) {
  if (needles.some((needle) => text.includes(needle))) scores[key] += delta;
}

function buildProfile(scores: RawScores): ProfileMetric[] {
  return [
    metric("risk", "风险偏好", scores.risk, "风险分越高，越能接受高波动路线；越低越需要稳就业出口。"),
    metric("independence", "独立程度", scores.independence, "独立分越高，越适合外省和大城市；越低越要重视离家距离。"),
    metric("sociability", "社交倾向", scores.sociability, "社交分越高，越适合资源型城市和开放环境。"),
    metric("execution", "执行力", scores.execution, "执行力越高，越能走考研、转专业、竞赛项目路线。"),
    metric("pressure", "抗压能力", scores.pressure, "抗压越低，越要避开长期高压和强淘汰专业。"),
    metric("familyResource", "家庭资源", scores.familyResource, "家庭资源越强，越能支撑高成本城市、培训和读研。"),
    metric("stability", "稳定偏好", scores.stability, "稳定偏好越高，越要看编制、国企、师范和本地就业网络。"),
  ];
}

function metric(key: string, label: string, score: number, reading: string): ProfileMetric {
  const level = score >= 70 ? "高" : score >= 45 ? "中" : "低";
  return { key, label, score, level, reading };
}

function buildMentorConclusion(input: {
  risk: number;
  stability: number;
  execution: number;
  family: number;
  isParent: boolean;
  scoreBand: ScoreBand;
}) {
  if (input.scoreBand === "specialist") {
    return "我的判断是：这个分数段不要再用本科思维硬套学校推荐。应该优先看城市、专业技能、就业质量和专升本可能性，选一个能真正学到技能的高职强校。";
  }
  if (input.scoreBand === "low") {
    return "我的判断是：这是最容易填坏的分数段。不要为了本科两个字牺牲城市、专业和家庭成本，要把民办本科、优质高职、专升本路径放在一起比较。";
  }
  if (input.stability >= 65 && input.risk < 65) {
    return input.isParent
      ? "我的判断是：孩子更适合出口清楚、城市可控、家庭能托底的路线，不适合被推到高波动赛道里硬冲。"
      : "我的判断是：你不是不能吃苦，而是不适合为一个自己没想清楚的热门方向硬扛四年。";
  }
  return "我的判断是：这份志愿表必须从人生路线倒推，而不是从学校名气正推。先看分数能到哪一层，再看城市能不能给机会，最后看专业是否学得动、转得出、毕业有路。";
}

function buildFitTags(profile: ProfileMetric[], band: ScoreBand, track: BasicInfo["candidateTrack"]) {
  const byKey = Object.fromEntries(profile.map((item) => [item.key, item.score]));
  return [
    track === "art"
      ? "艺考规则优先"
      : track === "sports"
        ? "体考规则优先"
        : track === "police" || track === "police_military"
          ? "警校提前批与政审体检优先"
          : track === "military"
            ? "军校提前批与军检政审优先"
            : "普通类规则",
    scoreBandLabel(band),
    byKey.stability >= 65 ? "重视稳定出口" : "看重成长空间",
    byKey.familyResource >= 60 ? "可借助家庭支持" : "需控制试错成本",
  ];
}

function buildCityAdvice(region: string, band: ScoreBand, track: BasicInfo["candidateTrack"]) {
  return `${recommendCity(region, band, track)} 如果目标写的是省份，比如“福建”，系统会按福州、厦门、泉州、漳州等城市层级分开推荐，而不是只按一个城市处理。`;
}

function buildMajorAdvice(
  risk: number,
  stability: number,
  execution: number,
  track: BasicInfo["candidateTrack"],
  answersText: string,
) {
  if (track === "art") {
    if (answersText.includes("视觉设计") || answersText.includes("作品集") || answersText.includes("设计公司")) {
      return "你更适合优先看视觉传达设计、数字媒体艺术设计、环境设计、产品艺术设计。路线重点不是“会画画”，而是作品集、软件能力、审美表达和实习项目。";
    }
    if (answersText.includes("影视传媒") || answersText.includes("镜头") || answersText.includes("短视频") || answersText.includes("传媒")) {
      return "你更适合优先看数字媒体艺术、影视摄影与制作、广播电视编导、播音与主持、网络与新媒体。沿海城市里厦门、广州、杭州这类城市更适合找内容和传媒实习。";
    }
    if (answersText.includes("音乐")) {
      return "你更适合优先看音乐学、音乐表演、音乐教育。若家庭更重视稳定，音乐教育和师范类院校优先级要高于纯表演方向。";
    }
    if (answersText.includes("美术教育") || answersText.includes("稳定就业") || answersText.includes("老师")) {
      return "你更适合优先看美术学、艺术教育、视觉传达设计。若想走教师或培训机构路线，要重点看师范背景、教师资格证路径和本地就业机会。";
    }
    return "艺考方向建议先在视觉传达设计、数字媒体艺术、环境设计、美术学、音乐学、播音编导中做取舍。下一步要根据你的专业分和作品方向缩小到2-3个专业。";
  }
  if (track === "sports") {
    if (answersText.includes("体育教师")) return "你更适合优先看体育教育。重点关注师范背景、教师资格证、当地中小学招聘和编制机会。";
    if (answersText.includes("运动康复")) return "你更适合优先看运动康复、康复治疗技术、健康管理。重点看实训基地、医院/康复机构合作和考证路径。";
    if (answersText.includes("运动训练")) return "你更适合优先看运动训练、专项训练、社会体育指导。重点看专项资源、训练平台和就业渠道。";
    return "体考方向建议在体育教育、运动训练、社会体育指导、运动康复中做选择。若想稳定，体育教育优先；若想就业面更宽，运动康复和健康管理值得看。";
  }
  if (track === "police" || track === "police_military") {
    return "警校方向不能只看分数，必须先核验政审、体检、体测、视力、身高、面试、选科和公安联考/入警政策。专业上优先看侦查学、治安学、公安管理学、刑事科学技术、网络安全与执法、交通管理工程、司法警察学；如果提前批不稳，普通批备选应放政法类、法学、公共管理或计算机安全方向。";
  }
  if (track === "military") {
    return "军校方向不能只看免费、稳定和学校名气，必须先核验政审、军检、体能、视力、面试、选科、训练强度和服从分配。专业上优先看指挥类、信息通信、网络空间安全、电子工程、航空航天、兵器工程、军医、后勤保障；如果军校提前批不稳，普通批备选应放工科、医学、信息安全或公办稳就业专业。";
  }
  if (stability >= 65) return "普通类建议优先看师范、财会、统计、电气、自动化、计算机应用等出口较清楚的方向。";
  if (risk >= 65 && execution >= 60) return "可以看电子信息、计算机、自动化、数据科学等成长型方向，但必须核验课程难度和转专业政策。";
  return "建议选应用性强、可就业也可升学的专业，不要只追热门。";
}

function buildStrategy(band: ScoreBand, track: BasicInfo["candidateTrack"], schools: SchoolRecommendation[]) {
  const reach = schools.filter((item) => item.level === "冲").map((item) => `${item.school} · ${item.major}`);
  const match = schools.filter((item) => item.level === "稳").map((item) => `${item.school} · ${item.major}`);
  const safe = schools.filter((item) => item.level === "保").map((item) => `${item.school} · ${item.major}`);

  if (track !== "general") {
    return {
      reach: reach.length ? reach : ["综合分略高于往年线的艺术/体育类院校"],
      match: match.length ? match : ["专业分和文化分都较匹配的省内院校"],
      safe: safe.length ? safe : ["专业分优势明显、城市和学费可接受的保底院校"],
    };
  }
  if (band === "specialist") {
    return {
      reach: reach.length ? reach : ["目标城市优质高职强专业"],
      match: match.length ? match : ["就业质量稳定的公办专科"],
      safe: safe.length ? safe : ["城市可接受、专业技能清楚的保底高职"],
    };
  }
  return {
    reach: reach.length ? reach : ["位次略高但城市/专业值得冲的学校"],
    match: match.length ? match : ["近三年位次稳定、专业可接受的学校"],
    safe: safe.length ? safe : ["即使录取也真正愿意去的保底学校"],
  };
}

function buildLifeRoutes(band: ScoreBand, track: BasicInfo["candidateTrack"], risk: number, stability: number, execution: number, region: string) {
  if (track === "art") {
    return [
      route("路径A：艺术专业就业线", `${region}艺术/设计类院校 -> 视觉传达/数字媒体 -> 作品集和实习 -> 设计/传媒岗位`, "68%", "专业指向清楚。", "需要作品能力和持续审美训练。"),
      route("路径B：综合大学艺术通道", `综合大学艺术专业 -> 辅修运营/新媒体 -> 品牌/教育/传媒就业`, "62%", "城市资源更丰富。", "专业竞争和作品要求都不低。"),
      route("路径C：专升本/考研抬平台", `应用型艺术院校 -> 作品集 -> 专升本或考研`, "55%", "可二次抬平台。", "执行力不足会很难坚持。"),
    ];
  }
  if (track === "sports") {
    return [
      route("路径A：体育教育稳定线", `${region}师范/体育院校 -> 体育教育 -> 教师/培训/体制内`, "70%", "就业方向清楚。", "需看教师资格和地区编制机会。"),
      route("路径B：运动康复健康线", `体育类专业 -> 康复/健康管理 -> 医养/健身/康复机构`, "63%", "健康产业有需求。", "需要持续考证和实习。"),
      route("路径C：运动训练竞技线", `运动训练 -> 专项能力 -> 俱乐部/训练机构`, "58%", "适合专项能力强的学生。", "收入波动和职业周期较明显。"),
    ];
  }
  if (band === "specialist" || band === "low") {
    return [
      route("路径A：高职技能就业线", `${region}优质高职 -> 软件/机电/护理/财会 -> 实习就业 -> 月薪5000-9000起步`, "72%", "技能路径清楚，就业更快。", "学校和专业选错会导致就业质量差。"),
      route("路径B：专升本抬平台线", `高职强专业 -> 大一开始准备专升本 -> 本科 -> 本地就业`, "56%", "保留继续升学机会。", "需要较强执行力。"),
      route("路径C：应用型民办本科线", `民办本科 -> 应用型专业 -> 本科就业`, "52%", "有本科身份。", "学费和家庭成本高，专业不好会很被动。"),
    ];
  }
  return [
    route("路径A：产业城市技术就业线", `${region}本科院校 -> 电子信息/计算机/自动化 -> 项目实习 -> 技术岗`, risk >= 65 ? "78%" : "66%", "成长空间较高。", "行业波动明显，需要大学期间做项目。"),
    route("路径B：区域稳就业线", `${region}省属本科 -> 师范/财会/电气/统计 -> 本地国企/学校/事业单位`, stability >= 65 ? "76%" : "62%", "稳定性更强。", "收入上限受城市和岗位限制。"),
    route("路径C：升学抬平台线", `本科 -> 保绩点/英语/项目 -> 考研或保研 -> 更高平台就业`, execution >= 65 ? "70%" : "58%", "可二次抬平台。", "战线长，需要执行力。"),
  ];
}

function route(title: string, path: string, probability: string, upside: string, risk: string) {
  return {
    title,
    school: "对应冲刺院校",
    major: "对应推荐专业",
    path,
    probability,
    admissionAction: "录取后先核对培养方案、核心课程和转专业政策。",
    collegePlan: [
      "大一：打好基础并完成第一个项目。",
      "大二：确定方向并积累项目、作品或证书。",
      "大三：准备作品集并争取对口实习。",
      "大四：集中校招、升学或考公，只保留一条主线。",
    ],
    targetIndustry: "专业对口行业和区域重点产业",
    skillChecklist: ["专业基础", "项目或作品", "对口实习", "简历与面试"],
    jobSearchKeywords: ["专业名称", "应届生", "实习"],
    upside,
    risk,
    mentorNote: "每学期用真实招聘岗位反查能力缺口，不要等到大四才看就业。",
  };
}

function buildRegrets(track: BasicInfo["candidateTrack"], family: number) {
  const regrets = [
    "只因为城市听起来好，就选了一个自己不喜欢、也不好就业的专业。",
    "只看学校名字，不看学费、住宿、专业课程和毕业去向。",
    "把保底志愿随便填，最后真被录取时才发现自己根本不想去。",
  ];
  if (track === "art" || track === "sports") regrets.push("艺体类只看文化分或只看专业分，没有按综合分和招生章程一起判断。");
  if (track === "police" || track === "police_military") {
    regrets.push("只看警校稳定和制服荣誉，却没有提前核验政审、体检、体测、视力、面试和公安联考/入警政策。");
    regrets.push("把普通政法专业误以为等同公安入警专业，最后发现就业路径完全不同。");
  }
  if (track === "military") {
    regrets.push("只看军校免费和稳定，却低估军检政审、训练纪律、专业类别和服从分配风险。");
    regrets.push("只填军校提前批，没有普通批工科、医学或信息安全备选，最后容易进退失据。");
  }
  if (family < 45) regrets.push("家庭投入压力较大，却选择高学费、高生活成本、回报周期长的路线。");
  return regrets;
}

function buildNextSteps(isEstimated: boolean, track: BasicInfo["candidateTrack"]) {
  return [
    isEstimated ? "正式出分后，用本省一分一段表替换当前粗略估算。" : "用真实位次核验近三年投档线。",
    track === "general"
      ? "核验专业组、选科限制和专业分。"
      : track === "police" || track === "police_military"
        ? "核验警校提前批招生计划、政审、体检、体测、视力、身高、面试、公安联考和入警政策。"
        : track === "military"
          ? "核验军校提前批招生计划、政审、军检、体能、视力、身高、面试、专业类别和服从分配要求。"
        : "核验专业分、综合分公式和招生章程。",
    "把推荐学校按就业、升学、转专业、学费、城市、住宿逐项核验。",
  ];
}
