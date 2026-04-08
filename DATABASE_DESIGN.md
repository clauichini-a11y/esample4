# データベース設計案 (SkillGrid)

このスキル管理サイトを運用するためのデータ構造（JSON形式およびリレーションシップ）を定義します。

## 1. データ構造 (JSON形式)

### ユーザー情報 (Users)
社員の基本情報を保持します。
```json
[
  {
    "id": "EMP001",
    "name": "佐藤 健一",
    "department": "システム開発部"
  }
]
```

### スキルマスター (SkillMaster)
管理対象となるスキルの定義を保持します。
```json
[
  {
    "id": "S001",
    "name": "TypeScript",
    "category": "言語"
  }
]
```

### ユーザーごとのスキル習得状況 (UserSkills)
各ユーザーがどのスキルをどのレベルで習得しているかを保持します。
```json
[
  {
    "userId": "EMP001",
    "skillId": "S001",
    "level": 4,
    "yearsOfExperience": 5,
    "certificationDate": "2023-10-01",
    "remarks": "フロントエンド開発のリードエンジニアとして従事"
  }
]
```

## 2. エンティティ・リレーションシップ (ER図的説明)

1.  **Users (1) <---> (N) UserSkills**
    *   1人のユーザーは複数のスキルを持つことができます。
    *   `UserSkills.userId` が `Users.id` を参照します。

2.  **SkillMaster (1) <---> (N) UserSkills**
    *   1つのスキル定義は、複数のユーザーによって習得され得ます。
    *   `UserSkills.skillId` が `SkillMaster.id` を参照します。

## 3. テーブル定義 (SQL形式案)

```sql
-- ユーザーテーブル
CREATE TABLE users (
    id VARCHAR(20) PRIMARY KEY, -- 社員番号
    name VARCHAR(100) NOT NULL, -- 氏名
    department VARCHAR(100) NOT NULL -- 部署名
);

-- スキルマスターテーブル
CREATE TABLE skill_master (
    id VARCHAR(20) PRIMARY KEY, -- スキルID
    name VARCHAR(100) NOT NULL, -- スキル名
    category VARCHAR(50) NOT NULL -- カテゴリ (サーバ, 言語, AI 等)
);

-- ユーザースキル紐付けテーブル
CREATE TABLE user_skills (
    user_id VARCHAR(20) REFERENCES users(id),
    skill_id VARCHAR(20) REFERENCES skill_master(id),
    level INTEGER CHECK (level BETWEEN 1 AND 5), -- 熟練度 (1-5)
    years_of_experience NUMERIC(4,1), -- 実務経験年数
    certification_date DATE, -- 資格取得日 (任意)
    remarks TEXT, -- 備考
    PRIMARY KEY (user_id, skill_id)
);
```

## 4. スキルレベルの定義基準

| レベル | ラベル | 具体的な習熟度 / 判断基準 |
| :--- | :--- | :--- |
| 1 | 基礎知識 | 用語や概念を理解しており、指示があれば作業が可能。独力での作業は困難だが、マニュアルや指導があれば基本的な操作ができるレベル。 |
| 2 | 実務経験あり | 一般的な業務を独力で遂行できる。日常的なトラブル対応を含め、標準的なタスクを完遂できるレベル。 |
| 3 | 応用可能 | 複雑な課題に対して、自ら解決策を提示し実行できる。例外的な事態にも対応でき、効率的な手法を選択・提案できるレベル。 |
| 4 | 指導可能 | 他者に対して技術指導やレビューを行うことができる。チーム全体の品質向上に貢献し、後進の育成を担えるレベル。 |
| 5 | 第一人者 | 社内外で専門家として認められ、戦略的な提言ができる。高度な専門性を持ち、技術トレンドを牽引または組織の技術戦略を決定できるレベル。 |
