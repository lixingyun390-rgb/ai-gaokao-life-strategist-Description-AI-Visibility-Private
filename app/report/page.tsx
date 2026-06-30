"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  Building2,
  CheckCircle2,
  Download,
  GraduationCap,
  MapPinned,
  Route,
  Share2,
  UserPlus,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { mockReport } from "@/lib/mock-data";
import type { Audience, Report } from "@/lib/types";

export default function ReportPage() {
  const [report, setReport] = useState<Report>(mockReport);
  const [audience, setAudience] = useState<Audience>("student");
  const [actionHint, setActionHint] = useState("报告已生成，可以先保存，再决定是否分享给家人一起看。");

  useEffect(() => {
    const raw = localStorage.getItem("gaokao-report");
    const savedAudience = localStorage.getItem("gaokao-audience");
    if (raw) {
      setReport(normalizeStoredReport(raw));
    }
    if (savedAudience === "parent") {
      setAudience("parent");
      setActionHint("报告已生成，可以先保存，再和孩子一起讨论学校、专业和风险取舍。");
    }
  }, []);

  return (
    <AppShell>
      <section className="motion-section space-y-4 pb-8">
        <div className="space-y-2">
          <p className="motion-card text-sm font-medium text-primary">人生报告已生成</p>
          <h1 className="motion-title text-2xl font-semibold leading-tight">
            {audience === "parent" ? "孩子的志愿决策画像" : "你的志愿决策画像"}
          </h1>
          <p className="motion-card text-sm leading-6 text-muted-foreground">{report.summary}</p>
        </div>

        <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
          <h2 className="mb-2 font-semibold">导师判断</h2>
          <p className="text-sm leading-6">{report.mentorConclusion}</p>
        </div>

        <div className="grid gap-3">
          <div className="rounded-md border border-border bg-white/90 p-4 shadow-sm">
            <h2 className="mb-2 font-semibold">分数层级判断</h2>
            <p className="text-sm leading-6 text-muted-foreground">{report.estimatedRank}</p>
          </div>
          <div className="rounded-md border border-border bg-white/90 p-4 shadow-sm">
            <h2 className="mb-2 font-semibold">推荐城市方向</h2>
            <p className="text-sm leading-6 text-muted-foreground">{report.recommendedCity}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {report.fitTags.map((tag) => (
            <span key={tag} className="rounded-sm bg-accent px-3 py-2 text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>

        <div className="rounded-md border border-border bg-white/90 p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">七维画像</h2>
          <div className="space-y-3">
            {report.profile.map((metric) => (
              <div key={metric.key} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{metric.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {metric.level} · {metric.score}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${metric.score}%` }} />
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{metric.reading}</p>
              </div>
            ))}
          </div>
        </div>

        <ReportBlock icon={MapPinned} title="城市建议" content={report.cityAdvice} />
        <ReportBlock icon={GraduationCap} title="专业建议" content={report.majorAdvice} />

        <div className="rounded-md border border-border bg-white/90 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">人生路线推演</h2>
          </div>
          <div className="space-y-3">
            {report.lifeRoutes.map((route, routeIndex) => (
              <div key={`${route.title}-${routeIndex}`} className="rounded-md bg-muted p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold leading-6">{route.title}</h3>
                  <span className="shrink-0 rounded-sm bg-white px-2 py-1 text-xs font-medium text-primary">
                    {route.probability}
                  </span>
                </div>
                <p className="text-sm leading-6">{route.path}</p>
                <div className="mt-3 space-y-3 border-t border-border pt-3">
                  <RouteDetail title="录取后第一步" content={route.admissionAction} />
                  <div>
                    <h4 className="mb-2 text-xs font-semibold text-foreground">大学四年行动</h4>
                    <ol className="space-y-2">
                      {route.collegePlan.map((item, itemIndex) => (
                        <li key={`${item}-${itemIndex}`} className="text-xs leading-5 text-muted-foreground">
                          {item}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <RouteDetail title="毕业目标行业" content={route.targetIndustry} />
                  <div>
                    <h4 className="mb-2 text-xs font-semibold text-foreground">招聘常见技能</h4>
                    <div className="flex flex-wrap gap-2">
                      {route.skillChecklist.map((item, itemIndex) => (
                        <span key={`${item}-${itemIndex}`} className="rounded-sm bg-white px-2 py-1 text-xs text-muted-foreground">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-2 text-xs font-semibold text-foreground">先去招聘网站反查岗位要求</h4>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {route.jobSearchKeywords.map((keyword, keywordIndex) => (
                        <span key={`${keyword}-${keywordIndex}`} className="rounded-sm border border-border bg-white px-2 py-1 text-xs">
                          {keyword}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <JobSiteLink href="https://www.zhipin.com/">BOSS直聘</JobSiteLink>
                      <JobSiteLink href="https://www.shixiseng.com/">实习僧</JobSiteLink>
                      <JobSiteLink href="https://www.ncss.cn/">国家就业平台</JobSiteLink>
                    </div>
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                  <p>机会：{route.upside}</p>
                  <p>风险：{route.risk}</p>
                  <p className="text-foreground">导师判断：{route.mentorNote}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-white/90 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">志愿梯度</h2>
          </div>
          <StrategyList title="值得冲" items={report.strategy.reach} />
          <StrategyList title="重点稳" items={report.strategy.match} />
          <StrategyList title="必须保" items={report.strategy.safe} />
        </div>

        <div className="rounded-md border border-border bg-white/90 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">学校推荐与核验清单</h2>
          </div>
          <div className="space-y-3">
            {report.schoolRecommendations.map((school, schoolIndex) => (
              <div key={`${school.school}-${school.major}-${schoolIndex}`} className="rounded-md border border-border bg-white p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold">{school.school}</h3>
                    <p className="text-xs text-muted-foreground">
                      {school.city} · {school.major}
                    </p>
                  </div>
                  <span className="rounded-sm bg-accent px-2 py-1 text-xs font-semibold">
                    {school.level}
                  </span>
                </div>
                <p className="mb-2 text-sm leading-6">{school.reason}</p>
                <AdmissionHistory rows={school.admissionHistory} />
                <div className="grid gap-2 text-xs leading-5 text-muted-foreground">
                  <Metric label="就业率" value={school.employmentRate} />
                  <Metric label="升学/保研" value={school.graduateRate} />
                  <Metric label="推免名额" value={school.postgraduateQuota} />
                  <Metric label="转专业" value={school.transferDifficulty} />
                  <Metric label="住宿条件" value={school.dormCondition ?? "建议重点查宿舍是几人间、是否上床下桌、是否独卫、是否有空调，以及校区位置。"} />
                  <Metric label="就读体验" value={school.studentExperience ?? "建议看在读学生对食堂、宿舍、校区位置、课程强度、实习机会和管理风格的真实反馈。"} />
                  <Metric label="师资" value={school.facultyStrength} />
                  <Metric label="硕博点" value={school.degreePrograms} />
                  <Metric label="科研强项" value={school.researchStrength} />
                  <Metric label="数据状态" value={school.dataFreshness} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <SearchLink href="https://hudong.moe.gov.cn/qggxmd/">
                    教育部查校
                  </SearchLink>
                  <SearchLink href={school.admissionsUrl ?? searchUrl(`${school.school} 招生章程 招生网`)}>
                    招生网
                  </SearchLink>
                  <SearchLink href={school.transferSearchUrl ?? searchUrl(`${school.school} 转专业 政策 教务处`)}>
                    转专业
                  </SearchLink>
                  <SearchLink href={school.dormSearchUrl ?? searchUrl(`${school.school} 宿舍 条件 校区`)}>
                    宿舍
                  </SearchLink>
                  <SearchLink href={school.experienceSearchUrl ?? searchUrl(`${school.school} 就读体验 贴吧 小红书 知乎`)}>
                    真实体验
                  </SearchLink>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-white/90 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="font-semibold">未来容易后悔的选择</h2>
          </div>
          <ul className="space-y-2">
            {report.regrets.map((item, itemIndex) => (
              <li key={`${item}-${itemIndex}`} className="text-sm leading-6 text-muted-foreground">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">下一步</h2>
          </div>
          <ul className="space-y-2">
            {report.nextSteps.map((item, itemIndex) => (
              <li key={`${item}-${itemIndex}`} className="text-sm leading-6">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-border bg-white/95 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">把报告留下来</h2>
          </div>
          <p className="mb-3 text-sm leading-6 text-muted-foreground">{actionHint}</p>
          <div className="grid gap-2">
            <Button className="w-full gap-2" onClick={() => setActionHint("已为你标记保存。正式接入后这里会生成可下载报告。")}>
              <Download className="h-4 w-4" />
              保存报告
            </Button>
            <Button
              variant="secondary"
              className="w-full gap-2"
              onClick={() => setActionHint("海报入口已预留。后续可生成适合发给家人或分享到抖音的图片。")}
            >
              <Share2 className="h-4 w-4" />
              生成海报
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setActionHint("关注博主获取完整解读入口已预留，可接抖音主页或私信关键词。")}
            >
              <UserPlus className="h-4 w-4" />
              关注博主获取完整解读
            </Button>
          </div>
        </div>

        <Button asChild variant="outline" className="w-full gap-2">
          <Link href="/basic">
            <ArrowLeft className="h-4 w-4" />
            重新评估
          </Link>
        </Button>
      </section>
    </AppShell>
  );
}

function ReportBlock({
  icon: Icon,
  title,
  content,
}: {
  icon: typeof MapPinned;
  title: string;
  content: string;
}) {
  return (
    <div className="rounded-md border border-border bg-white/90 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{content}</p>
    </div>
  );
}

function StrategyList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        {items.map((item, itemIndex) => (
          <div key={`${item}-${itemIndex}`} className="rounded-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-2 rounded-sm bg-muted px-2 py-2">
      <span className="font-medium text-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function AdmissionHistory({ rows }: { rows?: Report["schoolRecommendations"][number]["admissionHistory"] }) {
  if (!rows?.length) return null;

  return (
    <div className="mb-3 rounded-md border border-primary/15 bg-primary/5 p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-foreground">近三年录取参考</h4>
        <span className="text-[0.68rem] text-muted-foreground">用于判断冲稳保</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((row, index) => (
          <div key={`${row.year}-${index}`} className="rounded-sm bg-white px-2 py-2 text-xs leading-5">
            <div className="mb-1 flex items-center justify-between gap-2 font-semibold text-foreground">
              <span>{row.year}</span>
              <span>{row.scoreLine}</span>
            </div>
            <p className="text-muted-foreground">位次：{row.rank}</p>
            <p className="text-muted-foreground">判断：{row.note}</p>
            <p className="text-[0.68rem] text-muted-foreground">口径：{row.source}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RouteDetail({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold text-foreground">{title}</h4>
      <p className="text-xs leading-5 text-muted-foreground">{content}</p>
    </div>
  );
}

function JobSiteLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex min-h-10 items-center justify-center rounded-md border border-border bg-white px-2 text-center text-xs font-medium text-foreground"
    >
      {children}
    </a>
  );
}

function SearchLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-md border border-border bg-white px-3 py-2 text-center text-xs font-medium text-foreground transition hover:border-primary/50 hover:text-primary"
    >
      {children}
    </a>
  );
}

function searchUrl(query: string) {
  return `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`;
}

function normalizeStoredReport(raw: string): Report {
  try {
    const value = JSON.parse(raw) as Record<string, any>;
    const strategy = value.strategy && typeof value.strategy === "object" ? value.strategy : {};

    return {
      summary: toText(value.summary, mockReport.summary),
      mentorConclusion: toText(value.mentorConclusion, mockReport.mentorConclusion),
      estimatedRank: toText(value.estimatedRank, mockReport.estimatedRank),
      recommendedCity: toText(value.recommendedCity, mockReport.recommendedCity),
      profile: Array.isArray(value.profile)
        ? normalizeProfileForDisplay(value.profile)
        : mockReport.profile,
      fitTags: toStringArray(value.fitTags, mockReport.fitTags),
      cityAdvice: toText(value.cityAdvice, mockReport.cityAdvice),
      majorAdvice: toText(value.majorAdvice, mockReport.majorAdvice),
      strategy: {
        reach: toStringArray(strategy.reach, mockReport.strategy.reach),
        match: toStringArray(strategy.match, mockReport.strategy.match),
        safe: toStringArray(strategy.safe, mockReport.strategy.safe),
      },
      lifeRoutes: Array.isArray(value.lifeRoutes)
        ? value.lifeRoutes.map((item: any, index: number) => {
            const major = toText(item?.major, "重点推荐专业");
            const rawSchool = toText(item?.school, "");
            const school = isPlaceholderSchoolName(rawSchool)
              ? fallbackSchoolName(index, major, index === 0 ? "冲" : "稳")
              : rawSchool;
            const placeholder = rawSchool || "请以同分段院校池重新生成具体学校";
            const title = replacePlaceholderSchool(
              toText(item?.title, `路径${index + 1}：${school} · ${major}`),
              placeholder,
              school,
            );

            return {
              title,
              school,
              major,
              path: replacePlaceholderSchool(
                toText(item?.path ?? item?.route, "围绕录取专业积累课程、项目和实习。"),
                placeholder,
                school,
              ),
              probability: toText(item?.probability, "中等"),
              admissionAction: replacePlaceholderSchool(
                toText(item?.admissionAction, "先核对培养方案、核心课程和转专业政策。"),
                placeholder,
                school,
              ),
              collegePlan: toStringArray(item?.collegePlan, [
                "大一：打好基础并完成第一个项目。",
                "大二：确定方向并积累项目、作品或证书。",
                "大三：准备作品集并争取对口实习。",
                "大四：集中校招、升学或考公，只保留一条主线。",
              ]).map((text) => replacePlaceholderSchool(text, placeholder, school)),
              targetIndustry: toText(item?.targetIndustry, "专业对口行业和城市重点产业"),
              skillChecklist: toStringArray(item?.skillChecklist, ["专业基础", "项目或作品", "对口实习", "简历与面试"]),
              jobSearchKeywords: toStringArray(item?.jobSearchKeywords, ["专业名称", "应届生", "实习"]),
              upside: replacePlaceholderSchool(toText(item?.upside, "方向明确后有持续成长空间。"), placeholder, school),
              risk: replacePlaceholderSchool(toText(item?.risk, "需要避免大学期间缺少持续积累。"), placeholder, school),
              mentorNote: replacePlaceholderSchool(toText(item?.mentorNote ?? item?.note, "从大一开始执行具体计划。"), placeholder, school),
            };
          })
        : mockReport.lifeRoutes,
      schoolRecommendations: Array.isArray(value.schoolRecommendations)
        ? normalizeSchoolsForDisplay(value.schoolRecommendations)
        : mockReport.schoolRecommendations,
      regrets: toStringArray(value.regrets, mockReport.regrets),
      nextSteps: normalizeNextStepsForDisplay(value.nextSteps, value.schoolRecommendations),
    };
  } catch {
    return mockReport;
  }
}

function normalizeSchoolsForDisplay(items: any[]) {
  const seen = createDisplaySchoolFieldSeen();
  return items.map((item, index) => {
    const rawSchool = toText(item?.school ?? item?.name, "");
    const major = toText(item?.major ?? item?.program, "推荐专业");
    const level = item?.level === "稳" || item?.level === "保" ? item.level : "冲";
    const school = isPlaceholderSchoolName(rawSchool)
      ? fallbackSchoolName(index, major, level)
      : rawSchool;
    const city = toText(item?.city, "目标城市");
    const context = { school, city, major, level, index };

    return {
      school,
      city,
      major,
      level,
      reason: displaySchoolField(seen, "reason", item?.reason, `${school} 放在“${level}”档，核心看 ${city} 城市机会、${major} 专业出口和分数余量。`, context),
      admissionHistory: normalizeAdmissionHistoryForDisplay(item?.admissionHistory ?? item?.admissionReference, { school, major, level }),
      employmentRate: displaySchoolField(seen, "employmentRate", item?.employmentRate, `${school} 的 ${major} 要看该学院就业质量报告里的对口就业率、主要就业城市和典型岗位，不只看全校就业率。`, context),
      graduateRate: displaySchoolField(seen, "graduateRate", item?.graduateRate, `${school} 的升学情况重点看 ${major} 所属学院近三年考研、专升本或出国去向，别只看学校整体宣传。`, context),
      postgraduateQuota: displaySchoolField(seen, "postgraduateQuota", item?.postgraduateQuota, `${school} 如果是本科，查推免公示里 ${major} 所属学院是否有名额；如果是专科，改查专升本和合作升学通道。`, context),
      transferDifficulty: displaySchoolField(seen, "transferDifficulty", item?.transferDifficulty, `${school} 要查教务处转专业文件：${major} 能否转入、是否限制绩点/面试/选科，以及能不能跨学院。`, context),
      dormCondition: displaySchoolField(seen, "dormCondition", item?.dormCondition, `${school} 要先确认 ${major} 所在校区，再查宿舍几人间、独卫空调、到学院或实训楼的通勤时间。`, context),
      studentExperience: displaySchoolField(seen, "studentExperience", item?.studentExperience, `${school} 的真实体验建议搜“${school} ${major} 就读体验”，重点看课程强度、实习资源、管理风格和 ${city} 生活成本。`, context),
      admissionsUrl: toText(item?.admissionsUrl, ""),
      dormSearchUrl: toText(item?.dormSearchUrl, ""),
      transferSearchUrl: toText(item?.transferSearchUrl, ""),
      experienceSearchUrl: toText(item?.experienceSearchUrl, ""),
      facultyStrength: displaySchoolField(seen, "facultyStrength", item?.facultyStrength, `${school} 的师资要看 ${major} 所属学院教师方向、行业项目、竞赛指导和校企合作。`, context),
      degreePrograms: displaySchoolField(seen, "degreePrograms", item?.degreePrograms, `${school} 的硕博点要查 ${major} 对应一级学科或专业学位点；没有硕士点时重点看实训平台和就业合作。`, context),
      researchStrength: displaySchoolField(seen, "researchStrength", item?.researchStrength, `${school} 的科研强项要落到 ${major}：重点查实验室、工作室、竞赛获奖、横向项目和毕业作品。`, context),
      dataFreshness: displaySchoolField(seen, "dataFreshness", item?.dataFreshness, `${school} 这张卡先到教育部全国高等学校名单核验学校名称，再核对 2026 招生章程、省考试院投档数据、${major} 学院官网和最近一版就业质量报告。`, context),
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

function replacePlaceholderSchool(text: string, placeholder: string, school: string) {
  return text
    .replaceAll(placeholder, school)
    .replaceAll("请以同分段院校池重新生成具体学校", school)
    .replaceAll("推荐院校", school);
}

function createDisplaySchoolFieldSeen() {
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

function displaySchoolField(
  seen: ReturnType<typeof createDisplaySchoolFieldSeen>,
  key: keyof ReturnType<typeof createDisplaySchoolFieldSeen>,
  value: unknown,
  fallback: string,
  context: { school: string; major: string },
) {
  const raw = toText(value, "").trim();
  const cleanedRaw = replacePlaceholderSchool(raw, "请以同分段院校池重新生成具体学校", context.school);
  const text = cleanedRaw && !seen[key].has(cleanedRaw) && !isWeakDisplaySchoolField(cleanedRaw) ? cleanedRaw : fallback;
  const specificText = text.includes(context.school) || text.includes(context.major)
    ? text
    : `${context.school} · ${context.major}：${text}`;
  seen[key].add(specificText);
  return specificText;
}

function isWeakDisplaySchoolField(text: string) {
  const weakPhrases = ["以学校官网为准", "以官网为准", "需核验", "待核验", "建议查询", "建议查", "去官网查"];
  return text.length < 18 || weakPhrases.some((phrase) => text === phrase || text.startsWith(phrase));
}

function normalizeAdmissionHistoryForDisplay(
  value: unknown,
  context: { school: string; major: string; level: "冲" | "稳" | "保" },
) {
  const rows = Array.isArray(value) ? value : [];
  const normalized = rows
    .map((item: any, index) => ({
      year: toText(item?.year, String(2025 - index)),
      scoreLine: toText(item?.scoreLine ?? item?.score ?? item?.line, ""),
      rank: toText(item?.rank ?? item?.position ?? item?.lowestRank, ""),
      note: toText(item?.note ?? item?.remark, ""),
      source: toText(item?.source, ""),
    }))
    .filter((item) => item.scoreLine || item.rank || item.note)
    .slice(0, 3);

  if (normalized.length === 3) return normalized;

  const levelHint =
    context.level === "冲"
      ? "冲刺档：重点看你的位次是否接近近年最低投档位次，不能把它当唯一主线。"
      : context.level === "稳"
        ? "稳妥档：重点看你的位次是否略优于近年最低投档位次，再比较专业组。"
        : "保底档：重点看是否明显留出位次余量，同时确认专业和城市能接受。";

  return ["2025", "2024", "2023"].map((year) => ({
    year,
    scoreLine: `${context.school} · ${context.major}：待接入本省考试院精确投档线`,
    rank: "按你的位次对照该校近年最低投档位次",
    note: levelHint,
    source: "省考试院投档表 / 学校招生网 / 阳光高考",
  }));
}

function normalizeNextStepsForDisplay(value: unknown, schoolsValue: unknown) {
  const schools = Array.isArray(schoolsValue) ? normalizeSchoolsForDisplay(schoolsValue).slice(0, 2) : [];
  const fallback = [
    schools[0]
      ? `先对比 ${schools[0].school} · ${schools[0].major} 的近三年录取参考，判断它到底是冲刺还是贴线。`
      : "先对比学校卡片里的近三年录取参考，判断每所学校的冲稳保位置。",
    schools[1]
      ? `再打开 ${schools[1].school} 的招生网、转专业和宿舍入口，确认专业组、校区和录取规则。`
      : "再打开学校卡片里的招生网、转专业和宿舍入口，确认专业组、校区和录取规则。",
    "保存报告，和家人一起只讨论两件事：能不能录取，以及录取后这条路值不值得走。",
  ];
  const cleaned = toStringArray(value, fallback)
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

const displayProfileDimensions = [
  { key: "risk", label: "风险偏好" },
  { key: "independence", label: "独立适应" },
  { key: "sociability", label: "社交协作" },
  { key: "execution", label: "执行力" },
  { key: "pressure", label: "抗压能力" },
  { key: "familyResource", label: "家庭支持" },
  { key: "stability", label: "稳定偏好" },
];

function normalizeProfileForDisplay(profile: any[]) {
  return displayProfileDimensions.map((dimension, index) => {
    const item =
      profile.find((metric) => metric?.key === dimension.key) ??
      profile.find((metric) => metric?.label === dimension.label) ??
      profile[index] ??
      {};

    return {
      key: dimension.key,
      label: dimension.label,
      score: clampScore(item?.score),
      level: toText(item?.level, "中"),
      reading: toText(item?.reading ?? item?.value, "结合答题内容综合判断这一项对志愿选择的影响。"),
    };
  });
}

function toStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value.map((item) => toText(item, "")).filter(Boolean);
  return items.length ? items : fallback;
}

function toText(value: any, fallback: string): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => toText(item, "")).filter(Boolean).join("；") || fallback;
  }
  if (value && typeof value === "object") {
    for (const key of ["text", "content", "value", "summary", "advice", "description"]) {
      if (value[key] != null) return toText(value[key], fallback);
    }
    return Object.values(value).map((item) => toText(item, "")).filter(Boolean).join("；") || fallback;
  }
  return fallback;
}

function clampScore(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 58;
}
