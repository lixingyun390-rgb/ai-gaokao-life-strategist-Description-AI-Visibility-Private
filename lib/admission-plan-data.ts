import type { CandidateTrack } from "@/lib/types";

export type AdmissionPlanSource = {
  province: string;
  year: 2026;
  status: "not_started" | "source_found" | "imported_partial" | "imported" | "needs_manual_file";
  sourceName: string;
  sourceUrl: string;
  note: string;
};

export type AdmissionPlanRecord = {
  year: 2026;
  province: string;
  batch: string;
  candidateTrack: CandidateTrack;
  subjectGroup: string;
  schoolCode?: string;
  schoolName: string;
  schoolProvince?: string;
  city?: string;
  collegeGroup?: string;
  majorCode?: string;
  majorName: string;
  planCount: number;
  tuition?: string;
  duration?: string;
  campus?: string;
  requirement?: string;
  sourceUrl: string;
};

export const admissionPlanSources2026: AdmissionPlanSource[] = [
  {
    province: "福建",
    year: 2026,
    status: "imported",
    sourceName: "福建省教育考试院：2026年福建省普通高校招生计划",
    sourceUrl: "https://www.eeafj.cn/",
    note: "已导入福建 2026 普通类物理/历史、艺术类、体育类、提前批、本科批和高职专科批结构化计划；少量 PDF 表格行标记为 needs_review。",
  },
  {
    province: "江苏",
    year: 2026,
    status: "source_found",
    sourceName: "江苏省教育考试院：江苏省公布2026年普通高校招生计划",
    sourceUrl: "https://www.jseea.cn/webfile/index/index_zkxx/2026-06-23/7474808080111243264.html",
    note: "已发现官方发布页，但页面未直接暴露全量专业目录附件，需继续获取电子专刊或系统数据。",
  },
  {
    province: "山东",
    year: 2026,
    status: "imported_partial",
    sourceName: "山东省教育招生考试院：2026年普通高等学校分专业招生计划补充信息（本科）",
    sourceUrl: "https://www.sdzk.cn/NewsInfo.aspx?NewsID=7268",
    note: "已导入本科补充信息 7 条，属于招生计划更正/调整补丁；全量分专业计划仍需继续获取。",
  },
  {
    province: "河南",
    year: 2026,
    status: "source_found",
    sourceName: "河南省教育考试院：《招生考试之友》专业目录/招生计划补充说明",
    sourceUrl: "https://www.haeea.cn/",
    note: "官方指南说明专业目录公布分专业招生计划、选考科目要求和学费标准。",
  },
  {
    province: "广东",
    year: 2026,
    status: "source_found",
    sourceName: "广东省教育考试院：广东省2026年普通高校招生专业目录",
    sourceUrl: "https://eea.gd.gov.cn/tzgg/",
    note: "志愿填报通知要求按类别、批次、专业查阅招生计划；具体目录可能需要 PDF/系统入口导入。",
  },
  {
    province: "北京",
    year: 2026,
    status: "source_found",
    sourceName: "北京教育考试院：2026年普通高等学校招生工作规定",
    sourceUrl: "https://www.bjeea.cn/html/gkgz/tzgg/2026/0505/88114.html",
    note: "已确认批次和志愿规则，招生计划目录需继续导入。",
  },
  ...[
    "天津",
    "河北",
    "山西",
    "内蒙古",
    "辽宁",
    "吉林",
    "黑龙江",
    "上海",
    "浙江",
    "安徽",
    "江西",
    "湖北",
    "湖南",
    "广西",
    "海南",
    "重庆",
    "四川",
    "贵州",
    "云南",
    "西藏",
    "陕西",
    "甘肃",
    "青海",
    "宁夏",
    "新疆",
  ].map((province) => ({
    province,
    year: 2026 as const,
    status: "not_started" as const,
    sourceName: `${province}省级教育考试院/招生考试机构 2026 招生计划或专业目录`,
    sourceUrl: "",
    note: "待接入官方专业目录、PDF、网页或手工表格。",
  })),
];

export const admissionPlans2026: AdmissionPlanRecord[] = [];

export function getAdmissionPlanSource(province: string) {
  return admissionPlanSources2026.find((source) => source.province === province);
}

export function findAdmissionPlans(params: {
  province?: string;
  candidateTrack?: CandidateTrack;
  subjectGroup?: string;
  schoolName?: string;
  majorName?: string;
}) {
  return admissionPlans2026.filter((record) => {
    if (params.province && record.province !== params.province) return false;
    if (params.candidateTrack && record.candidateTrack !== params.candidateTrack) return false;
    if (params.subjectGroup && record.subjectGroup !== params.subjectGroup) return false;
    if (params.schoolName && !record.schoolName.includes(params.schoolName)) return false;
    if (params.majorName && !record.majorName.includes(params.majorName)) return false;
    return true;
  });
}
