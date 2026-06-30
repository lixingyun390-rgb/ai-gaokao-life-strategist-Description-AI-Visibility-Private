"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Map, SlidersHorizontal } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { candidateTrackOptions, provinces, subjectOptions } from "@/lib/mock-data";
import type { Audience, BasicInfo, CandidateTrack } from "@/lib/types";

const genderOptions = [
  { value: "male", label: "男生" },
  { value: "female", label: "女生" },
  { value: "private", label: "暂不透露" },
];

const budgetOptions = [
  { value: "public_only", label: "优先公办低成本" },
  { value: "moderate", label: "可接受适度学费" },
  { value: "high", label: "可考虑民办/中外合办" },
  { value: "international", label: "可支持海外读研" },
];

const rankSourceUrls: Partial<Record<string, string>> = {
  广东: "https://eea.gd.gov.cn/",
  福建: "https://www.eeafj.cn/",
  江苏: "https://www.jseea.cn/",
  河南: "https://www.haeea.cn/",
  山东: "https://www.sdzk.cn/",
  浙江: "https://www.zjzs.net/",
  四川: "https://www.sceea.cn/",
  湖北: "https://www.hbea.edu.cn/",
  湖南: "https://jyt.hunan.gov.cn/sjyt/hnsjyksy/",
};

const policeMajorOptions = [
  "侦查学 / 治安学",
  "公安技术 / 刑事科学技术",
  "网络安全与执法",
  "交通管理工程 / 警务指挥",
  "司法警察学 / 监狱学",
  "不确定，先帮我判断",
];

const militaryMajorOptions = [
  "指挥类 / 作战指挥",
  "信息通信 / 网络空间安全",
  "航空航天 / 电子工程 / 雷达",
  "兵器工程 / 无人系统",
  "军医 / 后勤保障",
  "不确定，先帮我判断",
];

function isUniformCandidateTrack(track: CandidateTrack | string) {
  return track === "police" || track === "military" || track === "police_military";
}

function estimateRankFromScore(province: string, scoreValue: string) {
  const score = Number(scoreValue);
  if (!province || !Number.isFinite(score) || score <= 0) return null;

  const rank =
    score >= 680
      ? "约全省前 800 名"
      : score >= 650
        ? "约全省前 3000 名"
        : score >= 620
          ? "约全省前 9000 名"
          : score >= 590
            ? "约全省前 20000 名"
            : score >= 560
              ? "约全省前 40000 名"
              : score >= 520
                ? "约全省前 75000 名"
                : score >= 480
                  ? "约全省前 120000 名"
                  : score >= 430
                    ? "约全省前 180000 名"
                    : score >= 350
                      ? "约全省前 260000 名"
                      : "约全省 260000 名以后";
  const source = rankSourceUrls[province] ?? "本省教育考试院";

  return {
    rankText: rank,
    note: `这是按近年一分一段分布做的粗估，不等同于官方位次。正式推荐时应以 ${source} 发布的 2026 一分一段表为准。`,
  };
}

const audienceCopy = {
  student: {
    eyebrow: "高考后 5 分钟人生报告",
    title: "先确定分数边界",
    description: "AI 会把分数、位次、城市偏好和后面的访谈一起看，而不是只给一串学校名单。",
    button: "继续和 AI 聊一聊",
  },
  parent: {
    eyebrow: "家长版志愿决策",
    title: "先写清您对孩子的期待",
    description: "AI 会把孩子的分数、考生类型、家长期望、城市取舍和家庭支持一起看，再判断冲稳保和长期风险。",
    button: "进入家长风险访谈",
  },
};

const fieldCopy = {
  student: {
    familyBudget: "家庭可承受的学费和升学成本",
    majorLabel: "喜欢或愿意了解的专业方向",
    majorPlaceholder: "例如：计算机、电子信息、师范、护理、数字媒体、设计、财会；不知道也可以写“不确定”",
    careerLabel: "期待的就业方向或生活状态",
    careerPlaceholder: "例如：稳定体面、本地就业、高收入、考研、进大厂、当老师、公务员、设计传媒、出国读研",
    avoidedMajorLabel: "明确不想读的专业或行业",
    avoidedMajorPlaceholder: "例如：不想医学、不想土木、不想销售、不想太卷、不想长期加班；可不填",
    preferredCityLabel: "想去的省份或城市",
    preferredCityPlaceholder: "例如：福建、福州、泉州、厦门；可不填",
    avoidedCityLabel: "不想去的省份或城市",
    avoidedCityPlaceholder: "例如：太远、太冷、生活成本高的城市；可不填",
  },
  parent: {
    familyBudget: "您能为孩子承受的学费和升学成本",
    majorLabel: "您希望孩子就读什么专业",
    majorPlaceholder: "例如：希望读计算机、电子信息、师范、医学、财会、设计传媒；不确定可以写“先看就业和孩子适配”",
    careerLabel: "您希望孩子毕业后走什么方向",
    careerPlaceholder: "例如：本地稳定就业、考研提升平台、进国企/事业单位、进大厂、出国读研、先保证本科质量",
    avoidedMajorLabel: "您不希望孩子进入的专业或行业",
    avoidedMajorPlaceholder: "例如：不想孩子长期加班、不想医学、不想土木、不想销售、不想高风险行业；可不填",
    preferredCityLabel: "您希望孩子所在的城市是哪里",
    preferredCityPlaceholder: "例如：希望在福建、福州、厦门、泉州；或写“沿海城市”“离家近”“省会优先”",
    avoidedCityLabel: "您不希望孩子去的省份或城市",
    avoidedCityPlaceholder: "例如：太远、太冷、生活成本高、离家交通不方便；可不填",
  },
};

export default function BasicPage() {
  const router = useRouter();
  const [audience, setAudience] = useState<Audience>("student");
  const [form, setForm] = useState<BasicInfo>({
    province: "",
    score: "",
    rank: "",
    artScore: "",
    sportsScore: "",
    chineseScore: "",
    mathScore: "",
    englishScore: "",
    subjectScores: {},
    heightVision: "",
    politicalCheck: "",
    disciplinePreference: "",
    gender: "",
    subjects: [],
    scoreReleased: true,
    candidateTrack: "general",
    preferredCities: "",
    avoidedCities: "",
    familyBudget: "",
    majorPreferences: "",
    careerPreferences: "",
    avoidedMajors: "",
  });

  const copy = audienceCopy[audience];
  const fields = fieldCopy[audience];
  const isUniformTrack = isUniformCandidateTrack(form.candidateTrack);
  const autoRank = estimateRankFromScore(form.province, form.score);
  const canContinue = useMemo(() => {
    const hasSpecialScore =
      form.candidateTrack === "art"
        ? Boolean(form.artScore)
        : form.candidateTrack === "sports"
          ? Boolean(form.sportsScore)
          : form.candidateTrack === "police" ||
              form.candidateTrack === "military" ||
              form.candidateTrack === "police_military"
            ? Boolean(form.heightVision && form.politicalCheck && form.disciplinePreference)
            : true;
    return form.province && form.score && form.gender && form.subjects.length === 3 && hasSpecialScore;
  }, [form]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextAudience: Audience = params.get("audience") === "parent" ? "parent" : "student";
    setAudience(nextAudience);
    localStorage.setItem("gaokao-audience", nextAudience);
  }, []);

  useEffect(() => {
    if (!form.scoreReleased || !autoRank) return;
    if (form.rank && !form.rank.startsWith("约全省")) return;
    setForm((current) => (current.rank === autoRank.rankText ? current : { ...current, rank: autoRank.rankText }));
  }, [autoRank, form.rank, form.scoreReleased]);

  function toggleSubject(value: string) {
    setForm((current) => ({
      ...current,
      subjects: current.subjects.includes(value)
        ? current.subjects.filter((item) => item !== value)
        : current.subjects.length >= 3
          ? current.subjects
          : [...current.subjects, value],
      subjectScores: current.subjects.includes(value)
        ? Object.fromEntries(Object.entries(current.subjectScores).filter(([key]) => key !== value))
        : current.subjectScores,
    }));
  }

  function submit() {
    localStorage.setItem("gaokao-basic-info", JSON.stringify(form));
    localStorage.setItem("gaokao-audience", audience);
    router.push("/interview");
  }

  function toggleMajorPreference(value: string) {
    setForm((current) => {
      const items = current.majorPreferences
        .split("、")
        .map((item) => item.trim())
        .filter(Boolean);
      const next = items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
      return { ...current, majorPreferences: next.join("、") };
    });
  }

  return (
    <AppShell>
      <section className="motion-section space-y-5 pb-8 pt-1">
        <div className="space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <p className="motion-card text-sm font-medium text-primary">{copy.eyebrow}</p>
          <h1 className="motion-title text-2xl font-semibold">{copy.title}</h1>
          <p className="motion-card text-sm leading-6 text-muted-foreground">{copy.description}</p>
        </div>

        <div className="motion-card space-y-4 rounded-md border border-border bg-white/90 p-4 shadow-sm">
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <div className="space-y-2">
            <Label>高考省份</Label>
            <Select
              value={form.province}
              onValueChange={(province) => setForm((current) => ({ ...current, province }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择高考省份" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((province) => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
            <span className="rounded-sm bg-secondary px-2 py-2 text-xs text-secondary-foreground">
              {audience === "parent" ? "家长版" : "学生版"}
            </span>
          </div>

          <div className="space-y-3">
            <Label>考生类型</Label>
            <div className="grid grid-cols-2 gap-2">
              {candidateTrackOptions.map((track) => {
                const active = form.candidateTrack === track.value;
                return (
                  <button
                    key={track.value}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        candidateTrack: track.value as CandidateTrack,
                        familyBudget:
                          isUniformCandidateTrack(track.value) ? "" : current.familyBudget,
                        majorPreferences:
                          isUniformCandidateTrack(track.value) ? "" : current.majorPreferences,
                      }))
                    }
                    className={`h-10 rounded-md border text-sm font-medium transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-white text-foreground"
                    }`}
                  >
                    {track.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <Label>考生性别</Label>
            <div className="grid grid-cols-3 gap-2">
              {genderOptions.map((option) => {
                const active = form.gender === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, gender: option.value }))}
                    className={`h-10 rounded-md border text-sm font-medium transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-white text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              性别只用于分析行业环境、岗位友好度和长期就业风险，不会简单决定你能不能学某个专业。
            </p>
          </div>

          <label className="flex items-center gap-3 rounded-md border border-border bg-muted/50 p-3">
            <Checkbox
              checked={form.scoreReleased}
              onCheckedChange={(checked) =>
                setForm((current) => ({
                  ...current,
                  scoreReleased: Boolean(checked),
                  rank: Boolean(checked) ? current.rank : "",
                }))
              }
            />
            <span className="text-sm font-medium">已经出分</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{form.scoreReleased ? "文化分数" : "预估文化分"}</Label>
              <Input
                inputMode="numeric"
                placeholder="例如 300"
                value={form.score}
                onChange={(event) => setForm((current) => ({ ...current, score: event.target.value }))}
              />
            </div>
            {form.scoreReleased ? (
              <div className="space-y-2">
                <Label>位次</Label>
                <Input
                  placeholder={autoRank ? "系统已自动估算，可手动改成官方位次" : "例如 18000"}
                  value={form.rank}
                  onChange={(event) => setForm((current) => ({ ...current, rank: event.target.value }))}
                />
              </div>
            ) : (
              <div className="flex min-h-11 items-center rounded-md border border-border bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
                未出分时不用填位次，系统会先按本省往年分数段粗估位次和批次。
              </div>
            )}
          </div>

          {autoRank && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
              <p className="font-medium text-foreground">系统位次估算：{autoRank.rankText}</p>
              <p className="mt-1">{autoRank.note}</p>
              <button
                type="button"
                className="mt-2 rounded-sm bg-primary px-2 py-1 font-medium text-primary-foreground"
                onClick={() => setForm((current) => ({ ...current, rank: autoRank.rankText }))}
              >
                填入位次栏
              </button>
            </div>
          )}

          <div className="space-y-3 rounded-md border border-primary/15 bg-primary/5 p-3">
            <div>
              <Label>各科分数</Label>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                可选填。填了以后，AI 会更准确判断学科优势、专业适配和不建议硬冲的方向。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label>语文</Label>
                <Input
                  inputMode="numeric"
                  placeholder="例如 105"
                  value={form.chineseScore}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, chineseScore: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>数学</Label>
                <Input
                  inputMode="numeric"
                  placeholder="例如 92"
                  value={form.mathScore}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, mathScore: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>外语</Label>
                <Input
                  inputMode="numeric"
                  placeholder="例如 110"
                  value={form.englishScore}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, englishScore: event.target.value }))
                  }
                />
              </div>
            </div>
            {form.subjects.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {form.subjects.map((subject) => (
                  <div key={subject} className="space-y-2">
                    <Label>{subject}</Label>
                    <Input
                      inputMode="numeric"
                      placeholder="例如 78"
                      value={form.subjectScores[subject] ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          subjectScores: {
                            ...current.subjectScores,
                            [subject]: event.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {form.candidateTrack === "art" && (
            <div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3">
              <Label>艺考专业分</Label>
              <Input
                inputMode="decimal"
                placeholder="例如 230"
                value={form.artScore}
                onChange={(event) => setForm((current) => ({ ...current, artScore: event.target.value }))}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                艺考推荐会优先看艺术类院校、专业分、综合分规则和招生章程。
              </p>
            </div>
          )}

          {form.candidateTrack === "sports" && (
            <div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3">
              <Label>体考专业分</Label>
              <Input
                inputMode="decimal"
                placeholder="例如 85"
                value={form.sportsScore}
                onChange={(event) => setForm((current) => ({ ...current, sportsScore: event.target.value }))}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                体考推荐会优先看体育类院校、体育教育/运动训练/康复方向和综合分规则。
              </p>
            </div>
          )}

          {(form.candidateTrack === "police" ||
            form.candidateTrack === "military" ||
            form.candidateTrack === "police_military") && (
            <div className="space-y-3 rounded-md border border-primary/20 bg-primary/5 p-3">
              <div className="space-y-2">
                <Label>身高、视力和体能基础</Label>
                <Textarea
                  placeholder="例如：男生175，裸眼视力4.8，体能还可以；或写“不确定，需要体检前核查”"
                  value={form.heightVision}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, heightVision: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {form.candidateTrack === "military"
                    ? "政审、军检、面试是否有明显风险"
                    : "政审、体检、面试是否有明显风险"}
                </Label>
                <Textarea
                  placeholder={
                    form.candidateTrack === "military"
                      ? "例如：家庭和本人情况正常；或写“不了解军检/政审要求，需要提前核对”"
                      : "例如：家庭和本人情况正常；或写“不了解政审要求，需要提前核对”"
                  }
                  value={form.politicalCheck}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, politicalCheck: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {form.candidateTrack === "military"
                    ? "对军校训练、纪律和服从分配的接受度"
                    : "对纪律化管理和服从安排的接受度"}
                </Label>
                <Textarea
                  placeholder={
                    form.candidateTrack === "military"
                      ? "例如：能接受军校训练和服从安排；或写“想读军校，但担心未来岗位不确定”"
                      : "例如：能接受严格作息和训练；或写“想要稳定，但担心管理太严”"
                  }
                  value={form.disciplinePreference}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, disciplinePreference: event.target.value }))
                  }
                />
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {form.candidateTrack === "military"
                  ? "军校通常涉及提前批、政审、军检、面试、体能和选科限制。常见方向包括指挥类、信息通信、网络空间安全、航空航天、电子工程、军医和后勤保障。报告会先判断这条路能不能走，再给普通批备选。"
                  : "警校通常涉及提前批、政审、体检、体测、面试和选科限制。常见专业包括侦查学、治安学、公安技术、刑事科学技术、网络安全与执法、交通管理工程。报告会先判断这条路能不能走，再给政法类或稳妥备选。"}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label>选科</Label>
              <span className="text-xs text-muted-foreground">已选 {form.subjects.length}/3</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {subjectOptions.map((subject) => {
                const active = form.subjects.includes(subject);
                const disabled = !active && form.subjects.length >= 3;
                return (
                  <button
                    key={subject}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleSubject(subject)}
                    className={`h-10 rounded-md border text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-white text-foreground"
                    }`}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              新高考选科请准确选择 3 科；选满后如需更换，先取消一个已选科目。
            </p>
          </div>

          {!isUniformTrack && (
            <div className="space-y-3">
              <Label>{fields.familyBudget}</Label>
              <div className="grid grid-cols-2 gap-2">
                {budgetOptions.map((option) => {
                  const active = form.familyBudget === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, familyBudget: option.value }))}
                      className={`min-h-11 rounded-md border px-2 text-sm font-medium leading-5 transition ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-white text-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isUniformTrack ? (
            <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3">
              <div className="space-y-1">
                <Label>
                  {form.candidateTrack === "military"
                    ? "先选一个你愿意了解的军校方向"
                    : "先选一个你愿意了解的警校方向"}
                </Label>
                <p className="text-xs leading-5 text-muted-foreground">
                  {form.candidateTrack === "military"
                    ? "军校专业和普通大学不一样，先按大方向判断：指挥、信息通信、航空航天、军医、后勤等，后面报告会再解释差别。"
                    : "警校专业和普通法学不一样，先按大方向判断：侦查治安、公安技术、网安执法、交通管理、司法警察等，后面报告会再解释差别。"}
                </p>
              </div>
              <div className="grid gap-2">
                {(form.candidateTrack === "military" ? militaryMajorOptions : policeMajorOptions).map((option) => {
                  const active = form.majorPreferences.split("、").includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleMajorPreference(option)}
                      className={`rounded-md border px-3 py-3 text-left text-sm font-medium leading-5 transition ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-white text-foreground"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{fields.majorLabel}</Label>
              <Textarea
                placeholder={fields.majorPlaceholder}
                value={form.majorPreferences}
                onChange={(event) =>
                  setForm((current) => ({ ...current, majorPreferences: event.target.value }))
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>{fields.careerLabel}</Label>
            <Textarea
              placeholder={fields.careerPlaceholder}
              value={form.careerPreferences}
              onChange={(event) =>
                setForm((current) => ({ ...current, careerPreferences: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>{fields.avoidedMajorLabel}</Label>
            <Textarea
              placeholder={fields.avoidedMajorPlaceholder}
              value={form.avoidedMajors}
              onChange={(event) =>
                setForm((current) => ({ ...current, avoidedMajors: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              {fields.preferredCityLabel}
            </Label>
            <Textarea
              placeholder={fields.preferredCityPlaceholder}
              value={form.preferredCities}
              onChange={(event) =>
                setForm((current) => ({ ...current, preferredCities: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>{fields.avoidedCityLabel}</Label>
            <Textarea
              placeholder={fields.avoidedCityPlaceholder}
              value={form.avoidedCities}
              onChange={(event) =>
                setForm((current) => ({ ...current, avoidedCities: event.target.value }))
              }
            />
          </div>
        </div>

        <Button onClick={submit} disabled={!canContinue} className="motion-card h-14 w-full gap-2">
          {copy.button}
          <ArrowRight className="h-5 w-5" />
        </Button>
      </section>
    </AppShell>
  );
}
