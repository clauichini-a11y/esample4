/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, SkillMaster, UserSkill } from './types';

export const mockUsers: User[] = [
  { id: "EMP001", name: "佐藤 健一", department: "システム開発部" },
  { id: "EMP002", name: "田中 美咲", department: "インフラ運用課" },
  { id: "EMP003", name: "鈴木 裕太", department: "AI推進室" },
  { id: "EMP004", name: "高橋 陽子", department: "DX推進部" },
  { id: "EMP005", name: "伊藤 誠", department: "システム開発部" },
];

export const mockSkillMaster: SkillMaster[] = [
  { id: "S001", name: "TypeScript", category: "言語" },
  { id: "S002", name: "React", category: "言語" },
  { id: "S003", name: "Node.js", category: "言語" },
  { id: "S004", name: "AWS", category: "クラウド" },
  { id: "S005", name: "GCP", category: "クラウド" },
  { id: "S006", name: "Docker", category: "ツール" },
  { id: "S007", name: "Kubernetes", category: "ツール" },
  { id: "S008", name: "PostgreSQL", category: "データベース" },
  { id: "S009", name: "Python", category: "言語" },
  { id: "S010", name: "PyTorch", category: "AI" },
];

export const mockUserSkills: UserSkill[] = [
  { userId: "EMP001", skillId: "S001", level: 4, yearsOfExperience: 5 },
  { userId: "EMP001", skillId: "S002", level: 4, yearsOfExperience: 4 },
  { userId: "EMP001", skillId: "S003", level: 3, yearsOfExperience: 3 },
  { userId: "EMP002", skillId: "S004", level: 5, yearsOfExperience: 8 },
  { userId: "EMP002", skillId: "S006", level: 4, yearsOfExperience: 4 },
  { userId: "EMP003", skillId: "S009", level: 5, yearsOfExperience: 6 },
  { userId: "EMP003", skillId: "S010", level: 4, yearsOfExperience: 3 },
  { userId: "EMP004", skillId: "S005", level: 3, yearsOfExperience: 2 },
  { userId: "EMP005", skillId: "S001", level: 2, yearsOfExperience: 1 },
];
