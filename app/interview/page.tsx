"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Send, UserRound } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { BorderGlow } from "@/components/border-glow";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  parentArtInterviewQuestions,
  parentInterviewQuestions,
  parentMilitaryInterviewQuestions,
  parentPoliceInterviewQuestions,
  parentSportsInterviewQuestions,
  studentArtInterviewQuestions,
  studentInterviewQuestions,
  studentMilitaryInterviewQuestions,
  studentPoliceInterviewQuestions,
  studentSportsInterviewQuestions,
} from "@/lib/mock-data";
import type { Audience, BasicInfo, InterviewAnswer, Report } from "@/lib/types";

type Message = {
  role: "ai" | "user";
  text: string;
};

const interviewCopy = {
  student: {
    title: "AI 陪你聊聊未来",
    intro: "这套题是给学生自己的。你不用回答大道理，直接选最像你的场景就行。",
    placeholder: "也可以补充一句真实想法",
    generating: "正在整理你的城市、专业和未来路线画像...",
    early: "先生成报告",
  },
  parent: {
    title: "家长版志愿风险访谈",
    intro: "这套题是给家长的。重点看家庭资源、孩子状态、就业风险、城市距离和长期发展取舍。",
    placeholder: "也可以补充孩子或家庭的真实情况",
    generating: "正在整理孩子的城市、专业、就业和家庭决策画像...",
    early: "生成阶段报告",
  },
};

export default function InterviewPage() {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [audience, setAudience] = useState<Audience>("student");
  const [basicInfo, setBasicInfo] = useState<BasicInfo | null>(null);
  const [answers, setAnswers] = useState<InterviewAnswer[]>([]);
  const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const questions = useMemo(() => {
    const track = basicInfo?.candidateTrack ?? "general";
    if (audience === "parent") {
      return buildParentQuestions(track);
    }

    return buildStudentQuestions(track);
  }, [audience, basicInfo?.candidateTrack]);
  const copy = interviewCopy[audience];
  const currentQuestion = questions[answers.length];
  const progress = Math.round((answers.length / questions.length) * 100);

  const messages = useMemo<Message[]>(() => {
    const result: Message[] = [{ role: "ai", text: copy.intro }];

    answers.forEach((item, index) => {
      result.push({ role: "ai", text: `${index + 1}. ${item.question}` });
      result.push({ role: "user", text: item.answer });
    });

    if (currentQuestion) {
      result.push({ role: "ai", text: `${answers.length + 1}. ${currentQuestion}` });
    }

    return result;
  }, [answers, copy.intro, currentQuestion]);

  useEffect(() => {
    const raw = localStorage.getItem("gaokao-basic-info");
    const savedAudience = localStorage.getItem("gaokao-audience");
    if (raw) {
      setBasicInfo(normalizeBasicInfo(JSON.parse(raw) as Partial<BasicInfo>));
    }
    if (savedAudience === "parent") {
      setAudience("parent");
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function generateReport(nextAnswers: InterviewAnswer[]) {
    setIsGenerating(true);
    setError("");
    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basicInfo, answers: nextAnswers, audience }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "报告生成失败");
      }
      localStorage.setItem("gaokao-report", JSON.stringify(data as Report));
      router.push("/report");
    } catch (err) {
      setError(formatReportError(err));
      setIsGenerating(false);
    }
  }

  async function submitAnswer(answer: string) {
    const text = answer.trim();
    if (!text || !currentQuestion || isGenerating) return;

    const nextAnswers = [
      ...answers,
      {
        id: `q-${answers.length + 1}`,
        question: currentQuestion,
        answer: text,
      },
    ];

    setAnswers(nextAnswers);
    setDraft("");

    if (nextAnswers.length >= questions.length) {
      await generateReport(nextAnswers);
    }
  }

  const currentChoices = extractChoices(currentQuestion);
  return (
    <AppShell>
      <section className="motion-section flex min-h-0 flex-1 flex-col pb-4">
        <div className="space-y-3 pb-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="motion-title text-2xl font-semibold">{copy.title}</h1>
              <p className="motion-card text-sm text-white/70">
                {answers.length}/{questions.length} 个问题
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/20 bg-white/15 text-white backdrop-blur">
              <Bot className="h-5 w-5" />
            </div>
          </div>
          <Progress value={progress} />
        </div>

        <div className="interview-glass-panel motion-card min-h-[52svh] flex-1 space-y-3 overflow-y-auto rounded-md border p-3">
          {currentQuestion && !isGenerating && (
            <div className="sticky top-0 z-20 rounded-md border border-white/20 bg-slate-950/58 px-3 py-3 text-sm leading-6 text-white shadow-[0_14px_34px_rgb(2_6_23/0.2)] backdrop-blur-xl">
              <div className="mb-1 text-xs font-semibold text-cyan-200">正在回答第 {answers.length + 1} 题</div>
              <div>{currentQuestion}</div>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "ai" && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/12 text-cyan-100">
                  <Bot className="h-4 w-4" />
                </span>
              )}
              <div
                className={`max-w-[82%] rounded-md px-3 py-2 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-cyan-400/85 text-slate-950"
                    : "border border-white/14 bg-white/12 text-white shadow-sm backdrop-blur"
                }`}
              >
                {message.text}
              </div>
              {message.role === "user" && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-200/90 text-slate-950">
                  <UserRound className="h-4 w-4" />
                </span>
              )}
            </div>
          ))}
          {isGenerating && (
            <div className="rounded-md border border-white/15 bg-white/12 px-3 py-3 text-sm text-white">
              {copy.generating}
            </div>
          )}
          {error && (
            <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm leading-6 text-amber-900">
              <p>{error}</p>
              {answers.length >= questions.length && (
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => generateReport(answers)}
                  className="rounded-md bg-amber-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  重新生成报告
                </button>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="interview-input-dock motion-card sticky bottom-0 mt-3 space-y-3 rounded-md p-3">
          {currentChoices.length > 0 && (
            <div className="grid gap-2">
              {currentChoices.map((choice) => (
                <BorderGlow
                  key={choice}
                  className={isGenerating ? "opacity-50" : ""}
                  borderRadius={14}
                  glowRadius={26}
                  glowIntensity={1.45}
                  backgroundColor="rgb(8 18 28 / 82%)"
                  colors={["#22d3ee", "#f472b6", "#bef264"]}
                >
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => submitAnswer(choice)}
                    className="choice-glow-button disabled:opacity-50"
                  >
                    {choice}
                  </button>
                </BorderGlow>
              ))}
            </div>
          )}
          <Textarea
            disabled={isGenerating}
            placeholder={copy.placeholder}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="border-white/15 bg-white/12 text-white placeholder:text-white/45"
          />
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="flex items-center rounded-md border border-white/15 bg-white/10 px-3 text-xs leading-5 text-white/62">
              选完全部问题后自动生成报告
            </div>
            <Button
              size="icon"
              disabled={!draft.trim() || isGenerating}
              onClick={() => submitAnswer(draft)}
              aria-label="发送答案"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function extractChoices(question?: string) {
  if (!question) return [];
  const matches = question.match(/[A-D]\.[^A-D]+/g);
  return matches?.map((item) => item.trim()) ?? [];
}

function formatReportError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (
    /JSON|Expected|Unexpected|position|parse|unterminated|array element/i.test(message) ||
    message.includes("格式不完整")
  ) {
    return "AI 刚才返回的报告格式不完整，系统没能正常整理成报告。你的答题已经保留，点“重新生成报告”即可，不需要重新答题。";
  }
  if (/Failed to fetch|NetworkError|fetch/i.test(message)) {
    return "网络请求中断了，你的答题已经保留，可以稍后重新生成报告。";
  }
  return message || "报告生成失败，你的答题已经保留，可以重新生成一次。";
}

function normalizeBasicInfo(value: Partial<BasicInfo>): BasicInfo {
  return {
    province: value.province ?? "",
    score: value.score ?? "",
    rank: value.rank ?? "",
    artScore: value.artScore ?? "",
    sportsScore: value.sportsScore ?? "",
    chineseScore: value.chineseScore ?? "",
    mathScore: value.mathScore ?? "",
    englishScore: value.englishScore ?? "",
    subjectScores: value.subjectScores ?? {},
    heightVision: value.heightVision ?? "",
    politicalCheck: value.politicalCheck ?? "",
    disciplinePreference: value.disciplinePreference ?? "",
    gender: value.gender ?? "",
    subjects: value.subjects ?? [],
    scoreReleased: value.scoreReleased ?? true,
    candidateTrack: value.candidateTrack ?? "general",
    preferredCities: value.preferredCities ?? "",
    avoidedCities: value.avoidedCities ?? "",
    familyBudget: value.familyBudget ?? "",
    majorPreferences: value.majorPreferences ?? "",
    careerPreferences: value.careerPreferences ?? "",
    avoidedMajors: value.avoidedMajors ?? "",
  };
}

function buildStudentQuestions(track: BasicInfo["candidateTrack"]) {
  const generalQuestions = studentInterviewQuestions.filter((question) => shouldShowQuestionForTrack(question, "general"));
  if (track === "general") return generalQuestions;

  const core = [
    generalQuestions[0],
    generalQuestions[1],
    generalQuestions[2],
    generalQuestions[4],
    generalQuestions[5],
    generalQuestions[7],
    generalQuestions[9],
    generalQuestions[12],
    generalQuestions[14],
    generalQuestions[16],
  ].filter(Boolean);

  return uniqueQuestions([...core, ...studentTrackQuestions(track)]);
}

function buildParentQuestions(track: BasicInfo["candidateTrack"]) {
  const generalQuestions = parentInterviewQuestions.filter((question) => shouldShowQuestionForTrack(question, "general"));
  if (track === "general") return generalQuestions;

  const core = [
    generalQuestions[0],
    generalQuestions[1],
    generalQuestions[2],
    generalQuestions[3],
    generalQuestions[4],
    generalQuestions[5],
    generalQuestions[6],
    generalQuestions[8],
    generalQuestions[12],
    generalQuestions[15],
  ].filter(Boolean);

  return uniqueQuestions([...core, ...parentTrackQuestions(track)]);
}

function studentTrackQuestions(track: BasicInfo["candidateTrack"]) {
  if (track === "art") return studentArtInterviewQuestions;
  if (track === "sports") return studentSportsInterviewQuestions;
  if (track === "police" || track === "police_military") return studentPoliceInterviewQuestions;
  if (track === "military") return studentMilitaryInterviewQuestions;
  return [];
}

function parentTrackQuestions(track: BasicInfo["candidateTrack"]) {
  if (track === "art") return parentArtInterviewQuestions;
  if (track === "sports") return parentSportsInterviewQuestions;
  if (track === "police" || track === "police_military") return parentPoliceInterviewQuestions;
  if (track === "military") return parentMilitaryInterviewQuestions;
  return [];
}

function uniqueQuestions(questions: string[]) {
  return Array.from(new Set(questions));
}

function shouldShowQuestionForTrack(question: string, track: BasicInfo["candidateTrack"]) {
  const isArt = question.includes("艺考生") || question.includes("艺体") || question.includes("艺术");
  const isSports = question.includes("体考生") || question.includes("艺体") || question.includes("体育");
  const isPolice = question.includes("警校") || question.includes("公安") || question.includes("入警");
  const isMilitary = question.includes("军校") || question.includes("军检") || question.includes("军种");
  const isSharedPoliceMilitary = question.includes("警校或军校") || question.includes("纪律化管理和服从安排");
  const isPoliceMilitary = isPolice || isMilitary || question.includes("政审");
  const isSpecialBatch = question.includes("特殊批次");

  if (track === "general") return !isArt && !isSports && !isPoliceMilitary && !isSpecialBatch;
  if (track === "art") return !isSports && !isPoliceMilitary;
  if (track === "sports") return !isArt && !isPoliceMilitary;
  if (track === "police") return !isArt && !isSports && (!isMilitary || isSharedPoliceMilitary);
  if (track === "military") return !isArt && !isSports && (!isPolice || isSharedPoliceMilitary);
  return !isArt && !isSports;
}
