import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export default function WeChatEntryPage() {
  return (
    <main className="min-h-svh bg-[#f7faf9] px-5 py-8 text-slate-900">
      <section className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-md flex-col justify-center">
        <div className="mb-8 inline-flex h-12 w-12 items-center justify-center rounded-md bg-teal-700 text-white shadow-sm">
          <Sparkles className="h-6 w-6" />
        </div>

        <p className="mb-3 text-sm font-semibold text-teal-700">微信极速入口</p>
        <h1 className="text-4xl font-black leading-tight tracking-normal">
          AI高考
          <br />
          人生军师
        </h1>
        <p className="mt-5 text-xl font-semibold leading-8">5分钟生成你的18岁人生决策报告</p>
        <p className="mt-4 text-base leading-7 text-slate-600">
          不注册，不留手机号。先填写基础信息，再通过 AI 访谈生成志愿决策参考。
        </p>

        <div className="mt-8 grid gap-3 rounded-md border border-teal-100 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
          <div className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
            <span>不收集敏感隐私</span>
          </div>
          <div className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
            <span>不替代正式志愿填报，仅提供理性参考</span>
          </div>
        </div>

        <div className="mt-8 grid gap-3">
          <Link
            href="/basic?audience=student"
            prefetch={false}
            className="flex h-14 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-base font-bold text-white shadow-sm"
          >
            我是学生，开始测试
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/basic?audience=parent"
            prefetch={false}
            className="flex h-14 items-center justify-center gap-2 rounded-md border border-teal-200 bg-white px-4 text-base font-bold text-teal-800 shadow-sm"
          >
            我是家长，开始测试
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          如果微信里加载慢，请点击右上角三个点，选择“在浏览器打开”。
        </p>
      </section>
    </main>
  );
}
