export type CandidateTrack = "general" | "art" | "sports" | "police" | "military" | "police_military";

export type BasicInfo = {
  province: string;
  score: string;
  rank: string;
  artScore: string;
  sportsScore: string;
  chineseScore: string;
  mathScore: string;
  englishScore: string;
  subjectScores: Record<string, string>;
  heightVision: string;
  politicalCheck: string;
  disciplinePreference: string;
  gender: string;
  subjects: string[];
  scoreReleased: boolean;
  candidateTrack: CandidateTrack;
  preferredCities: string;
  avoidedCities: string;
  familyBudget: string;
  majorPreferences: string;
  careerPreferences: string;
  avoidedMajors: string;
};

export type Audience = "student" | "parent";

export type InterviewAnswer = {
  id: string;
  question: string;
  answer: string;
};

export type ProfileMetric = {
  key: string;
  label: string;
  score: number;
  level: string;
  reading: string;
};

export type LifeRoute = {
  title: string;
  school: string;
  major: string;
  path: string;
  probability: string;
  admissionAction: string;
  collegePlan: string[];
  targetIndustry: string;
  skillChecklist: string[];
  jobSearchKeywords: string[];
  upside: string;
  risk: string;
  mentorNote: string;
};

export type SchoolRecommendation = {
  school: string;
  city: string;
  major: string;
  level: "冲" | "稳" | "保";
  reason: string;
  admissionHistory?: {
    year: string;
    scoreLine: string;
    rank: string;
    note: string;
    source: string;
  }[];
  employmentRate: string;
  graduateRate: string;
  postgraduateQuota: string;
  transferDifficulty: string;
  dormCondition?: string;
  studentExperience?: string;
  admissionsUrl?: string;
  dormSearchUrl?: string;
  transferSearchUrl?: string;
  experienceSearchUrl?: string;
  facultyStrength: string;
  degreePrograms: string;
  researchStrength: string;
  dataFreshness: string;
};

export type Report = {
  summary: string;
  mentorConclusion: string;
  estimatedRank: string;
  recommendedCity: string;
  profile: ProfileMetric[];
  fitTags: string[];
  cityAdvice: string;
  majorAdvice: string;
  strategy: {
    reach: string[];
    match: string[];
    safe: string[];
  };
  lifeRoutes: LifeRoute[];
  schoolRecommendations: SchoolRecommendation[];
  regrets: string[];
  nextSteps: string[];
};
