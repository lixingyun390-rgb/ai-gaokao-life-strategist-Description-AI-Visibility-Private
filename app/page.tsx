import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";

const trustItems = [
  "已帮助高考生模拟生成志愿决策报告",
  "不收集敏感隐私",
  "不替代正式志愿填报，仅提供理性参考",
];

const decisionFactors = ["性格", "家庭", "城市", "专业", "就业", "考研", "转专业风险"];

export default function HomePage() {
  return (
    <AppShell>
      <section className="motion-section flex flex-1 flex-col pb-8 pt-4">
        <div className="space-y-5">
          <div className="space-y-4">
            <div className="motion-card inline-flex items-center gap-2 rounded-sm border border-border bg-white/85 px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              抖音扫码进入，无需注册
            </div>

            <div className="space-y-3">
              <h1 className="motion-title text-4xl font-semibold leading-tight tracking-normal text-foreground">
                AI高考人生军师
              </h1>
              <p className="motion-card text-xl font-semibold leading-8 text-foreground">
                5分钟生成你的18岁人生决策报告
              </p>
              <p className="motion-card text-base leading-7 text-muted-foreground">
                不是只看分数，而是综合分析性格、家庭、城市、专业、就业、考研、转专业风险，帮你判断哪条路更适合你。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {decisionFactors.map((factor) => (
              <span
                key={factor}
                className="motion-card rounded-sm bg-white/90 px-3 py-2 text-xs font-medium text-foreground shadow-sm"
              >
                {factor}
              </span>
            ))}
          </div>

          <div className="motion-card space-y-2 rounded-md border border-border bg-white/90 p-3 shadow-sm">
            {trustItems.map((item) => (
              <div key={item} className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="grid gap-3 pt-1">
            <div className="motion-card rounded-md border border-primary/20 bg-primary/5 p-3 text-center">
              <p className="text-sm font-semibold text-foreground">选择身份，立即免费生成报告</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                不用注册，不用手机号，先生成报告再决定是否保存或分享。
              </p>
            </div>
            <AudienceEntry
              href="/basic?audience=student"
              icon={GraduationCap}
              title="我是学生"
              description="想看看自己适合什么专业和城市"
            />
            <AudienceEntry
              href="/basic?audience=parent"
              icon={Users}
              title="我是家长"
              description="想帮孩子做更稳妥的志愿决策"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Signal icon={ClipboardCheck} label="先测试" />
            <Signal icon={HeartHandshake} label="出报告" />
            <Signal icon={CheckCircle2} label="再分享" />
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function AudienceEntry({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof GraduationCap;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="motion-card group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-border bg-white/95 p-4 shadow-sm transition hover:border-primary/50"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold">{title}</span>
        <span className="block text-sm leading-6 text-muted-foreground">{description}</span>
      </span>
      <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:text-primary" />
    </Link>
  );
}

function Signal({ icon: Icon, label }: { icon: typeof ClipboardCheck; label: string }) {
  return (
    <div className="motion-card rounded-md border border-border bg-white/75 px-2 py-3 text-center shadow-sm">
      <Icon className="mx-auto mb-2 h-5 w-5 text-primary" />
      <div className="text-xs font-medium">{label}</div>
    </div>
  );
}
