/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SkillLevel = 1 | 2 | 3 | 4 | 5;

export interface SkillMaster {
  id: string;
  name: string;
  category: string;
}

export interface WorkExperience {
  date: string;
  description: string;
}

export interface User {
  id: string; // 社員番号
  name: string; // 氏名
  department: string; // 部署名
  workExperiences?: WorkExperience[];
}

export interface UserSkill {
  userId: string;
  skillId: string;
  level: SkillLevel;
  yearsOfExperience: number;
  certificationDate?: string;
  remarks?: string;
}

export const SKILL_LEVEL_DEFINITIONS = {
  1: {
    label: "基礎知識",
    description: "用語や概念を理解しており、指示があれば作業が可能。",
    criteria: "独力での作業は困難だが、マニュアルや指導があれば基本的な操作ができるレベル。"
  },
  2: {
    label: "実務経験あり",
    description: "一般的な業務を独力で遂行できる。",
    criteria: "日常的なトラブル対応を含め、標準的なタスクを完遂できるレベル。"
  },
  3: {
    label: "応用可能",
    description: "複雑な課題に対して、自ら解決策を提示し実行できる。",
    criteria: "例外的な事態にも対応でき、効率的な手法を選択・提案できるレベル。"
  },
  4: {
    label: "指導可能",
    description: "他者に対して技術指導やレビューを行うことができる。",
    criteria: "チーム全体の品質向上に貢献し、後進の育成を担えるレベル。"
  },
  5: {
    label: "第一人者",
    description: "社内外で専門家として認められ、戦略的な提言ができる。",
    criteria: "高度な専門性を持ち、技術トレンドを牽引または組織の技術戦略を決定できるレベル。"
  }
};

export const CATEGORIES = [
  "サーバ",
  "ネットワーク",
  "データベース",
  "クラウド",
  "AI",
  "言語",
  "ハードウェア",
  "ツール",
  "資格"
];
